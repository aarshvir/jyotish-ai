export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';

export interface PaymentRecord {
  id: string;
  provider: 'ziina';
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
 * Returns Ziina payment history for the authenticated user, sorted newest-first.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const userId = auth.user.id;

  // ziina_payments has no user_id — join via reports
  const { data, error } = await supabase
    .from('ziina_payments')
    .select(
      'id, ziina_intent_id, amount, currency, plan_type, status, created_at, report_id, reports!inner(user_id)',
    )
    .eq('reports.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[/api/user/payments] query failed:', error.message);
  }

  const payments: PaymentRecord[] = (data ?? []).map((z) => ({
    id: z.id,
    provider: 'ziina',
    amount: z.amount,
    currency: z.currency,
    plan_type: z.plan_type ?? null,
    status: z.status,
    created_at: z.created_at,
    report_id: z.report_id ?? null,
    transaction_ref: z.ziina_intent_id,
  }));

  return NextResponse.json({ payments });
}
