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
 *
 * BRD validation: scripts/lib/validate-report-brd.mjs (shared with
 * test-report-e2e-matrix.mjs). Agent roles + bounded loops: see matrix script header.
 */

import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fetchJson, sleep } from './lib/e2e-http.mjs';
import {
  validateReport,
  REQUIRED_DAYS,
  REQUIRED_SLOTS,
  REQUIRED_MONTHS,
  REQUIRED_WEEKS,
} from './lib/validate-report-brd.mjs';

// ── Env Loader (Manual .env.local parsing) ───────────────────────────────────
const envPath = resolve('.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL   = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const BYPASS     = process.argv[3] || process.env.E2E_BYPASS   || process.env.BYPASS_SECRET || '';
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
    if (startRes.body?.engine === 'inngest') {
      log(`  Dispatched to Inngest — will poll status.`);
    } else {
      // skippedPipeline — row was too young / already generating
      warning(`Got 202 (skippedPipeline). Report row already generating — will poll status instead.`);
    }
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

  // weeks — commentary/synthesis text
  const emptyWeeks = (report?.weeks || []).filter((w) => !w.commentary?.trim() && !w.synthesis?.trim());
  emptyWeeks.length === 0
    ? ok(`All ${REQUIRED_WEEKS} weeks have commentary`)
    : warning(`${emptyWeeks.length} weeks have empty commentary`);

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
