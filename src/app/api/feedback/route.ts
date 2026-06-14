export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/** Public visitor feedback → feedback table (reviewed in /admin/feedback). */
export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`feedback:${getRateLimitKey(req)}`, 6, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many submissions — try again shortly.' }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    brought_by?: string;
    rating?: number;
    email?: string;
    path?: string;
  };
  const message = (body.message ?? '').trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: 'Please share a little feedback first.' }, { status: 400 });

  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? null;
  } catch {
    /* anonymous feedback is fine */
  }

  try {
    const db = createServiceClient();
    const { error } = await db.from('feedback').insert({
      user_id: userId,
      email: (body.email?.trim() || userEmail || null),
      brought_by: (body.brought_by ?? '').trim().slice(0, 500) || null,
      rating: typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null,
      message,
      path: (body.path ?? '').slice(0, 256) || null,
    });
    if (error) return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
