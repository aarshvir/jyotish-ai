export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Content → signup attribution for /admin/content. Answers "which blog posts /
 * calculators / SEO pages actually produce signups", not just raw views.
 *
 * Two independent signals per content row:
 *  1. Session-bridge signups: sessions whose page_views hit the content and that
 *     ALSO carry a signed-in event later (analytics_events.user_id is attached
 *     server-side in /api/track) — session_id bridges anonymous view → account.
 *  2. First-touch landing: user_profiles.first_touch_landing (persisted at
 *     signup from the vh_first_touch cookie) matching the content path.
 *
 * All queries are windowed (?days=, default 30) and bounded; recent rows win
 * when the 50k cap is hit (order created_at DESC).
 */

const CALCULATOR_PATHS = new Set([
  '/moon-sign-calculator',
  '/nakshatra-finder',
  '/lagna-calculator',
  '/manglik-dosha-calculator',
  '/kaal-sarp-dosha-calculator',
  '/sade-sati-calculator',
  '/vimshottari-dasha-calculator',
  '/free-kundli',
]);

function cleanPath(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let p = raw.split('?')[0].split('#')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (!p.startsWith('/')) return null;
  return p;
}

/** Normalize a path into a content row key + bucket label. Blog slugs and the
 *  fixed calculator paths stay individual; catalog sections collapse to one row. */
function bucketOf(path: string): { key: string; bucket: string } {
  if (path === '/blog' || path.startsWith('/blog/')) return { key: path, bucket: 'Blog' };
  if (path === '/compare' || path.startsWith('/compare/')) return { key: '/compare/*', bucket: 'Compare' };
  if (CALCULATOR_PATHS.has(path)) return { key: path, bucket: 'Calculators' };
  if (path === '/nakshatra' || path.startsWith('/nakshatra/')) return { key: '/nakshatra/*', bucket: 'Nakshatra' };
  if (path === '/dasha' || path.startsWith('/dasha/')) return { key: '/dasha/*', bucket: 'Dasha' };
  if (path === '/predictions' || path.startsWith('/predictions/')) return { key: '/predictions/*', bucket: 'Predictions' };
  if (path === '/transit' || path.startsWith('/transit/')) return { key: '/transit/*', bucket: 'Transit' };
  if (path === '/horoscope' || path.startsWith('/horoscope/')) return { key: '/horoscope/*', bucket: 'Horoscope' };
  if (path === '/hora') return { key: '/hora', bucket: 'Hora' };
  if (path === '/muhurat') return { key: '/muhurat', bucket: 'Muhurat' };
  return { key: path, bucket: 'Other' };
}

type Props = { path?: string | null; session_id?: string | null };

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 30;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const db = createServiceClient();
  // limit(50000) mirrors the other admin aggregations (PostgREST caps at 1000 by
  // default). DESC ordering means the newest window survives if we ever truncate.
  const [pvRes, bridgeRes, ftRes] = await Promise.all([
    db
      .from('analytics_events')
      .select('properties, created_at')
      .eq('event_name', 'page_view')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50000),
    db
      .from('analytics_events')
      .select('user_id, properties')
      .not('user_id', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50000),
    // No created_at filter: first_touch_landing is written once at signup, and
    // the column set predates profile timestamps — treat as an all-time signal.
    db
      .from('user_profiles')
      .select('id, first_touch_landing')
      .not('first_touch_landing', 'is', null)
      .limit(50000),
  ]);

  if (pvRes.error) {
    return NextResponse.json({ error: pvRes.error.message }, { status: 500 });
  }

  // session_id → user ids seen in that session (any signed-in event bridges,
  // including session_start after login — same derivation as /admin/journeys).
  const sessionUsers = new Map<string, Set<string>>();
  for (const e of bridgeRes.data ?? []) {
    const p = (e.properties ?? {}) as Props;
    const sid = p.session_id;
    const uid = e.user_id as string | null;
    if (!sid || !uid) continue;
    let set = sessionUsers.get(sid);
    if (!set) sessionUsers.set(sid, (set = new Set()));
    set.add(uid);
  }

  type Agg = { key: string; bucket: string; views: number; sessions: Set<string> };
  const byKey = new Map<string, Agg>();
  const allSessions = new Set<string>();
  let totalViews = 0;

  for (const e of pvRes.data ?? []) {
    const p = (e.properties ?? {}) as Props;
    const path = cleanPath(p.path);
    if (!path) continue;
    const { key, bucket } = bucketOf(path);
    let row = byKey.get(key);
    if (!row) byKey.set(key, (row = { key, bucket, views: 0, sessions: new Set() }));
    row.views++;
    totalViews++;
    if (p.session_id) {
      row.sessions.add(p.session_id);
      allSessions.add(p.session_id);
    }
  }

  // First-touch landing counts, normalized with the same bucketing.
  const firstTouchAvailable = !ftRes.error;
  const ftByKey = new Map<string, number>();
  for (const prof of ftRes.data ?? []) {
    const path = cleanPath((prof as { first_touch_landing?: string | null }).first_touch_landing);
    if (!path) continue;
    const { key } = bucketOf(path);
    ftByKey.set(key, (ftByKey.get(key) ?? 0) + 1);
  }

  const pct = (numer: number, denom: number) => (denom > 0 ? Math.round((numer / denom) * 1000) / 10 : 0);

  // Per-row output: signups = unique users bridged from this row's sessions.
  const rows = Array.from(byKey.values()).map((r) => {
    const users = new Set<string>();
    for (const sid of Array.from(r.sessions)) {
      for (const uid of Array.from(sessionUsers.get(sid) ?? [])) users.add(uid);
    }
    return {
      key: r.key,
      bucket: r.bucket,
      views: r.views,
      sessions: r.sessions.size,
      signups: users.size,
      signupPct: pct(users.size, r.sessions.size),
      firstTouch: ftByKey.get(r.key) ?? 0,
    };
  });
  rows.sort((a, b) => b.views - a.views);

  // Bucket rollup with unique sessions/users per bucket (not a sum of rows).
  const bucketAgg = new Map<string, { views: number; sessions: Set<string>; users: Set<string>; firstTouch: number }>();
  for (const r of Array.from(byKey.values())) {
    let b = bucketAgg.get(r.bucket);
    if (!b) bucketAgg.set(r.bucket, (b = { views: 0, sessions: new Set(), users: new Set(), firstTouch: 0 }));
    b.views += r.views;
    for (const sid of Array.from(r.sessions)) {
      b.sessions.add(sid);
      for (const uid of Array.from(sessionUsers.get(sid) ?? [])) b.users.add(uid);
    }
    b.firstTouch += ftByKey.get(r.key) ?? 0;
  }
  const buckets = Array.from(bucketAgg.entries())
    .map(([bucket, v]) => ({
      bucket,
      views: v.views,
      sessions: v.sessions.size,
      signups: v.users.size,
      signupPct: pct(v.users.size, v.sessions.size),
      firstTouch: v.firstTouch,
    }))
    .sort((a, b) => b.views - a.views);

  return NextResponse.json({
    days,
    totalViews,
    totalSessions: allSessions.size,
    rows: rows.slice(0, 100),
    buckets,
    firstTouchAvailable,
    note:
      'Signups = unique accounts seen (via session_id) in sessions that viewed the content within the window — content assists, not exclusive credit. First-touch = user_profiles.first_touch_landing matches (all-time, populated at signup since 2026-06-15).',
  });
}
