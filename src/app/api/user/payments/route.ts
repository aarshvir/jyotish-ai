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

  // Filter directly on ziina_payments.user_id. A reports!inner join would drop
  // every standalone (synastry/kundali) purchase, which is inserted with
  // report_id = NULL — so a buyer of those unlocks saw no record of the charge.
  // Only return real charges: each re-checkout supersedes prior intents to
  // 'cancelled' and inserts a fresh 'pending' row, so without this filter the
  // history shows phantom transactions and an inflated count.
  const { data, error } = await supabase
    .from('ziina_payments')
    .select(
      'id, ziina_intent_id, amount, currency, plan_type, status, created_at, report_id',
    )
    .eq('user_id', userId)
    .in('status', ['completed', 'refunded'])
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
