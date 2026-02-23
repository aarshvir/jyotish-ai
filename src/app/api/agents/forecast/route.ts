import { NextRequest, NextResponse } from 'next/server';
import { ForecastAgent } from '@/lib/agents/ForecastAgent';
import type { ForecastInput } from '@/lib/agents/types';

export const maxDuration = 300;

let agent: ForecastAgent;
try {
  agent = new ForecastAgent();
} catch (initError) {
  console.error('❌ ForecastAgent init failed:', initError);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ForecastInput;

    console.log('Forecast route called with body keys:', Object.keys(body));
    console.log('natalChart.lagna:', body.natalChart?.lagna);
    console.log('dateFrom:', body.dateFrom);
    console.log('dateTo:', body.dateTo);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'ForecastAgent failed to initialize — check ANTHROPIC_API_KEY' },
        { status: 500 }
      );
    }

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
    console.error('❌ Forecast route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null,
      },
      { status: 500 }
    );
  }
}
