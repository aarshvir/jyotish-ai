import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { computeFallbackDayData } from '@/lib/ephemeris/fallback';

export const maxDuration = 300;

const EPHEMERIS_URL = (
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000'
).trim();

/**
 * POST /api/agents/daily-grid
 *
 * Tries the Python ephemeris service first for full accuracy.
 * If the service is offline or returns an error, falls back to the
 * pure-TypeScript computation in src/lib/ephemeris/fallback.ts
 * which gives accurate hora/choghadiya/Rahu Kaal scores.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { date, currentLat, currentLng, timezoneOffset, natal_lagna_sign_index } =
    await request.json() as {
      date: string;
      currentLat: number;
      currentLng: number;
      timezoneOffset: number;
      natal_lagna_sign_index: number;
    };

  if (!date || natal_lagna_sign_index === undefined) {
    return NextResponse.json(
      { error: 'date and natal_lagna_sign_index are required' },
      { status: 400 }
    );
  }

  // ── 1. Try the Python service ──────────────────────────────────────────
  try {
    const res = await fetch(`${EPHEMERIS_URL}/generate-daily-grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        current_lat:              currentLat  ?? 0,
        current_lng:              currentLng  ?? 0,
        timezone_offset_minutes:  timezoneOffset ?? 0,
        natal_lagna_sign_index,
      }),
      signal: AbortSignal.timeout(15_000), // shorter timeout so fallback is fast
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    console.warn('[daily-grid] Python service returned', res.status, '— using TypeScript fallback');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // ECONNREFUSED / timeout → expected when service is offline
    console.warn('[daily-grid] Python service unreachable:', msg.slice(0, 100), '— using TypeScript fallback');
  }

  // ── 2. TypeScript fallback ─────────────────────────────────────────────
  try {
    const data = computeFallbackDayData(
      date,
      currentLat  ?? 0,
      currentLng  ?? 0,
      timezoneOffset ?? 0,
      natal_lagna_sign_index ?? 0,
    );
    return NextResponse.json(data);
  } catch (fallbackErr: unknown) {
    const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Fallback computation failed';
    console.error('[daily-grid] Fallback error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
