export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { toUsdCents } from '@/lib/admin/analytics';
import { utmRollup, revenueKpis, type FirstTouchUserRow, type PaymentRow, type UtmRow } from '@/lib/analytics/calcs';

/**
 * Campaign rollup: sessions / signups / payers / revenue by (utm_source,
 * utm_medium, utm_campaign). Signups+revenue come from first-touch attribution
 * (user_profiles.first_touch_*, persisted at signup); sessions come from the
 * landing UTMs of recent analytics_events page views. Math lives in
 * src/lib/analytics/calcs.ts (utmRollup / revenueKpis).
 */

// Must match utmRollup's grouping (norm + '(direct)' fallback) so session rows
// land in the same bucket as the signups they produced.
const norm = (v?: string | null) => (v && v.trim() ? v.trim().toLowerCase() : null);
const keyOf = (source?: string | null, medium?: string | null, campaign?: string | null) =>
  `${norm(source) ?? '(direct)'}|${norm(medium) ?? '-'}|${norm(campaign) ?? '-'}`;

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 30));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const db = createServiceClient();
  const [profRes, payRes, evRes] = await Promise.all([
    db.from('user_profiles').select('id, first_touch_source, first_touch_medium, first_touch_campaign').limit(50000),
    db.from('ziina_payments').select('user_id, amount, currency, status, created_at').eq('status', 'completed').limit(50000),
    db.from('analytics_events').select('properties, created_at').eq('event_name', 'page_view').gte('created_at', since).order('created_at', { ascending: false }).limit(50000),
  ]);
  if (profRes.error) {
    return NextResponse.json({ rows: [], kpis: null, totalProfiles: 0, range: { days }, note: 'Run the first-touch migration (20260615_first_touch_attribution.sql), then this fills in as new users sign up.' });
  }

  const users: FirstTouchUserRow[] = (profRes.data ?? []).map((p) => {
    const row = p as { id: string; first_touch_source?: string | null; first_touch_medium?: string | null; first_touch_campaign?: string | null };
    return {
      user_id: row.id,
      first_touch_source: row.first_touch_source ?? null,
      first_touch_medium: row.first_touch_medium ?? null,
      first_touch_campaign: row.first_touch_campaign ?? null,
    };
  });
  const payments: PaymentRow[] = (payRes.data ?? []).map((p) => {
    const row = p as { user_id?: string | null; amount?: number; currency?: string; created_at?: string };
    return { user_id: row.user_id ?? null, usd_cents: toUsdCents(row.amount ?? 0, row.currency ?? 'USD'), created_at: row.created_at ?? '' };
  });

  // Signups / payers / revenue by first-touch UTM (all-time attribution).
  const rollup = utmRollup(users, payments);

  // Sessions per campaign: the first page_view per session carries the landing
  // UTMs (events fetched newest-first so the window stays fresh at scale, then
  // re-ascended so "first per session" is correct).
  const events = (evRes.data ?? []).slice().reverse();
  const seen = new Set<string>();
  const sessionsByKey = new Map<string, number>();
  for (const e of events) {
    const p = (e.properties ?? {}) as { session_id?: string | null; utm?: Record<string, string> | null };
    const sid = p.session_id;
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    const key = keyOf(p.utm?.utm_source, p.utm?.utm_medium, p.utm?.utm_campaign);
    sessionsByKey.set(key, (sessionsByKey.get(key) ?? 0) + 1);
  }

  type Row = UtmRow & { sessions: number; convPct: number | null; revenuePerSignupUsdCents: number | null };
  const byKey = new Map<string, Row>();
  for (const r of rollup) {
    byKey.set(keyOf(r.source, r.medium, r.campaign), {
      ...r,
      sessions: 0,
      convPct: r.signups > 0 ? Math.round((r.payers / r.signups) * 1000) / 10 : null,
      revenuePerSignupUsdCents: r.signups > 0 ? Math.round(r.revenueUsdCents / r.signups) : null,
    });
  }
  // Campaigns with traffic but no signups yet (the launch-day case) still get a row.
  for (const entry of Array.from(sessionsByKey.entries())) {
    const [key, count] = entry;
    let row = byKey.get(key);
    if (!row) {
      const parts = key.split('|');
      row = {
        source: parts[0],
        medium: parts[1] === '-' ? null : parts[1],
        campaign: parts[2] === '-' ? null : parts[2],
        signups: 0,
        payers: 0,
        revenueUsdCents: 0,
        sessions: 0,
        convPct: null,
        revenuePerSignupUsdCents: null,
      };
      byKey.set(key, row);
    }
    row.sessions = count;
  }

  const rows = Array.from(byKey.values()).sort(
    (a, b) => b.revenueUsdCents - a.revenueUsdCents || b.signups - a.signups || b.sessions - a.sessions
  );

  const kpis = revenueKpis(payments, users.length);

  return NextResponse.json({
    rows,
    kpis: {
      revenueUsdCents: kpis.revenueUsdCents,
      payers: kpis.payers,
      purchases: kpis.purchases,
      arppUsdCents: kpis.arppUsdCents,
      paidConversionPct: kpis.paidConversionPct,
      // Revenue-per-signup = the LTV proxy for a one-time-purchase business (paid-ads CAC ceiling).
      revenuePerSignupUsdCents: users.length > 0 ? Math.round(kpis.revenueUsdCents / users.length) : null,
    },
    totalProfiles: users.length,
    range: { days },
    note: `Signups/payers/revenue = all-time first-touch attribution. Sessions = last ${days} days of traffic (first hit per session). Conv. = payers / signups.`,
  });
}
