export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { verifyPaymentSignature } from '@/lib/razorpay/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * POST /api/razorpay/verify-payment
 * Body: { orderId, paymentId, signature, planType, reportId, amount, currency }
 * Verifies Razorpay signature, logs to razorpay_payments, marks report as paid.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { orderId, paymentId, signature, planType, reportId, amount, currency } = body as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
    planType?: string;
    reportId?: string;
    amount?: number;
    currency?: string;
  };

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'orderId, paymentId, signature required' }, { status: 400 });
  }

  const valid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  const db = createServiceClient();

  // Log payment
  try {
    await db.from('razorpay_payments').insert({
      user_id: auth.user.id,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: amount ?? 0,
      currency: currency ?? 'INR',
      plan_type: planType ?? 'unknown',
      report_id: reportId ?? null,
      status: 'completed',
    });
  } catch (err) {
    console.error('[razorpay/verify-payment] payment log failed:', err);
  }

  // Mark report as paid
  if (reportId) {
    try {
      await db
        .from('reports')
        .update({ payment_status: 'paid', payment_provider: 'razorpay' })
        .eq('id', reportId)
        .eq('user_id', auth.user.id);
    } catch (err) {
      console.error('[razorpay/verify-payment] report update failed:', err);
    }
  }

  return NextResponse.json({ ok: true, verified: true });
}
