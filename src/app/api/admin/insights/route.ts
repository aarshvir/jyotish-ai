export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { alignmentStats, DEFAULT_BANDS, utcWeekKey, type DayRatingRow } from '@/lib/analytics/calcs';
import { isFreePlan } from '@/lib/admin/analytics';

/**
 * Correlation analytics for /admin/insights:
 *  (a) resonance — predicted day-score band vs user-felt rating (day_ratings);
 *      tolerates the table not existing yet (migration may be pending in prod).
 *  (b) conversion by plan — reports grouped by plan_type × payment_status.
 *  (c) feedback trend — avg rating + volume by ISO week, last 8 weeks.
 * Band math comes from src/lib/analytics/calcs.ts (single source of truth).
 */

const FEEDBACK_WEEKS = 8;

type Band = 'clear' | 'middle' | 'heavy';
type Felt = 'clearer' | 'asExpected' | 'heavier';
type Matrix = Record<Band, Record<Felt, number>>;

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const daysRaw = parseInt(url.searchParams.get('days') ?? '90', 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 90;
  const now = Date.now();
  const since = new Date(now - days * 24 * 3600 * 1000).toISOString();
  const fbSince = new Date(now - FEEDBACK_WEEKS * 7 * 24 * 3600 * 1000).toISOString();

  const db = createServiceClient();
  const [ratingsRes, reportsRes, feedbackRes] = await Promise.all([
    // Newest 50k ratings; if the table is missing this returns an error we
    // convert into an "available: false" payload instead of a 500.
    db
      .from('day_ratings')
      .select('rating, predicted_score, created_at')
      .order('created_at', { ascending: false })
      .limit(50000),
    db
      .from('reports')
      .select('plan_type, payment_status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50000),
    db
      .from('feedback')
      .select('rating, created_at')
      .gte('created_at', fbSince)
      .order('created_at', { ascending: false })
      .limit(50000),
  ]);

  // (a) resonance ────────────────────────────────────────────────────────────
  let resonance:
    | { available: false; reason: string }
    | {
        available: true;
        n: number;
        totalRatings: number;
        aligned: number;
        alignmentPct: number | null;
        byRating: { clearer: number; asExpected: number; heavier: number };
        matrix: Matrix;
        bands: { clearMin: number; heavyMax: number };
      };
  if (ratingsRes.error) {
    resonance = {
      available: false,
      reason: 'day_ratings table not found — apply the 20260702_day_ratings.sql migration.',
    };
  } else {
    const rows: DayRatingRow[] = (ratingsRes.data ?? []).map((r) => {
      const raw = r as { rating?: number; predicted_score?: number | string | null };
      const rating = Number(raw.rating);
      const score = raw.predicted_score == null ? null : Number(raw.predicted_score);
      return {
        rating: (rating === 1 ? 1 : rating === -1 ? -1 : 0) as -1 | 0 | 1,
        predicted_score: score != null && Number.isFinite(score) ? score : null,
      };
    });
    // minN 30 for the admin/global aggregate — never headline a % off a tiny sample.
    const stats = alignmentStats(rows, { minN: 30 });

    const matrix: Matrix = {
      clear: { clearer: 0, asExpected: 0, heavier: 0 },
      middle: { clearer: 0, asExpected: 0, heavier: 0 },
      heavy: { clearer: 0, asExpected: 0, heavier: 0 },
    };
    for (const r of rows) {
      if (r.predicted_score == null) continue;
      const band: Band =
        r.predicted_score >= DEFAULT_BANDS.clearMin ? 'clear' : r.predicted_score < DEFAULT_BANDS.heavyMax ? 'heavy' : 'middle';
      const felt: Felt = r.rating === 1 ? 'clearer' : r.rating === -1 ? 'heavier' : 'asExpected';
      matrix[band][felt]++;
    }

    resonance = {
      available: true,
      n: stats.n,
      totalRatings: rows.length,
      aligned: stats.aligned,
      alignmentPct: stats.alignmentPct,
      byRating: stats.byRating,
      matrix,
      bands: { clearMin: DEFAULT_BANDS.clearMin, heavyMax: DEFAULT_BANDS.heavyMax },
    };
  }

  // (b) conversion by plan ───────────────────────────────────────────────────
  const planAgg = new Map<string, { total: number; paid: number }>();
  for (const r of reportsRes.data ?? []) {
    const row = r as { plan_type?: string | null; payment_status?: string | null };
    const plan = (row.plan_type ?? 'unknown').trim().toLowerCase() || 'unknown';
    let agg = planAgg.get(plan);
    if (!agg) planAgg.set(plan, (agg = { total: 0, paid: 0 }));
    agg.total++;
    if (row.payment_status === 'paid') agg.paid++;
  }
  const plans = Array.from(planAgg.entries())
    .map(([plan, v]) => ({
      plan,
      isFree: isFreePlan(plan),
      total: v.total,
      paid: v.paid,
      paidPct: v.total > 0 ? Math.round((v.paid / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.paid - a.paid || b.total - a.total);

  // (c) feedback trend ───────────────────────────────────────────────────────
  const fbByWeek = new Map<string, { count: number; ratedCount: number; ratingSum: number }>();
  if (!feedbackRes.error) {
    for (const f of feedbackRes.data ?? []) {
      const row = f as { rating?: number | null; created_at: string };
      const wk = utcWeekKey(row.created_at);
      let agg = fbByWeek.get(wk);
      if (!agg) fbByWeek.set(wk, (agg = { count: 0, ratedCount: 0, ratingSum: 0 }));
      agg.count++;
      if (row.rating != null && Number.isFinite(Number(row.rating))) {
        agg.ratedCount++;
        agg.ratingSum += Number(row.rating);
      }
    }
  }
  // Fill the last 8 ISO weeks (oldest → newest) so the trend has no gaps.
  const feedbackWeeks: { week: string; count: number; ratedCount: number; avgRating: number | null }[] = [];
  for (let i = FEEDBACK_WEEKS - 1; i >= 0; i--) {
    const wk = utcWeekKey(now - i * 7 * 24 * 3600 * 1000);
    const agg = fbByWeek.get(wk) ?? { count: 0, ratedCount: 0, ratingSum: 0 };
    feedbackWeeks.push({
      week: wk,
      count: agg.count,
      ratedCount: agg.ratedCount,
      avgRating: agg.ratedCount > 0 ? Math.round((agg.ratingSum / agg.ratedCount) * 10) / 10 : null,
    });
  }

  return NextResponse.json({
    days,
    resonance,
    plans,
    feedback: {
      weeks: feedbackWeeks,
      error: feedbackRes.error ? feedbackRes.error.message : null,
    },
    note:
      'Resonance = felt day rating vs predicted score band (>=65 clear, <50 heavy). Alignment % is suppressed below 30 scored ratings. Plan conversion is windowed; resonance and feedback use their own ranges.',
  });
}
