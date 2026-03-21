import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

const EPHEMERIS_URL =
  process.env.EPHEMERIS_SERVICE_URL ??
  process.env.EPHEMERIS_API_URL ??
  'http://localhost:8000';

/**
 * POST /api/agents/daily-grid
 * Proxies to the Python /generate-daily-grid endpoint.
 * Returns 18 fixed hourly slots (06:00–24:00 local) with proper display_label.
 *
 * Body: { date, currentLat, currentLng, timezoneOffset, natal_lagna_sign_index }
 */
export async function POST(request: NextRequest) {
  try {
    const { date, currentLat, currentLng, timezoneOffset, natal_lagna_sign_index } =
      await request.json();

    if (!date || natal_lagna_sign_index === undefined) {
      return NextResponse.json(
        { error: 'date and natal_lagna_sign_index are required' },
        { status: 400 }
      );
    }

    const res = await fetch(`${EPHEMERIS_URL}/generate-daily-grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        current_lat: currentLat ?? 0,
        current_lng: currentLng ?? 0,
        timezone_offset_minutes: timezoneOffset ?? 0,
        natal_lagna_sign_index,
      }),
      signal: AbortSignal.timeout(600_000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Ephemeris service error: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    const msg = error?.message ?? 'Daily-grid request failed';
    console.error('[daily-grid] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
