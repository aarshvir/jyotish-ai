import { NextRequest, NextResponse } from 'next/server';
import { NativityAgent } from '@/lib/agents/NativityAgent';
import type { NatalChartData } from '@/lib/agents/types';
import { requireAuth } from '@/lib/api/requireAuth';

export const maxDuration = 300;

let agent: NativityAgent | null = null;
try {
  agent = new NativityAgent();
} catch (initError) {
  console.error('NativityAgent init failed:', initError);
}

// Hard wall-clock budget for the entire nativity route.
// The Anthropic SDK has timeout:55s, but belt-and-suspenders: if the SDK
// hangs anyway (e.g. TLS stall before the connection is established), the
// route returns the deterministic fallback profile rather than hanging forever.
// 120s: 45s for Anthropic attempt + ~40s for OpenAI fallback + margin.
const ROUTE_BUDGET_MS = 120_000;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error:
            'NativityAgent failed to initialize — set ANTHROPIC_API_KEY and/or OPENAI_API_KEY / GEMINI_API_KEY for fallback',
        },
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

    const profile = await Promise.race([
      agent.analyze(natalChart),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`NativityAgent route timed out after ${ROUTE_BUDGET_MS}ms`)),
          ROUTE_BUDGET_MS,
        ),
      ),
    ]);

    return NextResponse.json({ success: true, data: profile });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Nativity route error:', msg.slice(0, 200));
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
