import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';

export const dynamic = 'force-dynamic';

/**
 * Proxies the Python ephemeris `/test/hora-base` regression payload (all 12 lagnas).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const base =
    process.env.EPHEMERIS_SERVICE_URL ??
    process.env.EPHEMERIS_API_URL ??
    'http://localhost:8000';

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/test/hora-base`, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
