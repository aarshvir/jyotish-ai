import { describe, it, expect } from 'vitest';
import {
  utcDayKey,
  utcWeekKey,
  funnel,
  weeklyCohortRetention,
  revenueKpis,
  utmRollup,
  alignmentStats,
  DEFAULT_BANDS,
  type FunnelEventRow,
  type FunnelStageDef,
} from './calcs';

describe('date keys', () => {
  it('utcDayKey is UTC-stable', () => {
    expect(utcDayKey('2026-07-02T23:59:59Z')).toBe('2026-07-02');
    expect(utcDayKey('2026-07-02T00:00:00Z')).toBe('2026-07-02');
  });
  it('utcWeekKey returns the Monday of the ISO week', () => {
    expect(utcWeekKey('2026-07-02T12:00:00Z')).toBe('2026-06-29'); // Thu -> Mon
    expect(utcWeekKey('2026-06-29T00:00:00Z')).toBe('2026-06-29'); // Mon -> same
    expect(utcWeekKey('2026-07-05T10:00:00Z')).toBe('2026-06-29'); // Sun -> prev Mon
  });
});

const STAGES: FunnelStageDef[] = [
  { key: 'visit', label: 'Visited', match: (r) => r.event_name === 'page_view' },
  { key: 'tool', label: 'Used tool', match: (r) => r.event_name === 'tool_result' },
  { key: 'signup', label: 'Signed up', match: (r) => r.event_name === 'session_start' && !!r.user_id },
  { key: 'paid', label: 'Paid', match: (r) => r.event_name === 'payment_succeeded' },
];

describe('funnel', () => {
  const ev = (event_name: string, session_id: string | null, user_id: string | null): FunnelEventRow => ({
    event_name,
    session_id,
    user_id,
  });

  it('counts strict stage-over-stage conversion', () => {
    const rows = [
      // visitor A: full funnel
      ev('page_view', 'sA', null),
      ev('tool_result', 'sA', null),
      ev('session_start', 'sA', 'u1'),
      ev('payment_succeeded', null, 'u1'), // server event, session-less
      // visitor B: visit + tool only
      ev('page_view', 'sB', null),
      ev('tool_result', 'sB', null),
      // visitor C: visit only
      ev('page_view', 'sC', null),
    ];
    const [visit, tool, signup, paid] = funnel(rows, STAGES);
    expect(visit.count).toBe(3);
    expect(tool.count).toBe(2);
    expect(signup.count).toBe(1);
    expect(paid.count).toBe(1);
    expect(tool.pctOfPrev).toBeCloseTo(66.7, 1);
    expect(paid.pctOfTop).toBeCloseTo(33.3, 1);
  });

  it('links a session-less server event back through the user id', () => {
    const rows = [
      ev('page_view', 'sX', null),
      ev('session_start', 'sX', 'u9'),
      ev('tool_result', 'sX', 'u9'),
      ev('payment_succeeded', null, 'u9'),
    ];
    // reorder stages so the strict intersection must bridge session<->user keys
    const res = funnel(rows, STAGES);
    expect(res[3].count).toBe(1);
  });

  it('a later-stage-only visitor does not count (strict funnel)', () => {
    const rows = [ev('payment_succeeded', null, 'ghost')];
    const res = funnel(rows, STAGES);
    expect(res[0].count).toBe(0);
    expect(res[3].count).toBe(0);
  });
});

describe('weeklyCohortRetention', () => {
  it('computes cohort sizes and weekly activity %', () => {
    const users = [
      { user_id: 'a', signed_up_at: '2026-06-15T10:00:00Z' }, // week 2026-06-15
      { user_id: 'b', signed_up_at: '2026-06-16T10:00:00Z' }, // same cohort
      { user_id: 'c', signed_up_at: '2026-06-23T10:00:00Z' }, // next cohort
    ];
    const activity = [
      { user_id: 'a', created_at: '2026-06-15T11:00:00Z' }, // wk0
      { user_id: 'a', created_at: '2026-06-24T11:00:00Z' }, // wk1
      { user_id: 'b', created_at: '2026-06-17T11:00:00Z' }, // wk0
      { user_id: 'c', created_at: '2026-06-23T11:00:00Z' }, // wk0 of its cohort
    ];
    const rows = weeklyCohortRetention(users, activity, { throughWeek: '2026-06-29', maxWeeks: 4 });
    expect(rows).toHaveLength(2);
    const [c1, c2] = rows;
    expect(c1.cohortWeek).toBe('2026-06-15');
    expect(c1.cohortSize).toBe(2);
    expect(c1.retentionPct[0]).toBe(100); // both active week 0
    expect(c1.retentionPct[1]).toBe(50); // only a active week 1
    expect(c2.cohortSize).toBe(1);
    expect(c2.retentionPct[0]).toBe(100);
  });

  it('omits unobservable future weeks instead of zero-filling', () => {
    const users = [{ user_id: 'a', signed_up_at: '2026-06-29T10:00:00Z' }];
    const rows = weeklyCohortRetention(users, [], { throughWeek: '2026-06-29', maxWeeks: 8 });
    expect(rows[0].retentionPct).toHaveLength(1); // only week 0 observable
  });
});

