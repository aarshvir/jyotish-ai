import { NextRequest, NextResponse } from 'next/server';
import { isTestMode } from '@/lib/stripe/server';

/**
 * POST /api/stripe/webhook
 * Stripe webhook. When STRIPE_SECRET_KEY starts with "your_" (test mode), return 200 and skip.
 */
export async function POST(request: NextRequest) {
  if (isTestMode()) {
    return NextResponse.json({ received: true });
  }
  const body = await request.text();
  const res = await fetch(`${request.nextUrl.origin}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'stripe-signature': request.headers.get('stripe-signature') ?? '',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
