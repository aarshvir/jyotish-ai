/**
 * Retry loop: start report generation until one completes successfully (status API).
 * Mirrors the onboard ADMIN100 path: paid plan + payment_status "promo" (no Ziina).
 *
 * Prereqs:
 *   - Dev server: npm run dev  (or set E2E_BASE_URL)
 *   - BYPASS_SECRET in .env.local and pass via E2E_BYPASS, OR argv[2]
 *   - Optional: BYPASS_USER_ID=<your auth.users id> so rows appear on your dashboard
 *
 * Usage:
 *   node scripts/retry-aarsh-admin100-loop.mjs
 *   node scripts/retry-aarsh-admin100-loop.mjs http://localhost:3000 YOUR_BYPASS_SECRET
 *
 * Env (optional):
 *   E2E_BASE_URL, E2E_BYPASS, POLL_TIMEOUT_MS (default 20m), SLEEP_BETWEEN_MS (default 8s),
 *   MAX_ATTEMPTS (default 0 = unlimited; cap with e.g. 25)
 */

import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fetchJson, sleep } from './lib/e2e-http.mjs';

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

const BASE_URL = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const BYPASS = process.argv[3] || process.env.E2E_BYPASS || process.env.BYPASS_SECRET || '';
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS) || 20 * 60 * 1000;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5000;
const SLEEP_BETWEEN_MS = Number(process.env.SLEEP_BETWEEN_MS) || 8000;
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS) || 0;

/** Aarsh — 5 Jan 1991, 19:45 Lucknow; living Dubai (same shape as onboard → /api/reports/start). */
function buildPayload(reportId) {
  return {
    reportId,
    name: 'Aarsh',
    birth_date: '1991-01-05',
    birth_time: '19:45:00',
    birth_city: 'Lucknow, India',
    birth_lat: 26.8467,
    birth_lng: 80.9462,
    current_city: 'Dubai, UAE',
    current_lat: 25.2048,
    current_lng: 55.2708,
    timezone_offset: 240,
    plan_type: '7day',
    type: '7day',
    payment_status: 'promo',
    promoCode: 'ADMIN100',
    forceRestart: true,
  };
}

const HEADERS = {
  'Content-Type': 'application/json',
  ...(BYPASS ? { 'x-bypass-token': BYPASS } : {}),
};

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

async function fetchGenerationLog(reportId) {
  try {
    const r = await fetchJson(`${BASE_URL}/api/reports/${reportId}/generation-log`, {
      method: 'GET',
      headers: HEADERS,
      timeoutMs: 25_000,
    });
    if (r.status !== 200) return { ok: false, body: r.body };
    return { ok: true, body: r.body };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function summarizeLog(body) {
  const entries = Array.isArray(body?.entries) ? body.entries : [];
  if (!entries.length) return '(no log entries)';
  return entries
    .slice(-15)
    .map((e) => `  [${e.level}] ${e.step}: ${e.message}`)
    .join('\n');
}

async function pollUntilSettled(reportId) {
  const t0 = Date.now();
  let lastStep = '';
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    let pollRes;
    try {
      pollRes = await fetchJson(`${BASE_URL}/api/reports/${reportId}/status`, {
        headers: HEADERS,
        timeoutMs: 25_000,
      });
    } catch (e) {
      log('poll error (retry):', e.message);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (pollRes.status !== 200) {
      log('poll HTTP', pollRes.status, JSON.stringify(pollRes.body).slice(0, 500));
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const d = pollRes.body;
    const step = d.generation_step || '';
    const pct = typeof d.progress === 'number' ? d.progress : '?';
    if (step && step !== lastStep) {
      log(`  [${pct}%] ${step}`);
      lastStep = step;
    }

    if (d.status === 'error') {
      return { outcome: 'error', detail: d };
    }
    if (d.status === 'complete' && d.report && Array.isArray(d.report.days) && d.report.days.length > 0) {
      return { outcome: 'complete', detail: d };
    }
    if (d.status === 'complete' && (!d.report || !Array.isArray(d.report.days) || d.report.days.length === 0)) {
      log('status complete but missing days — keep polling');
    }

    await sleep(POLL_INTERVAL_MS);
  }
  return { outcome: 'timeout' };
}

async function main() {
  if (!BYPASS) {
    console.error('Set BYPASS_SECRET in .env.local or pass bypass as second CLI arg.');
    process.exit(1);
  }

  log('Base URL:', BASE_URL);
  log('ADMIN100-style payload (promo payment_status). Ctrl+C to stop.');
  if (process.env.BYPASS_USER_ID) {
    log('BYPASS_USER_ID is set — reports should attach to that user for dashboard.');
  } else {
    log('Tip: set BYPASS_USER_ID to your Supabase user UUID to see these reports on your dashboard.');
  }

  let attempt = 0;
  while (true) {
    attempt += 1;
    if (MAX_ATTEMPTS > 0 && attempt > MAX_ATTEMPTS) {
      log(`Stopped after ${MAX_ATTEMPTS} attempts (MAX_ATTEMPTS).`);
      process.exit(1);
    }

    const reportId = randomUUID();
    log(`\n── Attempt ${attempt} reportId=${reportId} ──`);

    let startRes;
    try {
      startRes = await fetchJson(`${BASE_URL}/api/reports/start`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(buildPayload(reportId)),
        timeoutMs: 330_000,
      });
    } catch (e) {
      log('POST /api/reports/start failed:', e.message);
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }

    const startBody = startRes.body;
    const startSnippet =
      typeof startBody === 'string'
        ? startBody.slice(0, 120)
        : JSON.stringify(startBody || {}).slice(0, 400);
    log('start HTTP', startRes.status, startSnippet);
    if (typeof startBody === 'string' && startBody.includes('<!DOCTYPE')) {
      log('  (response is HTML — route crashed or wrong URL; check `npm run dev` terminal for stack trace)');
    }

    if (startRes.status === 429 || startRes.status === 503) {
      await sleep(SLEEP_BETWEEN_MS * 2);
      continue;
    }
    if (startRes.status >= 500 && startRes.status !== 503) {
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }

    const settled = await pollUntilSettled(reportId);

    if (settled.outcome === 'complete') {
      log('\nSUCCESS — report complete with day data.');
      log('Open:', `${BASE_URL}/report/${reportId}`);
      process.exit(0);
    }

    log(`Outcome: ${settled.outcome}`);
    const gl = await fetchGenerationLog(reportId);
    if (gl.ok) {
      log('Last pipeline log lines:\n', summarizeLog(gl.body));
    } else {
      log('generation-log:', gl.error || gl.body);
    }
    if (settled.outcome === 'error' && settled.detail) {
      log('generation_error:', settled.detail.generation_error || settled.detail.report?.error || '');
    }

    log(`Sleeping ${SLEEP_BETWEEN_MS}ms before next attempt…`);
    await sleep(SLEEP_BETWEEN_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
