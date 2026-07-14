import { describe, expect, it } from 'vitest';
import { isConfirmedPaymentStatus } from '@/lib/ziina/paymentRecovery';

describe('pending payment recovery', () => {
  it('recognizes only server-confirmed entitlement states', () => {
    expect(isConfirmedPaymentStatus('paid')).toBe(true);
    expect(isConfirmedPaymentStatus('promo')).toBe(true);
    expect(isConfirmedPaymentStatus('unpaid')).toBe(false);
    expect(isConfirmedPaymentStatus('pending')).toBe(false);
    expect(isConfirmedPaymentStatus(null)).toBe(false);
  });
});