describe('revenueKpis', () => {
  it('excludes refunds and computes ARPP + conversion', () => {
    const payments = [
      { user_id: 'u1', usd_cents: 999, created_at: '2026-07-01T00:00:00Z' },
      { user_id: 'u1', usd_cents: 1999, created_at: '2026-07-02T00:00:00Z' },
      { user_id: 'u2', usd_cents: 999, created_at: '2026-07-02T00:00:00Z' },
      { user_id: 'u3', usd_cents: 4999, created_at: '2026-07-02T00:00:00Z', refunded: true },
    ];
    const k = revenueKpis(payments, 100);
    expect(k.revenueUsdCents).toBe(999 + 1999 + 999);
    expect(k.payers).toBe(2);
    expect(k.purchases).toBe(3);
    expect(k.arppUsdCents).toBe(Math.round((999 + 1999 + 999) / 2));
    expect(k.paidConversionPct).toBe(2);
  });

  it('null-guards empty inputs', () => {
    const k = revenueKpis([], 0);
    expect(k.arppUsdCents).toBeNull();
    expect(k.paidConversionPct).toBeNull();
  });
});

describe('utmRollup', () => {
  it('groups by normalised source/medium/campaign with revenue join', () => {
    const users = [
      { user_id: 'u1', first_touch_source: 'ProductHunt', first_touch_medium: 'launch', first_touch_campaign: 'launch' },
      { user_id: 'u2', first_touch_source: 'producthunt', first_touch_medium: 'launch', first_touch_campaign: 'launch' },
      { user_id: 'u3', first_touch_source: null, first_touch_medium: null, first_touch_campaign: null },
    ];
    const payments = [
      { user_id: 'u2', usd_cents: 1999, created_at: '2026-07-02T00:00:00Z' },
      { user_id: 'u3', usd_cents: 999, created_at: '2026-07-02T00:00:00Z', refunded: true },
    ];
    const rows = utmRollup(users, payments);
    expect(rows).toHaveLength(2);
    const ph = rows.find((r) => r.source === 'producthunt')!;
    expect(ph.signups).toBe(2);
    expect(ph.payers).toBe(1);
    expect(ph.revenueUsdCents).toBe(1999);
    const direct = rows.find((r) => r.source === '(direct)')!;
    expect(direct.signups).toBe(1);
    expect(direct.payers).toBe(0); // refunded payment doesn't count
  });
});

describe('alignmentStats', () => {
  it('scores alignment by band and guards small samples', () => {
    const rows: { rating: -1 | 0 | 1; predicted_score: number | null }[] = [
      { rating: 1, predicted_score: 80 }, // aligned (clear band)
      { rating: 1, predicted_score: 30 }, // not aligned
      { rating: -1, predicted_score: 20 }, // aligned (heavy band)
      { rating: 0, predicted_score: 55 }, // aligned (middle)
      { rating: 0, predicted_score: 90 }, // not aligned
      { rating: 1, predicted_score: null }, // counted in byRating, not in n
    ];
    const s = alignmentStats(rows, { minN: 5 });
    expect(s.n).toBe(5);
    expect(s.aligned).toBe(3);
    expect(s.alignmentPct).toBe(60);
    expect(s.byRating).toEqual({ clearer: 3, asExpected: 2, heavier: 1 });
  });

  it('returns null pct below minN', () => {
    const s = alignmentStats([{ rating: 1, predicted_score: 90 }], { minN: 5 });
    expect(s.n).toBe(1);
    expect(s.alignmentPct).toBeNull();
  });

  it('default bands match the user-facing tiers (labels.ts): clear >=65, heavy <50', () => {
    expect(DEFAULT_BANDS.clearMin).toBe(65); // getDayOutcomeTier: >=65 FAVORABLE
    expect(DEFAULT_BANDS.heavyMax).toBe(50); // getDayOutcomeTier: <50 CAUTION and below
    // boundary behaviour: 50 is MODERATE (middle band), 49.9 is heavy
    const mid = alignmentStats(
      [
        { rating: 0, predicted_score: 50 },
        { rating: -1, predicted_score: 49.9 },
        { rating: 1, predicted_score: 65 },
        { rating: 0, predicted_score: 64.9 },
        { rating: -1, predicted_score: 0 },
      ],
      { minN: 5 }
    );
    expect(mid.aligned).toBe(5);
    expect(mid.alignmentPct).toBe(100);
  });
});
