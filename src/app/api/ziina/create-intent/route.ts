export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import {
  createPaymentIntent,
  countryToCurrency,
  isZiinaConfigured,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { getPromoDiscount } from '@/lib/promo/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * POST /api/ziina/create-intent
 * Body: { planType: '7day' | 'monthly' | 'annual', reportId: string }
 * Returns: { intentId, redirectUrl, currency, amount }
 *
 * Country detected from x-vercel-ip-country header → currency selected automatically.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isZiinaConfigured()) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as {
    planType?: string;
    reportId?: string;
    promoCode?: string;
    testMode?: boolean;
  };

  const { planType, reportId, promoCode, testMode } = body;
  if (!planType || !reportId) {
    return NextResponse.json({ error: 'planType and reportId required' }, { status: 400 });
  }

  const promoResult = promoCode
    ? await getPromoDiscount(promoCode, auth.user.email ?? undefined)
    : { valid: false, discountPct: 0 };

  const discountPct = promoResult.valid ? promoResult.discountPct : 0;

  if (discountPct >= 100) {
    return NextResponse.json({ error: 'Use a valid promo code — this report is free' }, { status: 400 });
  }

  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const currency: SupportedCurrency = countryToCurrency(country);

  const origin = request.nextUrl.origin;
  // Encode reportId in the success URL so verify route knows which report was paid.
  const successUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=${planType}&status=success`;
  const cancelUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=${planType}&status=cancel`;
  const failureUrl = `${origin}/api/ziina/verify?intentId={PAYMENT_INTENT_ID}&reportId=${reportId}&planType=${planType}&status=failure`;

  try {
    const intent = await createPaymentIntent({
      planType,
      currency,
      reportId,
      successUrl,
      cancelUrl,
      failureUrl,
      discountPct: discountPct > 0 ? discountPct : undefined,
      test: testMode ?? false,
    });

    // Store intentId → reportId binding server-side so the verify route can
    // confirm the reportId in the redirect URL hasn't been tampered with.
    // Non-fatal: if the ziina_payments table hasn't been migrated yet, the
    // payment redirect still works — verify route falls back to URL param.
    const db = createServiceClient();
    const { error: dbErr } = await db.from('ziina_payments').insert({
      ziina_intent_id: intent.id,
      report_id: reportId,
      amount: intent.amount,
      currency: currency,
      plan_type: planType,
      status: 'pending',
    });
    if (dbErr) {
      console.warn('[ziina/create-intent] ziina_payments insert failed (table may not exist yet):', dbErr.message);
    }

    return NextResponse.json({
      intentId: intent.id,
      redirectUrl: intent.redirect_url,
      currency,
      amount: intent.amount,
      discountPct,
    });
  } catch (err) {
    console.error('[ziina/create-intent]', err);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
