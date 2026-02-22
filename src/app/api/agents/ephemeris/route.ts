import { NextRequest, NextResponse } from 'next/server';
import { EphemerisAgent } from '@/lib/agents/EphemerisAgent';
import type { NatalChartInput } from '@/lib/agents/types';

const agent = new EphemerisAgent();

export async function POST(request: NextRequest) {
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
