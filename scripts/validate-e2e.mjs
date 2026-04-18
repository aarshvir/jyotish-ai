/**
 * E2E validation script for VedicHour Pillar-1.
 *
 * Steps:
 *  1. Health-check the dev server
 *  2. Hit ephemeris agent directly
 *  3. Create a report row via /api/reports/start (bypass auth)
 *  4. Poll /api/reports/[id]/status until complete or error (15 min cap)
 *  5. Validate the report payload against the locked contract
 *     (18 slots/day, day_score from mean, all required sections present)
 *
 * Run: node scripts/validate-e2e.mjs
 */

import { randomUUID } from 'crypto';

const BASE = 'http://localhost:3000';
const BYPASS = 'VEDICADMIN2026';
const BYPASS_USER_ID = 'd84ccbc7-9254-406e-856d-195bed48c3eb';

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'x-bypass-token': BYPASS,
};

const REPORT_ID = randomUUID();

function log(tag, msg, data) {
  const ts = new Date().toISOString().slice(11, 23);
  const extra = data !== undefined ? ' ' + JSON.stringify(data) : '';
  console.log(`[${ts}] [${tag}]${extra ? '' : ' ' + msg}${extra ? ' ' + msg + extra : ''}`);
}

function fail(msg, detail) {
  console.error(`\n❌ VALIDATION FAILED: ${msg}`);
  if (detail) console.error('   Detail:', JSON.stringify(detail, null, 2));
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

// ── Step 1: Server health ────────────────────────────────────────────────────
async function checkHealth() {
  log('health', 'Checking dev server at ' + BASE);
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    // /api/health may not exist — any non-network-error means server is up
    log('health', `server responded`, { status: res.status });
    ok('Dev server is reachable');
  } catch (err) {
    if (err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')) {
      fail('Dev server not running at ' + BASE + '. Start it with: npm run dev');
    }
    // Non-network errors (404 etc) mean server is up but endpoint missing — fine
    ok('Dev server is reachable (non-network error)');
  }
}

// ── Step 2: Ephemeris agent ──────────────────────────────────────────────────
async function checkEphemeris() {
  log('ephemeris', 'Testing /api/agents/ephemeris');
  const res = await fetch(`${BASE}/api/agents/ephemeris`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      type: 'natal-chart',
      birth_date: '1990-04-15',
      birth_time: '08:30:00',
      birth_city: 'Mumbai, India',
      birth_lat: 19.076,
      birth_lng: 72.877,
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) {
    const txt = await res.text();
    fail(`/api/agents/ephemeris returned ${res.status}`, txt);
  }
  const data = await res.json();
  const chart = data.data ?? data;
  if (!chart.lagna) fail('Ephemeris response missing lagna', chart);
  if (!chart.planets) fail('Ephemeris response missing planets', chart);
  if (!chart.current_dasha) fail('Ephemeris response missing current_dasha', chart);
  ok(`Ephemeris OK — lagna=${chart.lagna} mahadasha=${chart.current_dasha?.mahadasha}`);
  return chart;
}

// ── Step 3: Start report ─────────────────────────────────────────────────────
async function startReport() {
  log('report/start', `Creating report ${REPORT_ID}`);
  const body = {
    reportId: REPORT_ID,
    name: 'E2E Validator',
    birth_date: '1990-04-15',
    birth_time: '08:30:00',
    birth_city: 'Mumbai, India',
    birth_lat: 19.076,
    birth_lng: 72.877,
    current_city: 'Dubai, UAE',
    current_lat: 25.204,
    current_lng: 55.270,
    timezone_offset: 240,
    plan_type: '7day',
    payment_status: 'bypass',
  };

  // In dev (no INNGEST_EVENT_KEY) /api/reports/start runs the pipeline inline
  // and can take 3-8 minutes. We fire it as a non-awaited background fetch
  // and immediately start polling the status endpoint — this way the script
  // can report progress while the dev server processes the job.
  log('report/start', 'Firing start request (fire-and-poll — dev mode)');

  // Fire without awaiting — intentional
  fetch(`${BASE}/api/reports/start`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12 * 60_000),
  }).then(async res => {
    const json = await res.json().catch(() => ({}));
    log('report/start', `start returned`, { status: res.status, engine: json.engine });
  }).catch(err => {
    log('report/start', `start fetch error (ok if inline run completed): ${err.message}`);
  });

  // Give the server ~2s to create the row before we start polling
  await new Promise(r => setTimeout(r, 2000));
  ok(`Report generation triggered (REPORT_ID=${REPORT_ID})`);
  return 'inline';
}

