export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import {
  createPaymentIntent,
  countryToCurrency,
  isZiinaConfigured,
  type SupportedCurrency,
} from '@/lib/ziina/server';

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
    testMode?: boolean;
  };

  const { planType, reportId, testMode } = body;
  if (!planType || !reportId) {
    return NextResponse.json({ error: 'planType and reportId required' }, { status: 400 });
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
      test: testMode ?? false,
    });

    return NextResponse.json({
      intentId: intent.id,
      redirectUrl: intent.redirect_url,
      currency,
      amount: intent.amount,
    });
  } catch (err) {
    console.error('[ziina/create-intent]', err);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
