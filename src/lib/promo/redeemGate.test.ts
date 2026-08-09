import { describe, expect, it } from 'vitest';
import { decideAfterPromoRedeem } from './redeemGate';

describe('decideAfterPromoRedeem', () => {
  it('proceeds when the RPC booked a new redemption', () => {
    expect(
      decideAfterPromoRedeem({
        booked: true,
        oncePerUser: true,
        capReached: false,
        reportAlreadyPromo: false,
      }),
    ).toEqual({ action: 'proceed' });
  });

  it('blocks when the global max_uses cap is reached', () => {
    expect(
      decideAfterPromoRedeem({
        booked: false,
        oncePerUser: true,
        capReached: true,
        reportAlreadyPromo: false,
      }),
    ).toEqual({
      action: 'block',
      code: 'PROMO_LIMIT_REACHED',
      error: 'This code has reached its usage limit.',
    });
  });

  it('blocks once-per-user duplicate when this report is not already promo (concurrent second reportId)', () => {
    expect(
      decideAfterPromoRedeem({
        booked: false,
        oncePerUser: true,
        capReached: false,
        reportAlreadyPromo: false,
      }),
    ).toEqual({
      action: 'block',
      code: 'PROMO_ALREADY_USED',
      error: 'You have already used this coupon.',
    });
  });

  it('allows once-per-user duplicate when this report is already promo (same-report retry)', () => {
    expect(
      decideAfterPromoRedeem({
        booked: false,
        oncePerUser: true,
        capReached: false,
        reportAlreadyPromo: true,
      }),
    ).toEqual({ action: 'proceed' });
  });

  it('allows unlimited-code duplicate order_id (same reportId retry)', () => {
    expect(
      decideAfterPromoRedeem({
        booked: false,
        oncePerUser: false,
        capReached: false,
        reportAlreadyPromo: false,
      }),
    ).toEqual({ action: 'proceed' });
  });
});
