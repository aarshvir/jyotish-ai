import { describe, it, expect } from 'vitest';
import { getReusablePendingZiinaIntent } from './pendingIntentReuse';
import { computeIntentAmount } from './server';
import type { ZiinaPaymentIntent } from './server';

function intent(over: Partial<ZiinaPaymentIntent>): ZiinaPaymentIntent {
  return { id: 'i1', status: 'pending', redirect_url: 'https://pay', amount: 0, currency_code: 'USD', ...over };
}

const usdAmount = computeIntentAmount('7day', 'USD');

describe('getReusablePendingZiinaIntent', () => {
  it('reuses a pending intent with matching currency + amount', () => {
    const reusable = getReusablePendingZiinaIntent(intent({ amount: usdAmount, currency_code: 'USD' }), {
      currency: 'USD',
      expectedAmount: usdAmount,
    });
    expect(reusable?.id).toBe('i1');
  });

  it('reuses awaiting-instrument and awaiting-action intents too', () => {
    for (const status of ['requires_payment_instrument', 'requires_user_action'] as const) {
      const reusable = getReusablePendingZiinaIntent(
        intent({ status, amount: usdAmount, currency_code: 'USD' }),
        { currency: 'USD', expectedAmount: usdAmount },
      );
      expect(reusable?.id).toBe('i1');
    }
  });

  it('creates fresh when the buyer switched currency', () => {
    const reusable = getReusablePendingZiinaIntent(intent({ amount: usdAmount, currency_code: 'AED' }), {
      currency: 'USD',
      expectedAmount: usdAmount,
    });
    expect(reusable).toBeNull();
  });

  it('creates fresh when the amount changed (e.g. a promo was applied)', () => {
    const discounted = computeIntentAmount('7day', 'USD', 30);
    const reusable = getReusablePendingZiinaIntent(intent({ amount: usdAmount, currency_code: 'USD' }), {
      currency: 'USD',
      expectedAmount: discounted,
    });
    expect(reusable).toBeNull();
  });

  it('reuses when the discounted amount matches the existing intent', () => {
    const discounted = computeIntentAmount('7day', 'USD', 30);
    const reusable = getReusablePendingZiinaIntent(intent({ amount: discounted, currency_code: 'USD' }), {
      currency: 'USD',
      expectedAmount: discounted,
    });
    expect(reusable?.id).toBe('i1');
  });

  it('does NOT reuse a completed / failed / canceled intent', () => {
    for (const status of ['completed', 'failed', 'canceled'] as const) {
      const reusable = getReusablePendingZiinaIntent(
        intent({ status, amount: usdAmount, currency_code: 'USD' }),
        { currency: 'USD', expectedAmount: usdAmount },
      );
      expect(reusable).toBeNull();
    }
  });

  it('creates fresh when there is no existing intent', () => {
    expect(getReusablePendingZiinaIntent(null, { currency: 'USD', expectedAmount: usdAmount })).toBeNull();
  });
});
