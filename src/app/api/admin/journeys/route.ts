export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { fetchAllAuthUsers } from '@/lib/admin/analytics';

/**
 * Per-visitor (per-session) journey list — one row per session_id, including
 * ANONYMOUS visitors that never signed up. Powers /admin/journeys. Computed
 * entirely from the first-party analytics_events table (event_name + JSONB
 * properties: path, referrer, utm, session_id) written by /api/track.
 *
 * For each session we surface: entry page + source (referrer/UTM/channel),
 * number of pages, last page (= drop-off), first/last seen, and whether the
 * session converted (signed up / paid) when derivable from a user_id.
 */

type Props = {
  path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
  session_id?: string | null;
};

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

type SessionRow = {
  sid: string;
  entryPage: string | null;
  channel: string;
  referrer: string | null;
  utmSource: string | null;
  pages: number;
  lastPage: string | null;
  events: number;
  firstSeen: string;
  lastSeen: string;
  userId: string | null;
  email: string | null;
  signedUp: boolean;
  paid: boolean;
};

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();

  // Ascending so the first event per session = entry, last = drop-off. limit(50000)
  // mirrors the other admin aggregations (PostgREST caps at 1000 by default).
  const [eventsRes, users, payments] = await Promise.all([
    db
      .from('analytics_events')
      .select('user_id, event_name, properties, created_at')
      .order('created_at', { ascending: true })
      .limit(50000),
    fetchAllAuthUsers(db),
    db.from('ziina_payments').select('user_id, status').limit(50000),
  ]);

  const emailById = new Map(users.map((u) => [u.id, u.email ?? null]));
  const paidUserIds = new Set<string>();
  for (const p of payments.data ?? []) {
    const row = p as { user_id?: string; status?: string };
    if (row.status === 'completed' && row.user_id) paidUserIds.add(row.user_id);
  }

  const bySid = new Map<string, SessionRow>();
  for (const e of eventsRes.data ?? []) {
    const p = (e.properties ?? {}) as Props;
    const sid = p.session_id;
    if (!sid) continue;
    const isPageView = e.event_name === 'page_view';
    let row = bySid.get(sid);
    if (!row) {
      row = {
        sid,
        entryPage: isPageView ? p.path ?? null : null,
        channel: channelOf(p.referrer ?? null, p.utm?.utm_source ?? null),
        referrer: p.referrer ?? null,
        utmSource: p.utm?.utm_source ?? null,
        pages: 0,
        lastPage: null,
        events: 0,
        firstSeen: e.created_at as string,
        lastSeen: e.created_at as string,
        userId: e.user_id ?? null,
        email: null,
        signedUp: false,
        paid: false,
      };
      bySid.set(sid, row);
    }
    row.events++;
    row.lastSeen = e.created_at as string;
    if (e.user_id) row.userId = e.user_id; // a session may sign up partway through
    if (isPageView) {
      row.pages++;
      if (!row.entryPage && p.path) row.entryPage = p.path; // first page_view seen
      if (p.path) row.lastPage = p.path; // last page_view = drop-off
    }
  }

  const sessions: SessionRow[] = [];
  for (const row of bySid.values()) {
    if (row.userId) {
      row.signedUp = true;
      row.email = emailById.get(row.userId) ?? null;
      row.paid = paidUserIds.has(row.userId);
    }
    sessions.push(row);
  }

  // Most-recent activity first.
  sessions.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));

  const anonymous = sessions.filter((s) => !s.signedUp).length;
  return NextResponse.json({
    totalSessions: sessions.length,
    anonymousSessions: anonymous,
    convertedSessions: sessions.filter((s) => s.paid).length,
    // Cap the payload; the list view shows the most recent. The per-session
    // timeline (/admin/journeys/[sid]) loads any single session on demand.
    sessions: sessions.slice(0, 500),
    note: 'One row per browser session (anonymous + identified). Entry = first page, drop-off = last page. Conversion is derived from a signed-in user_id seen during the session.',
  });
}
