import { describe, expect, it } from 'vitest';
import {
  breakdown,
  buildVisitors,
  classifySource,
  computeFunnel,
  mrr,
  normalizeEvent,
  paymentState,
  quizSteps,
  summarizeReasons,
  toInr,
  type RawEvent,
} from './metrics';
import { isInternalEmail, isInternalHost } from './internal';

const T0 = Date.parse('2026-10-01T00:00:00Z');
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const ev = (name: string, sid: string | null, min: number, props: Record<string, unknown> = {}, user: string | null = null): RawEvent => ({
  event_name: name,
  user_id: user,
  created_at: at(min),
  properties: { session_id: sid, ...props },
});

describe('normalizeEvent', () => {
  it('maps legacy names and the legacy recap step', () => {
    expect(normalizeEvent(ev('quiz_step', 's', 0, { step: 'concern', path: '/start' })).name).toBe('quiz_view');
    expect(normalizeEvent(ev('quiz_step', 's', 0, { step: 'recap' })).name).toBe('reveal_view');
    expect(normalizeEvent(ev('paywall_view', 's', 0)).name).toBe('offer_view');
    expect(normalizeEvent(ev('checkout_started', 's', 0)).name).toBe('checkout_start');
    expect(normalizeEvent(ev('quiz_step', 's', 0, { path: '/start' })).slug).toBe('start');
  });
  it('falls back to user id as the visitor', () => {
    expect(normalizeEvent(ev('purchase', null, 0, {}, 'u1')).visitor).toBe('u:u1');
    expect(normalizeEvent(ev('purchase', 'anon', 0, {}, null)).visitor).toBeNull();
  });
});

describe('classifySource', () => {
  it('prefers utm, then click ids, then referrer', () => {
    expect(classifySource({ utm_source: 'Instagram' })).toBe('instagram');
    expect(classifySource({ utm: { utm_source: 'yt' } })).toBe('yt');
    expect(classifySource({ fbclid: 'abc' })).toBe('meta (click id)');
    expect(classifySource({ referrer: 'https://www.google.com/' })).toBe('organic search');
    expect(classifySource({ referrer: 'https://vedichour.com/blog' })).toBeNull();
    expect(classifySource({})).toBeNull();
  });
});

describe('funnel', () => {
  const rows: RawEvent[] = [
    // a: full journey and pays
    ev('page_view', 'a', 0, { path: '/start', utm_source: 'ig' }),
    ev('quiz_view', 'a', 1, { step: 'concern', step_index: 1, slug: 'start' }),
    ev('quiz_view', 'a', 2, { step: 'duration', step_index: 2, slug: 'start' }),
    ev('reveal_view', 'a', 5, {}, 'ua'),
    ev('offer_view', 'a', 6, {}, 'ua'),
    ev('checkout_start', 'a', 7, {}, 'ua'),
    // b: quiz then leaves
    ev('page_view', 'b', 0, { path: '/start' }),
    ev('quiz_view', 'b', 1, { step: 'concern', step_index: 1 }),
    // c: lands on the offer without the quiz (renewal) — excluded by strictness
    ev('page_view', 'c', 0, { path: '/start' }),
    ev('offer_view', 'c', 1),
    // d: internal tester
    ev('page_view', 'd', 0, { path: '/start' }, 'staff'),
    ev('quiz_view', 'd', 1, { step: 'concern' }),
    // e: local dev host
    ev('page_view', 'e', 0, { path: '/start', host: 'localhost:3001' }),
  ];
  const events = rows.map(normalizeEvent);
  const visitors = buildVisitors(events, new Set(['staff']));
  const paid = new Map([['ua', T0 + 9 * 60_000]]);
  const kept = () => Array.from(visitors.values()).filter((v) => !v.internal);

  it('marks internal by user and by host', () => {
    expect(visitors.get('d')?.internal).toBe(true);
    expect(visitors.get('e')?.internal).toBe(true);
    expect(visitors.get('a')?.internal).toBe(false);
  });

  it('is strict and monotonic, with medians', () => {
    const st = computeFunnel(kept(), paid);
    expect(st.map((s) => s.count)).toEqual([3, 2, 1, 1, 1, 1]);
    expect(st[1].pctOfPrev).toBe(66.7);
    expect(st[1].dropped).toBe(1);
    expect(st[5].medianMsFromPrev).toBe(2 * 60_000);
  });

  it('steps follow declared order', () => {
    const steps = quizSteps(kept(), ['concern', 'duration']);
    expect(steps.map((s) => [s.step, s.reached])).toEqual([
      ['concern', 2],
      ['duration', 1],
    ]);
  });

  it('breakdown credits revenue to the first visitor of the paying user', () => {
    const rowsBy = breakdown(
      kept(),
      [
        { user_id: 'ua', inr: 3999, created_at: at(9) },
        { user_id: 'zz', inr: 100, created_at: at(9) },
      ],
      'source',
    );
    const ig = rowsBy.find((r) => r.key === 'ig')!;
    expect(ig.revenueInr).toBe(3999);
    expect(ig.payers).toBe(1);
    expect(ig.rpvInr).toBe(3999);
    expect(rowsBy.find((r) => r.key === '(no tracked visit)')?.revenueInr).toBe(100);
  });
});

