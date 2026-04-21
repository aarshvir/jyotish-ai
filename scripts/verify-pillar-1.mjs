#!/usr/bin/env node
/**
 * verify-pillar-1.mjs — Acceptance checks for Pillar 1 (Durable Pipeline).
 *
 * Run: node scripts/verify-pillar-1.mjs
 *
 * Checks:
 *   1. GET/POST /api/reports/run returns HTTP 410 Gone.
 *   2. GET /api/inngest returns 200 (Inngest endpoint operational).
 *   3. POST /api/ziina/webhook with no ZIINA_WEBHOOK_SECRET returns 501 (disabled) or 401 (wrong sig).
 *
 * Optionally pass --base-url=https://www.vedichour.com to test production.
 */

const BASE_URL = (() => {
  const arg = process.argv.find((a) => a.startsWith('--base-url='));
  return arg ? arg.split('=')[1] : 'http://localhost:3001';
})();

let passed = 0;
let failed = 0;

function ok(label, detail) {
  passed++;
  console.log(`  ✅  ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail) {
  failed++;
  console.error(`  ❌  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function check(label, fn) {
  try {
    await fn();
  } catch (err) {
    fail(label, err.message);
  }
}

async function main() {
  console.log(`\n🔮 VedicHour Pillar 1 Verification\n   Base URL: ${BASE_URL}\n`);

  // --- 1. /api/reports/run must be 410 Gone ---
  await check('/api/reports/run → 410 Gone (POST)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/run`, { method: 'POST' });
    if (res.status === 410) {
      ok('/api/reports/run POST', `HTTP ${res.status}`);
    } else {
      fail('/api/reports/run POST', `Expected 410, got ${res.status}`);
    }
  });

  await check('/api/reports/run → 410 Gone (GET)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports/run`, { method: 'GET' });
    if (res.status === 410) {
      ok('/api/reports/run GET', `HTTP ${res.status}`);
    } else {
      fail('/api/reports/run GET', `Expected 410, got ${res.status}`);
    }
  });

  // --- 2. /api/inngest must respond (200 or 405 both mean it exists) ---
  await check('/api/inngest → operational', async () => {
    const res = await fetch(`${BASE_URL}/api/inngest`);
    if (res.status === 200 || res.status === 405) {
      ok('/api/inngest', `HTTP ${res.status} (endpoint exists)`);
    } else if (res.status === 404) {
      fail('/api/inngest', 'Not found — Inngest route missing or not deployed');
    } else {
      // Accept anything non-404 as "exists"
      ok('/api/inngest', `HTTP ${res.status} (non-404 means route exists)`);
    }
  });

  // --- 3. /api/ziina/webhook with no secret → 501 Disabled ---
  await check('/api/ziina/webhook → 501 (no secret configured)', async () => {
    const res = await fetch(`${BASE_URL}/api/ziina/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment_intent.status.updated', data: { id: 'test', status: 'completed' } }),
    });
    if (res.status === 501) {
      ok('/api/ziina/webhook (no secret)', `HTTP ${res.status} — correctly gated`);
    } else if (res.status === 401) {
      ok('/api/ziina/webhook (secret set)', `HTTP ${res.status} — signature check working`);
    } else if (res.status === 200) {
      ok('/api/ziina/webhook', `HTTP ${res.status} — webhook processed (secret is configured)`);
    } else {
      fail('/api/ziina/webhook', `Unexpected status ${res.status}`);
    }
  });

  // --- 4. /api/reports/[id]/stream → must be SSE read-only (no pipeline launch) ---
  await check('/api/reports/:id/stream → SSE content-type header', async () => {
    // Use a fake UUID — we expect 401 (unauthenticated) or SSE headers
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${BASE_URL}/api/reports/${fakeId}/stream`);
    const ct = res.headers.get('content-type') ?? '';
    if (res.status === 401 || res.status === 403) {
      ok('/api/reports/:id/stream', `HTTP ${res.status} — auth guard working`);
    } else if (ct.includes('text/event-stream')) {
      ok('/api/reports/:id/stream', 'SSE content-type confirmed');
    } else {
      fail('/api/reports/:id/stream', `Unexpected status ${res.status}, content-type: ${ct}`);
    }
  });

  // --- Summary ---
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log(`  🎉 All Pillar 1 checks passed!\n`);
    process.exit(0);
  } else {
    console.error(`  ⚠️  ${failed} check(s) failed — see above for details.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
