/**
 * Pure calculation layer for the analytics/correlations features.
 * No I/O — callers fetch rows (analytics_events, day_ratings, payments, users)
 * and pass plain objects in, so every formula here is unit-testable and the
 * math is defined in exactly one place.
 *
 * Conventions:
 *  - All date bucketing is UTC (day key = YYYY-MM-DD, week key = Monday of the
 *    ISO week) so admin numbers are stable regardless of server timezone.
 *  - Percentages are returned 0-100 rounded to 1 decimal.
 *  - Small-sample guards return null rather than a misleading number.
 */

// ── date helpers ────────────────────────────────────────────────────────────

/** UTC day key: 2026-07-02 */
export function utcDayKey(d: string | number | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** UTC Monday-of-week key, e.g. 2026-06-29 for any date in that ISO week. */
export function utcWeekKey(d: string | number | Date): string {
  const dt = new Date(d);
  const day = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  const monday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

function pct(numer: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

// ── funnel ──────────────────────────────────────────────────────────────────

export type FunnelEventRow = {
  event_name: string;
  /** analytics_events.properties.session_id (nullable for old rows) */
  session_id: string | null;
  user_id: string | null;
  /** properties.path when relevant (page_view rows) */
  path?: string | null;
};

export type FunnelStageDef = {
  key: string;
  label: string;
  /** A row matching this predicate places its visitor in the stage. */
  match: (row: FunnelEventRow) => boolean;
};

export type FunnelStageResult = {
  key: string;
  label: string;
  /** unique visitors (session_id, falling back to user_id) in this stage */
  count: number;
  /** % of stage 1 */
  pctOfTop: number;
  /** % of previous stage */
  pctOfPrev: number;
};

/**
 * Stage-by-stage funnel over unique visitors. A visitor = session_id when
 * present, else user_id (server-emitted rows often lack a session). A visitor
 * counts in stage N only if they also counted in stage N-1 (strict funnel), so
 * conversion percentages are monotonic and honest.
 */
export function funnel(rows: FunnelEventRow[], stages: FunnelStageDef[]): FunnelStageResult[] {
  const visitorKey = (r: FunnelEventRow) => r.session_id || (r.user_id ? `u:${r.user_id}` : null);

  // A user can span sessions (e.g. tool anonymous → signs up). Link sessions
  // to users so later-stage user-only events still credit the earlier session.
  const sessionsOfUser = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.session_id && r.user_id) {
      let set = sessionsOfUser.get(r.user_id);
      if (!set) sessionsOfUser.set(r.user_id, (set = new Set()));
      set.add(r.session_id);
    }
  }
  // Expand a row into every visitor key it can credit.
  const keysFor = (r: FunnelEventRow): string[] => {
    const keys = new Set<string>();
    const k = visitorKey(r);
    if (k) keys.add(k);
    if (r.user_id) {
      keys.add(`u:${r.user_id}`);
      for (const s of Array.from(sessionsOfUser.get(r.user_id) ?? [])) keys.add(s);
    }
    return Array.from(keys);
  };

  const stageVisitors: Set<string>[] = stages.map(() => new Set());
  for (const r of rows) {
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].match(r)) for (const k of keysFor(r)) stageVisitors[i].add(k);
    }
  }

  // Strict funnel: intersect each stage with the previous one.
  const results: FunnelStageResult[] = [];
  let prev: Set<string> | null = null;
  let top = 0;
  for (let i = 0; i < stages.length; i++) {
    const eligible: Set<string> = prev
      ? new Set(Array.from(stageVisitors[i]).filter((k) => prev!.has(k)))
      : stageVisitors[i];
    if (i === 0) top = eligible.size;
    results.push({
      key: stages[i].key,
      label: stages[i].label,
      count: eligible.size,
      pctOfTop: i === 0 ? 100 : pct(eligible.size, top),
      pctOfPrev: i === 0 ? 100 : pct(eligible.size, prev ? prev.size : 0),
    });
    prev = eligible;
  }
  return results;
}

// ── weekly cohort retention ─────────────────────────────────────────────────

export type CohortUserRow = { user_id: string; signed_up_at: string };
export type ActivityRow = { user_id: string; created_at: string };

