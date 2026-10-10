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
import {
  COST_MODEL,
  CURRENCIES,
  EXPERIMENTS,
  PRICE_SETS,
  READY_CURRENCIES,
  SUBSCRIPTION_MONTHS,
  experimentPrice,
  firstPaymentProfitUsd,
  netOfCharge,
  steadyMargin,
  subscriptionPrice,
  type PriceExperiment,
  type PriceSetId,
} from '@/lib/priceBook';

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
 * Cost floor, on the honest basis (docs/PRICING_RESEARCH.md §4–§5). Replaces the
 * 2026-09-13 rule "6x a $6.50 all-Opus worst case", which priced a ceiling nobody pays:
 * the measured cost of a daily-active subscriber-month is ≤ $1.60, plus $0.40 for Ask.
 *
 * A price passes when, after Ziina's real fees (2.6% + 1.5% non-AED + 1.2% FX + AED 1)
 * and a 5% refund reserve:
 *   1. serve cost at daily use takes at most 30% of what we keep (70% margin), and
 *   2. a buyer who pays once and never renews is not a loss, even after the market's
 *      extra first-run budget.
 * Checked for the live prices, the recommended prices and every experiment arm. An arm
 * that knowingly sits below the floor must say so (belowFloor) or this fails.
 */
describe('prices clear the honest cost floor after fees and refunds', () => {
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  for (const setId of Object.keys(PRICE_SETS) as PriceSetId[]) {
    for (const sku of ['sub_monthly', 'sub_annual'] as const) {
      for (const cur of [...CURRENCIES, ...READY_CURRENCIES]) {
        it(`${setId} ${sku} in ${cur} keeps a ${pct(COST_MODEL.minSteadyMargin)}+ margin and never loses on one payment`, () => {
          const amt = subscriptionPrice(sku, cur, setId);
          expect(steadyMargin(amt, cur, SUBSCRIPTION_MONTHS[sku])).toBeGreaterThanOrEqual(COST_MODEL.minSteadyMargin);
          expect(firstPaymentProfitUsd(amt, cur)).toBeGreaterThanOrEqual(0);
        });
      }
    }
  }

  it('every subscription experiment arm clears the floor or says why not', () => {
    for (const id of ['price_monthly_in', 'price_monthly_row'] as const) {
      const exp: PriceExperiment = EXPERIMENTS[id];
      for (const [armId, arm] of Object.entries(exp.arms)) {
        const cur = exp.market === 'IN' ? 'INR' : 'USD';
        const amt = experimentPrice(id, armId, cur);
        const passes = steadyMargin(amt, cur, 1) >= COST_MODEL.minSteadyMargin && firstPaymentProfitUsd(amt, cur) >= 0;
        if (!passes) expect(arm.belowFloor, `${id}/${armId} is below the floor without saying so`).toBeTruthy();
        else expect(arm.belowFloor, `${id}/${armId} clears the floor; drop the belowFloor note`).toBeUndefined();
      }
    }
  });

  it('every one-time funnel price nets at least 2x its estimated generation cost', () => {
    const oneTime = [
      ['price_report', 'report_entry', true],
      ['price_bump', 'bump_30day', false], // rides in the report's charge: no second fixed fee
      ['price_downsell', 'downsell_7day', true],
    ] as const;
    for (const [id, sku, ownCharge] of oneTime) {
      for (const armId of Object.keys(EXPERIMENTS[id].arms)) {
        for (const cur of CURRENCIES) {
          const { netUsd } = netOfCharge(experimentPrice(id, armId, cur), cur, { fixedFee: ownCharge });
          expect(netUsd, `${id}/${armId}/${cur}`).toBeGreaterThanOrEqual(COST_MODEL.oneTimeMarkup * COST_MODEL.oneTimeCostUsd[sku]);
        }
      }
    }
  });

  it('the measured cost basis is used, not the old all-Opus ceiling', () => {
    expect(COST_MODEL.monthlyServeUsd).toBeLessThan(6.5);
    expect(COST_MODEL.monthlyServeUsd).toBeGreaterThanOrEqual(1.6);
  });
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
