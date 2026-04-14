/**
 * End-to-end report generation test agent.
 *
 * Usage:
 *   node scripts/test-report-e2e.mjs [BASE_URL] [BYPASS_SECRET]
 *
 * Or via env vars:
 *   E2E_BASE_URL=https://www.vedichour.com E2E_BYPASS=your_secret node scripts/test-report-e2e.mjs
 *
 * The script:
 *   1. Creates a fresh report UUID
 *   2. POSTs to /api/reports/start  (waits up to 330s for response)
 *   3. Polls /api/reports/[id]/status until complete or error
 *   4. Runs full BRD structural + semantic validation on the output
 *   5. Prints a detailed pass/fail report and exits 0 (pass) or 1 (fail)
 */

import { randomUUID } from 'crypto';
import https from 'https';
import http from 'http';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL   = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const BYPASS     = process.argv[3] || process.env.E2E_BYPASS   || '';
const REPORT_ID  = randomUUID();

// Test natal data — a well-known chart (generic, not a real person)
const TEST_INPUT = {
  reportId:       REPORT_ID,
  name:           'E2E Test User',
  birth_date:     '1990-06-15',
  birth_time:     '08:30:00',
  birth_city:     'Mumbai',
  birth_lat:      '19.0760',
  birth_lng:      '72.8777',
  current_city:   'Mumbai',
  current_lat:    '19.0760',
  current_lng:    '72.8777',
  timezone_offset: 330,  // IST = UTC+5:30
  plan_type:      '7day',
  payment_status: 'bypass',
  forceRestart:   true,
};

const HEADERS = {
  'Content-Type': 'application/json',
  ...(BYPASS ? { 'x-bypass-token': BYPASS } : {}),
};

// ── BRD thresholds ────────────────────────────────────────────────────────────
const REQUIRED_DAYS   = 7;
const REQUIRED_SLOTS  = 18;
const REQUIRED_MONTHS = 12;
const REQUIRED_WEEKS  = 6;
const MIN_COMMENTARY_CHARS = 40;
const MAX_FALLBACK_REPETITION_RATE = 0.5; // >50% identical → fallback leak
const MAX_DAY_SCORE_DRIFT = 2; // day_score allowed to differ from slot mean by ±2

