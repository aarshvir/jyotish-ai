import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, isTestMode } from '@/lib/stripe/server';

/**
 * POST /api/stripe/create-checkout
 * Body: { priceId?, userId?, userEmail?, reportParams? } (reportParams used when test mode to build redirect)
 * Test mode: if STRIPE_SECRET_KEY starts with "your_", skip payment and return redirect to report.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { priceId, userId, userEmail, reportParams } = body as {
      priceId?: string;
      userId?: string;
      userEmail?: string;
      reportParams?: Record<string, string>;
    };

    if (isTestMode) {
      const base = request.nextUrl.origin;
      const reportId = Date.now();
      const query = reportParams
        ? new URLSearchParams(reportParams).toString()
        : '';
      const url = `${base}/report/${reportId}${query ? `?${query}` : ''}`;
      return NextResponse.json({
        sessionId: 'test_skip',
        url,
        skipPayment: true,
      });
    }

    if (!priceId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'priceId, userId, userEmail required' },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession({
      priceId,
      userId,
      userEmail,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
