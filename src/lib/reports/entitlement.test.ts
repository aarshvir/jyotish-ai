import { describe, it, expect } from 'vitest';
import { isEntitledPaymentStatus, hasPaidMoney } from './entitlement';

describe('isEntitledPaymentStatus — may this report show paid content?', () => {
  it('accepts every status that represents a granted report', () => {
    expect(isEntitledPaymentStatus('paid')).toBe(true);
    expect(isEntitledPaymentStatus('promo')).toBe(true);
    expect(isEntitledPaymentStatus('bypass')).toBe(true);
  });

  it('rejects unpaid / free / missing statuses — the paywall still holds', () => {
    expect(isEntitledPaymentStatus('unpaid')).toBe(false);
    expect(isEntitledPaymentStatus('free')).toBe(false);
    expect(isEntitledPaymentStatus('pending')).toBe(false);
    expect(isEntitledPaymentStatus('')).toBe(false);
    expect(isEntitledPaymentStatus(null)).toBe(false);
    expect(isEntitledPaymentStatus(undefined)).toBe(false);
    expect(isEntitledPaymentStatus('PAID')).toBe(false);
  });
});

describe('hasPaidMoney — did revenue actually happen?', () => {
  it('counts only a real completed payment', () => {
    expect(hasPaidMoney('paid')).toBe(true);
    expect(hasPaidMoney('promo')).toBe(false);
    expect(hasPaidMoney('bypass')).toBe(false);
    expect(hasPaidMoney(null)).toBe(false);
  });

  it('is strictly narrower than entitlement (the distinction the upgrade bug collapsed)', () => {
    for (const s of ['promo', 'bypass']) {
      expect(isEntitledPaymentStatus(s)).toBe(true);
      expect(hasPaidMoney(s)).toBe(false);
    }
  });
});
