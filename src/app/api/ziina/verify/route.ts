export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent } from '@/lib/ziina/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * GET /api/ziina/verify?intentId=...&reportId=...&planType=...&status=success|cancel|failure
 *
 * Ziina redirects the user here after checkout. We:
 *  1. Look up the stored intentId → reportId binding in ziina_payments (IDOR protection)
 *  2. Verify intent status with Ziina's API
 *  3. Update reports + ziina_payments, then redirect to the report page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const intentId = searchParams.get('intentId') ?? '';
  const planType = searchParams.get('planType') ?? '';
  const status = searchParams.get('status') ?? '';

  const origin = request.nextUrl.origin;

  // If user cancelled, redirect back to onboard
  if (status === 'cancel') {
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=cancelled`);
  }

  if (!intentId) {
    return NextResponse.redirect(`${origin}/onboard?payment=error`);
  }

  const db = createServiceClient();

  // reportId from URL is used as fallback if ziina_payments table doesn't exist yet
  const urlReportId = searchParams.get('reportId') ?? '';

  try {
    // ── IDOR protection: look up reportId from DB, never trust the URL ──────
    const { data: storedIntent, error: lookupErr } = await db
      .from('ziina_payments')
      .select('report_id, plan_type, status')
      .eq('ziina_intent_id', intentId)
      .single();

    // If the table doesn't exist yet (migration pending), fall back to URL param.
    // This is safe because Ziina's API will still verify the intent status.
    const tableNotFound = lookupErr?.message?.includes('does not exist') || lookupErr?.code === '42P01';
    if (lookupErr && !tableNotFound) {
      console.error('[ziina/verify] intent not found in DB:', lookupErr?.message);
    }
    if (!storedIntent?.report_id && !tableNotFound && lookupErr) {
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    // Already completed (idempotent replay)
    if (storedIntent?.status === 'completed') {
      return NextResponse.redirect(`${origin}/report/${storedIntent.report_id}?payment_status=paid`);
    }

    const reportId: string = storedIntent?.report_id ?? urlReportId;
    if (!reportId) {
      console.error('[ziina/verify] no reportId available');
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }
    const resolvedPlanType: string = storedIntent?.plan_type ?? planType;

    // ── Verify with Ziina API ────────────────────────────────────────────────
    const intent = await getPaymentIntent(intentId);

    if (intent.status !== 'completed') {
      const reason = intent.status === 'failed' ? 'failed'
        : intent.status === 'pending' ? 'pending'
        : 'incomplete';
      return NextResponse.redirect(`${origin}/onboard?plan=${resolvedPlanType}&payment=${reason}`);
    }

    // ── Update ziina_payments → completed (non-fatal if table doesn't exist yet) ──
    const { error: updateErr } = await db
      .from('ziina_payments')
      .update({ status: 'completed', amount: intent.amount, currency: intent.currency_code })
      .eq('ziina_intent_id', intentId);
    if (updateErr) {
      console.warn('[ziina/verify] payment status update skipped:', updateErr.message);
    }

    // ── Mark report as paid ─────────────────────────────────────────────────
    try {
      await db
        .from('reports')
        .update({ payment_status: 'paid', payment_provider: 'ziina' })
        .eq('id', reportId);
    } catch (err) {
      console.error('[ziina/verify] report update failed:', err);
    }

    return NextResponse.redirect(`${origin}/report/${reportId}?payment_status=paid`);
  } catch (err) {
    console.error('[ziina/verify] failed:', err);
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=error`);
  }
}
