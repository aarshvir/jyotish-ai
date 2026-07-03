export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents, pctDelta, fetchAllAuthUsers } from '@/lib/admin/analytics';

/**
 * Launch-day pulse: today-so-far (UTC) vs the same time yesterday, computed
 * from existing tables (analytics_events, auth users, reports, ziina_payments).
 * Polled by /admin/today every 60s.
 */

// The free tool surfaces (7 calculators + the free Kundli tool).
const TOOL_PATHS = [
  '/free-kundli',
  '/moon-sign-calculator', '/nakshatra-finder', '/lagna-calculator',
  '/manglik-dosha-calculator', '/kaal-sarp-dosha-calculator',
  '/sade-sati-calculator', '/vimshottari-dasha-calculator',
];

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
  // Fair delta: compare today-so-far against yesterday up to the SAME time of day.
  const yesterdaySameTime = new Date(now.getTime() - 24 * 3600 * 1000);

  const inToday = (t?: string | null) => !!t && new Date(t) >= todayStart;
  const inYesterday = (t?: string | null) => {
    if (!t) return false;
    const d = new Date(t);
    return d >= yesterdayStart && d <= yesterdaySameTime;
  };

  const db = createServiceClient();
  const sinceIso = yesterdayStart.toISOString();
  const [evRes, users, reportsRes, payRes] = await Promise.all([
    db.from('analytics_events').select('event_name, properties, created_at').gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(50000),
    fetchAllAuthUsers(db),
    db.from('reports').select('created_at').gte('created_at', sinceIso).limit(50000),
    db.from('ziina_payments').select('amount, currency, created_at, status').eq('status', 'completed').gte('created_at', sinceIso).limit(50000),
  ]);

  const sessionsToday = new Set<string>();
  const sessionsYesterday = new Set<string>();
  let pvToday = 0, pvYesterday = 0, toolToday = 0, toolYesterday = 0;
  for (const e of evRes.data ?? []) {
    const created = e.created_at as string;
    const today = inToday(created);
    const yesterday = !today && inYesterday(created);
    if (!today && !yesterday) continue;
    const p = (e.properties ?? {}) as { session_id?: string | null; path?: string | null };
    if (p.session_id) (today ? sessionsToday : sessionsYesterday).add(p.session_id);
    if (e.event_name === 'page_view') {
      if (today) pvToday++; else pvYesterday++;
      const path = p.path ?? '';
      if (TOOL_PATHS.some((t) => path === t || path.startsWith(`${t}/`))) {
        if (today) toolToday++; else toolYesterday++;
      }
    }
  }

  let signupsToday = 0, signupsYesterday = 0;
  for (const u of users) {
    if (inToday(u.created_at)) signupsToday++;
    else if (inYesterday(u.created_at)) signupsYesterday++;
  }

  let reportsToday = 0, reportsYesterday = 0;
  for (const r of reportsRes.data ?? []) {
    const created = (r as { created_at?: string }).created_at;
    if (inToday(created)) reportsToday++;
    else if (inYesterday(created)) reportsYesterday++;
  }

  let revToday = 0, revYesterday = 0;
  for (const pay of payRes.data ?? []) {
    const row = pay as { amount?: number; currency?: string; created_at?: string };
    const usd = toUsdCents(row.amount ?? 0, row.currency ?? 'USD');
    if (inToday(row.created_at)) revToday += usd;
    else if (inYesterday(row.created_at)) revYesterday += usd;
  }

  const kpi = (today: number, yesterday: number) => ({ today, yesterday, delta: pctDelta(today, yesterday) });

  return NextResponse.json({
    asOf: now.toISOString(),
    kpis: {
      sessions: kpi(sessionsToday.size, sessionsYesterday.size),
      pageViews: kpi(pvToday, pvYesterday),
      toolViews: kpi(toolToday, toolYesterday),
      signups: kpi(signupsToday, signupsYesterday),
      reports: kpi(reportsToday, reportsYesterday),
      revenueUsdCents: kpi(revToday, revYesterday),
    },
    note: 'Today (UTC) vs the same time yesterday. Tool views = the 7 free calculators + /free-kundli.',
  });
}
