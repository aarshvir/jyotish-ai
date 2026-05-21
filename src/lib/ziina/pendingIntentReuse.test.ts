import { describe, expect, it } from 'vitest';
import { getReusablePendingZiinaIntent } from './pendingIntentReuse';
import type { ZiinaPaymentIntent } from './server';

const baseIntent: ZiinaPaymentIntent = {
  id: 'intent_1',
  status: 'requires_payment_instrument',
  redirect_url: 'https://pay.example.test/intent_1',
  amount: 999,
  currency_code: 'USD',
};

describe('getReusablePendingZiinaIntent', () => {
  it('reuses a live pending intent when currency and amount still match', () => {
    expect(
      getReusablePendingZiinaIntent(baseIntent, {
        planType: '7day',
        currency: 'USD',
        discountPct: 0,
      }),
    ).toEqual({ reusable: true, currency: 'USD' });
  });

  it('rejects reuse after the user switches currency', () => {
    expect(
      getReusablePendingZiinaIntent(baseIntent, {
        planType: '7day',
        currency: 'INR',
        discountPct: 0,
      }),
    ).toEqual({ reusable: false, reason: 'currency_mismatch' });
  });

  it('rejects reuse when a promo change makes the old amount stale', () => {
    expect(
      getReusablePendingZiinaIntent(baseIntent, {
        planType: '7day',
        currency: 'USD',
        discountPct: 30,
      }),
    ).toEqual({ reusable: false, reason: 'amount_mismatch' });
  });

  it('rejects reuse for terminal Ziina intents', () => {
    expect(
      getReusablePendingZiinaIntent(
        { ...baseIntent, status: 'canceled' },
        { planType: '7day', currency: 'USD', discountPct: 0 },
      ),
    ).toEqual({ reusable: false, reason: 'status_mismatch' });
  });
});
