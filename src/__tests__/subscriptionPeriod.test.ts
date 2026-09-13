import { describe, it, expect } from 'vitest';
import {
  PLAN_DAYS,
  isSubscriptionPlanType,
  planFromPlanType,
  nextPeriod,
  isActive,
  daysLeft,
  isDueForRenewalReminder,
} from '@/lib/subscriptions/period';

const NOW = new Date('2026-09-13T12:00:00Z');
const DAY = 86_400_000;

describe('plan ids', () => {
  it('recognises only the subscription checkout plans', () => {
    expect(isSubscriptionPlanType('sub_monthly')).toBe(true);
    expect(isSubscriptionPlanType('sub_annual')).toBe(true);
    // The one-time report plans share words with these; they must not grant a subscription.
    expect(isSubscriptionPlanType('monthly')).toBe(false);
    expect(isSubscriptionPlanType('annual')).toBe(false);
    expect(isSubscriptionPlanType('7day')).toBe(false);
    expect(isSubscriptionPlanType(null)).toBe(false);
  });

  it('maps checkout plans to subscription plans', () => {
    expect(planFromPlanType('sub_monthly')).toBe('monthly');
    expect(planFromPlanType('sub_annual')).toBe('annual');
    expect(planFromPlanType('monthly')).toBeNull();
  });
});

describe('nextPeriod', () => {
  it('starts now for a first payment', () => {
    const p = nextPeriod(null, 'monthly', NOW);
    expect(p.start.getTime()).toBe(NOW.getTime());
    expect(p.end.getTime() - p.start.getTime()).toBe(PLAN_DAYS.monthly * DAY);
  });

  it('stacks an early renewal onto the days still owed', () => {
    const end = new Date(NOW.getTime() + 5 * DAY);
    const p = nextPeriod(end, 'monthly', NOW);
    expect(p.start.getTime()).toBe(end.getTime());
    expect(p.end.getTime()).toBe(end.getTime() + 30 * DAY);
  });

  it('starts now after a lapse, so nobody pays for days without access', () => {
    const lapsed = new Date(NOW.getTime() - 10 * DAY);
    expect(nextPeriod(lapsed, 'monthly', NOW).start.getTime()).toBe(NOW.getTime());
  });

  it('gives an annual plan 365 days', () => {
    const p = nextPeriod(null, 'annual', NOW);
    expect(p.end.getTime() - p.start.getTime()).toBe(365 * DAY);
  });

  it('treats an unparseable end date as no period', () => {
    expect(nextPeriod('not-a-date', 'monthly', NOW).start.getTime()).toBe(NOW.getTime());
  });
});

describe('access', () => {
  it('is active only before the period end', () => {
    expect(isActive({ current_period_end: new Date(NOW.getTime() + 1000) }, NOW)).toBe(true);
    expect(isActive({ current_period_end: NOW }, NOW)).toBe(false);
    expect(isActive({ current_period_end: new Date(NOW.getTime() - 1000) }, NOW)).toBe(false);
    expect(isActive(null, NOW)).toBe(false);
  });

  it('counts days left, rounded up, and zero when lapsed', () => {
    expect(daysLeft({ current_period_end: new Date(NOW.getTime() + 2.2 * DAY) }, NOW)).toBe(3);
    expect(daysLeft({ current_period_end: new Date(NOW.getTime() - DAY) }, NOW)).toBe(0);
  });
});

describe('renewal reminder timing', () => {
  it('reminds a monthly subscriber in the last three days', () => {
    expect(isDueForRenewalReminder({ plan: 'monthly', current_period_end: new Date(NOW.getTime() + 3 * DAY) }, NOW)).toBe(true);
    expect(isDueForRenewalReminder({ plan: 'monthly', current_period_end: new Date(NOW.getTime() + 4 * DAY) }, NOW)).toBe(false);
  });

  it('reminds an annual subscriber two weeks out', () => {
    expect(isDueForRenewalReminder({ plan: 'annual', current_period_end: new Date(NOW.getTime() + 14 * DAY) }, NOW)).toBe(true);
    expect(isDueForRenewalReminder({ plan: 'annual', current_period_end: new Date(NOW.getTime() + 20 * DAY) }, NOW)).toBe(false);
  });

  it('never reminds someone whose access has already lapsed', () => {
    expect(isDueForRenewalReminder({ plan: 'monthly', current_period_end: new Date(NOW.getTime() - DAY) }, NOW)).toBe(false);
  });
});
