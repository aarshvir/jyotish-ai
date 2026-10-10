import { createServiceClient } from '@/lib/supabase/admin';
import {
  sanitizeAttribution,
  sanitizeEventProps,
  type Attribution,
  type CanonicalEventName,
} from './events';

/**
 * Server-side emitter for canonical events (e.g. `purchase` / `refund` from a
 * payment confirmation, where the browser may never come back). Writes to
 * analytics_events with the same property shape /api/events produces.
 * Never throws.
 */
export async function emitServerEvent(
  name: CanonicalEventName,
  props: Record<string, unknown> = {},
  ctx: { userId?: string | null; sessionId?: string | null; attribution?: Attribution } = {},
): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from('analytics_events').insert({
      user_id: ctx.userId ?? null,
      event_name: name,
      properties: {
        ...sanitizeEventProps(name, props),
        ...sanitizeAttribution(ctx.attribution),
        session_id: ctx.sessionId ?? null,
        schema: 1,
        source: 'server',
      },
    });
  } catch {
    /* analytics must never break the caller */
  }
}

/**
 * Cron heartbeat. Lets /admin2 show when each scheduled job last ran and whether
 * it succeeded (Vercel's own cron logs expire within about an hour on this plan).
 */
export async function recordCronRun(job: string, ok: boolean, startedAt: number, detail?: string): Promise<void> {
  await emitServerEvent('cron_run', {
    job,
    ok,
    duration_ms: Date.now() - startedAt,
    detail,
  });
}
