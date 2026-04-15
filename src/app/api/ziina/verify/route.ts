export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentIntent } from '@/lib/ziina/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * GET /api/ziina/verify?intentId=...&reportId=...&planType=...&status=success|cancel|failure
 *
 * Ziina redirects the user here after checkout. We verify the intent status
 * with Ziina's API, update the reports table, then redirect to the report page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const intentId = searchParams.get('intentId') ?? '';
  const reportId = searchParams.get('reportId') ?? '';
  const planType = searchParams.get('planType') ?? '';
  const status = searchParams.get('status') ?? '';

  const origin = request.nextUrl.origin;

  // If user cancelled, redirect back to onboard
  if (status === 'cancel') {
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=cancelled`);
  }

  if (!intentId || !reportId) {
    return NextResponse.redirect(`${origin}/onboard?payment=error`);
  }

  try {
    const intent = await getPaymentIntent(intentId);

    if (intent.status !== 'completed') {
      // Not yet paid — could be pending or failed
      const reason = intent.status === 'failed' ? 'failed' : intent.status === 'pending' ? 'pending' : 'incomplete';
      return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=${reason}`);
    }

    // Payment completed — mark the report as paid in Supabase
    const db = createServiceClient();

    try {
      await db.from('ziina_payments').insert({
        ziina_intent_id: intentId,
        amount: intent.amount,
        currency: intent.currency_code,
        plan_type: planType,
        report_id: reportId || null,
        status: 'completed',
      });
    } catch (err) {
      // Non-fatal — log and continue
      console.error('[ziina/verify] payment log failed:', err);
    }

    if (reportId) {
      try {
        await db
          .from('reports')
          .update({ payment_status: 'paid', payment_provider: 'ziina' })
          .eq('id', reportId);
      } catch (err) {
        console.error('[ziina/verify] report update failed:', err);
      }
    }

    // Redirect to the report page — the report URL is stored in the browser's
    // history as the user navigated from onboard → Ziina → here. We encode the
    // reportId in the redirect so the client can navigate there.
    return NextResponse.redirect(`${origin}/report/${reportId}?payment_status=paid`);
  } catch (err) {
    console.error('[ziina/verify] intent fetch failed:', err);
    return NextResponse.redirect(`${origin}/onboard?plan=${planType}&payment=error`);
  }
}
