export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents, fetchAllAuthUsers } from '@/lib/admin/analytics';

/**
 * Customer call-list for the founder's phone-call workflow. Surfaces every user
 * who left a phone number (captured at onboarding) with the context to make the
 * call meaningful: name, plan, spend, report count, last activity.
 */
export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const [users, reportsRes, paymentsRes] = await Promise.all([
    fetchAllAuthUsers(db),
    db.from('reports').select('user_id, phone, native_name, plan_type, payment_status, created_at').order('created_at', { ascending: false }).limit(50000),
    db.from('ziina_payments').select('user_id, amount, currency, status').eq('status', 'completed').limit(50000),
  ]);

  const spend: Record<string, number> = {};
  for (const p of paymentsRes.data ?? []) {
    const row = p as { user_id?: string; amount?: number; currency?: string };
    if (row.user_id) spend[row.user_id] = (spend[row.user_id] ?? 0) + toUsdCents(row.amount ?? 0, row.currency ?? 'USD');
  }

  type Agg = { phone: string; name: string; reports: number; lastPlan: string; paidEver: boolean; lastActivity: string };
  const byUser: Record<string, Agg> = {};
  for (const r of reportsRes.data ?? []) {
    const row = r as { user_id?: string; phone?: string | null; native_name?: string; plan_type?: string; payment_status?: string; created_at?: string };
    if (!row.user_id) continue;
    const cur = byUser[row.user_id];
    if (!cur) {
      byUser[row.user_id] = {
        phone: row.phone?.trim() ?? '',
        name: row.native_name ?? '',
        reports: 1,
        lastPlan: row.plan_type ?? '',
        paidEver: row.payment_status === 'paid',
        lastActivity: row.created_at ?? '',
      };
    } else {
      cur.reports++;
      if (!cur.phone && row.phone?.trim()) cur.phone = row.phone.trim();
      if (row.payment_status === 'paid') cur.paidEver = true;
    }
  }

  const usersById = new Map(users.map((u) => [u.id, u]));
  const list = Object.entries(byUser)
    .filter(([, a]) => a.phone)
    .map(([uid, a]) => ({
      userId: uid,
      email: usersById.get(uid)?.email ?? '',
      name: a.name,
      phone: a.phone,
      reports: a.reports,
      lastPlan: a.lastPlan,
      paidEver: a.paidEver,
      spendUsd: spend[uid] ?? 0,
      lastActivity: a.lastActivity,
    }))
    .sort((x, y) => y.spendUsd - x.spendUsd || (y.lastActivity > x.lastActivity ? 1 : -1));

  return NextResponse.json({ count: list.length, customers: list });
}
