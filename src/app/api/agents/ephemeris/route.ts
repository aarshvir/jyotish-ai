import { NextRequest, NextResponse } from 'next/server';
import { EphemerisAgent } from '@/lib/agents/EphemerisAgent';
import type { NatalChartInput } from '@/lib/agents/types';
import { requireAuth } from '@/lib/api/requireAuth';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, shouldRateLimitLlmForUser } from '@/lib/api/rateLimit';

const agent = new EphemerisAgent();
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (shouldRateLimitLlmForUser(auth)) {
    const rl = await checkRateLimit(
      `ephemeris:${getRateLimitKey(request, auth.user.id)}`,
      RATE_LIMITS.ephemeris.limit,
      RATE_LIMITS.ephemeris.windowMs,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many ephemeris requests', resetAt: rl.resetAt },
        { status: 429 },
      );
    }
  }

  try {
    const body = await request.json();

    // Support two call patterns:
    //   { type: 'natal-chart', ...NatalChartInput }
    //   { type: 'full-day', date, birthLat, birthLng, currentLat, currentLng, timezoneOffset }
    const { type = 'natal-chart', ...rest } = body as Record<string, unknown>;

    if (type === 'full-day') {
      const data = await agent.getFullDayData({
        date:            rest.date as string,
        birthLat:        rest.birthLat as number,
        birthLng:        rest.birthLng as number,
        currentLat:      rest.currentLat as number,
        currentLng:      rest.currentLng as number,
        timezoneOffset:  rest.timezoneOffset as number,
      });
      return NextResponse.json({ success: true, data });
    }

    // default: natal chart
    const input: NatalChartInput = {
      birth_date: rest.birth_date as string,
      birth_time: rest.birth_time as string,
      birth_city: rest.birth_city as string,
      birth_lat:  rest.birth_lat as number,
      birth_lng:  rest.birth_lng as number,
    };
    const data = await agent.getNatalChart(input);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Ephemeris route error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
