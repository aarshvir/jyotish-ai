/**
 * GET /api/reports/[id]/stream
 *
 * Pillar 1 refactor: pure read-side SSE projection.
 *
 * Previously this route invoked `generateReportPipeline` as fire-and-forget,
 * which duplicated the Inngest background run and caused double-executions.
 * Now the pipeline is owned exclusively by Inngest (via /api/reports/start or
 * the Ziina webhook). This route only tails the `reports` row every 1s and
 * emits SSE `phase` frames so alternative clients (e.g. CLI tools) can watch
 * generation progress without hitting the status endpoint 300 times.
 *
 * The main web UI uses Supabase Realtime + /api/reports/[id]/status polling
 * and does NOT rely on this route. It is kept as a public observability API.
 */

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';

const POLL_INTERVAL_MS = 1000;
const MAX_STREAM_MS = 15 * 60 * 1000; // 15 min hard cap on the connection

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const authedUserId = authResult.user.id;

  const { id: reportId } = context.params;

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastStep: string | null = null;
  let lastProgress: number | null = null;
  let lastStatus: string | null = null;
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(event: string, payload: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // stream already closed
        }
      }

      function closeStream() {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        try { controller.close(); } catch { /* already closed */ }
      }

      // Heartbeat: SSE comment every 15s keeps intermediaries from buffering.
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 15_000);

      const db = createServiceClient();

      // Initial hello so the client knows the connection is live.
      send('hello', { reportId, t: Date.now() });

      async function pollOnce() {
        if (Date.now() - startedAt > MAX_STREAM_MS) {
          send('timeout', { reason: 'stream_max_duration' });
          closeStream();
          return;
        }
        try {
          const { data, error } = await db
            .from('reports')
            .select('status, generation_step, generation_progress')
            .eq('id', reportId)
            .eq('user_id', authedUserId)
            .maybeSingle();
          if (error) {
            send('error', { message: error.message });
            return;
          }
          if (!data) {
            send('error', { message: 'not_found' });
            closeStream();
            return;
          }
          const step = (data.generation_step as string | null) ?? null;
          const pct = typeof data.generation_progress === 'number' ? data.generation_progress : null;
          const status = (data.status as string | null) ?? null;

          if (step !== lastStep || pct !== lastProgress || status !== lastStatus) {
            send('phase', {
              slug: step,
              pct: pct ?? 0,
              status,
              t: Date.now(),
            });
            lastStep = step;
            lastProgress = pct;
            lastStatus = status;
          }

          if (status === 'complete') {
            send('complete', { reportId });
            closeStream();
          } else if (status === 'error') {
            send('error', { reportId, message: 'pipeline_error' });
            closeStream();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          send('error', { message: msg });
        }
      }

      void pollOnce();
      pollTimer = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
