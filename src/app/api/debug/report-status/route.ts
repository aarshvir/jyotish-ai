export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BYPASS_SECRET } from '@/lib/api/requireAuth';

/**
 * Dependency health for report pipeline. Protected by bypass token only.
 */
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
    const r = await fetch(` ${ephUrl.replace(/\/\$/, '')}/validate `, {
      signal: AbortSignal.timeout(5000),
    });
    status.ephemeris = { ok: r.ok, url: ephUrl, status: r.status };
  } catch (e: unknown) {
    status.ephemeris = {
      ok: false,
      url: ephUrl,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
    if (!url || !key) {
      status.supabase = { ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    } else {
      const sb = createClient(url, key);
      const { error } = await sb.from('reports').select('id').limit(1);
      status.supabase = { ok: !error, error: error?.message };
    }
  } catch (e: unknown) {
    status.supabase = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  status.llm = {
    anthropic: !!(process.env.ANTHROPIC_API_KEY?.trim()),
    openai: !!(process.env.OPENAI_API_KEY?.trim()),
  };

  status.razorpay = { present: !!(process.env.RAZORPAY_KEY_ID?.trim()) };

  return NextResponse.json(status);
}
