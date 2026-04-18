/**
 * POST /api/ziina/webhook
 *
 * Ziina → VedicHour server-to-server webhook. Makes payment confirmation
 * independent of the browser redirect to /api/ziina/verify.
 *
 * Flow:
 *   1. Verify HMAC signature (constant-time compare).
 *   2. Parse JSON body; extract event_id + event_type + intent.
 *   3. Insert into ziina_webhook_events — if duplicate event_id (unique constraint),
 *      short-circuit and return 200 (idempotent replay).
 *   4. Look up ziina_payments by intent_id.
 *   5. If intent completed → mark ziina_payments.status = completed, mark
 *      reports.payment_status = paid, emit `report/generate` Inngest event.
 *   6. Return 200 within 3s — heavy work is always async via Inngest.
 *
 * Pillar 1 acceptance: a user who closes the tab immediately after paying
 * still gets a paid report within ~60s thanks to this webhook + Inngest.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { verifyZiinaWebhook } from '@/lib/ziina/verifyWebhook';
import { inngest } from '@/lib/inngest/client';
import type { PipelineInput } from '@/lib/reports/orchestrator';

/**
 * Ziina webhook payload shape (best-effort — adapt to actual schema in prod).
 * We defensively read multiple field paths so minor Ziina API version changes
 * don't break payment confirmation.
 */
interface ZiinaWebhookPayload {
  id?: string;
  event_id?: string;
  event?: string;
  type?: string;
  object?: {
    id?: string;
    status?: string;
    amount?: number;
    currency_code?: string;
  };
  data?: {
    object?: {
      id?: string;
      status?: string;
      amount?: number;
      currency_code?: string;
    };
  };
}

function extractIntent(payload: ZiinaWebhookPayload): {
  intentId: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
} {
  const obj = payload.data?.object ?? payload.object ?? {};
  return {
    intentId: obj.id ?? null,
    status: obj.status ?? null,
    amount: typeof obj.amount === 'number' ? obj.amount : null,
    currency: obj.currency_code ?? null,
  };
}

function extractEventId(payload: ZiinaWebhookPayload, rawBody: string): string {
  // Prefer explicit event_id, fall back to top-level id, then to a hash of the body.
  const explicit = payload.event_id ?? payload.id;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  // Deterministic fallback: timestamp + intent_id keeps idempotency across replays.
  const intentId = extractIntent(payload).intentId ?? 'unknown';
  // Use a simple hash of the body as last-resort dedupe key.
  let hash = 0;
  for (let i = 0; i < rawBody.length; i++) {
    hash = ((hash << 5) - hash + rawBody.charCodeAt(i)) | 0;
  }
  return `${intentId}:${hash >>> 0}`;
}

