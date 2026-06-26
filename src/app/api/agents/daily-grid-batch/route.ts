export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * Batched daily-grid proxy → Python /generate-daily-grid-batch. Computes the
 * score grid for ALL dates in ONE process call, collapsing N per-day HTTP
 * round-trips into one (the per-day deterministic compute is ~3ms/day; the old
 * cost was the round-trips). No TS fallback here on purpose: the orchestrator
 * falls back to its per-day loop (which has retries + a TS fallback) if this
 * returns non-ok or fewer days than requested.
 */

const EPHEMERIS_URL = (
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000'
).trim();

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: {
    dates: string[];
    currentLat: number;
    currentLng: number;
    timezoneOffset: number;
    natal_lagna_sign_index: number;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body', days: [] }, { status: 400 }); }

  const { dates, currentLat, currentLng, timezoneOffset, natal_lagna_sign_index } = body;
  if (!Array.isArray(dates) || dates.length === 0 || natal_lagna_sign_index === undefined) {
    return NextResponse.json({ error: 'dates[] and natal_lagna_sign_index are required', days: [] }, { status: 400 });
  }

  try {
    const res = await fetch(`${EPHEMERIS_URL}/generate-daily-grid-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dates,
        current_lat: currentLat ?? 0,
        current_lng: currentLng ?? 0,
        timezone_offset_minutes: timezoneOffset ?? 0,
        natal_lagna_sign_index,
      }),
      signal: AbortSignal.timeout(200_000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    // 404 = endpoint not deployed to Railway yet; anything else = service error.
    // Either way, signal the caller to use its per-day fallback.
    console.warn('[daily-grid-batch] Python returned', res.status, '— caller will fall back to per-day');
    return NextResponse.json({ error: `batch endpoint returned ${res.status}`, days: [] }, { status: res.status === 404 ? 404 : 502 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[daily-grid-batch] Python unreachable:', msg.slice(0, 100), '— caller will fall back to per-day');
    return NextResponse.json({ error: msg.slice(0, 120), days: [] }, { status: 502 });
  }
}
