export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import {
  createPaymentIntent,
  getPaymentIntent,
  countryToCurrency,
  formatAmount,
  getMonthlyUpgradeAmount,
  isZiinaConfigured,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { getReusablePendingZiinaIntent } from '@/lib/ziina/pendingIntentReuse';
import { emitUpsellEvent } from '@/lib/analytics/upsellEvents';
import { isMonthlyUpgradeReady } from '@/lib/ziina/monthlyUpgradeSafety';

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
    .select('id, user_id, plan_type, payment_status, status, report_data')
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
  // The automatic post-payment upsell can render while the base report is still
  // generating. Charging before seven days exist makes the async extension fail
  // permanently, so keep checkout closed until its required input is durable.
  if (!isMonthlyUpgradeReady(row)) {
    return NextResponse.json(
      { error: 'Your 7-day report is still generating. Please try the upgrade again once it is ready.' },
      { status: 409 },
    );
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

  // Honour the user's manual currency pick (vh_currency cookie) over geo-IP so the
  // upgrade charge matches the currency used for the original purchase + the display.
  const cookieRaw = (() => {
    const raw = request.headers.get('cookie');
    if (!raw) return null;
    for (const part of raw.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      if (part.slice(0, eq).trim() === 'vh_currency') return decodeURIComponent(part.slice(eq + 1).trim());
    }
    return null;
  })();
  const cookieCurrency: SupportedCurrency | null =
    cookieRaw === 'USD' || cookieRaw === 'INR' || cookieRaw === 'AED' ? cookieRaw : null;
  const country = request.headers.get('x-vercel-ip-country');
  const currency = cookieCurrency ?? countryToCurrency(country);
  const amount = getMonthlyUpgradeAmount(currency);

  // Duplicate-charge guards (mirror create-intent). Without these a double-submit /
  // back-button while the report is still 7day mints two monthly_upgrade intents and
  // the buyer can pay BOTH for one upgrade.
  // 1) Already upgraded (a prior monthly_upgrade completed): nothing to charge.
  const { data: completedUpgrade } = await db
    .from('ziina_payments')
    .select('ziina_intent_id')
    .eq('report_id', reportId)
    .eq('plan_type', 'monthly_upgrade')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();
  if (completedUpgrade) {
    return NextResponse.json({ alreadyUpgraded: true, redirectUrl: `/report/${reportId}?payment_status=paid` });
  }
  // 2) Reuse a recent (<90s) still-payable pending upgrade intent at the same currency/amount.
  const pendingCutoff = new Date(Date.now() - 90 * 1000).toISOString();
  const { data: pendingUpgrade } = await db
    .from('ziina_payments')
    .select('ziina_intent_id')
    .eq('user_id', auth.user.id)
    .eq('report_id', reportId)
    .eq('plan_type', 'monthly_upgrade')
    .eq('status', 'pending')
    .gte('created_at', pendingCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingUpgrade?.ziina_intent_id) {
    try {
      const existingIntent = await getPaymentIntent(pendingUpgrade.ziina_intent_id);
      const reusable = getReusablePendingZiinaIntent(existingIntent, { currency, expectedAmount: amount });
      if (reusable) {
        return NextResponse.json({
          intentId: reusable.id,
          redirectUrl: reusable.redirect_url,
          currency,
          amount: reusable.amount,
          amountLabel: formatAmount(amount, currency),
        });
      }
    } catch (e) {
      console.warn('[ziina/upgrade] pending intent lookup failed (continuing with new intent):', e);
    }
  }

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

    // Supersede older still-pending upgrade rows for this (user, report) so repeated
    // attempts don't leave a pile of payable pending intents.
    await db
      .from('ziina_payments')
      .update({ status: 'cancelled' })
      .eq('user_id', auth.user.id)
      .eq('report_id', reportId)
      .eq('plan_type', 'monthly_upgrade')
      .eq('status', 'pending');

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
