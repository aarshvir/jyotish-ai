export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Ordered event timeline for ONE session (entry → … → drop-off), including
 * anonymous visitors. Powers /admin/journeys/[sid]. Filters analytics_events on
 * the JSONB key properties->>session_id (backed by idx_analytics_events_session_created).
 */

type Props = {
  path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
  session_id?: string | null;
  text?: string | null;
  label?: string | null;
  href?: string | null;
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

export async function GET(_req: NextRequest, { params }: { params: { sid: string } }) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const sid = (params.sid ?? '').slice(0, 64);
  if (!sid) return NextResponse.json({ error: 'session id required' }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from('analytics_events')
    .select('user_id, event_name, properties, created_at')
    .eq('properties->>session_id', sid)
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });

  const rows = data ?? [];
  const propsOf = (e: { properties: unknown }) => (e.properties ?? {}) as Props;

  let email: string | null = null;
  const userId = rows.find((e) => e.user_id)?.user_id ?? null;
  if (userId) {
    const u = await db.auth.admin.getUserById(userId);
    email = u.data?.user?.email ?? null;
  }

  const pageViews = rows.filter((e) => e.event_name === 'page_view');
  const firstWithRef = rows.find((e) => {
    const p = propsOf(e);
    return p.referrer || (p.utm && Object.keys(p.utm).length);
  });
  const refProps = firstWithRef ? propsOf(firstWithRef) : null;

  const events = rows.map((e) => {
    const p = propsOf(e);
    const isClick = e.event_name === 'click';
    return {
      name: e.event_name,
      path: p.path ?? null,
      label: isClick ? (p.text ?? p.label ?? null) : null,
      href: isClick ? (p.href ?? null) : null,
      at: e.created_at as string,
      identified: Boolean(e.user_id),
    };
  });

  return NextResponse.json({
    sid,
    userId,
    email,
    referrer: refProps?.referrer ?? null,
    utm: refProps?.utm ?? null,
    channel: channelOf(refProps?.referrer ?? null, refProps?.utm?.utm_source ?? null),
    entryPage: pageViews.length ? propsOf(pageViews[0]).path ?? null : null,
    dropOffPage: pageViews.length ? propsOf(pageViews[pageViews.length - 1]).path ?? null : null,
    pageCount: pageViews.length,
    firstSeen: rows.length ? (rows[0].created_at as string) : null,
    lastSeen: rows.length ? (rows[rows.length - 1].created_at as string) : null,
    events,
  });
}
