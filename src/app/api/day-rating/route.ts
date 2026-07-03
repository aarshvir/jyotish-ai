export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { alignmentStats, type DayRatingRow } from '@/lib/analytics/calcs';

/**
 * Resonance loop: one-tap "how did the day feel" ratings vs the predicted day
 * score. RLS-scoped to the signed-in user (day_ratings policies), so this uses
 * the user client — no service role needed.
 *
 * POST { rated_date: 'YYYY-MM-DD', rating: -1|0|1, predicted_score?: number, report_id?: uuid }
 *   → upserts the user's rating for that date (unique per user+date).
 * GET → { ratings: [...last 60], stats: alignmentStats }
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const { allowed } = await checkRateLimit(`day-rating:${getRateLimitKey(req)}`, 30, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    rated_date?: string;
    rating?: number;
    predicted_score?: number | null;
    report_id?: string | null;
  };

  const ratedDate = body.rated_date ?? '';
  if (!DATE_RE.test(ratedDate)) {
    return NextResponse.json({ error: 'rated_date must be YYYY-MM-DD' }, { status: 400 });
  }
  // Real-date round-trip + window guard: only today or the past 30 days can be
  // rated (a felt-rating for the future is meaningless).
  const parsed = new Date(`${ratedDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== ratedDate) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  const todayKey = new Date().toISOString().slice(0, 10);
  const ageDays = (Date.parse(todayKey) - parsed.getTime()) / 86_400_000;
  if (ageDays < 0 || ageDays > 30) {
    return NextResponse.json({ error: 'Only today or the past 30 days can be rated' }, { status: 400 });
  }

  const rating = body.rating;
  if (rating !== -1 && rating !== 0 && rating !== 1) {
    return NextResponse.json({ error: 'rating must be -1, 0 or 1' }, { status: 400 });
  }

  let predicted: number | null = null;
  if (typeof body.predicted_score === 'number' && Number.isFinite(body.predicted_score)) {
    predicted = Math.max(0, Math.min(100, body.predicted_score));
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const reportId = typeof body.report_id === 'string' && UUID_RE.test(body.report_id) ? body.report_id : null;

  const { error } = await sb.from('day_ratings').upsert(
    {
      user_id: auth.user.id,
      rated_date: ratedDate,
      rating,
      predicted_score: predicted,
      report_id: reportId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,rated_date' }
  );
  if (error) {
    // 42P01 = table missing (migration not yet applied in prod) — degrade politely.
    return NextResponse.json({ error: 'Could not save rating' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { allowed } = await checkRateLimit(`day-rating:${getRateLimitKey(req)}`, 60, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { data, error } = await sb
    .from('day_ratings')
    .select('rated_date, rating, predicted_score, created_at')
    .eq('user_id', auth.user.id)
    .order('rated_date', { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ ratings: [], stats: null });

  const rows: DayRatingRow[] = (data ?? []).map((r) => ({
    rating: r.rating as -1 | 0 | 1,
    predicted_score: r.predicted_score == null ? null : Number(r.predicted_score),
  }));
  return NextResponse.json({ ratings: data ?? [], stats: alignmentStats(rows) });
}
