/**
 * Agentic E2E matrix — parallel scenarios, bounded retries, one consolidated report.
 *
 * ## Five roles (process contract; same repo tools)
 * 1. Pipeline cartographer — map env: E2E_BASE_URL, E2E_BYPASS (or BYPASS_SECRET), ANTHROPIC_API_KEY,
 *    INNGEST_EVENT_KEY (optional), ephemeris reachable, Supabase. Surfaces: POST /api/reports/start,
 *    GET /api/reports/:id/status. Phases live in src/lib/reports/orchestrator.ts (Inngest DAG in
 *    src/lib/inngest/functions.ts).
 * 2. E2E runner — this script: runs multiple birth/location scenarios in parallel (concurrency cap),
 *    each with per-scenario retries (sequential backoff), then validateReport from validate-report-brd.mjs.
 * 3. Failure triage — on fail: classify timeout vs HTTP vs BRD validation; print reportId + first errors.
 * 4. Fix agent — human/Cursor implements minimal fix; re-run matrix.
 * 5. Regression guard — npm run test:regression (tsc, lint, vitest).
 *
 * Loops are bounded: MAX_RETRIES_PER_SCENARIO (default 3), CONCURRENCY (default 2). No infinite loops.
 *
 * Usage:
 *   E2E_BYPASS=secret node scripts/test-report-e2e-matrix.mjs [BASE_URL]
 *   E2E_CONCURRENCY=3 E2E_MAX_RETRIES=2 node scripts/test-report-e2e-matrix.mjs
 */

import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { validateReport } from './lib/validate-report-brd.mjs';
import { runReportUntilComplete } from './lib/e2e-pipeline.mjs';

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

const BASE = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const BYPASS = process.env.E2E_BYPASS || process.env.BYPASS_SECRET || '';
const CONCURRENCY = Math.max(1, parseInt(String(process.env.E2E_CONCURRENCY || '2'), 10) || 2);
const MAX_RETRIES = Math.max(1, parseInt(String(process.env.E2E_MAX_RETRIES || '3'), 10) || 3);
const RETRY_BACKOFF_MS = 5000;

const HEADERS = {
  'Content-Type': 'application/json',
  ...(BYPASS ? { 'x-bypass-token': BYPASS } : {}),
};

function baseInput(overrides) {
  return {
    name: 'E2E Matrix User',
    birth_date: '1990-06-15',
    birth_time: '08:30:00',
    birth_city: 'Mumbai',
    birth_lat: '19.0760',
    birth_lng: '72.8777',
    current_city: 'Mumbai',
    current_lat: '19.0760',
    current_lng: '72.8777',
    timezone_offset: 330,
    plan_type: '7day',
    payment_status: 'bypass',
    forceRestart: true,
    ...overrides,
  };
}

const SCENARIOS = [
  { id: 'in-ist-7d', label: 'IST Mumbai 7-day (baseline)', makeBody: () => baseInput({}) },
  {
    id: 'us-est-7d',
    label: 'US Eastern offset, NYC current location',
    makeBody: () =>
      baseInput({
        timezone_offset: -300,
        current_city: 'New York',
        current_lat: '40.7128',
        current_lng: '-74.0060',
      }),
  },
  {
    id: 'preview-plan',
    label: 'Plan type free/preview',
    makeBody: () => baseInput({ plan_type: 'free' }),
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runScenario(sc) {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const reportId = randomUUID();
    const body = { reportId, ...sc.makeBody() };
    try {
      const { report, pollSeconds } = await runReportUntilComplete(BASE, HEADERS, body);
      const { errors, warnings } = validateReport(report);
      return {
        id: sc.id,
        label: sc.label,
        reportId,
        ok: errors.length === 0,
        errors,
        warnings,
        pollSeconds,
        attempts: attempt,
      };
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
        continue;
      }
    }
  }
  return {
    id: sc.id,
    label: sc.label,
    ok: false,
    errors: [String(lastErr?.message ?? lastErr)],
    warnings: [],
    reportId: null,
    pollSeconds: 0,
    attempts: MAX_RETRIES,
  };
}

async function poolMap(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!BYPASS) {
    console.error('E2E_BYPASS or BYPASS_SECRET is required (same as test-report-e2e.mjs).');
    process.exit(1);
  }

  console.log(`E2E matrix  base=${BASE}  concurrency=${CONCURRENCY}  maxRetries=${MAX_RETRIES}`);
  const results = await poolMap(SCENARIOS, CONCURRENCY, runScenario);

  let allOk = true;
  for (const r of results) {
    const st = r.ok ? 'PASS' : 'FAIL';
    console.log(`\n[${st}] ${r.id} — ${r.label}`);
    console.log(`  reportId: ${r.reportId ?? 'n/a'}  poll: ${r.pollSeconds}s  attempts: ${r.attempts}`);
    if (r.errors.length) {
      allOk = false;
      r.errors.forEach((e) => console.log(`  error: ${e}`));
    }
    if (r.warnings.length) {
      r.warnings.slice(0, 8).forEach((w) => console.log(`  warn: ${w}`));
      if (r.warnings.length > 8) console.log(`  ... ${r.warnings.length - 8} more warnings`);
    }
  }

  console.log(`\n=== SUMMARY: ${allOk ? 'ALL PASSED' : 'SOME FAILED'} ===`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
