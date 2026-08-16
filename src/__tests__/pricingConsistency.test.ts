import { describe, it, expect } from 'vitest';
import {
  ZIINA_PLANS,
  getPlanAmount,
  formatAmount,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { applyDiscount } from '@/lib/ziina/amounts';
import { computeIntentAmount } from '@/lib/ziina/server';
import { PLAN_CARDS, UNLOCK_7DAY_HREF } from '@/lib/pricing';

/**
 * Locks the canonical displayed prices so the amount a customer SEES always equals
 * the amount Ziina CHARGES — getPlanAmount() is the single source of truth for both
 * the rendered price and the create-intent charge. If ZIINA_PLANS amounts change,
 * update these expectations deliberately (and the hardcoded PRICE_DISPLAY in
 * src/components/landing/Pricing.tsx, which must match these strings).
 */
describe('pricing consistency — display == charge', () => {
  const EXPECTED: Record<string, Record<SupportedCurrency, string>> = {
    '7day': { USD: '$9.99', INR: '₹799', AED: 'AED 37.99' },
    monthly: { USD: '$19.99', INR: '₹1,499', AED: 'AED 69.99' },
    annual: { USD: '$49.99', INR: '₹3,999', AED: 'AED 184.99' },
  };

  for (const [plan, byCurrency] of Object.entries(EXPECTED)) {
    for (const cur of ['USD', 'INR', 'AED'] as SupportedCurrency[]) {
      it(`${plan} in ${cur} displays ${byCurrency[cur]}`, () => {
        expect(formatAmount(getPlanAmount(plan, cur), cur)).toBe(byCurrency[cur]);
      });
    }
  }

  it('every plan has positive integer base-unit amounts in all three currencies', () => {
    for (const plan of Object.values(ZIINA_PLANS)) {
      for (const amt of [plan.amountUSD, plan.amountINR, plan.amountAED]) {
        expect(Number.isInteger(amt)).toBe(true);
        expect(amt).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * NEWUSER30 is advertised as "30% off" in the launch banner, the onboard step-3
 * nudge, every blog CTA, the lifecycle emails and the already-SENT launch emails.
 * A discount that charges less than it promises is a false price on a live
 * payments site. These lock the promise to the charge.
 *
 * Regression: charm rounding turned ₹799 − 30% (= ₹559.30) into ₹599, a 25%
 * discount sold as 30%.
 */
describe('advertised discount == charged discount', () => {
  const NEWUSER30_PCT = 30; // supabase/migrations/20260418_seed_promo_codes.sql

  it('NEWUSER30 on the 7-day plan charges ₹559 in INR, not ₹599', () => {
    expect(computeIntentAmount('7day', 'INR', NEWUSER30_PCT)).toBe(55900);
    expect(formatAmount(55900, 'INR')).toBe('₹559');
  });

  it('never charges MORE than the exact advertised discount, for every plan × currency × code', () => {
    // Every discount percentage the promo table can hand out (seed migration).
    for (const pct of [30, 80, 10]) {
      for (const [planId, plan] of Object.entries(ZIINA_PLANS)) {
        for (const cur of ['USD', 'INR', 'AED'] as SupportedCurrency[]) {
          const list = getPlanAmount(planId, cur);
          const exact = list * (1 - pct / 100);
          const charged = applyDiscount(list, pct, cur);
          expect(
            charged,
            `${planId}/${cur} at ${pct}% off: charged ${charged} > exact ${exact}`,
          ).toBeLessThanOrEqual(exact);
          expect(charged).toBeGreaterThan(0);
          expect(Number.isInteger(charged)).toBe(true);
          expect(plan.name.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('INR discounted amounts land on whole rupees so the shown price is the charged price', () => {
    for (const pct of [30, 80, 10]) {
      for (const planId of Object.keys(ZIINA_PLANS)) {
        const charged = applyDiscount(getPlanAmount(planId, 'INR'), pct, 'INR');
        expect(charged % 100, `${planId} at ${pct}% off is not a whole rupee`).toBe(0);
      }
    }
  });

  it('a 0% / absent code leaves the list price untouched', () => {
    expect(applyDiscount(79900, 0, 'INR')).toBe(79900);
    expect(computeIntentAmount('7day', 'INR')).toBe(79900);
  });
});

describe('unlock and plan-card honesty', () => {
  it('unlocks 7-day with the public launch promo', () => {
    expect(UNLOCK_7DAY_HREF).toBe('/onboard?plan=7day&promo=NEWUSER30');
  });

  it('Annual card is access + support, not a year of hourly windows', () => {
    const annual = PLAN_CARDS.find((p) => p.id === 'annual');
    expect(annual).toBeTruthy();
    const blob = `${annual?.description ?? ''} ${annual?.features.join(' ') ?? ''}`.toLowerCase();
    expect(blob).toMatch(/1-year report access/);
    expect(blob).not.toMatch(/full year of hours/);
    expect(blob).not.toMatch(/dasha transitions across the year/);
  });
});
