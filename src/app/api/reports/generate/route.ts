import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Deprecated: Report generation is now orchestrated client-side
 * via /api/agents/* and /api/commentary/* routes.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Use client-side orchestration via /api/agents and /api/commentary routes.' },
    { status: 410 }
  );
}
