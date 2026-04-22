import { NextRequest, NextResponse } from 'next/server';
import { ForecastAgent } from '@/lib/agents/ForecastAgent';
import type { ForecastInput } from '@/lib/agents/types';
import { requireAuth } from '@/lib/api/requireAuth';

export const maxDuration = 300;

let agent: ForecastAgent | null = null;
try {
  agent = new ForecastAgent();
} catch (initError) {
  console.error('❌ ForecastAgent init failed:', initError);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as ForecastInput & {
      jyotishRagMode?: string;
      jyotish_rag_mode?: string;
    };
    const jyotishRagMode = body.jyotishRagMode ?? body.jyotish_rag_mode;

    console.log('[forecast] called, lagna:', body.natalChart?.lagna, 'range:', body.dateFrom, '-', body.dateTo);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ForecastAgent failed to initialize — set ANTHROPIC_API_KEY and/or OPENAI_API_KEY / GEMINI_API_KEY for fallback',
        },
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

    const forecast = await agent.generateForecast(body, { jyotishRagMode });
    return NextResponse.json({ success: true, data: forecast });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Forecast route error:', msg.slice(0, 200));
    return NextResponse.json(
      { success: false, error: 'Forecast generation failed' },
      { status: 500 }
    );
  }
}
