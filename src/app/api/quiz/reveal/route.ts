export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { EphemerisAgent } from '@/lib/agents/EphemerisAgent';
import type { NatalChartData } from '@/lib/agents/types';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { computeReveal, RevealError } from '@/lib/funnel/reveal/compute';

/**
 * POST /api/quiz/reveal — the /q funnel's free, computed reveal (spec S14 + S16).
 *
 * Public and login-free: the funnel shows real chart facts before asking for anything
 * (no password before the reveal). Reads the chart engine only — writes nothing.
 * Returns the reveal facts and sentences, each with its source chart keys (H3).
 */

interface Body {
  birth_date?: string;
  birth_time?: string | null;
  time_known?: string;
  city?: string;
  lat?: number | string;
  lng?: number | string;
  focus_area?: string;
  self_role?: string;
}

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`quiz-reveal:${getRateLimitKey(request)}`, 12, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as Body;
  const date = String(b.birth_date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json({ error: 'A valid birth date is required.' }, { status: 400 });
  }
  const year = Number(date.slice(0, 4));
  if (year < 1900 || Date.parse(`${date}T00:00:00Z`) > Date.now()) {
    return NextResponse.json({ error: 'Please check the birth date.' }, { status: 400 });
  }
  const timeKnown = b.time_known === 'exact' || b.time_known === 'approx';
  const hhmm = typeof b.birth_time === 'string' ? b.birth_time.slice(0, 5) : '';
  if (timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) {
    return NextResponse.json({ error: 'Please check the birth time.' }, { status: 400 });
  }
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const city = String(b.city ?? '').trim().slice(0, 120);
  if (!city || !hasValidBirthCoords({ birth_lat: lat, birth_lng: lng })) {
    return NextResponse.json({ error: 'Please choose your birth place from the list.' }, { status: 400 });
  }

  let chart: NatalChartData;
  try {
    const raw = (await new EphemerisAgent().getNatalChart({
      birth_date: date,
      // Unknown time: noon, and the reveal counts houses from the Moon instead of the rising sign.
      birth_time: timeKnown ? `${hhmm}:00` : '12:00:00',
      birth_city: city,
      birth_lat: lat,
      birth_lng: lng,
    })) as NatalChartData | { data?: NatalChartData };
    chart = ('data' in raw && raw.data ? raw.data : raw) as NatalChartData;
  } catch (e) {
    console.error('[quiz/reveal] ephemeris failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'The chart service is busy. Please try again.' }, { status: 502 });
  }

  try {
    const reveal = computeReveal({
      chart,
      timeKnown,
      city,
      lat,
      lng,
      focusArea: typeof b.focus_area === 'string' ? b.focus_area : undefined,
      selfRole: typeof b.self_role === 'string' ? b.self_role : undefined,
    });
    return NextResponse.json({ reveal });
  } catch (e) {
    if (e instanceof RevealError) {
      console.error('[quiz/reveal] incomplete chart:', e.message);
      return NextResponse.json({ error: 'The chart came back incomplete. Please try again.' }, { status: 502 });
    }
    throw e;
  }
}
