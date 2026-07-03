export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

function hostOf(ref?: string | null): string {
  if (!ref) return '';
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function channelOf(ref: string | null | undefined, utmSource?: string | null): string {
  if (utmSource) return `Campaign · ${utmSource}`;
  const h = hostOf(ref);
  if (!h || h.includes('vedichour')) return 'Direct';
  if (/google|bing|duckduckgo|yahoo|ecosia|search/.test(h)) return 'Organic Search';
  if (/instagram|facebook|fb\.|youtube|reddit|twitter|x\.com|t\.co|linkedin|pinterest|whatsapp|threads|quora/.test(h)) return 'Social / Community';
  return `Referral · ${h}`;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const daysRaw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 30));
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const db = createServiceClient();
  // Windowed + newest-first: the old oldest-first .limit(50000) silently froze
  // this view at the first 50k rows ever written once the table outgrew the cap.
  const { data } = await db
    .from('analytics_events')
    .select('properties, created_at')
    .eq('event_name', 'page_view')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50000);

  // Re-ascend so "first event per session = entry page" still holds.
  const rows = (data ?? []).slice().reverse();

  const entryBySession: Record<string, { ref: string | null; utm: string | null; path: string }> = {};
  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  const allSessions = new Set<string>();

  for (const e of rows) {
    const p = (e.properties ?? {}) as { path?: string; referrer?: string | null; utm?: { utm_source?: string } | null; session_id?: string };
    const sid = p.session_id;
    const path = p.path ?? '';
    if (sid) {
      allSessions.add(sid);
      if (!entryBySession[sid]) entryBySession[sid] = { ref: p.referrer ?? null, utm: p.utm?.utm_source ?? null, path };
    }
    if (path) {
      pageCounts[path] = pageCounts[path] ?? { views: 0, sessions: new Set() };
      pageCounts[path].views++;
      if (sid) pageCounts[path].sessions.add(sid);
    }
  }

  const channelSessions: Record<string, number> = {};
  const landingPages: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  for (const e of Object.values(entryBySession)) {
    const ch = channelOf(e.ref, e.utm);
    channelSessions[ch] = (channelSessions[ch] ?? 0) + 1;
    if (e.path) landingPages[e.path] = (landingPages[e.path] ?? 0) + 1;
    const h = hostOf(e.ref);
    if (h && !h.includes('vedichour')) referrers[h] = (referrers[h] ?? 0) + 1;
  }

  const sortDesc = (obj: Record<string, number>) => Object.entries(obj).map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalSessions: allSessions.size,
    range: { days },
    channels: sortDesc(channelSessions),
    landingPages: sortDesc(landingPages).slice(0, 20),
    referrers: sortDesc(referrers).slice(0, 15),
    topPages: Object.entries(pageCounts).map(([path, v]) => ({ path, views: v.views, sessions: v.sessions.size })).sort((a, b) => b.views - a.views).slice(0, 20),
    note: `Last ${days} days. Channel = each session's entry referrer/UTM. Campaign revenue lives on /admin/campaigns (first-touch attribution).`,
  });
}
