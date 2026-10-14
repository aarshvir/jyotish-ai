export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { calculateNatal } from '@/lib/ephemeris/calculateNatal';
import { validateBirth } from '@/lib/tools/birth';
import { computeAshtakoot, nakshatraNameToIndex } from '@/lib/synastry/ashtakoot';
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
  return i >= 0 ? i : -1;
}

function band(total: number): { label: string; tone: 'excellent' | 'good' | 'fair' | 'work' } {
  if (total >= 28) return { label: 'High traditional alignment', tone: 'excellent' };
  if (total >= 21) return { label: 'Moderate to high traditional alignment', tone: 'good' };
  if (total >= 18) return { label: 'Moderate traditional alignment', tone: 'fair' };
  return { label: 'Lower traditional alignment', tone: 'work' };
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
  const validA = validateBirth(body?.partnerA ?? body?.partner_a);
  const validB = validateBirth(body?.partnerB ?? body?.partner_b);
  if (!validA.ok || !validB.ok) {
    const issue = !validA.ok ? validA : !validB.ok ? validB : null;
    return NextResponse.json({ error: issue?.message, code: issue?.code }, { status: 400 });
  }
  const a = validA.person;
  const b = validB.person;

  const [chartA, chartB] = await Promise.all([
    calculateNatal(a, request.signal).catch(() => null),
    calculateNatal(b, request.signal).catch(() => null),
  ]);
  if (!chartA || !chartB) {
    return NextResponse.json({ error: 'Birth chart calculation failed. Please try again.' }, { status: 502 });
  }

  const moonA = chartA.planets?.Moon;
  const moonB = chartB.planets?.Moon;
  const nakA = nakshatraNameToIndex(moonA?.nakshatra ?? chartA.moon_nakshatra);
  const nakB = nakshatraNameToIndex(moonB?.nakshatra ?? chartB.moon_nakshatra);
  const sigA = signToIndex(moonA?.sign ?? '');
  const sigB = signToIndex(moonB?.sign ?? '');
  if (nakA < 0 || nakB < 0 || sigA < 0 || sigB < 0) {
    return NextResponse.json(
      { error: 'Could not resolve Moon sign/nakshatra from the birth charts.' },
      { status: 502 },
    );
  }
  const ashtakoot = computeAshtakoot({
    moonNakshatraIndexA: nakA,
    moonNakshatraIndexB: nakB,
    moonSignIndexA: sigA,
    moonSignIndexB: sigB,
  });

  return NextResponse.json({
    total: ashtakoot.total,
    max: 36,
    ...band(ashtakoot.total),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
