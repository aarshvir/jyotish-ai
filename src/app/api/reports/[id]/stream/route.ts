export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { generateReportPipeline, type StepEvent, type PipelineInput } from '@/lib/reports/orchestrator';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id: reportId } = context.params;
  const sp = request.nextUrl.searchParams;

  const input: PipelineInput = {
    name: sp.get('name') ?? 'Seeker',
    date: sp.get('date') ?? '',
    time: sp.get('time') ?? '',
    city: sp.get('city') ?? '',
    lat: parseFloat(sp.get('lat') ?? '0') || 0,
    lng: parseFloat(sp.get('lng') ?? '0') || 0,
    currentLat: parseFloat(sp.get('currentLat') ?? sp.get('lat') ?? '0') || 0,
    currentLng: parseFloat(sp.get('currentLng') ?? sp.get('lng') ?? '0') || 0,
    currentCity: sp.get('currentCity') ?? sp.get('city') ?? '',
    timezoneOffset: sp.get('currentTz') ? parseInt(sp.get('currentTz')!) : -new Date().getTimezoneOffset(),
    type: sp.get('type') ?? '7day',
    forecastStart: sp.get('forecastStart') ?? undefined,
    planType: sp.get('plan_type') ?? sp.get('type') ?? '7day',
    paymentStatus: 'bypass',
  };

  const base = request.nextUrl.origin;
  // Forward Cookie + bypass token so internal API routes stay authenticated
  const authHeaders: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  if (cookie) authHeaders['cookie'] = cookie;
  const bypass = sp.get('bypass') ?? request.headers.get('x-bypass-token');
  if (bypass) authHeaders['x-bypass-token'] = bypass;

  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });

  function send(data: StepEvent | { type: 'ping' }) {
    if (!streamController) return;
    try {
      streamController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream already closed
    }
  }

  // Send ping to establish connection
  send({ type: 'ping' });

  // Run pipeline in background — do NOT await here so the Response returns immediately
  void generateReportPipeline(
    reportId,
    auth.user.id,
    auth.user.email ?? '',
    input,
    (event) => {
      send(event);
      if (event.type === 'report_completed' || event.type === 'error') {
        try { streamController?.close(); } catch { /* already closed */ }
        streamController = null;
      }
    },
    base,
    authHeaders,
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
