export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import type { NatalChartData } from '@/lib/agents/types';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { detectDoshas } from '@/lib/kundli/doshas';

/**
 * PUBLIC, no-login chart-facts endpoint powering the free SEO calculator tools
 * (manglik, sade sati, dasha, nakshatra, moon sign, lagna, kaal sarp, free kundli).
 * Returns deterministic facts + the three doshas — NO written reading (that is the
 * paid /kundali deep report). Rate-limited; mirrors the kundali/teaser auth pattern.
 */

type BirthPayload = {
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
};

async function natal(origin: string, p: BirthPayload, dateOverride?: string): Promise<NatalChartData | null> {
  const res = await fetch(`${origin}/api/agents/ephemeris`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
    body: JSON.stringify({
      type: 'natal-chart',
      birth_date: dateOverride ?? p.birth_date,
      birth_time: dateOverride ? '12:00:00' : p.birth_time || '12:00:00',
      birth_city: p.birth_city || 'Unknown',
      birth_lat: p.birth_lat,
      birth_lng: p.birth_lng,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.data ?? j) as NatalChartData;
}

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`tools-chart:${getRateLimitKey(request)}`, 15, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { person?: BirthPayload };
  const p = body.person;
  if (!p?.birth_date || !p.birth_lat || !p.birth_lng) {
    return NextResponse.json({ error: 'Birth date and a located city are required.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const chart = await natal(origin, p);
  if (!chart) {
    return NextResponse.json({ error: 'Birth chart calculation failed. Please try again.' }, { status: 502 });
  }

  // Best-effort current Saturn sign (date-only is enough for the sidereal sign) for Sade Sati.
  let currentSaturnSign: string | undefined;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = await natal(origin, p, today);
    currentSaturnSign = now?.planets?.Saturn?.sign;
  } catch {
    // Sade Sati will report "pending live transit".
  }

  const doshas = detectDoshas(chart, { currentSaturnSign });
  const moon = chart.planets?.Moon;
  const sun = chart.planets?.Sun;
  const mars = chart.planets?.Mars;

  return NextResponse.json({
    lagna: chart.lagna ?? null,
    lagna_degree: chart.lagna_degree ?? null,
    sun_sign: sun?.sign ?? null,
    moon_sign: moon?.sign ?? null,
    moon_nakshatra: moon?.nakshatra ?? chart.moon_nakshatra ?? null,
    moon_nakshatra_pada: moon?.nakshatra_pada ?? null,
    mars_house: mars?.house ?? null,
    mars_sign: mars?.sign ?? null,
    current_dasha: chart.current_dasha ?? null,
    dasha_sequence: (chart.dasha_sequence ?? []).map((d) => ({
      planet: d.planet,
      start_date: d.start_date,
      end_date: d.end_date,
    })),
    doshas,
  });
}
