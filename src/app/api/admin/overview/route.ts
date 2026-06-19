export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { fetchAllAuthUsers } from '@/lib/admin/analytics';

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const [users, reports, paidPayments, kundalis, synastries, promo] = await Promise.all([
    // Paginate all signups — a single listUsers page caps at 1000 (and GoTrue may
    // cap lower), which undercounted total + last-7-day signups (the #88 class).
    fetchAllAuthUsers(db),
    db.from('reports').select('id', { count: 'exact', head: true }),
    // count:'exact' gives the true paidOrders, but the rows used to sum revenue
    // must not be capped at PostgREST's default 1000 or revenue undercounts.
    db.from('ziina_payments').select('amount, currency', { count: 'exact' }).eq('status', 'completed').limit(50000),
    db.from('kundali_charts').select('id', { count: 'exact', head: true }),
    db.from('synastry_charts').select('id', { count: 'exact', head: true }),
    db.from('promo_codes').select('id', { count: 'exact', head: true }).eq('active', true),
  ]);

  const now = Date.now();
  const signupsLast7 = users.filter(
    (u) => u.created_at && now - new Date(u.created_at).getTime() < 7 * 86_400_000,
  ).length;

  const revenue: Record<string, number> = {};
  for (const p of paidPayments.data ?? []) {
    const row = p as { amount?: number; currency?: string };
    const c = row.currency ?? 'USD';
    revenue[c] = (revenue[c] ?? 0) + (row.amount ?? 0);
  }

  return NextResponse.json({
    signups: users.length,
    signupsLast7,
    reports: reports.count ?? 0,
    paidOrders: paidPayments.count ?? 0,
    kundalis: kundalis.count ?? 0,
    synastries: synastries.count ?? 0,
    activeCoupons: promo.count ?? 0,
    revenue,
  });
}
