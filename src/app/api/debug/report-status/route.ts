export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BYPASS_SECRET } from '@/lib/api/requireAuth';
import { cleanEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  // Read the secret from a header, NOT the query string — query params land in
  // Vercel/CDN access logs, browser history, and the Referer sent to third parties.
  // Matches the sibling /api/debug route and requireAuth's documented preference.
  const bypass = request.headers.get('x-bypass-token');
  // Reject if secret is unset/empty, or if the header is absent/empty, or if they don't match.
  const secretOk = !!BYPASS_SECRET && !!bypass && bypass === BYPASS_SECRET;
  if (!secretOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status: Record<string, unknown> = {};

  const ephUrl = (
    process.env.EPHEMERIS_SERVICE_URL ||
    process.env.NEXT_PUBLIC_EPHEMERIS_URL ||
    'http://localhost:8000'
  ).trim();

  try {
    const ephValidateUrl = ephUrl.replace(/\/$/, '') + '/validate';
    const r = await fetch(ephValidateUrl, { signal: AbortSignal.timeout(5000) });
    status.ephemeris = { ok: r.ok, url: ephUrl, status: r.status };
  } catch (e: unknown) {
    status.ephemeris = { ok: false, url: ephUrl, error: e instanceof Error ? e.message : String(e) };
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const url = rawUrl.trim();
  const key = rawKey.trim();

  status.supabase_debug = {
    url_raw_len: rawUrl.length,
    url_trimmed_len: url.length,
    url_preview: url.substring(0, 60),
    key_raw_len: rawKey.length,
    key_trimmed_len: key.length,
    key_configured: key.length > 0,  // boolean only — never expose key prefix
  };

  try {
    const testRes = await fetch(url + '/rest/v1/reports?select=id&limit=1', {
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
      },
      signal: AbortSignal.timeout(8000),
    });
    const body = await testRes.text();
    status.supabase = { ok: testRes.ok, status: testRes.status, body_preview: body.substring(0, 100) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    status.supabase = { ok: false, error: msg };
  }

  status.llm = {
    anthropic_key_present: !!cleanEnv(process.env.ANTHROPIC_API_KEY),
    openai_key_present: !!cleanEnv(process.env.OPENAI_API_KEY),
    gemini_key_present: !!cleanEnv(process.env.GEMINI_API_KEY),
    grok_key_present: !!cleanEnv(process.env.GROK_API_KEY),
  };

  // Live LLM probes are billable, so opt-in only (?probe=1) — matches /api/debug. The
  // default diagnostic reports key presence + ephemeris/supabase connectivity and spends
  // no tokens, so an uptime monitor hitting this route can't run up API cost.
  const runProbe = new URL(request.url).searchParams.get('probe') === '1';

  // Live probe Anthropic — does the key actually work?
  const anthropicKey = cleanEnv(process.env.ANTHROPIC_API_KEY);
  if (runProbe && anthropicKey) {
    try {
      const probeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Reply OK' }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const probeBody = await probeRes.json().catch(() => ({}));
      status.llm_probe_anthropic = {
        http_status: probeRes.status,
        ok: probeRes.status === 200,
        error: probeRes.status !== 200 ? (probeBody as { error?: { message?: string } }).error?.message : undefined,
      };
    } catch (e: unknown) {
      status.llm_probe_anthropic = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    status.llm_probe_anthropic = { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  }

  // Live probe OpenAI — does the key actually work? (opt-in via ?probe=1)
  const openaiKey = cleanEnv(process.env.OPENAI_API_KEY);
  if (runProbe && openaiKey) {
    try {
      const probeRes = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.5',
          max_output_tokens: 16,
          input: [{ role: 'user', content: 'Reply OK' }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const probeBody = await probeRes.json().catch(() => ({}));
      status.llm_probe_openai = {
        http_status: probeRes.status,
        ok: probeRes.status === 200,
        error: probeRes.status !== 200 ? (probeBody as { error?: { message?: string } }).error?.message : undefined,
      };
    } catch (e: unknown) {
      status.llm_probe_openai = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    status.llm_probe_openai = { ok: false, error: 'OPENAI_API_KEY not set' };
  }

  return NextResponse.json(status);
}
