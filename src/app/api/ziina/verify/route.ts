export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent } from '@/lib/ziina/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';
import { getCanonicalDispatchOrigin } from '@/lib/url/canonicalDispatchOrigin';

/**
 * GET /api/ziina/verify?intentId=...&reportId=...&planType=...&status=success|cancel|failure
 *
 * Ziina redirects the user here after checkout. We:
 *  1. Look up the stored intentId → reportId binding in ziina_payments (IDOR protection)
 *  2. Verify intent status with Ziina's API
 *  3. Apply the same completion logic as POST /api/ziina/webhook (idempotent), then redirect
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const intentId = searchParams.get('intentId') ?? '';
  const planType = searchParams.get('planType') ?? '';
  const status = searchParams.get('status') ?? '';

  const origin = request.nextUrl.origin;
  /** Internal orchestrator / extend fetches — stable prod URL when env overrides are set */
  const dispatchOrigin = getCanonicalDispatchOrigin(origin);

  if (status === 'cancel') {
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=cancelled`);
  }

  if (!intentId) {
    return NextResponse.redirect(`${origin}/onboard?payment=error`);
  }

  const db = createServiceClient();
  const urlReportId = searchParams.get('reportId') ?? '';

  try {
    const { data: storedIntent, error: lookupErr } = await db
      .from('ziina_payments')
      .select('report_id, plan_type, status, upsell_of_intent_id, user_id')
      .eq('ziina_intent_id', intentId)
      .maybeSingle();

    if (lookupErr) {
      console.warn('[ziina/verify] DB lookup failed:', lookupErr.message);
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    if (!storedIntent) {
      console.error('[ziina/verify] completed intent has no server-side payment binding', {
        intentId,
        urlReportId,
      });
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    const resolvedPlanType: string = storedIntent.plan_type ?? planType ?? '';
    const isSynastry = resolvedPlanType === 'synastry' || planType === 'synastry';

    if (storedIntent.status === 'completed' && isSynastry) {
      return NextResponse.redirect(`${origin}/synastry?unlocked=1`);
    }

    if (storedIntent.status === 'completed' && storedIntent.report_id) {
      if (storedIntent.user_id) {
        const { data: completedReport, error: completedReportErr } = await db
          .from('reports')
          .select('user_id')
          .eq('id', storedIntent.report_id)
          .maybeSingle();
        if (completedReportErr) {
          console.warn('[ziina/verify] completed report ownership lookup failed:', completedReportErr.message);
          return NextResponse.redirect(`${origin}/onboard?payment=error`);
        }
        if (completedReport && completedReport.user_id !== storedIntent.user_id) {
          console.error('[ziina/verify] completed intent/report owner mismatch', {
            intentId,
            reportId: storedIntent.report_id,
          });
          return NextResponse.redirect(`${origin}/onboard?payment=error`);
        }
      }
      return NextResponse.redirect(`${origin}/report/${storedIntent.report_id}?payment_status=paid`);
    }

    const reportId: string = storedIntent.report_id ?? '';
    if (!reportId && !isSynastry) {
      console.error('[ziina/verify] no reportId available from DB or URL');
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    const intent = await getPaymentIntent(intentId);

    if (intent.status !== 'completed') {
      const reason =
        intent.status === 'failed'
          ? 'failed'
          : intent.status === 'pending'
            ? 'pending'
            : 'incomplete';
      return NextResponse.redirect(`${origin}/onboard?plan=${resolvedPlanType}&payment=${reason}`);
    }

    const fin = await finalizeCompletedZiinaIntent(db, intentId, dispatchOrigin, { intent });

    if (!fin.ok) {
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    if (isSynastry) {
      return NextResponse.redirect(`${origin}/synastry?unlocked=1`);
    }

    if (fin.action === 'no_binding') {
      console.error('[ziina/verify] completed intent has no server-side payment binding', {
        intentId,
        reportId,
      });
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    if (resolvedPlanType === 'monthly_upgrade' || storedIntent.plan_type === 'monthly_upgrade') {
      return NextResponse.redirect(`${origin}/report/${reportId}?payment_status=paid&upgraded=1`);
    }

    const upsellEnabled = process.env.UPSELL_ENABLED !== 'false';
    if (upsellEnabled && (resolvedPlanType === '7day' || planType === '7day')) {
      const { data: rep } = await db
        .from('reports')
        .select('user_id, upsell_dismissed_at')
        .eq('id', reportId)
        .maybeSingle();

      if (rep?.user_id && !rep.upsell_dismissed_at) {
        const { count } = await db
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', rep.user_id)
          .eq('plan_type', 'monthly')
          .eq('payment_status', 'paid')
          .neq('id', reportId);

        if ((count ?? 0) === 0) {
          await db
            .from('reports')
            .update({ upsell_shown_at: new Date().toISOString() })
            .eq('id', reportId);
          return NextResponse.redirect(
            `${origin}/upsell?reportId=${reportId}&offerType=7day-to-monthly`,
          );
        }
      }
    }

    return NextResponse.redirect(`${origin}/report/${reportId}?payment_status=paid`);
  } catch (err) {
    console.error('[ziina/verify] failed:', err);
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=error`);
  }
}
