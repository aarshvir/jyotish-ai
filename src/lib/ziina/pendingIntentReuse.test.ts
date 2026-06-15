import { describe, it, expect } from 'vitest';
import { getReusablePendingZiinaIntent, expectedIntentAmount } from './pendingIntentReuse';
import type { ZiinaPaymentIntent } from './server';

function intent(over: Partial<ZiinaPaymentIntent>): ZiinaPaymentIntent {
  return { id: 'i1', status: 'pending', redirect_url: 'https://pay', amount: 0, currency_code: 'USD', ...over };
}

const want = { planType: '7day', currency: 'USD' as const, discountPct: 0 };
const amt = expectedIntentAmount('7day', 'USD', 0);

describe('getReusablePendingZiinaIntent', () => {
  it('reuses a pending intent with matching currency + amount', () => {
    expect(getReusablePendingZiinaIntent(intent({ amount: amt, currency_code: 'USD' }), want)?.id).toBe('i1');
  });

  it('creates fresh when the buyer switched currency', () => {
    expect(getReusablePendingZiinaIntent(intent({ amount: amt, currency_code: 'AED' }), want)).toBeNull();
  });

  it('creates fresh when the amount changed (e.g. a promo was applied)', () => {
    expect(getReusablePendingZiinaIntent(intent({ amount: amt + 1, currency_code: 'USD' }), want)).toBeNull();
  });

  it('never re-creates over a completed intent (no double charge)', () => {
    expect(
      getReusablePendingZiinaIntent(intent({ status: 'completed', amount: 999, currency_code: 'AED' }), want)?.id,
    ).toBe('i1');
  });

  it('creates fresh for a failed or canceled intent', () => {
    expect(getReusablePendingZiinaIntent(intent({ status: 'failed', amount: amt }), want)).toBeNull();
    expect(getReusablePendingZiinaIntent(intent({ status: 'canceled', amount: amt }), want)).toBeNull();
  });

  it('creates fresh when there is no existing intent', () => {
    expect(getReusablePendingZiinaIntent(null, want)).toBeNull();
  });

  it('matches a discounted amount when a partial promo is applied', () => {
    const discounted = expectedIntentAmount('7day', 'USD', 30);
    const w = { planType: '7day', currency: 'USD' as const, discountPct: 30 };
    expect(getReusablePendingZiinaIntent(intent({ amount: discounted, currency_code: 'USD' }), w)?.id).toBe('i1');
    expect(getReusablePendingZiinaIntent(intent({ amount: amt, currency_code: 'USD' }), w)).toBeNull();
  });
});
