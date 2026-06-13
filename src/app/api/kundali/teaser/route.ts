export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { NatalChartData } from '@/lib/agents/types';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/**
 * PUBLIC, no-login Kundali teaser. Returns the headline chart FACTS for free
 * (rising sign, Moon sign, birth star, current life period) — NO written reading,
 * NO life-chapters timeline, NO stored record. The full plain-English reading is
 * unlocked via /kundali compute after payment.
 */

type BirthPayload = {
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
};

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`kun-teaser:${getRateLimitKey(request)}`, 12, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { person?: BirthPayload };
  const p = body.person;
  if (!p?.birth_date || !p.birth_lat || !p.birth_lng) {
    return NextResponse.json({ error: 'Birth date and a located city are required.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/agents/ephemeris`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
    body: JSON.stringify({
      type: 'natal-chart',
      birth_date: p.birth_date,
      birth_time: p.birth_time || '12:00:00',
      birth_city: p.birth_city || 'Unknown',
      birth_lat: p.birth_lat,
      birth_lng: p.birth_lng,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Birth chart calculation failed. Please try again.' }, { status: 502 });
  }
  const j = await res.json();
  const chart = (j.data ?? j) as NatalChartData;
  const moon = chart.planets?.Moon;

  return NextResponse.json({
    lagna: chart.lagna ?? 'Unknown',
    moon_sign: moon?.sign ?? 'Unknown',
    moon_nakshatra: moon?.nakshatra ?? chart.moon_nakshatra ?? '',
    mahadasha: chart.current_dasha?.mahadasha ?? 'Unknown',
    antardasha: chart.current_dasha?.antardasha ?? 'Unknown',
  });
}
