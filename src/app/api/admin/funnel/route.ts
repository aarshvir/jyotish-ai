export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { fetchAllAuthUsers } from '@/lib/admin/analytics';

// Product/tool surfaces = paid product pages + the free calculators and SEO
// explainer pages that are the actual top of funnel (the funnel was blind to them).
const PRODUCT_PATHS = [
  '/kundali', '/synastry', '/pricing', '/onboard', '/free-kundli',
  '/moon-sign-calculator', '/nakshatra-finder', '/lagna-calculator',
  '/manglik-dosha-calculator', '/kaal-sarp-dosha-calculator',
  '/sade-sati-calculator', '/vimshottari-dasha-calculator',
  '/dasha', '/nakshatra', '/horoscope', '/hora', '/muhurat', '/transit', '/predictions', '/compare',
];

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 30));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const sinceMs = Date.parse(since);

  const db = createServiceClient();
  // All selects are windowed (.gte created_at) AND capped at 50000 with newest
  // rows first: PostgREST caps at 1000 by default, and an uncapped/oldest-first
  // fetch silently freezes the funnel at the first 50k events ever written.
  // listUsers is paginated for the same reason (#88 class) so the signup stage
  // agrees with the 'New signups' KPI on the same screen.
  const [pv, users, reports, kundalis, synastries, payments] = await Promise.all([
    db.from('analytics_events').select('properties').eq('event_name', 'page_view').gte('created_at', since).order('created_at', { ascending: false }).limit(50000),
    fetchAllAuthUsers(db),
    db.from('reports').select('user_id').gte('created_at', since).limit(50000),
    db.from('kundali_charts').select('user_id').gte('created_at', since).limit(50000),
    db.from('synastry_charts').select('user_id').gte('created_at', since).limit(50000),
    db.from('ziina_payments').select('user_id, status').gte('created_at', since).limit(50000),
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

  const signups = users.filter((u) => u.created_at && Date.parse(u.created_at) >= sinceMs).length;

  return NextResponse.json({
    note: `Last ${days} days. Visited/product are anonymous sessions; signup/generated/paid are accounts.`,
    range: { days },
    stages: [
      { key: 'visited', label: 'Visited the site', count: sessions.size, basis: 'sessions' },
      { key: 'product', label: 'Viewed a product / tool / pricing page', count: productSessions.size, basis: 'sessions' },
      { key: 'signup', label: 'Created an account', count: signups, basis: 'accounts' },
      { key: 'generated', label: 'Generated a report', count: reportUsers.size, basis: 'accounts' },
      { key: 'paid', label: 'Paid', count: paidUsers.size, basis: 'accounts' },
    ],
  });
}

function reportsRes(res: { data: { user_id?: string }[] | null }): { user_id?: string }[] | null {
  return res.data;
}
