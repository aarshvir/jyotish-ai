export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * Placeholder SSE endpoint. Full pipeline still runs in the browser; subscribe here
 * once `src/lib/reports/orchestrator.ts` owns generation server-side.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({
        type: 'info',
        reportId: id,
        message:
          'Server-side streaming orchestration not active yet; generation runs on the report page.',
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
