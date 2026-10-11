export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import { emitServerEvent } from '@/lib/analytics/server';
import { signingSecretOrNull, unsubscribeUrl } from '@/lib/notify/suppression';
import { parseCapture } from '@/lib/leads/capture';
import { captureLead } from '@/lib/leads/captureLead';
import { maskEmail, resendMailer } from '@/lib/leads/mailer';
import { makeResumeToken } from '@/lib/leads/resumeToken';
import { supabaseStore } from '@/lib/leads/store';

/**
 * POST /api/lead/capture — "Save your chart". Stores the lead and its consent record, then
 * emails the chart link. The funnel never depends on it: every failure is a 200 with
 * `saved: false` or `emailed: false` and a reason, and the visitor carries on to their result.
 *
 * Nothing is sent while the tables are missing, while consent could not be recorded, or to an
 * address that has unsubscribed. Production sending is also gated by LEADS_DRY_RUN and
 * LEADS_ALLOWLIST (see lib/leads/mailer.ts). The response never says whether an address
 * was already known.
 */

const SITE = 'https://www.vedichour.com';

export async function POST(request: NextRequest) {
  const ip = await checkRateLimit(`lead-capture:${getRateLimitKey(request)}`, 10, 60_000);
  if (!ip.allowed) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = parseCapture(body, request.headers.get('x-vercel-ip-country'));
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const { input } = parsed;

  const perEmail = await checkRateLimit(`lead-capture-email:${input.email}`, 5, 3600_000);
  if (!perEmail.allowed) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  let db: ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ ok: true, saved: false, emailed: false, reason: 'storage_unavailable' });
  }

  const origin = process.env.NODE_ENV === 'production' ? SITE : request.nextUrl.origin;
  const result = await captureLead(
    {
      store: supabaseStore(db),
      mailer: resendMailer(),
      siteUrl: origin,
      now: new Date(),
      hashKey: process.env.CONTACT_HASH_PEPPER?.trim() || signingSecretOrNull(),
      makeToken: (id, now) => makeResumeToken(id, now),
      unsubscribeUrl: (email) => unsubscribeUrl(email, origin),
    },
    input,
  );

  if (!result.saved) {
    // Until the leads migration has run, keep the one thing that was kept before: an address
    // someone ticked the marketing box for goes to the newsletter list.
    if (result.reason === 'storage_unavailable' && input.consent.marketing) {
      try {
        await db.from('newsletter_subscribers').upsert({ email: input.email, source: 'quiz_funnel' }, { onConflict: 'email' });
      } catch {
        /* never block the funnel on a lead write */
      }
    }
    return NextResponse.json({ ok: true, saved: false, emailed: false, reason: result.reason });
  }

  await emitServerEvent('lead_captured', { source: input.source, marketing: input.consent.marketing, emailed: result.emailed }, { sessionId: input.sessionId });
  return NextResponse.json({
    ok: true,
    saved: true,
    emailed: result.emailed,
    ...(result.emailed ? { to: maskEmail(input.email) } : { reason: result.reason }),
  });
}
