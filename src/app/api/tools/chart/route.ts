export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { validateBirth, type ValidBirth } from '@/lib/tools/birth';
import { makeChartResult, natalSchema, normalizeServiceNatal } from '@/lib/tools/chart';
import { requestJson, RequestTimeout } from '@/lib/tools/requests';

const privateHeaders = { 'Cache-Control': 'no-store' };

async function natal(person: ValidBirth, timeoutMs: number, signal: AbortSignal) {
  // Use the configured deterministic service, never a caller-controlled origin.
  // No service-role secret, account lookup, model call or birth-data cache here.
  const base = (process.env.EPHEMERIS_SERVICE_URL || process.env.EPHEMERIS_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  const { response, data } = await requestJson(`${base}/natal-chart`, {
    method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      birth_date: person.birth_date, birth_time: person.birth_time,
      birth_city: person.birth_city, birth_lat: person.birth_lat, birth_lng: person.birth_lng,
    }),
  }, timeoutMs);
  if (!response.ok) throw new Error('Calculation unavailable');
  return natalSchema.parse(normalizeServiceNatal(data));
}

/** Public deterministic results are free; this endpoint neither collects leads nor changes accounts. */
export async function POST(request: NextRequest) {
  try {
    const { allowed } = await checkRateLimit(`tools-chart:${getRateLimitKey(request)}`, 15, 60_000);
    if (!allowed) {
      return NextResponse.json({ code: 'RATE_LIMITED', error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: privateHeaders });
    }
    const body: unknown = await request.json().catch(() => null);
    const input = body && typeof body === 'object' && 'person' in body ? body.person : undefined;
    const validation = validateBirth(input);
    if (!validation.ok) {
      return NextResponse.json({ code: validation.code, error: validation.message }, {
        status: validation.code === 'UNKNOWN_TIME' ? 422 : 400, headers: privateHeaders,
      });
    }
    const person = validation.person;
    const chart = await natal(person, 16_000, request.signal);
    let currentSaturnSign: string | undefined;
    try {
      // Greenwich civil time is not always UTC, so sample at a fixed UTC location.
      const now = new Date().toISOString();
      const transit = await natal({
        ...person, birth_date: now.slice(0, 10), birth_time: now.slice(11, 19),
        birth_city: 'Reykjavik, Iceland', birth_lat: 64.1466, birth_lng: -21.9426,
      }, 4_000, request.signal);
      currentSaturnSign = transit.planets.Saturn?.sign;
    } catch {
      // Natal facts remain available; the missing transit is explicitly unknown.
    }
    return NextResponse.json(makeChartResult(chart, currentSaturnSign, person.birth_time_accuracy === 'approximate' ? 'approximate' : 'known'), { headers: privateHeaders });
  } catch (error) {
    const timedOut = error instanceof RequestTimeout;
    return NextResponse.json({
      code: timedOut ? 'CALCULATION_TIMEOUT' : 'CALCULATION_UNAVAILABLE',
      error: timedOut ? 'Calculation took too long. Your details are unchanged; please try again.' : 'Calculation is temporarily unavailable. Your details are unchanged; please try again.',
    }, { status: timedOut ? 504 : 503, headers: privateHeaders });
  }
}
