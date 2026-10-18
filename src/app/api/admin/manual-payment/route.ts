export const maxDuration = 30;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { recordManualPayment } from '@/lib/subscriptions/manualPayment';

/** Admin only: activate a subscription for a UPI / bank-transfer payment received outside Ziina. */
export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    plan_type?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };

  const result = await recordManualPayment(createServiceClient(), {
    email: body.email ?? '',
    planType: body.plan_type ?? '',
    reference: body.reference ?? '',
    amount: Number(body.amount),
    currency: body.currency ?? 'INR',
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  console.log('[admin/manual-payment]', admin.email, result.intentId, result.granted ? 'granted' : 'already-granted');
  return NextResponse.json({ ok: true, periodEnd: result.periodEnd, alreadyGranted: !result.granted });
}
