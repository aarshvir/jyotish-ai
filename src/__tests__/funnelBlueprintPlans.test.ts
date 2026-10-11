import { describe, it, expect } from 'vitest';
import { ZIINA_PLANS } from '@/lib/ziina/server';
import { BLUEPRINT_PLANS } from '@/lib/funnel/offer';

describe('blueprint plans', () => {
  it('exist at the spec prices, and the bump costs exactly ₹99 / $1.99 on top', () => {
    expect(ZIINA_PLANS.blueprint.amountINR).toBe(19900);
    expect(ZIINA_PLANS.blueprint.amountUSD).toBe(499);
    expect(ZIINA_PLANS.blueprint_plus30.amountINR - ZIINA_PLANS.blueprint.amountINR).toBe(9900);
    expect(ZIINA_PLANS.blueprint_plus30.amountUSD - ZIINA_PLANS.blueprint.amountUSD).toBe(199);
  });
  it('every blueprint plan id is a real Ziina plan', () => {
    for (const p of Array.from(BLUEPRINT_PLANS)) expect(ZIINA_PLANS[p]).toBeDefined();
  });
});