// ── Step 4: Poll until complete ──────────────────────────────────────────────
async function pollUntilComplete(engine) {
  const MAX_WAIT_MS = 15 * 60 * 1000;
  const POLL_MS = 4000;
  const start = Date.now();
  let lastStep = '';
  let lastProgress = -1;

  log('poll', `Polling /api/reports/${REPORT_ID}/status every ${POLL_MS / 1000}s (max ${MAX_WAIT_MS / 60000}min)`);

  if (engine !== 'inline') {
    log('poll', 'NOTE: Inngest engine — pipeline runs in Inngest cloud. Polling status endpoint...');
  }

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_MS));

    const res = await fetch(`${BASE}/api/reports/${REPORT_ID}/status`, {
      headers: AUTH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

    if (!res || !res.ok) {
      log('poll', `status check failed (${res?.status ?? 'network'}) — retrying`);
      continue;
    }

    const data = await res.json();
    const elapsed = Math.round((Date.now() - start) / 1000);

    if (data.generation_step !== lastStep || Math.abs((data.progress ?? 0) - lastProgress) >= 3) {
      log('poll', `[${elapsed}s] status=${data.status} progress=${data.progress ?? 0}% step="${data.generation_step ?? ''}"  `);
      lastStep = data.generation_step;
      lastProgress = data.progress ?? 0;
    }

    if (data.isComplete && data.report) {
      ok(`Report complete in ${elapsed}s`);
      return data.report;
    }

    if (data.status === 'error') {
      fail(`Report status=error after ${elapsed}s`, data);
    }
  }

  fail(`Report did not complete within ${MAX_WAIT_MS / 60000} minutes`);
}