function extractEventType(payload: ZiinaWebhookPayload): string {
  return payload.event ?? payload.type ?? 'unknown';
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // 1. Verify signature (skipped in dev if no secret set).
  const verification = verifyZiinaWebhook(rawBody, request.headers);
  if (!verification.ok) {
    console.warn('[ziina/webhook] signature verification failed:', verification.reason);
    return NextResponse.json(
      { error: 'invalid_signature', reason: verification.reason },
      { status: 401 },
    );
  }
  if (verification.skipped) {
    console.warn('[ziina/webhook] signature verification SKIPPED (no secret configured)');
  }

  // 2. Parse JSON.
  let payload: ZiinaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ZiinaWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventId = extractEventId(payload, rawBody);
  const eventType = extractEventType(payload);
  const { intentId, status, amount, currency } = extractIntent(payload);

  const db = createServiceClient();

  // 3. Insert dedupe row — unique constraint on event_id enforces idempotency.
  const { error: insertErr } = await db.from('ziina_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    intent_id: intentId,
    payload: payload as unknown as Record<string, unknown>,
  });

  if (insertErr) {
    // 23505 = unique_violation on event_id → we've seen this event before.
    if (insertErr.code === '23505') {
      console.log('[ziina/webhook] duplicate event — idempotent replay:', eventId);
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[ziina/webhook] dedupe insert failed:', insertErr.message);
    // Continue — we'd rather double-process than drop a payment event.
  }

  // Only act on completed intents. Failed / canceled / pending are logged and acknowledged.
  if (status !== 'completed') {
    console.log(`[ziina/webhook] event_type=${eventType} intent=${intentId} status=${status} — no action`);
    await db
      .from('ziina_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', eventId);
    return NextResponse.json({ ok: true, action: 'ignored', status });
  }

  if (!intentId) {
    console.error('[ziina/webhook] completed event missing intent id:', eventId);
    return NextResponse.json({ ok: true, action: 'skipped_missing_intent' });
  }

  // 4. Look up the payment row by intent id.
  const { data: payment, error: lookupErr } = await db
    .from('ziina_payments')
    .select('id, report_id, plan_type, status')
    .eq('ziina_intent_id', intentId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[ziina/webhook] ziina_payments lookup failed:', lookupErr.message);
    // Still ACK so Ziina doesn't retry forever; we can reconcile via logs.
    return NextResponse.json({ ok: true, action: 'lookup_failed' });
  }

  if (!payment) {
    console.warn(
      `[ziina/webhook] no ziina_payments row for intent=${intentId} — ` +
        `may arrive before create-intent insert. Acknowledging; will rely on /verify redirect.`,
    );
    await db
      .from('ziina_webhook_events')
      .update({
        processed_at: new Date().toISOString(),
        process_error: 'no_ziina_payments_row',
      })
      .eq('event_id', eventId);
    return NextResponse.json({ ok: true, action: 'no_payment_row' });
  }

  // 5. Mark payment completed + report paid (idempotent — safe to re-run).
  if (payment.status !== 'completed') {
    const { error: payUpdErr } = await db
      .from('ziina_payments')
      .update({
        status: 'completed',
        amount: amount ?? undefined,
        currency: currency ?? undefined,
      })
      .eq('id', payment.id);
    if (payUpdErr) {
      console.error('[ziina/webhook] ziina_payments update failed:', payUpdErr.message);
    }
  }

  if (payment.report_id) {
    const { error: repUpdErr } = await db
      .from('reports')
      .update({ payment_status: 'paid', payment_provider: 'ziina' })
      .eq('id', payment.report_id)
      .neq('status', 'complete');
    if (repUpdErr) {
      // Non-fatal: report row may not exist yet.
      console.warn('[ziina/webhook] reports update non-fatal:', repUpdErr.message);
    }

    // 6. Dispatch Inngest report generation if we have enough context.
    // Fetch the report row's birth data to build the pipeline input.
    const { data: reportRow } = await db
      .from('reports')
      .select(
        'user_id, user_email, native_name, birth_date, birth_time, birth_city, ' +
          'birth_lat, birth_lng, current_city, current_lat, current_lng, ' +
          'timezone_offset, plan_type, status',
      )
      .eq('id', payment.report_id)
      .maybeSingle();

    if (reportRow && reportRow.status !== 'complete' && process.env.INNGEST_EVENT_KEY) {
      const rawTime = String(reportRow.birth_time ?? '12:00:00').trim();
      const pipelineTime = (() => {
        const parts = rawTime.split(':').filter((p) => p.length > 0);
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return '12:00';
      })();

      const input: PipelineInput = {
        name: String(reportRow.native_name ?? 'Seeker'),
        date: String(reportRow.birth_date ?? ''),
        time: pipelineTime,
        city: String(reportRow.birth_city ?? ''),
        lat: Number(reportRow.birth_lat) || 0,
        lng: Number(reportRow.birth_lng) || 0,
        currentLat: Number(reportRow.current_lat ?? reportRow.birth_lat) || 0,
        currentLng: Number(reportRow.current_lng ?? reportRow.birth_lng) || 0,
        currentCity: String(reportRow.current_city ?? reportRow.birth_city ?? ''),
        timezoneOffset: Number(reportRow.timezone_offset) || 0,
        type: String(payment.plan_type ?? reportRow.plan_type ?? '7day'),
        planType: String(payment.plan_type ?? reportRow.plan_type ?? '7day'),
        paymentStatus: 'paid',
      };

      // Internal auth: service role key lets the pipeline call its own agent routes.
      const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
      const authHeaders: Record<string, string> = {};
      if (serviceKey) authHeaders['x-service-key'] = serviceKey;

      const base =
        process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '') ||
        request.nextUrl.origin;

      try {
        await inngest.send({
          name: 'report/generate',
          data: {
            reportId: payment.report_id,
            userId: String(reportRow.user_id ?? ''),
            userEmail: String(reportRow.user_email ?? ''),
            input,
            base,
            authHeaders,
          },
        });
        console.log(
          `[ziina/webhook] dispatched report/generate for ${payment.report_id}`,
        );
      } catch (err) {
        console.error('[ziina/webhook] Inngest dispatch failed:', err);
        // Still ACK — /api/ziina/verify redirect will also trigger generation when browser returns.
      }
    }
  }

  // 7. Mark webhook event processed.
  await db
    .from('ziina_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', eventId);

  return NextResponse.json({ ok: true });
}
