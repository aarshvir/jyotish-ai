import { NextRequest, NextResponse } from 'next/server';
import { isBypassToken } from '@/lib/bypass';

export const dynamic = 'force-dynamic';

/** Validates ?bypass= token without exposing BYPASS_SECRET to the client bundle. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bypass = typeof body?.bypass === 'string' ? body.bypass : '';
    return NextResponse.json({ ok: isBypassToken(bypass) });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
