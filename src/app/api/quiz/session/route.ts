export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sanitizeSessionPayload } from '@/lib/funnel/sessionPayload';

/**
 * POST /api/quiz/session — saves a /q funnel session (spec §4 `quiz_sessions`).
 *
 * The funnel never depends on this: until the quiz_sessions migration has been run, this
 * answers { stored: false } and the funnel carries on from browser state. The one thing
 * kept even then is an email lead the visitor explicitly consented to, which falls back
 * to the existing newsletter list.
 */
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`quiz-session:${getRateLimitKey(request)}`, 90, 60_000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const parsed = sanitizeSessionPayload(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });

  let userId: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }

  const country = request.headers.get('x-vercel-ip-country');
  const row: Record<string, unknown> = {
    ...parsed.row,
    geo_country: country ? country.slice(0, 2).toUpperCase() : null,
    updated_at: new Date().toISOString(),
    ...(userId ? { user_id: userId } : {}),
  };

  let db: ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ ok: true, stored: false });
  }

  const { error } = await db.from('quiz_sessions').upsert(row, { onConflict: 'id' });
  if (error) {
    const missing = /quiz_sessions|schema cache|does not exist/i.test(error.message ?? '');
    if (!missing) console.warn('[quiz/session] upsert failed:', error.message);
    // Without the table, keep only an email lead the visitor consented to market to.
    if (parsed.consentedEmail) {
      try {
        await db
          .from('newsletter_subscribers')
          .upsert({ email: parsed.consentedEmail, source: 'quiz_funnel' }, { onConflict: 'email' });
      } catch {
        /* never block the funnel on a lead write */
      }
    }
    return NextResponse.json({ ok: true, stored: false });
  }

  if (parsed.revealViewed) {
    await db
      .from('quiz_sessions')
      .update({ reveal_viewed_at: new Date().toISOString() })
      .eq('id', parsed.row.id as string)
      .is('reveal_viewed_at', null);
  }

  return NextResponse.json({ ok: true, stored: true });
}
