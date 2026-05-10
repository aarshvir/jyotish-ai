export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getPaymentIntent } from '@/lib/ziina/server';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';
import { getCanonicalDispatchOrigin } from '@/lib/url/canonicalDispatchOrigin';

/**
 * GET /api/cron/reconcile-payments
 * Scans ziina_payments with status=pending older than 5 minutes.
 * Calls Ziina API and finalizes completed intents.
 * Recovery path for users who closed browser before redirect completed.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: pending, error } = await db
    .from('ziina_payments')
    .select('ziina_intent_id, report_id, plan_type')
    .eq('status', 'pending')
    .lt('updated_at', cutoff)
    .limit(20);

  if (error) {
    console.error('[cron/reconcile-payments] query failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, reconciled: 0 });
  }

  const dispatchOrigin = getCanonicalDispatchOrigin(request.nextUrl.origin);
  let reconciled = 0;
  const results: { intentId: string; action: string }[] = [];

  for (const row of pending) {
    try {
      const intent = await getPaymentIntent(row.ziina_intent_id);
      if (intent.status !== 'completed') {
        results.push({ intentId: row.ziina_intent_id, action: `skipped:${intent.status}` });
        continue;
      }
      const fin = await finalizeCompletedZiinaIntent(db, row.ziina_intent_id, dispatchOrigin, { intent });
      results.push({ intentId: row.ziina_intent_id, action: fin.ok ? fin.action : `error:${fin.error.slice(0, 80)}` });
      reconciled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[cron/reconcile-payments] intent', row.ziina_intent_id, ':', msg);
      results.push({ intentId: row.ziina_intent_id, action: `error:${msg.slice(0, 80)}` });
    }
  }

  console.log(`[cron/reconcile-payments] reconciled ${reconciled}/${pending.length}`);
  return NextResponse.json({ ok: true, reconciled, total: pending.length, results });
}
