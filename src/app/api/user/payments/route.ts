export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';

export interface PaymentRecord {
  id: string;
  provider: 'ziina' | 'razorpay';
  amount: number;
  currency: string;
  plan_type: string | null;
  status: string;
  created_at: string;
  report_id: string | null;
  transaction_ref: string;
}

/**
 * GET /api/user/payments
 * Returns combined Ziina + Razorpay payment history for the authenticated user,
 * sorted newest-first.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const userId = auth.user.id;

  const [ziinaResult, razorpayResult] = await Promise.all([
    // ziina_payments has no user_id — join via reports
    supabase
      .from('ziina_payments')
      .select('id, ziina_intent_id, amount, currency, plan_type, status, created_at, report_id, reports!inner(user_id)')
      .eq('reports.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),

    // razorpay_payments has user_id directly
    supabase
      .from('razorpay_payments')
      .select('id, razorpay_payment_id, amount, currency, plan_type, status, created_at, report_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const payments: PaymentRecord[] = [];

  if (ziinaResult.data) {
    for (const z of ziinaResult.data) {
      payments.push({
        id: z.id,
        provider: 'ziina',
        amount: z.amount,
        currency: z.currency,
        plan_type: z.plan_type ?? null,
        status: z.status,
        created_at: z.created_at,
        report_id: z.report_id ?? null,
        transaction_ref: z.ziina_intent_id,
      });
    }
  }

  if (razorpayResult.data) {
    for (const r of razorpayResult.data) {
      payments.push({
        id: r.id,
        provider: 'razorpay',
        amount: r.amount,
        currency: r.currency,
        plan_type: r.plan_type ?? null,
        status: r.status,
        created_at: r.created_at,
        report_id: r.report_id ?? null,
        transaction_ref: r.razorpay_payment_id,
      });
    }
  }

  // Sort combined list newest first
  payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ payments });
}
