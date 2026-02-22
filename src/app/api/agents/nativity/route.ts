import { NextRequest, NextResponse } from 'next/server';
import { NativityAgent } from '@/lib/agents/NativityAgent';
import type { NatalChartData } from '@/lib/agents/types';

const agent = new NativityAgent();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Nativity route - Received body keys:', Object.keys(body));
    console.log('🔍 Nativity route - body.natalChart exists:', !!body.natalChart);
    console.log('🔍 Nativity route - body.natalChart?.lagna:', body.natalChart?.lagna);
    
    const natalChart = (body.natalChart ?? body.chartData) as NatalChartData;
    console.log('🔍 Nativity route - Extracted natalChart.lagna:', natalChart?.lagna);

    if (!natalChart?.lagna) {
      console.error('❌ Nativity route - Missing lagna. natalChart:', natalChart);
      return NextResponse.json(
        { success: false, error: 'natalChart with lagna is required' },
        { status: 400 }
      );
    }

    console.log('✅ Nativity route - Starting analysis...');
    const profile = await agent.analyze(natalChart);
    console.log('✅ Nativity route - Analysis complete');
    return NextResponse.json({ success: true, data: profile });

  } catch (error: any) {
    console.error('❌ Nativity route error:', error);
    console.error('❌ Nativity route error details:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || String(error),
        details: error.status ? `API Status: ${error.status}` : undefined,
      },
      { status: 500 }
    );
  }
}
