export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

const MIN = 60_000;

/**
 * Ops / health — the "needs attention" panel. Surfaces money-losing failures:
 * failed report generations, reports stuck mid-generation, and failed/abandoned
 * payment intents.
 */
export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const now = Date.now();
  const [reportsRes, paymentsRes] = await Promise.all([
    db.from('reports').select('id, user_email, status, plan_type, payment_status, created_at, generation_started_at').order('created_at', { ascending: false }).limit(50000),
    db.from('ziina_payments').select('id, user_id, status, plan_type, amount, currency, created_at').order('created_at', { ascending: false }).limit(50000),
  ]);
  const reports = reportsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  // Terminal report failures are written as status 'error' (markReportAsFailed + the
  // Inngest paths) — NOT 'failed' (no code ever writes that), so this panel showed 0.
  const failedReports = reports.filter((r) => r.status === 'error');
  const stuck = reports.filter((r) => {
    if (r.status !== 'generating') return false;
    const t = r.generation_started_at ?? r.created_at;
    return t ? now - new Date(t).getTime() > 15 * MIN : false;
  });
  // Paid report rows that never completed (paid but not delivered) — highest urgency.
  const paidNotDelivered = reports.filter((r) => r.payment_status === 'paid' && r.status !== 'complete');

  // NOTE: ziina_payments.status is only ever 'pending' | 'cancelled' | 'completed' —
  // 'failed' is never written, so a failedPayments stat keyed on it was always 0 and
  // hid real abandonment. Abandoned checkouts surface via stalePending below; genuine
  // paid-but-undelivered cases surface via paidNotDelivered above. Stat removed.
  const stalePending = payments.filter((p) => p.status === 'pending' && p.created_at && now - new Date(p.created_at).getTime() > 60 * MIN);

  const slim = <T extends Record<string, unknown>>(rows: T[], n = 15) => rows.slice(0, n);

  return NextResponse.json({
    summary: {
      failedReports: failedReports.length,
      stuckReports: stuck.length,
      paidNotDelivered: paidNotDelivered.length,
      stalePending: stalePending.length,
    },
    paidNotDelivered: slim(paidNotDelivered.map((r) => ({ id: r.id, email: r.user_email, plan: r.plan_type, status: r.status, at: r.created_at }))),
    failedReports: slim(failedReports.map((r) => ({ id: r.id, email: r.user_email, plan: r.plan_type, at: r.created_at }))),
    stuckReports: slim(stuck.map((r) => ({ id: r.id, email: r.user_email, plan: r.plan_type, since: r.generation_started_at ?? r.created_at }))),
    stalePending: slim(stalePending.map((p) => ({ id: p.id, plan: p.plan_type, amount: p.amount, currency: p.currency, at: p.created_at }))),
  });
}