export type CohortRetentionRow = {
  /** Monday key of the signup week */
  cohortWeek: string;
  cohortSize: number;
  /** retention[w] = % of cohort active in week w after signup; [0] is signup week (=100 by definition only if they had any event — we report actual) */
  retentionPct: number[];
};

/**
 * Weekly cohort retention matrix. Cohort = UTC ISO week of signup. A user is
 * "active" in week w if they produced ANY activity row that week. maxWeeks
 * bounds the matrix width; weeks beyond "now" are omitted (not zero-filled)
 * by passing `throughWeek` = current week key.
 */
export function weeklyCohortRetention(
  users: CohortUserRow[],
  activity: ActivityRow[],
  opts: { maxWeeks?: number; throughWeek: string }
): CohortRetentionRow[] {
  const maxWeeks = opts.maxWeeks ?? 8;
  const cohortOf = new Map<string, string>(); // user -> cohort week
  const cohorts = new Map<string, Set<string>>(); // week -> users
  for (const u of users) {
    const wk = utcWeekKey(u.signed_up_at);
    cohortOf.set(u.user_id, wk);
    let set = cohorts.get(wk);
    if (!set) cohorts.set(wk, (set = new Set()));
    set.add(u.user_id);
  }

  // active weeks per user
  const activeWeeks = new Map<string, Set<string>>();
  for (const a of activity) {
    let set = activeWeeks.get(a.user_id);
    if (!set) activeWeeks.set(a.user_id, (set = new Set()));
    set.add(utcWeekKey(a.created_at));
  }

  const weekIndex = (cohortWeek: string, week: string): number =>
    Math.round((Date.parse(week) - Date.parse(cohortWeek)) / (7 * 24 * 3600 * 1000));

  const out: CohortRetentionRow[] = [];
  const sortedCohorts = Array.from(cohorts.keys()).sort();
  for (const wk of sortedCohorts) {
    const members = cohorts.get(wk)!;
    const maxObservable = Math.min(maxWeeks, weekIndex(wk, opts.throughWeek) + 1);
    if (maxObservable <= 0) continue;
    const counts = new Array(maxObservable).fill(0);
    for (const uid of Array.from(members)) {
      for (const aw of Array.from(activeWeeks.get(uid) ?? [])) {
        const idx = weekIndex(wk, aw);
        if (idx >= 0 && idx < maxObservable) counts[idx]++;
      }
    }
    out.push({
      cohortWeek: wk,
      cohortSize: members.size,
      retentionPct: counts.map((c) => pct(c, members.size)),
    });
  }
  return out;
}

// ── revenue KPIs ────────────────────────────────────────────────────────────

export type PaymentRow = {
  user_id: string | null;
  /** already normalised to USD cents by the caller (lib/admin/analytics.toUsdCents) */
  usd_cents: number;
  created_at: string;
  refunded?: boolean;
};

export type RevenueKpis = {
  revenueUsdCents: number;
  payers: number;
  purchases: number;
  /** average revenue per payer, cents (null if no payers) */
  arppUsdCents: number | null;
  /** conversion: payers / totalUsers (null if totalUsers=0) */
  paidConversionPct: number | null;
};

export function revenueKpis(payments: PaymentRow[], totalUsers: number): RevenueKpis {
  const kept = payments.filter((p) => !p.refunded);
  const revenue = kept.reduce((s, p) => s + p.usd_cents, 0);
  const payers = new Set(kept.map((p) => p.user_id).filter(Boolean)).size;
  return {
    revenueUsdCents: revenue,
    payers,
    purchases: kept.length,
    arppUsdCents: payers > 0 ? Math.round(revenue / payers) : null,
    paidConversionPct: totalUsers > 0 ? pct(payers, totalUsers) : null,
  };
}

// ── UTM rollup ──────────────────────────────────────────────────────────────

export type UtmRow = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  signups: number;
  payers: number;
  revenueUsdCents: number;
};

export type FirstTouchUserRow = {
  user_id: string;
  first_touch_source: string | null;
  first_touch_medium: string | null;
  first_touch_campaign: string | null;
};