describe('reasons', () => {
  it('summarises answers, contexts and free text', () => {
    const e = [
      ev('dropoff_prompt_view', 'a', 0, { context: 'paywall_back' }),
      ev('dropoff_prompt_view', 'b', 0, { context: 'checkout_cancelled' }),
      ev('dropoff_reason', 'a', 1, { context: 'paywall_back', reason: 'price' }),
      ev('dropoff_reason', 'b', 1, { context: 'checkout_cancelled', reason: 'other', text: 'no upi' }),
    ].map(normalizeEvent);
    const r = summarizeReasons(e, () => true);
    expect(r.responsePct).toBe(100);
    expect(r.byReason.map((x) => x.reason).sort()).toEqual(['other', 'price']);
    expect(r.notes[0].text).toBe('no upi');
  });
});

describe('payments + money', () => {
  it('splits intents into paid / cancelled / in flight / abandoned', () => {
    const now = T0 + 5 * 3_600_000;
    const s = paymentState(
      [
        { id: '1', user_id: null, status: 'completed', amount: 399900, currency: 'INR', plan_type: 'sub_monthly', created_at: at(0) },
        { id: '2', user_id: null, status: 'pending', amount: 399900, currency: 'INR', plan_type: null, created_at: at(0) },
        { id: '3', user_id: null, status: 'pending', amount: 399900, currency: 'INR', plan_type: null, created_at: new Date(now - 60_000).toISOString() },
        { id: '4', user_id: null, status: 'cancelled', amount: 4800, currency: 'USD', plan_type: null, created_at: at(0) },
      ],
      now,
    );
    expect(s).toMatchObject({ created: 4, completed: 1, abandoned: 1, inFlight: 1, cancelled: 1, revenueInr: 3999 });
    expect(s.completionPct).toBe(33.3);
    expect(toInr(4800, 'USD')).toBe(3984);
  });

  it('MRR normalises annual and counts new / renewal / lapsed', () => {
    const now = Date.parse('2026-10-10T00:00:00Z');
    const start = Date.parse('2026-09-10T00:00:00Z');
    const m = mrr(
      [
        { user_id: 'a', plan: 'monthly', current_period_start: '2026-10-01', current_period_end: '2026-11-01', canceled_at: null, created_at: '2026-09-01' },
        { user_id: 'b', plan: 'annual', current_period_start: '2026-09-20', current_period_end: '2027-09-20', canceled_at: null, created_at: '2026-09-20' },
        { user_id: 'c', plan: 'monthly', current_period_start: '2026-08-20', current_period_end: '2026-09-20', canceled_at: null, created_at: '2026-08-20' },
      ],
      [
        { user_id: 'a', plan: 'monthly', amount: 399900, currency: 'INR', period_start: '2026-09-01', created_at: '2026-09-01' },
        { user_id: 'a', plan: 'monthly', amount: 399900, currency: 'INR', period_start: '2026-10-01', created_at: '2026-10-01' },
        { user_id: 'b', plan: 'annual', amount: 3600000, currency: 'INR', period_start: '2026-09-20', created_at: '2026-09-20' },
      ],
      now,
      start,
    );
    expect(m).toEqual({ activeSubs: 2, mrrInr: 3999 + 3000, newInWindow: 1, renewalsInWindow: 1, lapsedInWindow: 1 });
  });
});

describe('internal rules', () => {
  it('matches the owner-specified patterns', () => {
    expect(isInternalEmail('qa@vedichour.com')).toBe(true);
    expect(isInternalEmail('x@example.com')).toBe(true);
    expect(isInternalEmail('AarshVir+1@gmail.com')).toBe(true);
    expect(isInternalEmail('e2e-bot@mail.test')).toBe(true);
    expect(isInternalEmail('boss@corp.in', new Set(['boss@corp.in']))).toBe(true);
    expect(isInternalEmail('someone@gmail.com')).toBe(false);
    expect(isInternalHost('www.vedichour.com')).toBe(false);
    expect(isInternalHost('localhost:3001')).toBe(true);
    expect(isInternalHost(undefined)).toBe(false);
  });
});
