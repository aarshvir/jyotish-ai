export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/**
 * Lightweight first-party event ingest → analytics_events. Powers the admin
 * funnel + per-user journey (page path, referrer, UTM, session, logins).
 * Attaches user_id from the auth cookie when signed in; anonymous otherwise.
 */
export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`track:${getRateLimitKey(req)}`, 180, 60_000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    path?: string;
    referrer?: string | null;
    utm?: Record<string, string>;
    session_id?: string;
    props?: Record<string, unknown>;
  };
  const name = (body.name ?? '').trim().slice(0, 64);
  if (!name) return NextResponse.json({ ok: false }, { status: 400 });

  let userId: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }

  // Bound the untrusted client object: cap key count + per-value length so this
  // unauthenticated, service-role insert can't be abused to write multi-MB rows into
  // analytics_events (DB/storage bloat + cost). Applied to both props and utm.
  const boundObject = (raw: unknown, maxKeys: number, maxLen: number): Record<string, unknown> => {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (n >= maxKeys) break;
      out[String(k).slice(0, 64)] =
        typeof v === 'number' || typeof v === 'boolean' ? v : String(v ?? '').slice(0, maxLen);
      n++;
    }
    return out;
  };
  const utm = body.utm && typeof body.utm === 'object' ? boundObject(body.utm, 12, 256) : null;
  try {
    const db = createServiceClient();
    await db.from('analytics_events').insert({
      user_id: userId,
      event_name: name,
      properties: {
        // Spread untrusted (now bounded) props FIRST so the sanitized fields below always
        // win (prevents a client from overriding path/referrer/session/user attribution).
        ...boundObject(body.props, 20, 512),
        path: typeof body.path === 'string' ? body.path.slice(0, 256) : null,
        referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 256) : null,
        utm: utm && Object.keys(utm).length ? utm : null,
        session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : null,
      },
    });
  } catch {
    // analytics must never break the page
  }
  return NextResponse.json({ ok: true });
}