/**
 * Campaign rollup from first-touch attribution: signups, payers and revenue by
 * (source, medium, campaign). Null UTMs group under "(direct)". Revenue joins
 * on user_id from non-refunded payments.
 */
export function utmRollup(users: FirstTouchUserRow[], payments: PaymentRow[]): UtmRow[] {
  const norm = (v: string | null) => (v && v.trim() ? v.trim().toLowerCase() : null);
  const keyOf = (u: FirstTouchUserRow) =>
    `${norm(u.first_touch_source) ?? '(direct)'}|${norm(u.first_touch_medium) ?? '-'}|${norm(u.first_touch_campaign) ?? '-'}`;

  const revenueByUser = new Map<string, number>();
  for (const p of payments) {
    if (p.refunded || !p.user_id) continue;
    revenueByUser.set(p.user_id, (revenueByUser.get(p.user_id) ?? 0) + p.usd_cents);
  }

  const groups = new Map<string, UtmRow>();
  for (const u of users) {
    const key = keyOf(u);
    let g = groups.get(key);
    if (!g) {
      groups.set(
        key,
        (g = {
          source: norm(u.first_touch_source) ?? '(direct)',
          medium: norm(u.first_touch_medium),
          campaign: norm(u.first_touch_campaign),
          signups: 0,
          payers: 0,
          revenueUsdCents: 0,
        })
      );
    }
    g.signups++;
    const rev = revenueByUser.get(u.user_id);
    if (rev != null) {
      g.payers++;
      g.revenueUsdCents += rev;
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.revenueUsdCents - a.revenueUsdCents || b.signups - a.signups
  );
}

// ── resonance alignment ─────────────────────────────────────────────────────

export type DayRatingRow = {
  /** -1 heavier, 0 as expected, +1 clearer */
  rating: -1 | 0 | 1;
  /** predicted day score 0-100 snapshotted at rating time (null tolerated) */
  predicted_score: number | null;
};

export type AlignmentBands = {
  /** predicted_score >= clearMin counts as a predicted-clearer day */
  clearMin: number;
  /** predicted_score < heavyMax counts as a predicted-heavier day (exclusive) */
  heavyMax: number;
};

/**
 * Default bands MUST match the tiers users are shown (getDayOutcomeTier in
 * src/lib/guidance/labels.ts): >=65 FAVORABLE/EXCELLENT = clear band,
 * <50 CAUTION/CHALLENGING/AVOID = heavy band, [50,65) MODERATE = middle.
 * If the tier boundaries ever change, change these with them.
 */
export const DEFAULT_BANDS: AlignmentBands = { clearMin: 65, heavyMax: 50 };

export type AlignmentStats = {
  n: number;
  aligned: number;
  /** null when n < minN — never show a % on tiny samples */
  alignmentPct: number | null;
  byRating: { clearer: number; asExpected: number; heavier: number };
};

/**
 * Alignment between predicted day-score band and the user's felt rating.
 * Aligned when: rating=+1 & score in clear band; rating=-1 & score in heavy
 * band; rating=0 & score in the middle band. Rows without a predicted score
 * count toward byRating tallies but not toward alignment n.
 */
export function alignmentStats(
  rows: DayRatingRow[],
  opts: { minN?: number; bands?: AlignmentBands } = {}
): AlignmentStats {
  const minN = opts.minN ?? 5;
  const bands = opts.bands ?? DEFAULT_BANDS;
  let n = 0;
  let aligned = 0;
  const byRating = { clearer: 0, asExpected: 0, heavier: 0 };
  for (const r of rows) {
    if (r.rating === 1) byRating.clearer++;
    else if (r.rating === -1) byRating.heavier++;
    else byRating.asExpected++;

    if (r.predicted_score == null || Number.isNaN(r.predicted_score)) continue;
    n++;
    const inClear = r.predicted_score >= bands.clearMin;
    const inHeavy = r.predicted_score < bands.heavyMax;
    const inMiddle = !inClear && !inHeavy;
    if ((r.rating === 1 && inClear) || (r.rating === -1 && inHeavy) || (r.rating === 0 && inMiddle)) {
      aligned++;
    }
  }
  return { n, aligned, alignmentPct: n >= minN ? pct(aligned, n) : null, byRating };
}
