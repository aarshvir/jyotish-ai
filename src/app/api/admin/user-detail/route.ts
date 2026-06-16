export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

type Props = {
  path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
  session_id?: string | null;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = createServiceClient();
  const [userRes, eventsRes, reportsRes, kundaliRes, synastryRes, paymentsRes] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('analytics_events').select('event_name, properties, created_at').eq('user_id', id).order('created_at', { ascending: true }).limit(1000),
    db
      .from('reports')
      .select('id, plan_type, status, payment_status, native_name, birth_date, phone, personal_context, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    db.from('kundali_charts').select('id, person, overview, life_areas, year_outlook, doshas, created_at').eq('user_id', id).order('created_at', { ascending: false }),
    db.from('synastry_charts').select('id, partner_a, partner_b, ashtakoot, commentary, created_at').eq('user_id', id).order('created_at', { ascending: false }),
    db.from('ziina_payments').select('plan_type, amount, currency, status, created_at').eq('user_id', id).order('created_at', { ascending: false }),
  ]);

  const u = userRes.data?.user;
  const events = eventsRes.data ?? [];
  const propsOf = (e: { properties: unknown }) => (e.properties ?? {}) as Props;

  const pageViews = events.filter((e) => e.event_name === 'page_view');
  const firstWithRef = events.find((e) => {
    const p = propsOf(e);
    return p.referrer || (p.utm && Object.keys(p.utm).length);
  });
  const sessions = new Set(events.map((e) => propsOf(e).session_id).filter(Boolean));
  const logins = events.filter((e) => e.event_name === 'session_start').length || sessions.size;

  const pathCounts: Record<string, number> = {};
  for (const e of pageViews) {
    const p = propsOf(e).path;
    if (p) pathCounts[p] = (pathCounts[p] ?? 0) + 1;
  }

  return NextResponse.json({
    user: u ? { id: u.id, email: u.email ?? '(no email)', created_at: u.created_at, last_sign_in_at: u.last_sign_in_at } : null,
    acquisition: {
      referrer: firstWithRef ? propsOf(firstWithRef).referrer ?? null : null,
      utm: firstWithRef ? propsOf(firstWithRef).utm ?? null : null,
      entryPage: pageViews.length ? propsOf(pageViews[0]).path ?? null : null,
      lastPage: pageViews.length ? propsOf(pageViews[pageViews.length - 1]).path ?? null : null,
    },
    logins,
    pageViewCount: pageViews.length,
    pages: Object.entries(pathCounts).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
    journey: events.slice(-120).map((e) => ({ name: e.event_name, path: propsOf(e).path ?? null, at: e.created_at })),
    reports: reportsRes.data ?? [],
    kundalis: kundaliRes.data ?? [],
    synastries: synastryRes.data ?? [],
    payments: paymentsRes.data ?? [],
  });
}
