export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import { emitServerEvent } from '@/lib/analytics/server';
import { verifyResumeToken } from '@/lib/leads/resumeToken';
import { supabaseStore } from '@/lib/leads/store';

/**
 * GET /api/quiz/resume?t=<token> — what the "your chart link" email opens. Returns only the
 * quiz answers needed to rebuild the chart (never the email address, and never the free
 * text, which was not stored). A bad, forged or expired token is a plain 404.
 */
export async function GET(request: NextRequest) {
  const { allowed } = await checkRateLimit(`quiz-resume:${getRateLimitKey(request)}`, 30, 60_000);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const token = request.nextUrl.searchParams.get('t') ?? '';
  const t = verifyResumeToken(token);
  if (!t) return NextResponse.json({ ok: false }, { status: 404 });

  let db: ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const found = await supabaseStore(db).findById(t.leadId);
  if (!found.ok || !found.value) return NextResponse.json({ ok: false }, { status: 404 });

  const lead = found.value;
  await emitServerEvent('chart_link_open', { source: lead.source }, { sessionId: lead.latest_session_id });
  return NextResponse.json({
    ok: true,
    slug: lead.slug,
    lang: lead.lang,
    firstName: lead.first_name,
    answers: lead.answers ?? {},
  });
}
