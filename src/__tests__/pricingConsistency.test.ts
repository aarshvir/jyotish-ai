import { describe, it, expect } from 'vitest';
import {
  ZIINA_PLANS,
  getPlanAmount,
  formatAmount,
  type SupportedCurrency,
} from '@/lib/ziina/server';
import { applyDiscount } from '@/lib/ziina/amounts';
import { computeIntentAmount } from '@/lib/ziina/server';
import { PLAN_CARDS, FEATURE_MATRIX, UNLOCK_7DAY_HREF, UNLOCK_FREE_HREF } from '@/lib/pricing';

/**
 * Locks the displayed prices so the amount a customer SEES always equals the amount
 * Ziina CHARGES — getPlanAmount() is the single source of truth for both the rendered
 * price (pricing page, landing pricing, quiz paywall) and the create-intent charge.
 * If ZIINA_PLANS amounts change, update these expectations deliberately.
 */
describe('pricing consistency — display == charge', () => {
  const EXPECTED: Record<string, Record<SupportedCurrency, string>> = {
    // Subscriptions — the only plans sold since 2026-09-13.
    sub_monthly: { USD: '$41.99', INR: '₹3,999', AED: 'AED 159.00' },
    sub_annual: { USD: '$499.00', INR: '₹47,999', AED: 'AED 1849.00' },
    // Retired one-time plans, still defined for legacy rows and refused at checkout.
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
 * Owner rule (2026-09-13): a subscription must sell for at least 6x its real model cost,
 * assuming the subscriber uses it every day. The cost basis is the most expensive
 * realistic path, measured against a stored 30-day report — see the comment on
 * ZIINA_PLANS.sub_monthly. This test fails if a price edit, a fee change or an exchange
 * rate move takes any currency below that floor after Ziina's cut.
 */
describe('subscription prices clear the 6x cost floor after fees', () => {
  const COST_PER_MONTH_USD = 6.5;
  const MARKUP = 6;
  // Ziina keeps ~4.3% (2.6% processing + 1.5% international + VAT on fees) plus AED 1.
  const FEE_PCT = 0.043;
  const FEE_FIXED_USD = 1 / 3.6725;
  // Rates used when these prices were set (2026-09-13). Revisit if the rupee moves sharply.
  const USD_PER: Record<SupportedCurrency, number> = { USD: 1, INR: 1 / 95.58, AED: 1 / 3.6725 };

  const months: Record<string, number> = { sub_monthly: 1, sub_annual: 12 };

  for (const [planId, count] of Object.entries(months)) {
    for (const cur of ['USD', 'INR', 'AED'] as SupportedCurrency[]) {
      it(`${planId} in ${cur} nets at least ${MARKUP}x cost`, () => {
        const grossUsd = (getPlanAmount(planId, cur) / 100) * USD_PER[cur];
        const netUsd = grossUsd * (1 - FEE_PCT) - FEE_FIXED_USD;
        expect(netUsd).toBeGreaterThanOrEqual(COST_PER_MONTH_USD * count * MARKUP);
      });
    }
  }
});

/**
 * NEWUSER30 still exists for legacy links, and codes are refused on subscriptions at
 * checkout. The discount arithmetic must stay honest for every plan regardless: a
 * discount that charges less than it promises is a false price.
 *
 * Regression: charm rounding turned ₹799 − 30% (= ₹559.30) into ₹599, a 25% discount
 * sold as 30%.
 */
describe('advertised discount == charged discount', () => {
  const NEWUSER30_PCT = 30; // supabase/migrations/20260418_seed_promo_codes.sql

  it('NEWUSER30 on the 7-day plan charges ₹559 in INR, not ₹599', () => {
    expect(computeIntentAmount('7day', 'INR', NEWUSER30_PCT)).toBe(55900);
    expect(formatAmount(55900, 'INR')).toBe('₹559');
  });

  it('never charges MORE than the exact advertised discount, for every plan × currency × code', () => {
    for (const pct of [30, 80, 10]) {
      for (const [planId, plan] of Object.entries(ZIINA_PLANS)) {
        for (const cur of ['USD', 'INR', 'AED'] as SupportedCurrency[]) {
          const list = getPlanAmount(planId, cur);
          const exact = list * (1 - pct / 100);
          const charged = applyDiscount(list, pct, cur);
          expect(charged, `${planId}/${cur} at ${pct}% off: charged ${charged} > exact ${exact}`).toBeLessThanOrEqual(exact);
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

describe('links and plan-card honesty', () => {
  it('every paid CTA leads into the quiz', () => {
    expect(UNLOCK_7DAY_HREF).toBe('/start');
  });

  it('the free CTA leads to a genuinely free calculator, not a report', () => {
    expect(UNLOCK_FREE_HREF).toBe('/free-kundli');
  });

  it('only the free calculators and the two subscription plans are offered', () => {
    expect(PLAN_CARDS.map((p) => p.id)).toEqual(['free', 'sub_monthly', 'sub_annual']);
  });

  it('paid cards go to the quiz and never promise one-time or a free report', () => {
    for (const card of PLAN_CARDS) {
      const blob = `${card.name} ${card.description} ${card.features.join(' ')} ${card.cta}`.toLowerCase();
      expect(blob).not.toMatch(/one-time|pay once|no subscription|free report/);
      if (card.id !== 'free') expect(card.href).toBe('/start');
    }
  });

  it('Yearly is described as monthly forecasts across a year, not a year of hourly windows at once', () => {
    const annual = PLAN_CARDS.find((p) => p.id === 'sub_annual');
    const blob = `${annual?.description ?? ''} ${annual?.features.join(' ') ?? ''}`.toLowerCase();
    expect(blob).toMatch(/each month|every month/);
    expect(blob).not.toMatch(/full year of hours|365 days of hourly/);
  });

  it('the comparison matrix has a cell for every offered plan', () => {
    for (const group of FEATURE_MATRIX) {
      for (const row of group.rows) {
        expect(row).toHaveProperty('free');
        expect(row).toHaveProperty('sub_monthly');
        expect(row).toHaveProperty('sub_annual');
      }
    }
  });
});
