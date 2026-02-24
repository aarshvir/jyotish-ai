import { NextRequest, NextResponse } from 'next/server';
import { NativityAgent } from '@/lib/agents/NativityAgent';
import type { NatalChartData } from '@/lib/agents/types';

export const maxDuration = 120;

let agent: NativityAgent | null = null;
try {
  agent = new NativityAgent();
} catch (initError) {
  console.error('NativityAgent init failed:', initError);
}

export async function POST(request: NextRequest) {
  try {
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'NativityAgent failed to initialize — check ANTHROPIC_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const natalChart = (body.natalChart ?? body.chartData) as NatalChartData;

    if (!natalChart?.lagna) {
      return NextResponse.json(
        { success: false, error: 'natalChart with lagna is required' },
        { status: 400 }
      );
    }

    const profile = await agent.analyze(natalChart);
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Nativity route error:', error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
