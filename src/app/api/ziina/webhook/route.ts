export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import {
  readZiinaWebhookSignature,
  verifyZiinaWebhookSignature,
  shouldEnforceZiinaWebhookIp,
  isZiinaWebhookSenderIp,
} from '@/lib/ziina/verifyWebhook';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';

function extractIntentId(data: Record<string, unknown>): string {
  const id = data.id;
  if (typeof id === 'string' && id) return id;
  const nested = data.payment_intent as { id?: string } | undefined;
  if (typeof nested?.id === 'string') return nested.id;
  return '';
}

function extractIntentStatus(data: Record<string, unknown>): string {
  const st = data.status;
  if (typeof st === 'string') return st;
  const nested = data.payment_intent as { status?: string } | undefined;
  if (typeof nested?.status === 'string') return nested.status;
  return '';
}

function webhookBaseUrl(request: NextRequest): string {
  const envUrl = (process.env.NEXT_PUBLIC_URL ?? '').trim().replace(/\/$/, '');
  if (envUrl) return envUrl;
  return request.nextUrl.origin;
}

/**
 * POST /api/ziina/webhook (optional)
 * Ziina Business: `payment_intent.status.updated` with `X-Hmac-Signature`.
 * **Individual / API-only Ziina:** do not register a webhook URL — leave
 * `ZIINA_WEBHOOK_SECRET` unset; payment completion uses GET `/api/ziina/verify` only.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = (process.env.ZIINA_WEBHOOK_SECRET ?? '').trim();

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'webhook_disabled',
        hint:
          'Ziina Individual plan has no webhooks — use API + redirect only. Do not point Ziina at this URL. Payments finalize at GET /api/ziina/verify.',
      },
      { status: 501 },
    );
  }

  const sig = readZiinaWebhookSignature(request.headers);
  if (!verifyZiinaWebhookSignature(rawBody, secret, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (shouldEnforceZiinaWebhookIp()) {
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-vercel-forwarded-for') ??
      request.headers.get('x-real-ip');
    if (!isZiinaWebhookSenderIp(ip)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let parsed: { event?: string; data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody) as typeof parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = parsed.event ?? '';
  const data = (parsed.data ?? {}) as Record<string, unknown>;

  if (eventName === 'refund.status.updated') {
    return NextResponse.json({ ok: true, skipped: 'refund' }, { status: 200 });
  }

  if (eventName !== 'payment_intent.status.updated') {
    return NextResponse.json({ ok: true, skipped: 'unknown_event' }, { status: 200 });
  }

  const intentId = extractIntentId(data);
  const intentStatus = extractIntentStatus(data);

  if (!intentId) {
    return NextResponse.json({ ok: true, note: 'no_intent_id' }, { status: 200 });
  }

  const eventId = `${intentId}:${eventName}:${intentStatus || 'unknown'}`;
  const db = createServiceClient();

  const { data: seen } = await db
    .from('ziina_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (seen?.event_id) {
    return NextResponse.json({ ok: true, replay: true }, { status: 200 });
  }

  const baseUrl = webhookBaseUrl(request);
  const fin = await finalizeCompletedZiinaIntent(db, intentId, baseUrl);

  if (!fin.ok) {
    return NextResponse.json({ error: fin.error }, { status: 500 });
  }

  const { error: insErr } = await db.from('ziina_webhook_events').insert({
    event_id: eventId,
    event_name: eventName,
    payload: parsed as unknown as Record<string, unknown>,
    processed_at: new Date().toISOString(),
  });

  if (insErr?.code === '23505') {
    return NextResponse.json({ ok: true, replay: true }, { status: 200 });
  }
  if (insErr) {
    console.error('[ziina/webhook] insert ziina_webhook_events:', insErr);
    return NextResponse.json({ error: 'db_insert' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: fin.action }, { status: 200 });
}
