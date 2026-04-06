export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createOrder, isTestMode } from '@/lib/razorpay/server';

/**
 * POST /api/razorpay/create-order
 * Body: { planType: '7day' | 'monthly' | 'annual', reportId: string }
 * Returns: { orderId, amount, currency, keyId, testMode }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { planType, reportId } = body as { planType?: string; reportId?: string };

  if (!planType || !reportId) {
    return NextResponse.json({ error: 'planType and reportId required' }, { status: 400 });
  }

  try {
    const order = await createOrder(planType, reportId);
    return NextResponse.json({ ...order, testMode: isTestMode() });
  } catch (err) {
    console.error('[razorpay/create-order]', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