// ── HTTP helper ───────────────────────────────────────────────────────────────
function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const body = opts.body ? Buffer.from(opts.body) : null;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: opts.method || 'GET',
        headers: {
          ...(opts.headers || {}),
          ...(body ? { 'Content-Length': body.length } : {}),
        },
        timeout: opts.timeoutMs || 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      },
    );
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out: ${url}`)); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Validation ────────────────────────────────────────────────────────────────

function validateReport(report) {
  const errors   = [];
  const warnings = [];

  function err(msg) { errors.push(msg); }
  function warn(msg) { warnings.push(msg); }

  // ── Top-level shape ────────────────────────────────────────────────────────
  if (!report || typeof report !== 'object') { err('report is null or not an object'); return { errors, warnings }; }

  // ── nativity ──────────────────────────────────────────────────────────────
  if (!report.nativity) {
    err('nativity section missing');
  } else {
    if (!report.nativity.lagna_analysis?.trim()) err('nativity.lagna_analysis is empty');
    else if (report.nativity.lagna_analysis.trim().length < MIN_COMMENTARY_CHARS)
      warn(`nativity.lagna_analysis very short (${report.nativity.lagna_analysis.trim().length} chars)`);

    if (!report.nativity.current_dasha_interpretation?.trim()) err('nativity.current_dasha_interpretation is empty');
  }

  // ── synthesis ─────────────────────────────────────────────────────────────
  if (!report.synthesis) {
    err('synthesis section missing');
  } else {
    if (!report.synthesis.opening_paragraph?.trim()) err('synthesis.opening_paragraph is empty');
  }

  // ── months[12] ────────────────────────────────────────────────────────────
  if (!Array.isArray(report.months)) {
    err('months is not an array');
  } else if (report.months.length !== REQUIRED_MONTHS) {
    err(`months: expected ${REQUIRED_MONTHS}, got ${report.months.length}`);
  } else {
    report.months.forEach((m, i) => {
      if (!m.month?.trim())      err(`months[${i}]: month label empty`);
      if (typeof m.score !== 'number') err(`months[${i}]: score missing`);
      if (!m.commentary?.trim()) err(`months[${i}]: commentary empty`);
      else if (m.commentary.includes('generating — refresh'))
        warn(`months[${i}]: still shows fallback placeholder text`);
    });
  }

  // ── weeks[6] ─────────────────────────────────────────────────────────────
  if (!Array.isArray(report.weeks)) {
    err('weeks is not an array');
  } else if (report.weeks.length !== REQUIRED_WEEKS) {
    err(`weeks: expected ${REQUIRED_WEEKS}, got ${report.weeks.length}`);
  } else {
    report.weeks.forEach((w, i) => {
      if (!w.week_label?.trim())  err(`weeks[${i}]: week_label empty`);
      if (typeof w.score !== 'number') err(`weeks[${i}]: score missing`);
      if (!w.synthesis?.trim())   warn(`weeks[${i}]: synthesis text empty`);
    });
  }

  // ── days ──────────────────────────────────────────────────────────────────
  if (!Array.isArray(report.days) || report.days.length === 0) {
    err('days array is empty or missing');
  } else {
    if (report.days.length !== REQUIRED_DAYS)
      warn(`days: expected ${REQUIRED_DAYS}, got ${report.days.length}`);

    report.days.forEach((day, di) => {
      const dp = `days[${di}] (${day.date ?? '?'})`;

      if (!day.date?.match(/^\d{4}-\d{2}-\d{2}$/)) err(`${dp}: date invalid "${day.date}"`);
      if (!day.overview?.trim())                    err(`${dp}: overview empty`);
      if (typeof day.day_score !== 'number')        err(`${dp}: day_score missing`);

      // ── slots ──────────────────────────────────────────────────────────────
      if (!Array.isArray(day.slots)) {
        err(`${dp}: slots missing`);
        return;
      }
      if (day.slots.length !== REQUIRED_SLOTS)
        err(`${dp}: expected ${REQUIRED_SLOTS} slots, got ${day.slots.length}`);

      // Day score ≈ mean of slot scores
      if (day.slots.length === REQUIRED_SLOTS) {
        const mean = day.slots.reduce((s, sl) => s + (sl.score ?? 0), 0) / REQUIRED_SLOTS;
        const drift = Math.abs(day.day_score - Math.round(mean));
        if (drift > MAX_DAY_SCORE_DRIFT)
          warn(`${dp}: day_score ${day.day_score} drifts ${drift}pts from slot mean (${mean.toFixed(1)})`);
      }

      // Fallback repetition check
      const coms = day.slots.map((s) => (s.commentary ?? '').trim()).filter(Boolean);
      if (coms.length >= 3) {
        const unique = new Set(coms);
        const repRate = 1 - unique.size / coms.length;
        if (repRate > MAX_FALLBACK_REPETITION_RATE)
          warn(`${dp}: ${Math.round(repRate * 100)}% of slot commentaries are identical — fallback leak`);
      }

      day.slots.forEach((slot, si) => {
        const sp = `${dp} slot[${si}]`;

        if (slot.slot_index !== si)      err(`${sp}: slot_index ${slot.slot_index} !== ${si}`);
        if (!slot.display_label?.trim()) err(`${sp}: display_label empty`);

        if (!slot.commentary?.trim())
          err(`${sp}: commentary empty`);
        else if (slot.commentary.trim().length < MIN_COMMENTARY_CHARS)
          warn(`${sp}: commentary very short (${slot.commentary.trim().length} chars)`);

        if (!slot.commentary_short?.trim())
          warn(`${sp}: commentary_short empty`);

        if (typeof slot.score !== 'number') err(`${sp}: score missing`);

        // ISO timestamps
        const validStart = slot.start_iso && !isNaN(Date.parse(slot.start_iso));
        const validEnd   = slot.end_iso   && !isNaN(Date.parse(slot.end_iso));
        if (!validStart) err(`${sp}: start_iso invalid "${slot.start_iso}"`);
        if (!validEnd)   err(`${sp}: end_iso invalid "${slot.end_iso}"`);
        if (validStart && validEnd && Date.parse(slot.end_iso) <= Date.parse(slot.start_iso))
          err(`${sp}: end_iso not after start_iso`);

        // Rahu Kaal semantic check
        if (slot.is_rahu_kaal) {
          const c = (slot.commentary ?? '').toLowerCase();
          const initiationMatch = c.match(/\b(start|launch|sign|commit|initiate|begin new)\b/);
          if (initiationMatch) {
            const before = c.slice(Math.max(0, (c.indexOf(initiationMatch[0])) - 30), c.indexOf(initiationMatch[0]));
            if (!/\b(do not|don't|avoid|never|stop)\b/.test(before))
              warn(`${sp}: Rahu Kaal slot recommends initiation without negation ("${initiationMatch[0]}")`);
          }
        }

        // Score-label consistency
        if (slot.label) {
          const s = slot.score ?? 0;
          const rk = !!slot.is_rahu_kaal;
          const expected =
            rk ? 'Avoid' :
            s >= 85 ? 'Peak' :
            s >= 75 ? 'Excellent' :
            s >= 60 ? 'Good' :
            s >= 50 ? 'Neutral' :
            s >= 40 ? 'Caution' :
            s >= 25 ? 'Difficult' : 'Avoid';
          if (slot.label !== expected)
            warn(`${sp}: label "${slot.label}" doesn't match expected "${expected}" for score ${s}`);
        }
      });
    });
  }

  return { errors, warnings };
}

