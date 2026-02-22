import { NextRequest, NextResponse } from 'next/server';
import { ForecastAgent } from '@/lib/agents/ForecastAgent';
import type { ForecastInput } from '@/lib/agents/types';

const agent = new ForecastAgent();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ForecastInput;

    if (!body.natalChart?.lagna) {
      return NextResponse.json(
        { success: false, error: 'natalChart with lagna is required' },
        { status: 400 }
      );
    }
    if (!body.dateFrom || !body.dateTo) {
      return NextResponse.json(
        { success: false, error: 'dateFrom and dateTo are required' },
        { status: 400 }
      );
    }

    const forecast = await agent.generateForecast(body);
    return NextResponse.json({ success: true, data: forecast });

  } catch (error) {
    console.error('Forecast route error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
