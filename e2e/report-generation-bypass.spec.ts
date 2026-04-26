import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

/**
 * Full pipeline check via API (bypass auth). Requires:
 *   E2E_BYPASS or BYPASS_SECRET matching the server
 *   Running server: npm run build && npm run start
 *   Ephemeris + LLM + DB (long-running; 6 min cap).
 * Skips when secret is not set.
 */
const BYPASS = process.env.E2E_BYPASS ?? process.env.BYPASS_SECRET ?? '';

const TEST_BODY = {
  name: 'E2E API User',
  birth_date: '1990-06-15',
  birth_time: '08:30:00',
  birth_city: 'Mumbai',
  birth_lat: 19.076,
  birth_lng: 72.8777,
  current_city: 'Mumbai',
  current_lat: 19.076,
  current_lng: 72.8777,
  timezone_offset: 330,
  plan_type: '7day',
  payment_status: 'bypass',
  forceRestart: true,
};

test.describe('Report pipeline (bypass, API poll)', () => {
  test.skip(!BYPASS, 'Set E2E_BYPASS or BYPASS_SECRET to run (same value as server BYPASS_SECRET)');

  test('completes with report data, or error status includes generation_error', async ({ request, baseURL }) => {
    test.setTimeout(360_000);
    const reportId = randomUUID();
    const origin = baseURL ?? 'http://127.0.0.1:3000';
    const headers = {
      'Content-Type': 'application/json',
      'x-bypass-token': BYPASS,
    };

    const start = await request.post(`${origin}/api/reports/start`, {
      headers,
      data: { ...TEST_BODY, reportId },
    });
    // 202 = Inngest; 200 = possible inline success; 500 = start failed
    expect([200, 202, 500]).toContain(start.status());
    if (start.status() === 500) {
      const j = (await start.json().catch(() => ({}))) as { error?: string };
      throw new Error(`Start failed: ${j.error ?? start.status()}`);
    }

    const deadline = Date.now() + 330_000;
    let lastGenErr: string | null = null;
    let lastStatus = '';

    while (Date.now() < deadline) {
      const st = await request.get(`${origin}/api/reports/${encodeURIComponent(reportId)}/status`, { headers });
      expect(st.ok(), `status poll HTTP ${st.status()}`).toBeTruthy();
      const data = (await st.json()) as {
        status: string;
        isComplete: boolean;
        report: unknown;
        generation_error: string | null;
      };
      lastStatus = data.status;
      lastGenErr = data.generation_error;

      if (data.status === 'complete' && data.isComplete && data.report) {
        expect((data.report as { days?: unknown[] }).days?.length).toBeGreaterThan(0);
        return;
      }
      if (data.status === 'error') {
        const msg = data.generation_error?.trim() ?? '';
        expect(
          msg.length,
          'status=error must surface non-empty generation_error (report_data.error or generation_log)',
        ).toBeGreaterThan(0);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    throw new Error(
      `Timeout waiting for report; lastStatus=${lastStatus} generation_error=${lastGenErr ?? 'null'}`,
    );
  });
});
