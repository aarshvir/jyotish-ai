/**
 * Production ADMIN100 report-generation matrix.
 *
 * Runs real /api/reports/start requests against production using the same
 * shape as the onboard ADMIN100 path: payment_status='promo' + promoCode.
 *
 * Usage:
 *   E2E_BASE_URL=https://www.vedichour.com E2E_BYPASS=... node scripts/prod-admin100-e2e-matrix.mjs
 *
 * Defaults:
 *   - 12 scenarios
 *   - concurrency 2
 *   - 90 minute poll timeout per scenario
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { chromium } from 'playwright';
import { fetchJson, sleep } from './lib/e2e-http.mjs';
import { validateReport } from './lib/validate-report-brd.mjs';

for (const file of ['.env.vercel.production.local', '.env.local']) {
  const envPath = resolve(file);
  if (!existsSync(envPath)) continue;
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

const BASE_URL = process.env.E2E_BASE_URL || process.argv[2] || 'https://www.vedichour.com';
const BYPASS = process.env.E2E_BYPASS || process.env.BYPASS_SECRET || process.argv[3] || '';
const SERVICE_KEY = process.env.E2E_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AUTH_MODE = process.env.E2E_AUTH_MODE || 'browser';
const CONCURRENCY = Math.max(1, Number(process.env.E2E_CONCURRENCY || 2));
const LIMIT = Math.max(0, Number(process.env.E2E_LIMIT || 0));
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS || 90 * 60 * 1000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10_000);
const OUT_PATH = resolve(process.env.E2E_RESULT_PATH || 'tmp/prod-admin100-e2e-results.json');

const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_MODE !== 'browser' && BYPASS ? { 'x-bypass-token': BYPASS } : {}),
  ...(AUTH_MODE !== 'browser' && SERVICE_KEY ? { 'x-service-key': SERVICE_KEY } : {}),
};

function scenario(overrides) {
  return {
    name: 'ADMIN100 E2E',
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
    ...overrides,
  };
}

const ALL_SCENARIOS = [
  { id: 'admin100-dubai-baseline', body: scenario({ name: 'ADMIN100 Dubai Baseline' }) },
  {
    id: 'mumbai-ist-string-coords',
    body: scenario({
      name: 'ADMIN100 Mumbai Strings',
      birth_date: '1990-06-15',
      birth_time: '08:30:00',
      birth_city: 'Mumbai, India',
      birth_lat: '19.0760',
      birth_lng: '72.8777',
      current_city: 'Mumbai, India',
      current_lat: '19.0760',
      current_lng: '72.8777',
      timezone_offset: 330,
    }),
  },
  {
    id: 'nyc-negative-offset',
    body: scenario({
      name: 'ADMIN100 NYC Current',
      current_city: 'New York, USA',
      current_lat: 40.7128,
      current_lng: -74.006,
      timezone_offset: -300,
    }),
  },
  {
    id: 'los-angeles-late-birth',
    body: scenario({
      name: 'ADMIN100 LA Late Birth',
      birth_date: '1985-11-23',
      birth_time: '23:55:00',
      birth_city: 'Los Angeles, USA',
      birth_lat: 34.0522,
      birth_lng: -118.2437,
      current_city: 'Los Angeles, USA',
      current_lat: 34.0522,
      current_lng: -118.2437,
      timezone_offset: -480,
    }),
  },
  {
    id: 'london-zero-offset',
    body: scenario({
      name: 'ADMIN100 London Zero',
      birth_date: '1979-03-01',
      birth_time: '00:05:00',
      birth_city: 'London, UK',
      birth_lat: 51.5074,
      birth_lng: -0.1278,
      current_city: 'London, UK',
      current_lat: 51.5074,
      current_lng: -0.1278,
      timezone_offset: 0,
    }),
  },
  {
    id: 'sydney-southern-hemisphere',
    body: scenario({
      name: 'ADMIN100 Sydney',
      birth_date: '1995-12-31',
      birth_time: '06:10:00',
      birth_city: 'Sydney, Australia',
      birth_lat: -33.8688,
      birth_lng: 151.2093,
      current_city: 'Sydney, Australia',
      current_lat: -33.8688,
      current_lng: 151.2093,
      timezone_offset: 660,
    }),
  },
  {
    id: 'reykjavik-high-latitude',
    body: scenario({
      name: 'ADMIN100 Reykjavik',
      birth_date: '1988-07-20',
      birth_time: '14:20:00',
      birth_city: 'Reykjavik, Iceland',
      birth_lat: 64.1466,
      birth_lng: -21.9426,
      current_city: 'Reykjavik, Iceland',
      current_lat: 64.1466,
      current_lng: -21.9426,
      timezone_offset: 0,
    }),
  },
  {
    id: 'singapore-east-asia',
    body: scenario({
      name: 'ADMIN100 Singapore',
      birth_date: '1992-09-09',
      birth_time: '12:00:00',
      birth_city: 'Singapore',
      birth_lat: 1.3521,
      birth_lng: 103.8198,
      current_city: 'Singapore',
      current_lat: 1.3521,
      current_lng: 103.8198,
      timezone_offset: 480,
    }),
  },
  {
    id: 'tokyo-early-birth',
    body: scenario({
      name: 'ADMIN100 Tokyo Early',
      birth_date: '2001-04-02',
      birth_time: '00:01:00',
      birth_city: 'Tokyo, Japan',
      birth_lat: 35.6762,
      birth_lng: 139.6503,
      current_city: 'Tokyo, Japan',
      current_lat: 35.6762,
      current_lng: 139.6503,
      timezone_offset: 540,
    }),
  },
  {
    id: 'sao-paulo-negative-lat',
    body: scenario({
      name: 'ADMIN100 Sao Paulo',
      birth_date: '1983-02-14',
      birth_time: '21:15:00',
      birth_city: 'Sao Paulo, Brazil',
      birth_lat: -23.5558,
      birth_lng: -46.6396,
      current_city: 'Sao Paulo, Brazil',
      current_lat: -23.5558,
      current_lng: -46.6396,
      timezone_offset: -180,
    }),
  },
  {
    id: 'leap-day-birth',
    body: scenario({
      name: 'ADMIN100 Leap Day',
      birth_date: '1988-02-29',
      birth_time: '05:45:00',
      birth_city: 'Delhi, India',
      birth_lat: 28.6139,
      birth_lng: 77.209,
      current_city: 'Dubai, UAE',
      current_lat: 25.2048,
      current_lng: 55.2708,
      timezone_offset: 240,
    }),
  },
  {
    id: 'kathmandu-quarter-offset',
    body: scenario({
      name: 'ADMIN100 Kathmandu',
      birth_date: '1998-10-10',
      birth_time: '16:40:00',
      birth_city: 'Kathmandu, Nepal',
      birth_lat: 27.7172,
      birth_lng: 85.324,
      current_city: 'Kathmandu, Nepal',
      current_lat: 27.7172,
      current_lng: 85.324,
      timezone_offset: 345,
    }),
  },
];

const SCENARIOS = LIMIT > 0 ? ALL_SCENARIOS.slice(0, LIMIT) : ALL_SCENARIOS;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function createBrowserAuthCookie() {
  const stamp = Date.now();
  const email = process.env.E2E_EMAIL || `e2e-${stamp}@vedichour.com`;
  const password = process.env.E2E_PASSWORD || `VedicHour${stamp}!`;
  log(`browser-auth signup email=${email}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login?mode=signup`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await Promise.all([
      page.waitForURL(/\/dashboard|\/onboard|\/login/, { timeout: 45_000 }).catch(() => null),
      page.getByRole('button', { name: /Create Account/i }).click(),
    ]);

    const alertText = await page.locator('[role="alert"]').first().textContent({ timeout: 2000 }).catch(() => '');
    if (alertText) {
      throw new Error(`browser auth failed: ${alertText}`);
    }

    await page.waitForTimeout(2000);
    const cookies = await context.cookies(BASE_URL);
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    if (!cookieHeader || !cookies.some((c) => c.name.includes('auth-token'))) {
      throw new Error('browser auth did not produce Supabase auth cookies');
    }
    log(`browser-auth ok cookies=${cookies.length}`);
    return cookieHeader;
  } finally {
    await browser.close();
  }
}

async function fetchGenerationLog(reportId) {
  try {
    const res = await fetchJson(`${BASE_URL}/api/reports/${reportId}/generation-log`, {
      method: 'GET',
      headers: HEADERS,
      timeoutMs: 25_000,
    });
    return res.body;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function poll(reportId) {
  const started = Date.now();
  let lastStep = '';
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const res = await fetchJson(`${BASE_URL}/api/reports/${reportId}/status`, {
      method: 'GET',
      headers: HEADERS,
      timeoutMs: 25_000,
    });
    if (res.status !== 200) {
      throw new Error(`status HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 500)}`);
    }
    const body = res.body;
    const step = body?.generation_step || '';
    const progress = typeof body?.progress === 'number' ? body.progress : '?';
    if (step && step !== lastStep) {
      log(`  ${reportId} [${progress}%] ${step}`);
      lastStep = step;
    }
    if (body?.status === 'error') {
      throw new Error(`report error: ${JSON.stringify(body).slice(0, 1000)}`);
    }
    if (body?.status === 'complete' && body?.report) {
      return { report: body.report, pollSeconds: Math.round((Date.now() - started) / 1000) };
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`poll timeout after ${Math.round(POLL_TIMEOUT_MS / 1000)}s`);
}

async function runScenario(item, index) {
  const reportId = randomUUID();
  const body = { reportId, ...item.body };
  const started = Date.now();
  log(`[${index + 1}/${SCENARIOS.length}] START ${item.id} reportId=${reportId}`);
  try {
    const start = await fetchJson(`${BASE_URL}/api/reports/start`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
      timeoutMs: 330_000,
    });
    if (![200, 202].includes(start.status)) {
      throw new Error(`start HTTP ${start.status}: ${JSON.stringify(start.body).slice(0, 1000)}`);
    }
    const { report, pollSeconds } = await poll(reportId);
    const validation = validateReport(report);
    const ok = validation.errors.length === 0;
    log(`${ok ? 'PASS' : 'FAIL'} ${item.id} reportId=${reportId} seconds=${Math.round((Date.now() - started) / 1000)}`);
    return {
      id: item.id,
      reportId,
      ok,
      pollSeconds,
      totalSeconds: Math.round((Date.now() - started) / 1000),
      errors: validation.errors,
      warnings: validation.warnings,
      url: `${BASE_URL}/report/${reportId}`,
    };
  } catch (e) {
    const generationLog = await fetchGenerationLog(reportId);
    const message = e instanceof Error ? e.message : String(e);
    log(`FAIL ${item.id} reportId=${reportId}: ${message}`);
    return {
      id: item.id,
      reportId,
      ok: false,
      totalSeconds: Math.round((Date.now() - started) / 1000),
      errors: [message],
      warnings: [],
      generationLog,
      url: `${BASE_URL}/report/${reportId}`,
    };
  }
}

async function poolMap(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next;
      next += 1;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  if (AUTH_MODE === 'browser') {
    HEADERS.Cookie = await createBrowserAuthCookie();
  } else if (!BYPASS && !SERVICE_KEY) {
    console.error('E2E_BYPASS/BYPASS_SECRET or E2E_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY is required.');
    process.exit(1);
  }
  log(`base=${BASE_URL} scenarios=${SCENARIOS.length} concurrency=${CONCURRENCY}`);
  const started = Date.now();
  const results = await poolMap(SCENARIOS, CONCURRENCY, runScenario);
  const summary = {
    baseUrl: BASE_URL,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date().toISOString(),
    totalSeconds: Math.round((Date.now() - started) / 1000),
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2));
  log(`summary=${summary.passed}/${SCENARIOS.length} passed result=${OUT_PATH}`);
  for (const r of results) {
    console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${r.id} ${r.reportId} ${r.totalSeconds}s ${r.url}`);
    for (const err of r.errors.slice(0, 3)) console.log(`  error: ${err}`);
    for (const warn of r.warnings.slice(0, 3)) console.log(`  warn: ${warn}`);
    if (r.warnings.length > 3) console.log(`  ... ${r.warnings.length - 3} more warnings`);
  }
  process.exit(summary.failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
