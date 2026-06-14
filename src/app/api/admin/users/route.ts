export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

type Agg = {
  reports: number;
  paidReports: number;
  kundalis: number;
  synastries: number;
  paid: Record<string, number>;
};

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const [usersRes, reportsRes, kundaliRes, synastryRes, paymentsRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('reports').select('user_id, payment_status'),
    db.from('kundali_charts').select('user_id'),
    db.from('synastry_charts').select('user_id'),
    db.from('ziina_payments').select('user_id, amount, currency, status'),
  ]);

  const byUser: Record<string, Agg> = {};
  const ensure = (id: string): Agg =>
    (byUser[id] ??= { reports: 0, paidReports: 0, kundalis: 0, synastries: 0, paid: {} });

  for (const r of reportsRes.data ?? []) {
    const row = r as { user_id?: string; payment_status?: string };
    if (!row.user_id) continue;
    const u = ensure(row.user_id);
    u.reports++;
    if (row.payment_status === 'paid') u.paidReports++;
  }
  for (const k of kundaliRes.data ?? []) {
    const row = k as { user_id?: string };
    if (row.user_id) ensure(row.user_id).kundalis++;
  }
  for (const s of synastryRes.data ?? []) {
    const row = s as { user_id?: string };
    if (row.user_id) ensure(row.user_id).synastries++;
  }
  for (const p of paymentsRes.data ?? []) {
    const row = p as { user_id?: string; amount?: number; currency?: string; status?: string };
    if (row.status === 'completed' && row.user_id) {
      const u = ensure(row.user_id);
      const c = row.currency ?? 'USD';
      u.paid[c] = (u.paid[c] ?? 0) + (row.amount ?? 0);
    }
  }

  const users = (usersRes.data?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? '(no email)',
      created_at: u.created_at,
      ...(byUser[u.id] ?? { reports: 0, paidReports: 0, kundalis: 0, synastries: 0, paid: {} }),
    }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return NextResponse.json({ users });
}