// ── Logging helpers ────────────────────────────────────────────────────────────

const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function log(msg)        { console.log(msg); }
function ok(msg)         { console.log(`${GREEN}  PASS${RESET} ${msg}`); }
function fail(msg)       { console.log(`${RED}  FAIL${RESET} ${msg}`); }
function warning(msg)    { console.log(`${YELLOW}  WARN${RESET} ${msg}`); }
function section(title)  { console.log(`\n${BOLD}${CYAN}=== ${title} ===${RESET}`); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log(`${BOLD}VedicHour E2E Report Test Agent${RESET}`);
  log(`  Base URL:  ${BASE_URL}`);
  log(`  Report ID: ${REPORT_ID}`);
  log(`  Bypass:    ${BYPASS ? '*** (set)' : '(not set — will need auth cookie)'}`);
  log(`  Input:     ${TEST_INPUT.name} | ${TEST_INPUT.birth_date} ${TEST_INPUT.birth_time} | ${TEST_INPUT.birth_city}`);

  if (!BYPASS) {
    console.error(`\n${RED}ERROR: No bypass secret. Set E2E_BYPASS env var or pass as second argument.${RESET}`);
    process.exit(1);
  }

  // ── Step 1: POST /api/reports/start ────────────────────────────────────────
  section('Step 1 — Trigger report generation');
  log(`  POST ${BASE_URL}/api/reports/start`);
  log(`  (pipeline runs inline — may take up to 5 min, timeout set to 330s)`);

  const startT = Date.now();
  let startRes;
  try {
    startRes = await fetchJson(`${BASE_URL}/api/reports/start`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(TEST_INPUT),
      timeoutMs: 330_000,
    });
  } catch (e) {
    fail(`/api/reports/start request failed: ${e.message}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startT) / 1000).toFixed(1);
  log(`  Response: HTTP ${startRes.status} in ${elapsed}s`);

  if (startRes.status === 202) {
    // skippedPipeline — row was too young
    warning(`Got 202 (skippedPipeline). Report row already generating — will poll status instead.`);
  } else if (startRes.status === 200) {
    const s = startRes.body?.status;
    if (s === 'complete') {
      ok(`/api/reports/start returned 200 status=complete in ${elapsed}s`);
    } else if (s === 'complete' && startRes.body?.skipped) {
      ok(`Report already exists and is complete (skipped re-generation)`);
    } else {
      warning(`Unexpected body from start: ${JSON.stringify(startRes.body)}`);
    }
  } else if (startRes.status >= 500) {
    fail(`/api/reports/start returned ${startRes.status}: ${JSON.stringify(startRes.body)}`);
    process.exit(1);
  }

  // ── Step 2: Poll /api/reports/[id]/status ────────────────────────────────
  section('Step 2 — Poll for completion');
  const POLL_INTERVAL_MS = 5000;
  const POLL_TIMEOUT_MS  = 15 * 60 * 1000; // 15 min (inline pipeline already ran, this is just for safety)
  const pollStart = Date.now();
  let finalReport = null;
  let lastStep = '';

  // If start already returned complete + report, skip polling
  if (startRes.status === 200 && startRes.body?.status === 'complete') {
    log(`  Pipeline already finished — fetching status to get report_data`);
  }

  while (true) {
    const pollElapsed = Date.now() - pollStart;
    if (pollElapsed > POLL_TIMEOUT_MS) {
      fail(`Poll timed out after ${Math.round(pollElapsed/1000)}s — report stuck`);
      process.exit(1);
    }

    let pollRes;
    try {
      pollRes = await fetchJson(
        `${BASE_URL}/api/reports/${REPORT_ID}/status`,
        { headers: HEADERS, timeoutMs: 20_000 },
      );
    } catch (e) {
      warning(`Poll request failed (will retry): ${e.message}`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (pollRes.status !== 200) {
      fail(`Status poll returned HTTP ${pollRes.status}: ${JSON.stringify(pollRes.body)}`);
      process.exit(1);
    }

    const d = pollRes.body;
    const step = d.generation_step || '';
    const pct  = typeof d.progress === 'number' ? d.progress : '?';

    if (step && step !== lastStep) {
      log(`  [${pct}%] ${step}`);
      lastStep = step;
    }

    if (d.status === 'error') {
      fail(`Report entered error status: ${JSON.stringify(d)}`);
      process.exit(1);
    }

    if (d.status === 'complete' && d.report) {
      ok(`Report complete! Polled for ${Math.round(pollElapsed / 1000)}s`);
      finalReport = d.report;
      break;
    }

    // If start returned 200 complete but status poll doesn't have report yet, try once more
    if (d.status === 'complete' && !d.report) {
      warning(`status=complete but report_data null in poll response — retrying once`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // ── Step 3: Structural + semantic validation ──────────────────────────────
  section('Step 3 — BRD structural validation');

  const { errors, warnings: warns } = validateReport(finalReport);

  // Count stats
  let totalSlots = 0, emptyCommentary = 0, rahuKaalSlots = 0;
  if (Array.isArray(finalReport?.days)) {
    for (const day of finalReport.days) {
      for (const slot of (day.slots || [])) {
        totalSlots++;
        if (!slot.commentary?.trim()) emptyCommentary++;
        if (slot.is_rahu_kaal) rahuKaalSlots++;
      }
    }
  }

  // Print errors
  if (errors.length === 0) {
    ok(`0 structural errors — all BRD sections present and valid`);
  } else {
    errors.forEach((e) => fail(e));
  }

  section('Step 4 — Semantic / quality checks');
  if (warns.length === 0) {
    ok(`0 semantic warnings`);
  } else {
    warns.forEach((w) => warning(w));
  }

  // ── Step 5: Content spot-checks ───────────────────────────────────────────
  section('Step 5 — Content spot-checks');

  const report = finalReport;

  // nativity
  if (report?.nativity?.lagna_analysis) {
    const l = report.nativity.lagna_analysis.trim().length;
    l >= 100 ? ok(`nativity.lagna_analysis: ${l} chars`) : warning(`nativity.lagna_analysis: only ${l} chars`);
  }

  // months — check no month is all-fallback
  const fallbackMonths = (report?.months || []).filter((m) => m.commentary?.includes('generating — refresh'));
  fallbackMonths.length === 0
    ? ok(`All ${REQUIRED_MONTHS} months have non-fallback commentary`)
    : warning(`${fallbackMonths.length} months still show fallback placeholder`);

  // weeks — synthesis text
  const emptyWeeks = (report?.weeks || []).filter((w) => !w.synthesis?.trim());
  emptyWeeks.length === 0
    ? ok(`All ${REQUIRED_WEEKS} weeks have synthesis text`)
    : warning(`${emptyWeeks.length} weeks have empty synthesis`);

  // slots
  ok(`Total slots: ${totalSlots} (expected ${REQUIRED_DAYS * REQUIRED_SLOTS})`);
  emptyCommentary === 0
    ? ok(`No empty slot commentaries`)
    : fail(`${emptyCommentary} slots have empty commentary`);
  ok(`Rahu Kaal slots detected: ${rahuKaalSlots}`);

  // Day scores
  const dayScores = (report?.days || []).map((d) => d.day_score).filter((s) => typeof s === 'number');
  const allDefault = dayScores.length > 0 && dayScores.every((s) => s === 50);
  allDefault
    ? fail(`All day_scores are exactly 50 — generation likely failed to compute real scores`)
    : ok(`day_scores vary (${dayScores.join(', ')})`);

  // synthesis
  const synLen = report?.synthesis?.opening_paragraph?.trim().length ?? 0;
  synLen >= 80
    ? ok(`synthesis.opening_paragraph: ${synLen} chars`)
    : (synLen > 0 ? warning(`synthesis.opening_paragraph: only ${synLen} chars`) : fail('synthesis.opening_paragraph empty'));

  // ISO timestamps on first day first slot
  const firstSlot = report?.days?.[0]?.slots?.[0];
  if (firstSlot?.start_iso && firstSlot?.end_iso) {
    ok(`Slot ISO timestamps present (${firstSlot.start_iso} → ${firstSlot.end_iso})`);
  } else {
    fail(`First slot missing ISO timestamps`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  section('SUMMARY');
  const totalPipelineTime = ((Date.now() - startT) / 1000).toFixed(1);
  log(`  Report ID:      ${REPORT_ID}`);
  log(`  Total time:     ${totalPipelineTime}s`);
  log(`  Structural errors:  ${errors.length}`);
  log(`  Semantic warnings:  ${warns.length}`);

  if (errors.length === 0) {
    log(`\n${GREEN}${BOLD}  ALL CHECKS PASSED${RESET}`);
    process.exit(0);
  } else {
    log(`\n${RED}${BOLD}  ${errors.length} STRUCTURAL ERROR(S) — see above${RESET}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`\x1b[31mFatal error:\x1b[0m`, e);
  process.exit(1);
});
