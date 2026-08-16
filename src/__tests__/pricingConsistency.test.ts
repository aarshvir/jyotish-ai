import { describe, it, expect } from 'vitest';
import {
  ZIINA_PLANS,
  getPlanAmount,
  formatAmount,
  type SupportedCurrency,
} from '@/lib/ziina/server';
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
