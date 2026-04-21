export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent } from '@/lib/ziina/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { inngest } from '@/lib/inngest/client';
import { extendReportToMonthly } from '@/lib/reports/extendMonthly';
import {
  dispatchReportGenerateForPaidReport,
  finalizeCompletedZiinaIntent,
} from '@/lib/ziina/finalizeIntent';

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
      .select('report_id, plan_type, status, upsell_of_intent_id')
      .eq('ziina_intent_id', intentId)
      .maybeSingle();

    if (lookupErr) {
      console.warn('[ziina/verify] DB lookup failed (falling back to URL param):', lookupErr.message);
    }

    if (storedIntent?.status === 'completed' && storedIntent.report_id) {
      return NextResponse.redirect(`${origin}/report/${storedIntent.report_id}?payment_status=paid`);
    }

    const reportId: string = storedIntent?.report_id ?? urlReportId;
    if (!reportId) {
      console.error('[ziina/verify] no reportId available from DB or URL');
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }
    const resolvedPlanType: string = storedIntent?.plan_type ?? planType ?? '';

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

    const fin = await finalizeCompletedZiinaIntent(db, intentId, origin, { intent });

    if (!fin.ok) {
      return NextResponse.redirect(`${origin}/onboard?payment=error`);
    }

    if (resolvedPlanType === 'synastry' || planType === 'synastry') {
      return NextResponse.redirect(`${origin}/synastry?unlocked=1`);
    }

    if (fin.action === 'no_binding') {
      await db
        .from('ziina_payments')
        .update({ status: 'completed', amount: intent.amount, currency: intent.currency_code })
        .eq('ziina_intent_id', intentId);

      if (resolvedPlanType === 'monthly_upgrade') {
        await db
          .from('reports')
          .update({
            payment_status: 'paid',
            payment_provider: 'ziina',
            plan_type: 'monthly',
            upsell_converted_at: new Date().toISOString(),
          })
          .eq('id', reportId);
        const hasInngest = !!(process.env.INNGEST_EVENT_KEY ?? '').trim();
        if (hasInngest) {
          try {
            await inngest.send({
              name: 'report/extend',
              data: { reportId, baseUrl: origin },
            });
          } catch (e) {
            console.warn('[ziina/verify] Inngest send failed — inline extend:', e);
            void extendReportToMonthly(origin, reportId).catch((err) =>
              console.error('[ziina/verify] inline extend failed:', err),
            );
          }
        } else {
          void extendReportToMonthly(origin, reportId).catch((err) =>
            console.error('[ziina/verify] inline extend failed:', err),
          );
        }
        return NextResponse.redirect(`${origin}/report/${reportId}?payment_status=paid&upgraded=1`);
      }

      await db
        .from('reports')
        .update({ payment_status: 'paid', payment_provider: 'ziina' })
        .eq('id', reportId);

      if (resolvedPlanType !== 'monthly_upgrade') {
        await dispatchReportGenerateForPaidReport(db, reportId, origin);
      }
    }

    if (resolvedPlanType === 'monthly_upgrade' || storedIntent?.plan_type === 'monthly_upgrade') {
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
