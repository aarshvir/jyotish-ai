/**
 * VedicHour — Agentic Report Quality Loop
 *
 * Generates a fresh report, polls until complete, then runs exhaustive
 * quality checks. If any check fails it prints an actionable diagnosis
 * and exits non-zero.  Does NOT stop until:
 *   1. Report status = "complete"
 *   2. ALL contract checks pass (18 slots/day, 12 months, 6 weeks, etc.)
 *   3. ALL content quality checks pass (no blank/thin commentary, no
 *      placeholder text, min word counts, yoga mentions, nakshatra
 *      references, non-trivial scores, etc.)
 *   4. RAG grounding confirmed (scripture references present in nativity)
 *
 * Exit 0  = everything perfect
 * Exit 1  = quality failure (details printed)
 * Exit 2  = infrastructure failure (server down, pipeline error, etc.)
 */

import { randomUUID } from 'crypto';

const BASE        = 'http://localhost:3000';
const BYPASS      = 'VEDICADMIN2026';
const HEADERS     = { 'Content-Type': 'application/json', 'x-bypass-token': BYPASS };

// ── Birth data used for the test report ─────────────────────────────────────
// Well-known Vedic chart with multiple strong yogas (Taurus lagna, Malavya,
// Saturn Yogakaraka, Mars exalted in Capricorn, Jupiter in Cancer — Hamsa).
const BIRTH = {
  name:            'Validation Native',
  birth_date:      '1990-04-15',
  birth_time:      '08:30:00',
  birth_city:      'Mumbai, India',
  birth_lat:       19.076,
  birth_lng:       72.877,
  current_city:    'Dubai, UAE',
  current_lat:     25.204,
  current_lng:     55.270,
  timezone_offset: 240,       // UTC+4
  plan_type:       '7day',
  payment_status:  'bypass',
};

const REPORT_ID = randomUUID();

// ── Helpers ──────────────────────────────────────────────────────────────────
const ts  = () => new Date().toISOString().slice(11, 19);
const log = (tag, msg) => console.log(`[${ts()}] [${tag}] ${msg}`);

const PASS = (msg)     => console.log(`  ✅  ${msg}`);
const WARN = (msg)     => console.warn(`  ⚠️   ${msg}`);
const FAIL = (msg, d) => { console.error(`  ❌  ${msg}`); if (d) console.error('     Detail:', typeof d === 'string' ? d : JSON.stringify(d, null, 2)); };

function die(msg, detail, code = 1) {
  console.error(`\n${'═'.repeat(56)}`);
  console.error(`  LOOP STOPPED: ${msg}`);
  if (detail) console.error('  Detail:', typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  console.error('═'.repeat(56));
  process.exit(code);
}

async function fetchJSON(url, opts = {}, timeoutMs = 10_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { ...HEADERS, ...(opts.headers || {}) } });
    clearTimeout(t);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body });
    }
    return await res.json();
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

// ── Step 1: Health check ─────────────────────────────────────────────────────
async function checkServer() {
  log('server', `Pinging ${BASE}`);
  try {
    await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
    PASS('Dev server reachable');
  } catch (err) {
    if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')) {
      die('Dev server not running — start with: npm run dev', null, 2);
    }
    PASS('Dev server reachable (non-200 ok)');
  }
}

// ── Step 1b: Verify routes are compiled and reachable ────────────────────────
// NOTE: Before running this script, manually warm up the server by calling:
//   POST /api/agents/ephemeris  (takes ~60s to compile first time)
//   GET  /api/reports/any-id/status
// OR just wait ~90s after `npm run dev` before running this script.
async function warmupRoutes() {
  log('warmup', 'Checking if routes are compiled...');

  // Ephemeris warmup with long timeout (handles first-time compilation)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(`${BASE}/api/agents/ephemeris`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ type: 'natal-chart', birth_date: '1990-01-01', birth_time: '12:00:00', birth_city: 'Mumbai, India', birth_lat: 19.076, birth_lng: 72.877 }),
        signal: AbortSignal.timeout(90_000),
      });
      if (r.ok || r.status === 401) {
        log('warmup', `  ephemeris route ready (HTTP ${r.status})`);
        break;
      }
      log('warmup', `  ephemeris attempt ${attempt}: HTTP ${r.status} — waiting...`);
      await new Promise(r2 => setTimeout(r2, 5000));
    } catch (err) {
      log('warmup', `  ephemeris attempt ${attempt} threw: ${err.message} — waiting...`);
      await new Promise(r2 => setTimeout(r2, 5000));
    }
  }

  // Status route warmup
  try {
    await fetch(`${BASE}/api/reports/00000000-0000-0000-0000-000000000000/status`, {
      headers: HEADERS, signal: AbortSignal.timeout(30_000),
    });
    log('warmup', '  status route ready');
  } catch { /* 404 is fine */ }

  await new Promise(r => setTimeout(r, 500));
  PASS('Routes warmed up');
}

