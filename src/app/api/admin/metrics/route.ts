export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents, dayKey, lastNDays, pctDelta, fetchAllAuthUsers, isFreePlan } from '@/lib/admin/analytics';

const mdLabel = (key: string) => { const [, m, d] = key.split('-'); return `${parseInt(m)}/${parseInt(d)}`; };

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(365, Math.max(7, Number.isFinite(daysRaw) ? daysRaw : 30));
  const end = new Date();
  const currFrom = new Date(end); currFrom.setUTCDate(currFrom.getUTCDate() - days);
  const prevFrom = new Date(end); prevFrom.setUTCDate(prevFrom.getUTCDate() - days * 2);
  const inCurr = (t?: string | null) => !!t && new Date(t) >= currFrom && new Date(t) <= end;
  const inPrev = (t?: string | null) => !!t && new Date(t) >= prevFrom && new Date(t) < currFrom;

  const db = createServiceClient();
  const [users, reportsRes, paymentsRes] = await Promise.all([
    fetchAllAuthUsers(db),
    db.from('reports').select('user_id, created_at, plan_type, status, payment_status').limit(50000),
    db.from('ziina_payments').select('user_id, created_at, amount, currency, status, plan_type').eq('status', 'completed').limit(50000),
  ]);
  const reports = reportsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  // ── KPIs (current vs prior equal-length window) ──
  const signups = users.filter((u) => inCurr(u.created_at)).length;
  const prevSignups = users.filter((u) => inPrev(u.created_at)).length;

  const activatedSet = new Set<string>(), prevActivatedSet = new Set<string>();
  for (const r of reports) {
    const u = (r as { user_id?: string }).user_id; if (!u) continue;
    if (r.status === 'complete' && inCurr(r.created_at)) activatedSet.add(u);
    if (r.status === 'complete' && inPrev(r.created_at)) prevActivatedSet.add(u);
  }

  const paidSet = new Set<string>(), prevPaidSet = new Set<string>();
  const paymentsByUser: Record<string, number> = {};
  let revenueUsd = 0, prevRevenueUsd = 0;
  for (const p of payments) {
    const row = p as { user_id?: string; created_at?: string; amount?: number; currency?: string };
    const usd = toUsdCents(row.amount ?? 0, row.currency ?? 'USD');
    if (inCurr(row.created_at)) { revenueUsd += usd; if (row.user_id) paidSet.add(row.user_id); }
    if (inPrev(row.created_at)) { prevRevenueUsd += usd; if (row.user_id) prevPaidSet.add(row.user_id); }
    if (row.user_id) paymentsByUser[row.user_id] = (paymentsByUser[row.user_id] ?? 0) + 1;
  }
  const repeatBuyers = Object.values(paymentsByUser).filter((n) => n >= 2).length;
  const totalRevenueUsd = payments.reduce((s, p) => s + toUsdCents((p as { amount?: number }).amount ?? 0, (p as { currency?: string }).currency ?? 'USD'), 0);

  // ── Daily series over the window ──
  const keys = lastNDays(days, end);
  const idx: Record<string, number> = {}; keys.forEach((k, i) => (idx[k] = i));
  const signupSeries = keys.map(() => 0);
  const reportFree = keys.map(() => 0), reportPaid = keys.map(() => 0);
  const revSeries = keys.map(() => 0);
  for (const u of users) { if (inCurr(u.created_at)) { const i = idx[dayKey(u.created_at!)]; if (i != null) signupSeries[i]++; } }
  for (const r of reports) { if (inCurr(r.created_at)) { const i = idx[dayKey(r.created_at!)]; if (i != null) (isFreePlan(r.plan_type) ? reportFree : reportPaid)[i]++; } }
  for (const p of payments) { const row = p as { created_at?: string; amount?: number; currency?: string }; if (inCurr(row.created_at)) { const i = idx[dayKey(row.created_at!)]; if (i != null) revSeries[i] += toUsdCents(row.amount ?? 0, row.currency ?? 'USD'); } }

  const conv = signups > 0 ? Math.round((paidSet.size / signups) * 1000) / 10 : 0;
  const prevConv = prevSignups > 0 ? Math.round((prevPaidSet.size / prevSignups) * 1000) / 10 : 0;

  return NextResponse.json({
    range: { days, from: currFrom.toISOString(), to: end.toISOString() },
    kpis: {
      signups: { value: signups, delta: pctDelta(signups, prevSignups) },
      activated: { value: activatedSet.size, delta: pctDelta(activatedSet.size, prevActivatedSet.size) },
      paidCustomers: { value: paidSet.size, delta: pctDelta(paidSet.size, prevPaidSet.size) },
      revenueUsd: { value: revenueUsd, delta: pctDelta(revenueUsd, prevRevenueUsd) },
      paidConversion: { value: conv, delta: pctDelta(conv, prevConv) },
      repeatBuyers: { value: repeatBuyers, delta: null },
    },
    totals: { users: users.length, allTimeRevenueUsd: totalRevenueUsd },
    series: {
      signups: keys.map((k, i) => ({ label: mdLabel(k), value: signupSeries[i] })),
      reports: keys.map((k, i) => ({ label: mdLabel(k), a: reportFree[i], b: reportPaid[i] })),
      revenue: keys.map((k, i) => ({ label: mdLabel(k), value: Math.round(revSeries[i] / 100) })),
    },
  });
}
