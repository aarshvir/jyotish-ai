export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { NatalChartData } from '@/lib/agents/types';
import { validateBirth } from '@/lib/tools/birth';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { calculateNatal } from '@/lib/ephemeris/calculateNatal';

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
  const validated = validateBirth(body?.person);
  if (!validated.ok) return NextResponse.json({ error: validated.message, code: validated.code }, { status: 400 });
  const p = validated.person;

  let chart: NatalChartData;
  try { chart = await calculateNatal(p, request.signal); }
  catch { return NextResponse.json({ error: 'Calculation is temporarily unavailable. Your inputs are unchanged; try again.' }, { status: 503 }); }
  const moon = chart.planets?.Moon;

  return NextResponse.json({
    lagna: chart.lagna ?? 'Unknown',
    moon_sign: moon?.sign ?? 'Unknown',
    moon_nakshatra: moon?.nakshatra ?? chart.moon_nakshatra ?? '',
    mahadasha: chart.current_dasha?.mahadasha ?? 'Unknown',
    antardasha: chart.current_dasha?.antardasha ?? 'Unknown',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
