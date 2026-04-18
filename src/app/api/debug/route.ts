export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/debug — Returns env var presence (not values) for prod diagnostics.
 * Gated by BYPASS_SECRET so it's never public.
 */
export async function GET(request: NextRequest) {
  const bypass = request.headers.get('x-bypass-token');
  const internalKey = request.headers.get('x-service-key');
  const secret = process.env.BYPASS_SECRET;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const authorized =
    (secret && bypass === secret) ||
    (serviceKey && internalKey === serviceKey);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const check = (key: string) => {
    const v = process.env[key];
    if (!v) return 'MISSING';
    if (v.startsWith('your_') || v === 'undefined') return 'PLACEHOLDER';
    return `SET (${v.length} chars)`;
  };

  // Anthropic connectivity tests
  let anthropicPingHaiku = 'not_tested';
  let anthropicPingSonnet = 'not_tested';
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey && !anthropicKey.startsWith('your_')) {
    // Test 1: haiku with tiny prompt
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const t0 = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      clearTimeout(timer);
      anthropicPingHaiku = `HTTP_${res.status}_${Date.now() - t0}ms`;
    } catch (e) {
      anthropicPingHaiku = `ERROR:${(e as Error).name}`;
    }
    // Test 2: sonnet with small astrology prompt (30s timeout)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30_000);
      const t0 = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Describe Cancer lagna in 3 sentences.' }],
        }),
      });
      clearTimeout(timer);
      const elapsed = Date.now() - t0;
      anthropicPingSonnet = `HTTP_${res.status}_${elapsed}ms`;
    } catch (e) {
      anthropicPingSonnet = `ERROR:${(e as Error).name}`;
    }
  }

  return NextResponse.json({
    ANTHROPIC_API_KEY: check('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: check('OPENAI_API_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: check('SUPABASE_SERVICE_ROLE_KEY'),
    NEXT_PUBLIC_SUPABASE_URL: check('NEXT_PUBLIC_SUPABASE_URL'),
    EPHEMERIS_SERVICE_URL: check('EPHEMERIS_SERVICE_URL'),
    EPHEMERIS_API_URL: check('EPHEMERIS_API_URL'),
    INNGEST_EVENT_KEY: check('INNGEST_EVENT_KEY'),
    INNGEST_SIGNING_KEY: check('INNGEST_SIGNING_KEY'),
    BYPASS_SECRET: check('BYPASS_SECRET'),
    ZIINA_API_TOKEN: check('ZIINA_API_TOKEN'),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    anthropic_haiku_ping: anthropicPingHaiku,
    anthropic_sonnet_ping: anthropicPingSonnet,
  });
}
