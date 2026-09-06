export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getPaymentIntent } from '@/lib/ziina/server';
import { getCanonicalDispatchOrigin } from '@/lib/url/canonicalDispatchOrigin';
import { sendFounderDigest, runAbandonedCheckoutRecovery, runPreviewNurture } from '@/lib/notify/lifecycle';
import { drainReconcilePayments } from '@/lib/ziina/reconcilePayments';

/**
 * GET /api/cron/reconcile-payments
 * Drains ziina_payments with status=pending older than 5 minutes.
 * Calls Ziina API and finalizes completed intents.
 * Recovery path for users who closed browser before redirect completed
 * (Ziina Individual has no webhooks — verify redirect is otherwise the only path).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Daily lifecycle work runs first so it fires even when there are no pending payments
  // (folded in here because Vercel Hobby caps cron jobs at 2). Both no-op until
  // RESEND_API_KEY / TWILIO_* are set, and never throw.
  const recovery = await runAbandonedCheckoutRecovery();
  const nurture = await runPreviewNurture();
  const digest = await sendFounderDigest();

  const db = createServiceClient();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const dispatchOrigin = getCanonicalDispatchOrigin(request.nextUrl.origin);

  const drain = await drainReconcilePayments(db, {
    dispatchOrigin,
    getPaymentIntent,
    cutoffIso: cutoff,
  });

  if (drain.error && drain.scanned === 0) {
    return NextResponse.json({ error: drain.error }, { status: 500 });
  }

  console.log(
    `[cron/reconcile-payments] reconciled ${drain.reconciled}/${drain.scanned} (actions=${drain.results.length})`,
  );
  return NextResponse.json({
    ok: true,
    reconciled: drain.reconciled,
    total: drain.scanned,
    results: drain.results,
    recovery,
    nurture,
    digest,
  });
}
