export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

const PRODUCT_PATHS = ['/kundali', '/synastry', '/pricing', '/onboard', '/free-kundli'];

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const [pv, users, reports, kundalis, synastries, payments] = await Promise.all([
    db.from('analytics_events').select('properties').eq('event_name', 'page_view').limit(50000),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('reports').select('user_id'),
    db.from('kundali_charts').select('user_id'),
    db.from('synastry_charts').select('user_id'),
    db.from('ziina_payments').select('user_id, status'),
  ]);

  const sessions = new Set<string>();
  const productSessions = new Set<string>();
  for (const e of pv.data ?? []) {
    const p = (e.properties ?? {}) as { session_id?: string; path?: string };
    if (!p.session_id) continue;
    sessions.add(p.session_id);
    if (p.path && PRODUCT_PATHS.some((pp) => p.path === pp || p.path!.startsWith(pp))) {
      productSessions.add(p.session_id);
    }
  }

  const reportUsers = new Set<string>();
  const add = (rows: { user_id?: string }[] | null) => {
    for (const r of rows ?? []) if (r.user_id) reportUsers.add(r.user_id);
  };
  add(reportsRes(reports));
  add(reportsRes(kundalis));
  add(reportsRes(synastries));

  const paidUsers = new Set<string>();
  for (const p of payments.data ?? []) {
    const row = p as { user_id?: string; status?: string };
    if (row.status === 'completed' && row.user_id) paidUsers.add(row.user_id);
  }

  return NextResponse.json({
    note: 'Visited/product are anonymous sessions; signup/generated/paid are accounts.',
    stages: [
      { key: 'visited', label: 'Visited the site', count: sessions.size, basis: 'sessions' },
      { key: 'product', label: 'Viewed a product / pricing page', count: productSessions.size, basis: 'sessions' },
      { key: 'signup', label: 'Created an account', count: users.data?.users?.length ?? 0, basis: 'accounts' },
      { key: 'generated', label: 'Generated a report', count: reportUsers.size, basis: 'accounts' },
      { key: 'paid', label: 'Paid', count: paidUsers.size, basis: 'accounts' },
    ],
  });
}

function reportsRes(res: { data: { user_id?: string }[] | null }): { user_id?: string }[] | null {
  return res.data;
}
