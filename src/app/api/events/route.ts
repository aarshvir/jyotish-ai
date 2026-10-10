export const dynamic = 'force-dynamic';
export const maxDuration = 10;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import {
  isClientEventName,
  sanitizeAttribution,
  sanitizeEventProps,
  slugFromPath,
} from '@/lib/analytics/events';

/**
 * Canonical funnel-event ingestion (schema: src/lib/analytics/events.ts).
 * Only known event names are accepted, properties are allow-listed per event,
 * and geo (country/region from Vercel's edge headers) plus the request host are
 * stamped here so a browser cannot forge them. Rows land in analytics_events,
 * which /admin2 reads. Internal/test traffic is still recorded — the dashboard
 * excludes it from ratios, so nothing real is ever thrown away at capture.
 */
export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`events:${getRateLimitKey(req)}`, 240, 60_000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    session_id?: unknown;
    path?: unknown;
    attribution?: unknown;
    props?: unknown;
  } | null;
  if (!body || !isClientEventName(body.name)) {
    return NextResponse.json({ ok: false, error: 'unknown event' }, { status: 400 });
  }
  const name = body.name;

  let userId: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }

  const path = typeof body.path === 'string' ? body.path.split('?')[0].slice(0, 256) : null;
  const attribution = sanitizeAttribution(body.attribution);
  if (!attribution.slug) {
    const s = slugFromPath(path);
    if (s) attribution.slug = s;
  }
  const sessionId =
    typeof body.session_id === 'string' && /^[\w-]{1,64}$/.test(body.session_id) ? body.session_id : null;
  const header = (k: string) => req.headers.get(k)?.trim().slice(0, 64) || null;

  try {
    const db = createServiceClient();
    await db.from('analytics_events').insert({
      user_id: userId,
      event_name: name,
      properties: {
        ...sanitizeEventProps(name, body.props),
        ...attribution,
        session_id: sessionId,
        path,
        geo_country: header('x-vercel-ip-country'),
        geo_region: header('x-vercel-ip-country-region'),
        host: (req.headers.get('host') ?? '').toLowerCase().slice(0, 128) || null,
        schema: 1,
      },
    });
  } catch {
    // analytics must never break the page
  }
  return NextResponse.json({ ok: true });
}