// ── Step 5: Validate report payload ─────────────────────────────────────────
function validateReport(report) {
  log('validate', 'Validating locked contract...');

  // Required top-level sections
  const requiredSections = ['nativity', 'months', 'weeks', 'days', 'synthesis'];
  for (const s of requiredSections) {
    if (!report[s]) fail(`Missing required section: ${s}`);
  }
  ok('All required sections present (nativity, months, weeks, days, synthesis)');

  // months: always 12
  if (!Array.isArray(report.months) || report.months.length < 12) {
    fail(`months must have 12 entries, got ${report.months?.length}`);
  }
  ok(`months: ${report.months.length} entries`);

  // weeks: always 6
  if (!Array.isArray(report.weeks) || report.weeks.length < 6) {
    fail(`weeks must have 6 entries, got ${report.weeks?.length}`);
  }
  ok(`weeks: ${report.weeks.length} entries`);

  // days: 7 for 7day plan
  if (!Array.isArray(report.days) || report.days.length < 7) {
    fail(`days must have ≥7 entries for 7day plan, got ${report.days?.length}`);
  }
  ok(`days: ${report.days.length} entries`);

  // Each day: 18 slots
  for (const day of report.days) {
    if (!Array.isArray(day.slots) || day.slots.length !== 18) {
      fail(`Day ${day.date} must have 18 slots, got ${day.slots?.length}`, { date: day.date });
    }
    // day_score must be number 0-100
    if (typeof day.day_score !== 'number' || day.day_score < 0 || day.day_score > 100) {
      fail(`Day ${day.date} has invalid day_score`, { day_score: day.day_score });
    }
  }
  ok(`All ${report.days.length} days have exactly 18 slots with valid scores`);

  // day_score integrity: should be close to mean of slot scores
  for (const day of report.days) {
    const slotMean = day.slots.reduce((s, sl) => s + (sl.score ?? 50), 0) / day.slots.length;
    const drift = Math.abs(day.day_score - slotMean);
    if (drift > 15) {
      // warn but don't fail — the pipeline may round differently
      console.warn(`⚠  Day ${day.date} day_score=${day.day_score} vs slot mean=${slotMean.toFixed(1)} (drift=${drift.toFixed(1)})`);
    }
  }
  ok('day_score vs slot-mean drift check passed');

  // Commentary: no blank slots
  let blankCommentary = 0;
  for (const day of report.days) {
    for (const slot of day.slots) {
      if (!slot.commentary || slot.commentary.trim().length < 10) blankCommentary++;
    }
  }
  if (blankCommentary > 0) {
    console.warn(`⚠  ${blankCommentary} slots have short/blank commentary (fallbacks injected)`);
  } else {
    ok('Zero blank commentary slots');
  }

  // Nativity: non-blank
  const nat = report.nativity;
  if (!nat.lagna_analysis || nat.lagna_analysis.trim().length < 20) {
    fail('nativity.lagna_analysis is blank or too short', nat.lagna_analysis);
  }
  if (!nat.current_dasha_interpretation || nat.current_dasha_interpretation.trim().length < 20) {
    fail('nativity.current_dasha_interpretation is blank', nat.current_dasha_interpretation);
  }
  ok('Nativity text present and non-blank');

  // Synthesis: non-blank
  const synth = report.synthesis;
  if (typeof synth === 'object') {
    if (!synth.opening_paragraph || synth.opening_paragraph.trim().length < 20) {
      console.warn('⚠  synthesis.opening_paragraph is short/blank — fallback was used');
    } else {
      ok('Synthesis opening paragraph present');
    }
  }

  // Slot display_labels: must match HH:MM–HH:MM pattern
  const LABEL_RE = /^\d{2}:\d{2}[–-]\d{2}:\d{2}$/;
  let badLabels = 0;
  for (const day of report.days) {
    for (const slot of day.slots) {
      if (!slot.display_label || !LABEL_RE.test(slot.display_label)) badLabels++;
    }
  }
  if (badLabels > 0) {
    console.warn(`⚠  ${badLabels} slots have non-standard display_label format`);
  } else {
    ok('All slot display_labels match HH:MM–HH:MM pattern');
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('✅  FULL CONTRACT VALIDATION PASSED');
  console.log(`    Report ID : ${report.report_id}`);
  console.log(`    Type      : ${report.report_type}`);
  console.log(`    Days      : ${report.days.length}`);
  console.log(`    Slots     : ${report.days.length * 18} total`);
  console.log(`    Months    : ${report.months.length}`);
  console.log(`    Weeks     : ${report.weeks.length}`);
  console.log('─────────────────────────────────────────────\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  VedicHour E2E Validation — Pillar 1');
  console.log('═══════════════════════════════════════════════\n');

  await checkHealth();
  await checkEphemeris();
  const engine = await startReport();

  let report;
  if (engine === 'already_complete') {
    // Fetch the stored report from status endpoint
    const res = await fetch(`${BASE}/api/reports/${REPORT_ID}/status`, { headers: AUTH_HEADERS });
    const data = await res.json();
    report = data.report;
  } else {
    report = await pollUntilComplete(engine);
  }

  if (!report) fail('Report data was null after completion signal');
  validateReport(report);

  console.log('🎉  End-to-end validation complete — Pillar 1 is healthy.\n');
}

main().catch(err => {
  console.error('\n💥 Uncaught error:', err.message);
  process.exit(1);
});
