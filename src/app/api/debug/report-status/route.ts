export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BYPASS_SECRET } from '@/lib/api/requireAuth';

export async function GET(request: NextRequest) {
  const bypass = new URL(request.url).searchParams.get('bypass');
  if (bypass !== BYPASS_SECRET) {
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
    key_prefix: key.substring(0, 20),
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
    anthropic: !!(process.env.ANTHROPIC_API_KEY?.trim()),
    openai: !!(process.env.OPENAI_API_KEY?.trim()),
  };

  status.razorpay = { present: !!(process.env.RAZORPAY_KEY_ID?.trim()) };

  return NextResponse.json(status);
}