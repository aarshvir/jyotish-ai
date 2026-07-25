export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Campaign Control Panel API.
 *
 * GET  — every marketing_asset with its latest stats, an hour-by-hour views
 *        series (48h), attributed sessions/signups (analytics_events +
 *        user_profiles first-touch joined by utm_campaign), plus the latest
 *        marketing_insights verdict. Fails soft with { migrationPending }
 *        until the owner runs RUN_IN_SUPABASE.sql.
 * POST — { slug, action: 'kill' } sets status='killed'; the marketing-agent
 *        sync loop propagates the kill down so rendering/publishing stops.
 *
 * Tables are written by the local marketing-agent loops (sync/stats/insights).
 * The historical UTM → revenue rollup lives at /api/admin/campaigns/utm.
 */

const norm = (v?: string | null) => (v && v.trim() ? v.trim().toLowerCase() : null);

// PostgREST error when a table is missing from the schema (migration not run).
const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message ?? ''));

type StatRow = {
  asset_id: string;
  captured_at: string;
  source: string;
  views: number;
  likes: number;
  comments: number;
};

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const db = createServiceClient();

  const [assetsRes, insightRes] = await Promise.all([
    db.from('marketing_assets').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('marketing_insights').select('*').order('generated_at', { ascending: false }).limit(1),
  ]);

  if (assetsRes.error) {
    if (isMissingTable(assetsRes.error)) {
      return NextResponse.json({
        migrationPending: true,
        assets: [],
        insight: null,
        totals: null,
        note: 'marketing_* tables are not in Supabase yet — paste RUN_IN_SUPABASE.sql into the Supabase SQL editor, then this page fills in as the engine syncs.',
      });
    }
    return NextResponse.json({ error: assetsRes.error.message }, { status: 500 });
  }

  const assets = assetsRes.data ?? [];
  const insight = insightRes.error ? null : (insightRes.data?.[0] ?? null);
  const ids = assets.map((a) => a.id as string);
  const campaigns = new Set(assets.map((a) => norm(a.utm_campaign as string | null)).filter(Boolean) as string[]);

  const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [statsRes, eventsRes, profilesRes] = await Promise.all([
    ids.length
      ? db
          .from('marketing_stats')
          .select('asset_id, captured_at, source, views, likes, comments')
          .in('asset_id', ids)
          .gte('captured_at', since7d)
          .order('captured_at', { ascending: true })
          .limit(20000)
      : Promise.resolve({ data: [] as StatRow[], error: null }),
    campaigns.size
      ? db
          .from('analytics_events')
          .select('properties, created_at')
          .eq('event_name', 'page_view')
          .gte('created_at', since30d)
          .order('created_at', { ascending: false })
          .limit(50000)
      : Promise.resolve({ data: [] as { properties: unknown }[], error: null }),
    campaigns.size
      ? db.from('user_profiles').select('id, first_touch_campaign').limit(50000)
      : Promise.resolve({ data: [] as { id: string; first_touch_campaign?: string | null }[], error: null }),
  ]);

  // Stats series per asset (latest snapshot + 48h sparkline).
  const statsByAsset = new Map<string, StatRow[]>();
  for (const s of (statsRes.data ?? []) as StatRow[]) {
    const arr = statsByAsset.get(s.asset_id) ?? [];
    arr.push(s);
    statsByAsset.set(s.asset_id, arr);
  }

  // Attributed sessions per campaign: distinct session_ids whose page views
  // carried a matching utm_campaign in the last 30 days.
  const sessionsByCampaign = new Map<string, number>();
  const seenSessions = new Set<string>();
  for (const e of (eventsRes.data ?? []) as { properties?: { session_id?: string | null; utm?: Record<string, string> | null } | null }[]) {
    const p = e.properties ?? {};
    const camp = norm(p.utm?.utm_campaign);
    const sid = p.session_id;
    if (!camp || !campaigns.has(camp) || !sid || seenSessions.has(sid)) continue;
    seenSessions.add(sid);
    sessionsByCampaign.set(camp, (sessionsByCampaign.get(camp) ?? 0) + 1);
  }

  // Attributed signups per campaign: first-touch attribution persisted at signup.
  const signupsByCampaign = new Map<string, number>();
  for (const u of (profilesRes.data ?? []) as { first_touch_campaign?: string | null }[]) {
    const camp = norm(u.first_touch_campaign);
    if (!camp || !campaigns.has(camp)) continue;
    signupsByCampaign.set(camp, (signupsByCampaign.get(camp) ?? 0) + 1);
  }

  let totalViews = 0;
  let totalSessions = 0;
  let totalSignups = 0;
  let totalSpend = 0;

  const out = assets.map((a) => {
    const series = statsByAsset.get(a.id as string) ?? [];
    const latest = series.length ? series[series.length - 1] : null;
    const spark = series
      .filter((s) => s.captured_at >= since48h)
      .map((s) => ({ t: s.captured_at, views: s.views }));
    const camp = norm(a.utm_campaign as string | null);
    const sessions = camp ? (sessionsByCampaign.get(camp) ?? 0) : 0;
    const signups = camp ? (signupsByCampaign.get(camp) ?? 0) : 0;
    if (a.status !== 'killed') totalViews += latest?.views ?? 0;
    totalSessions += sessions;
    totalSignups += signups;
    totalSpend += Number(a.render_cost_usd ?? 0);
    return {
      ...a,
      latestViews: latest?.views ?? null,
      latestLikes: latest?.likes ?? null,
      latestComments: latest?.comments ?? null,
      latestSource: latest?.source ?? null,
      latestAt: latest?.captured_at ?? null,
      spark,
      series: series.slice(-48).map((s) => ({
        t: s.captured_at,
        source: s.source,
        views: s.views,
        likes: s.likes,
        comments: s.comments,
      })),
      sessions,
      signups,
    };
  });

  return NextResponse.json({
    assets: out,
    insight,
    totals: { views: totalViews, sessions: totalSessions, signups: totalSignups, spendUsd: Math.round(totalSpend * 100) / 100 },
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;
  const body = (await request.json().catch(() => ({}))) as { slug?: string; action?: string };
  const slug = (body.slug ?? '').trim();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  if (body.action !== 'kill') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  // Killing a parent kills its localized language variants too — the whole
  // family stops rendering/publishing when the sync loop pulls this down.
  const db = createServiceClient();
  const { data, error } = await db
    .from('marketing_assets')
    .update({ status: 'killed', updated_at: new Date().toISOString() })
    .or(`slug.eq.${slug},parent_slug.eq.${slug}`)
    .select('slug, status');
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: 'marketing_assets table missing — run RUN_IN_SUPABASE.sql first.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: `No asset with slug "${slug}"` }, { status: 404 });
  return NextResponse.json({ ok: true, killed: data.map((d) => d.slug) });
}
