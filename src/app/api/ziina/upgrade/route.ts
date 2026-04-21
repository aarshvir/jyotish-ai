export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import {
  createPaymentIntent,
  countryToCurrency,
  formatAmount,
  getMonthlyUpgradeAmount,
  isZiinaConfigured,
} from '@/lib/ziina/server';
import { emitUpsellEvent } from '@/lib/analytics/upsellEvents';

/**
 * POST /api/ziina/upgrade
 * Body: { reportId: string }
 * Creates a Ziina intent for the monthly upgrade delta (7-day → monthly, discounted).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isZiinaConfigured()) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { reportId?: string };
  const reportId = body.reportId?.trim();
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: row, error } = await db
    .from('reports')
    .select('id, user_id, plan_type, payment_status')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (row.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Report must be paid before upgrade' }, { status: 400 });
  }
  if (row.plan_type !== '7day') {
    return NextResponse.json({ error: 'Upgrade only available from 7-day plan' }, { status: 400 });
  }

  const { data: parentPay } = await db
    .from('ziina_payments')
    .select('ziina_intent_id')
    .eq('report_id', reportId)
    .eq('plan_type', '7day')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const parentIntentId = parentPay?.ziina_intent_id ?? '';

  const country = request.headers.get('x-vercel-ip-country');
  const currency = countryToCurrency(country);
  const amount = getMonthlyUpgradeAmount(currency);

  const origin = request.nextUrl.origin;
  const successUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=monthly_upgrade&status=success`;
  const cancelUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=monthly_upgrade&status=cancel`;
  const failureUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=monthly_upgrade&status=failure`;

  try {
    const intent = await createPaymentIntent({
      planType: 'monthly_upgrade',
      currency,
      reportId,
      successUrl,
      cancelUrl,
      failureUrl,
      message: 'Upgrade to Monthly Oracle',
    });

    const insertPayload: Record<string, unknown> = {
      ziina_intent_id: intent.id,
      report_id: reportId,
      user_id: auth.user.id,
      amount: intent.amount,
      currency,
      plan_type: 'monthly_upgrade',
      status: 'pending',
    };
    if (parentIntentId) {
      insertPayload.upsell_of_intent_id = parentIntentId;
    }

    await db.from('ziina_payments').insert(insertPayload);

    await emitUpsellEvent(auth.user.id, 'upsell_checkout_started', { reportId, intentId: intent.id });

    return NextResponse.json({
      intentId: intent.id,
      redirectUrl: intent.redirect_url,
      currency,
      amount: intent.amount,
      amountLabel: formatAmount(amount, currency),
    });
  } catch (e) {
    console.error('[ziina/upgrade]', e);
    return NextResponse.json({ error: 'Failed to create upgrade checkout' }, { status: 500 });
  }
}
