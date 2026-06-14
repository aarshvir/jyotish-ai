export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
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

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  const { data } = await db
    .from('analytics_events')
    .select('properties, created_at')
    .eq('event_name', 'page_view')
    .order('created_at', { ascending: true })
    .limit(50000);

  const entryBySession: Record<string, { ref: string | null; utm: string | null; path: string }> = {};
  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  const allSessions = new Set<string>();

  for (const e of data ?? []) {
    const p = (e.properties ?? {}) as { path?: string; referrer?: string | null; utm?: { source?: string } | null; session_id?: string };
    const sid = p.session_id;
    const path = p.path ?? '';
    if (sid) {
      allSessions.add(sid);
      if (!entryBySession[sid]) entryBySession[sid] = { ref: p.referrer ?? null, utm: p.utm?.source ?? null, path };
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
    channels: sortDesc(channelSessions),
    landingPages: sortDesc(landingPages).slice(0, 20),
    referrers: sortDesc(referrers).slice(0, 15),
    topPages: Object.entries(pageCounts).map(([path, v]) => ({ path, views: v.views, sessions: v.sessions.size })).sort((a, b) => b.views - a.views).slice(0, 20),
    note: 'Channel = each session\'s entry referrer/UTM. Tying channels to paid revenue needs first-touch attribution stored at signup (roadmap).',
  });
}
