export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { NatalChartData } from '@/lib/agents/types';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { computeAshtakoot, NAKSHATRA_NAMES } from '@/lib/synastry/ashtakoot';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/**
 * PUBLIC, no-login Ashtakoot teaser. Returns ONLY the total Guna score (out of 36)
 * plus a one-word band — NO 8-fold breakdown, NO commentary, NO stored record.
 * This is the free, shareable hook ("comment your score"); the full breakdown +
 * reading are unlocked via /synastry compute after payment.
 */

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function signToIndex(sign: string): number {
  const i = SIGNS.findIndex((s) => s.toLowerCase() === (sign || '').trim().toLowerCase());
  return i >= 0 ? i : 0;
}
function nakshatraToIndex(name: string): number {
  const i = NAKSHATRA_NAMES.findIndex((n) => n.toLowerCase() === (name || '').trim().toLowerCase());
  return i >= 0 ? i : 0;
}

function band(total: number): { label: string; tone: 'excellent' | 'good' | 'fair' | 'work' } {
  if (total >= 28) return { label: 'Excellent match', tone: 'excellent' };
  if (total >= 21) return { label: 'Strong match', tone: 'good' };
  if (total >= 18) return { label: 'Workable match', tone: 'fair' };
  return { label: 'Needs conscious effort', tone: 'work' };
}

type BirthPayload = {
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
};

export async function POST(request: NextRequest) {
  // Rate-limit by IP — this is a public, compute-heavy endpoint.
  const { allowed } = await checkRateLimit(`syn-teaser:${getRateLimitKey(request)}`, 12, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    partnerA?: BirthPayload;
    partnerB?: BirthPayload;
    partner_a?: BirthPayload;
    partner_b?: BirthPayload;
  };
  const a = body.partnerA ?? body.partner_a;
  const b = body.partnerB ?? body.partner_b;
  if (!a?.birth_date || !b?.birth_date || !hasValidBirthCoords(a) || !hasValidBirthCoords(b)) {
    return NextResponse.json({ error: 'Both birth dates and located cities are required.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const h = {
    'Content-Type': 'application/json',
    'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };

  async function chart(p: BirthPayload): Promise<NatalChartData | null> {
    const res = await fetch(`${origin}/api/agents/ephemeris`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        type: 'natal-chart',
        birth_date: p.birth_date,
        birth_time: p.birth_time || '12:00:00',
        birth_city: p.birth_city || 'Unknown',
        birth_lat: p.birth_lat,
        birth_lng: p.birth_lng,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.data ?? j) as NatalChartData;
  }

  const [chartA, chartB] = await Promise.all([chart(a), chart(b)]);
  if (!chartA || !chartB) {
    return NextResponse.json({ error: 'Birth chart calculation failed. Please try again.' }, { status: 502 });
  }

  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;
  const ashtakoot = computeAshtakoot({
    moonNakshatraIndexA: nakshatraToIndex(moonA?.nakshatra ?? chartA.moon_nakshatra ?? 'Ashwini'),
    moonNakshatraIndexB: nakshatraToIndex(moonB?.nakshatra ?? chartB.moon_nakshatra ?? 'Ashwini'),
    moonSignIndexA: signToIndex(moonA?.sign ?? 'Aries'),
    moonSignIndexB: signToIndex(moonB?.sign ?? 'Aries'),
  });

  return NextResponse.json({
    total: ashtakoot.total,
    max: 36,
    ...band(ashtakoot.total),
  });
}
