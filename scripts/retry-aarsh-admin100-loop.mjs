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
 *   E2E_BASE_URL, E2E_BYPASS, POLL_TIMEOUT_MS (default 120m), SLEEP_BETWEEN_MS (default 12s),
 *   MAX_ATTEMPTS (default 0 = unlimited; cap with e.g. 25)
 *   MAX_WALL_TIME_MS (default 0 = no wall-clock limit; e.g. 10800000 for 3h)
 */

import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fetchJson, sleep } from './lib/e2e-http.mjs';
import { validateReport } from './lib/validate-report-brd.mjs';

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
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS) || 120 * 60 * 1000;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5000;
const SLEEP_BETWEEN_MS = Number(process.env.SLEEP_BETWEEN_MS) || 12_000;
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS) || 0;
const MAX_WALL_TIME_MS = Number(process.env.MAX_WALL_TIME_MS) || 0;

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

function sleepWithJitter(baseMs) {
  const j = baseMs + Math.floor(Math.random() * 2000);
  return sleep(j);
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
    if (d.status === 'complete') {
      const days = d.report?.days;
      if (Array.isArray(days) && days.length > 0) {
        return { outcome: 'complete', detail: d };
      }
      log('status complete but report.days missing in payload — keep polling (PostgREST lag?)');
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

  const wallStart = Date.now();

  log('Base URL:', BASE_URL);
  log('ADMIN100-style payload (promo payment_status). Ctrl+C to stop.');
  if (MAX_WALL_TIME_MS > 0) {
    log(`MAX_WALL_TIME_MS=${MAX_WALL_TIME_MS} (will exit 1 if exceeded)`);
  }
  if (process.env.BYPASS_USER_ID) {
    log('BYPASS_USER_ID is set — reports should attach to that user for dashboard.');
  } else {
    log('Tip: set BYPASS_USER_ID to your Supabase user UUID to see these reports on your dashboard.');
  }

  let attempt = 0;
  while (true) {
    if (MAX_WALL_TIME_MS > 0 && Date.now() - wallStart > MAX_WALL_TIME_MS) {
      log('Stopped: MAX_WALL_TIME_MS exceeded');
      process.exit(1);
    }
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
      await sleepWithJitter(SLEEP_BETWEEN_MS);
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

    if (startRes.status === 429) {
      attempt -= 1;
      const resetAt =
        typeof startBody === 'object' && startBody && typeof startBody.resetAt === 'number'
          ? startBody.resetAt
          : null;
      const waitMs = resetAt != null ? Math.max(5000, resetAt - Date.now() + 2500) : SLEEP_BETWEEN_MS * 5;
      log(`  rate limited — sleeping ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      continue;
    }
    if (startRes.status === 503) {
      attempt -= 1;
      await sleep(SLEEP_BETWEEN_MS * 3);
      continue;
    }
    if (startRes.status >= 500 && startRes.status !== 503) {
      attempt -= 1;
      await sleep(SLEEP_BETWEEN_MS);
      continue;
    }
    if (startRes.status !== 200 && startRes.status !== 202) {
      attempt -= 1;
      log('  unexpected /reports/start status — not polling');
      await sleep(SLEEP_BETWEEN_MS * 2);
      continue;
    }

    const settled = await pollUntilSettled(reportId);

    if (settled.outcome === 'complete') {
      const finalReport = settled.detail?.report ?? null;
      const { errors, warnings } = validateReport(finalReport);
      for (const w of warnings) {
        log('  BRD warn:', w);
      }
      if (errors.length > 0) {
        log('\nBRD validation FAILED:');
        for (const e of errors) {
          log(' ', e);
        }
        log('Will retry with a new report…\n');
        await sleepWithJitter(SLEEP_BETWEEN_MS);
        continue;
      }
      log('\nSUCCESS — report complete; BRD validation passed.');
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

    log(`Sleeping ${SLEEP_BETWEEN_MS}ms (+ jitter) before next attempt…`);
    await sleepWithJitter(SLEEP_BETWEEN_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