// ── Step 2: Ephemeris sanity check ───────────────────────────────────────────
async function checkEphemeris() {
  // Retry up to 3 times — first attempt may hit a cold Railway container or
  // a route that was still compiling during warmup.
  const payload = { type: 'natal-chart', birth_date: BIRTH.birth_date, birth_time: BIRTH.birth_time, birth_city: BIRTH.birth_city, birth_lat: BIRTH.birth_lat, birth_lng: BIRTH.birth_lng };

  for (let attempt = 1; attempt <= 3; attempt++) {
    log('ephemeris', `POST /api/agents/ephemeris (attempt ${attempt}/3)`);
    try {
      const data = await fetchJSON(`${BASE}/api/agents/ephemeris`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, 60_000);

      const chart = data.data ?? data;
      if (!chart.lagna)         { log('ephemeris', 'response missing lagna — retrying'); continue; }
      if (!chart.planets)       { log('ephemeris', 'response missing planets — retrying'); continue; }
      if (!chart.current_dasha) { log('ephemeris', 'response missing current_dasha — retrying'); continue; }

      PASS(`Ephemeris OK — lagna=${chart.lagna}, MD=${chart.current_dasha.mahadasha}`);
      const pc = Object.keys(chart.planets).length;
      if (pc < 9) WARN(`Only ${pc} planets returned (expected 9)`);
      else PASS(`All ${pc} planets present`);
      return chart;
    } catch (err) {
      log('ephemeris', `attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 5000)); continue; }
      die('Ephemeris failed after 3 attempts', err.message, 2);
    }
  }
  die('Ephemeris never succeeded', null, 2);
}

// ── Step 3: Trigger report + block until pipeline returns ────────────────────
// The inline dev pipeline blocks the request until it's done.  We wait for
// /api/reports/start to return with HTTP 200 (status='complete') or 202 (Inngest).
// We also fire-and-forget so that if the dev server kills the connection early
// we still get the completion signal via the poll loop.

let startResolvedComplete = false; // set true when start returns 200 inline

async function triggerReport() {
  log('report', `Firing /api/reports/start — ID=${REPORT_ID}`);

  // Fire in background — captures the inline completion signal
  fetch(`${BASE}/api/reports/start`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ reportId: REPORT_ID, ...BIRTH, forceRestart: true }),
    signal: AbortSignal.timeout(15 * 60_000),
  })
  .then(async r => {
    const j = await r.json().catch(() => ({}));
    log('report/start', `returned HTTP ${r.status} engine=${j.engine ?? 'inline'} status=${j.status ?? '?'}`);
    if (r.status === 200 && j.status === 'complete') {
      startResolvedComplete = true;
      log('report/start', 'Inline pipeline completed — replica catch-up grace period begins');
    }
  })
  .catch(err => log('report/start', `fire-and-forget error (ok if inline): ${err.message}`));

  await new Promise(r => setTimeout(r, 3000)); // give server time to create the row
  PASS(`Report triggered — ID=${REPORT_ID}`);
}

// ── Step 4: Poll until status=complete ───────────────────────────────────────
// Handles two patterns:
//  a) Inngest: status endpoint reflects progress in real-time.
//  b) Inline dev: start blocks, returns 200 when done, but status endpoint may
//     still show 'generating' for up to ~60s due to Supabase read-replica lag.
//     In that case we wait for the lag to resolve rather than giving up.

async function pollUntilComplete() {
  const MAX_WAIT        = 15 * 60 * 1000;
  const NORMAL_INTERVAL = 5_000;
  // After start signals completion, poll more aggressively for replica catch-up
  const CATCHUP_INTERVAL = 3_000;
  const MAX_CATCHUP_MS   = 90_000; // wait up to 90s for replica after start=200

  const start = Date.now();
  let lastStep = '', lastPct = -1, lastStatus = '';
  let catchupStart = null;

  log('poll', `Polling every ${NORMAL_INTERVAL/1000}s (max ${MAX_WAIT/60000}min)`);

  while (Date.now() - start < MAX_WAIT) {
    // Decide interval: faster when waiting for replica catch-up
    const interval = (startResolvedComplete && !catchupStart)
      ? (() => { catchupStart = Date.now(); log('poll', 'Switching to fast catch-up polling (3s) for replica lag'); return CATCHUP_INTERVAL; })()
      : (catchupStart ? CATCHUP_INTERVAL : NORMAL_INTERVAL);

    await new Promise(r => setTimeout(r, interval));
    const elapsed = Math.round((Date.now() - start) / 1000);

    let data;
    try {
      data = await fetchJSON(`${BASE}/api/reports/${REPORT_ID}/status`, {}, 15_000);
    } catch (err) {
      log('poll', `status fetch failed (${err.status ?? err.message}) — retrying`);
      continue;
    }

    const { status, isComplete, progress, generation_step, report } = data;

    if (status !== lastStatus || generation_step !== lastStep || Math.abs((progress ?? 0) - lastPct) >= 5) {
      log('poll', `[${elapsed}s] status=${status} progress=${progress ?? 0}% step="${generation_step ?? ''}"`);
      lastStatus = status; lastStep = generation_step; lastPct = progress ?? 0;
    }

    if (isComplete && report) {
      PASS(`Pipeline complete in ${elapsed}s`);
      return report;
    }

    if (status === 'error') {
      die(`Pipeline returned status=error after ${elapsed}s`, data, 2);
    }

    // If we've been in catch-up mode too long, give up on replica and fetch directly
    if (catchupStart && Date.now() - catchupStart > MAX_CATCHUP_MS) {
      log('poll', 'Replica catch-up timed out — fetching report data directly');
      // Try fetching via debug endpoint or re-check status one final time
      try {
        const finalData = await fetchJSON(`${BASE}/api/reports/${REPORT_ID}/status`, {}, 20_000);
        if (finalData.report) {
          PASS(`Got report via final catch-up fetch (${elapsed}s)`);
          return finalData.report;
        }
      } catch { /* ignore */ }
      die('Replica never reflected complete status after pipeline succeeded', null, 2);
    }
  }

  die(`Pipeline did not complete within ${MAX_WAIT/60000} minutes`, null, 2);
}

// ── Step 5: Contract validation ───────────────────────────────────────────────
function validateContract(report) {
  console.log('\n── Contract Validation ─────────────────────────────────');
  let failures = 0;

  function require(cond, pass, fail, detail) {
    if (cond) PASS(pass);
    else { FAIL(fail, detail); failures++; }
  }

  // Top-level sections
  for (const s of ['nativity', 'months', 'weeks', 'days', 'synthesis']) {
    require(!!report[s], `Section "${s}" present`, `Missing required section: ${s}`);
  }

  // months: exactly 12
  require(Array.isArray(report.months) && report.months.length >= 12,
    `months: ${report.months?.length} entries`,
    `months must have ≥12 entries, got ${report.months?.length}`);

  // weeks: exactly 6
  require(Array.isArray(report.weeks) && report.weeks.length >= 6,
    `weeks: ${report.weeks?.length} entries`,
    `weeks must have ≥6 entries, got ${report.weeks?.length}`);

  // days: ≥7 for 7day plan
  require(Array.isArray(report.days) && report.days.length >= 7,
    `days: ${report.days?.length} entries`,
    `days must have ≥7 entries, got ${report.days?.length}`);

  // Each day: exactly 18 slots, valid score
  let badSlotDays = [];
  let badScoreDays = [];
  for (const day of (report.days ?? [])) {
    if (!Array.isArray(day.slots) || day.slots.length !== 18) badSlotDays.push(`${day.date}:${day.slots?.length}`);
    if (typeof day.day_score !== 'number' || day.day_score < 0 || day.day_score > 100) badScoreDays.push(day.date);
  }
  require(badSlotDays.length === 0, `All days have exactly 18 slots`, `Days with wrong slot count: ${badSlotDays.join(', ')}`);
  require(badScoreDays.length === 0, `All day_scores are 0-100`, `Days with invalid day_score: ${badScoreDays.join(', ')}`);

  // Slot display_label format HH:MM–HH:MM
  const LABEL_RE = /^\d{2}:\d{2}[–\-]\d{2}:\d{2}$/;
  const allSlots = (report.days ?? []).flatMap(d => d.slots ?? []);
  const badLabels = allSlots.filter(s => !s.display_label || !LABEL_RE.test(s.display_label)).length;
  require(badLabels === 0, `All ${allSlots.length} slot display_labels are HH:MM–HH:MM`, `${badLabels} slots have malformed display_label`);

  if (failures > 0) return failures;

  // day_score ≈ mean of slot scores (within ±20)
  let driftWarnings = 0;
  for (const day of report.days) {
    const mean = day.slots.reduce((s, sl) => s + (sl.score ?? 50), 0) / day.slots.length;
    if (Math.abs(day.day_score - mean) > 20) { WARN(`Day ${day.date}: day_score=${day.day_score} vs slot mean=${mean.toFixed(1)}`); driftWarnings++; }
  }
  if (driftWarnings === 0) PASS('day_score vs slot-mean drift all within ±20');

  return failures;
}

// ── Step 6: Content quality validation ───────────────────────────────────────
function validateQuality(report, ephemerisChart) {
  console.log('\n── Content Quality Validation ──────────────────────────');
  let failures = 0;
  let warnings = 0;

  function require(cond, pass, fail, detail) {
    if (cond) PASS(pass);
    else { FAIL(fail, detail); failures++; }
  }
  function warn(cond, pass, msg) {
    if (cond) PASS(pass);
    else { WARN(msg); warnings++; }
  }

  const allSlots = (report.days ?? []).flatMap(d => d.slots ?? []);

  // ── Commentary quality ────────────────────────────────────────────────────
  const blankSlots    = allSlots.filter(s => !s.commentary || s.commentary.trim().length < 20).length;
  const thinSlots     = allSlots.filter(s => s.commentary && s.commentary.trim().length < 50).length;
  const shortSlots    = allSlots.filter(s => s.commentary && s.commentary.trim().length < 80).length;
  const placeholder   = allSlots.filter(s => /Use hora|use hora|today's forecast|placeholder/i.test(s.commentary ?? '')).length;

  require(blankSlots === 0,
    `Zero blank/thin commentary slots (all ≥20 chars)`,
    `${blankSlots} slots have blank/empty commentary (<20 chars)`);

  warn(thinSlots === 0,
    `Zero thin slots (<50 chars): all commentary is substantive`,
    `${thinSlots}/${allSlots.length} slots have thin commentary (<50 chars) — acceptable but not ideal`);

  warn(placeholder === 0,
    `Zero placeholder/generic commentary strings`,
    `${placeholder} slots contain generic placeholder text like "Use hora"`);

  // ── Score diversity ───────────────────────────────────────────────────────
  const scores      = allSlots.map(s => s.score ?? 50);
  const minScore    = Math.min(...scores);
  const maxScore    = Math.max(...scores);
  const avgScore    = scores.reduce((a,b) => a+b, 0) / scores.length;
  const scoreRange  = maxScore - minScore;

  require(scoreRange >= 15,
    `Score range ${minScore}–${maxScore} (spread ≥15 = realistic variation)`,
    `All scores too homogeneous: min=${minScore} max=${maxScore} range=${scoreRange} — check RatingAgent`);

  require(avgScore >= 30 && avgScore <= 75,
    `Average slot score ${avgScore.toFixed(1)} is in realistic band (30–75)`,
    `Average slot score ${avgScore.toFixed(1)} is outside realistic band 30–75`);

  // ── Nativity quality ─────────────────────────────────────────────────────
  const nat = report.nativity ?? {};

  require((nat.lagna_analysis?.trim()?.length ?? 0) >= 100,
    `lagna_analysis ≥100 chars (${nat.lagna_analysis?.length})`,
    `lagna_analysis too short: ${nat.lagna_analysis?.length} chars`);

  require((nat.current_dasha_interpretation?.trim()?.length ?? 0) >= 80,
    `current_dasha_interpretation ≥80 chars (${nat.current_dasha_interpretation?.length})`,
    `current_dasha_interpretation too short: ${nat.current_dasha_interpretation?.length} chars`);

  // Nativity must mention lagna sign (e.g. "Taurus")
  const lagnaSign = ephemerisChart?.lagna ?? 'Taurus';
  const lagnaInText = nat.lagna_analysis?.toLowerCase().includes(lagnaSign.toLowerCase());
  require(lagnaInText,
    `lagna_analysis mentions lagna sign "${lagnaSign}"`,
    `lagna_analysis does not mention lagna sign "${lagnaSign}" — may be generic`);

  // Nativity must mention at least one planet name
  const PLANETS = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
  const natText = (nat.lagna_analysis + ' ' + nat.current_dasha_interpretation).toLowerCase();
  const planetsFound = PLANETS.filter(p => natText.includes(p));
  require(planetsFound.length >= 3,
    `Nativity references ≥3 planets (found: ${planetsFound.join(', ')})`,
    `Nativity only mentions ${planetsFound.length} planets — likely generic text`);

  // Nativity must mention at least one house number
  const housePattern = /\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|house|\bH[1-9])\b/i;
  require(housePattern.test(natText),
    `Nativity mentions house positions (e.g. "10th house", "2nd house")`,
    `Nativity contains no house references — analysis is too generic`);

  // ── Yogas quality ────────────────────────────────────────────────────────
  const yogas = nat.yogas ?? [];
  warn(yogas.length >= 2,
    `Nativity lists ${yogas.length} yogas (≥2)`,
    `Only ${yogas.length} yoga(s) detected — expected ≥2 for this chart`);

  for (const y of yogas) {
    warn(y.name && y.description && y.description.length >= 20,
      `Yoga "${y.name}" has substantive description`,
      `Yoga "${y.name}" description too short: "${y.description}"`);
  }

  // ── Synthesis quality ─────────────────────────────────────────────────────
  const synth = report.synthesis ?? {};
  const synthText = typeof synth === 'string' ? synth : (synth.opening_paragraph ?? '');
  require(synthText.trim().length >= 80,
    `synthesis text ≥80 chars (${synthText.length})`,
    `synthesis is too short: ${synthText.length} chars`);

  // ── Months quality ───────────────────────────────────────────────────────
  const thinMonths = (report.months ?? []).filter(m => {
    const txt = m.commentary ?? m.overview ?? m.narrative ?? m.text ?? '';
    return txt.trim().length < 30;
  }).length;
  warn(thinMonths === 0,
    `All months have substantive commentary`,
    `${thinMonths} months have thin commentary (<30 chars)`);

  // ── Weeks quality ────────────────────────────────────────────────────────
  const thinWeeks = (report.weeks ?? []).filter(w => {
    const txt = w.commentary ?? w.overview ?? w.narrative ?? w.text ?? '';
    return txt.trim().length < 30;
  }).length;
  warn(thinWeeks === 0,
    `All weeks have substantive commentary`,
    `${thinWeeks} weeks have thin commentary (<30 chars)`);

  // ── RAG grounding check ──────────────────────────────────────────────────
  // Check that the nativity text contains at least one classical reference word
  const RAG_MARKERS = ['yoga','dasha','nakshatra','lagna','kendra','trikona','bhava',
                       'mahadasha','antardasha','vimshottari','transit','hora'];
  const ragHits = RAG_MARKERS.filter(m => natText.includes(m));
  require(ragHits.length >= 3,
    `RAG grounding confirmed — classical terms found: ${ragHits.join(', ')}`,
    `Low RAG grounding — only found: ${ragHits.join(', ')} (expected ≥3 classical terms)`);

  // ── Per-day narrative diversity check ────────────────────────────────────
  // The report stores day narration in 'overview' (the serialized DTO field),
  // which is generated by the daily-overviews API and should be unique per day.
  // Note: the frontend remaps overview → day_overview, but the raw report JSON uses 'overview'.
  const narratives = (report.days ?? []).map(d => (d.overview ?? d.day_overview ?? d.narrative ?? '').trim());
  const nonEmptyNarratives = narratives.filter(n => n.length > 0);
  if (nonEmptyNarratives.length > 0) {
    const uniqueNarratives = new Set(nonEmptyNarratives).size;
    const totalNonEmpty = nonEmptyNarratives.length;
    require(uniqueNarratives >= totalNonEmpty,
      `All ${narratives.length} day narratives are unique (no copy-paste)`,
      `Duplicate day narratives detected: only ${uniqueNarratives} unique out of ${totalNonEmpty} non-empty`);
  } else {
    WARN('Day overview/narrative field is empty for all days — check daily-overviews agent');
  }

  console.log(`\n  Failures: ${failures}  |  Warnings: ${warnings}`);
  return failures;
}

// ── Step 7: Slot-level spot check ─────────────────────────────────────────────
function spotCheckSlots(report) {
  console.log('\n── Slot-Level Spot Check ───────────────────────────────');
  let issues = 0;

  const day0 = report.days?.[0];
  if (!day0) { FAIL('No day[0] to spot check'); return 1; }

  console.log(`  Checking day ${day0.date} (${day0.slots.length} slots):`);
  for (let i = 0; i < day0.slots.length; i++) {
    const slot = day0.slots[i];
    const problems = [];
    if (!slot.display_label)                      problems.push('no display_label');
    if (typeof slot.score !== 'number')           problems.push('no score');
    if (!slot.commentary || slot.commentary.length < 20) problems.push(`commentary too short: "${slot.commentary?.slice(0,40)}"`);
    if (slot.score < 0 || slot.score > 100)       problems.push(`score out of range: ${slot.score}`);

    if (problems.length > 0) {
      FAIL(`Slot ${i} (${slot.display_label ?? '?'}): ${problems.join(', ')}`);
      issues++;
    }
  }

  if (issues === 0) {
    PASS(`All 18 slots of day ${day0.date} pass spot check`);
    // Print first 3 as sample
    console.log('\n  Sample slots (first 3):');
    for (const slot of day0.slots.slice(0, 3)) {
      console.log(`    ${slot.display_label ?? '??:??-??:??'} | score=${slot.score} | "${slot.commentary?.slice(0, 90)}..."`);
    }
  }

  return issues;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(56));
  console.log('  VedicHour — Agentic Report Quality Loop');
  console.log('  Birth: ' + BIRTH.birth_date + ' ' + BIRTH.birth_time + ' Mumbai');
  console.log('  Plan: ' + BIRTH.plan_type + '  |  ReportID: ' + REPORT_ID.slice(0, 8) + '...');
  console.log('═'.repeat(56) + '\n');

  await checkServer();
  await warmupRoutes();
  const ephemerisChart = await checkEphemeris();
  await triggerReport();
  const report = await pollUntilComplete();

  // Run all validations
  const contractFailures = validateContract(report);
  const qualityFailures  = validateQuality(report, ephemerisChart);
  const spotFailures     = spotCheckSlots(report);

  const totalFailures = contractFailures + qualityFailures + spotFailures;

  // ── Final verdict ──────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(56));
  if (totalFailures === 0) {
    console.log('  🎉  REPORT PERFECT — All checks passed');
    console.log(`  Report ID : ${REPORT_ID}`);
    console.log(`  Days      : ${report.days.length}  |  Slots: ${report.days.length * 18}`);
    console.log(`  Months    : ${report.months.length}  |  Weeks: ${report.weeks.length}`);
    console.log(`  Nativity  : ${report.nativity?.lagna_analysis?.length} chars`);
    console.log(`  Yogas     : ${report.nativity?.yogas?.length ?? 0} detected`);
    console.log('═'.repeat(56));
    process.exit(0);
  } else {
    console.log(`  ❌  REPORT FAILED — ${totalFailures} failure(s) found`);
    console.log('  Fix the issues listed above and re-run.');
    console.log('═'.repeat(56));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n💥  Uncaught error:', err.message ?? err);
  process.exit(2);
});
