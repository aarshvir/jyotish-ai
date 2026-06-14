export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Public newsletter signup → newsletter_subscribers (reviewed in /admin/newsletter). */
export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`newsletter:${getRateLimitKey(req)}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests — try again shortly.' }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });

  let userId: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }

  try {
    const db = createServiceClient();
    const { error } = await db
      .from('newsletter_subscribers')
      .upsert({ email, user_id: userId, source: (body.source ?? '').slice(0, 64) || null }, { onConflict: 'email' });
    if (error) return NextResponse.json({ error: 'Could not subscribe.' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Could not subscribe.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
