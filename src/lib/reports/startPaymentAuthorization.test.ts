import { describe, expect, it, vi } from 'vitest';
import { resolveReportStartPaymentAuthorization } from './startPaymentAuthorization';

const db = {} as never;

describe('resolveReportStartPaymentAuthorization', () => {
  it('rejects browser-supplied bypass for paid report plans', async () => {
    const result = await resolveReportStartPaymentAuthorization(
      {
        db,
        reportId: 'report_1',
        userId: 'user_1',
        userEmail: 'user@example.test',
        planType: '7day',
        requestedPaymentStatus: 'bypass',
        existingPaymentStatus: null,
        isAdmin: false,
      },
      {
        hasCompletedZiinaPayment: async () => false,
        hasServerPromoRedemption: async () => false,
      },
    );

    expect(result).toEqual({
      ok: false,
      error: 'Payment is required before starting this report plan.',
      code: 'PAYMENT_REQUIRED',
    });
  });

  it('allows a paid plan only after completed Ziina payment', async () => {
    const result = await resolveReportStartPaymentAuthorization(
      {
        db,
        reportId: 'report_1',
        userId: 'user_1',
        userEmail: 'user@example.test',
        planType: 'monthly',
        requestedPaymentStatus: 'bypass',
        existingPaymentStatus: null,
        isAdmin: false,
      },
      {
        hasCompletedZiinaPayment: async () => true,
      },
    );

    expect(result).toEqual({ ok: true, status: 'paid' });
  });

  it('coerces non-paid report plans to free despite privileged request values', async () => {
    const result = await resolveReportStartPaymentAuthorization({
      db,
      reportId: 'report_1',
      userId: 'user_1',
      userEmail: 'user@example.test',
      planType: 'preview',
      requestedPaymentStatus: 'bypass',
      existingPaymentStatus: 'bypass',
      isAdmin: false,
    });

    expect(result).toEqual({ ok: true, status: 'free' });
  });

  it('allows a full promo only after server validation and redemption', async () => {
    const redeemPromoCode = vi.fn(async () => {});
    const result = await resolveReportStartPaymentAuthorization(
      {
        db,
        reportId: 'report_1',
        userId: 'user_1',
        userEmail: 'user@example.test',
        planType: 'annual',
        requestedPaymentStatus: 'promo',
        existingPaymentStatus: null,
        isAdmin: false,
        promoCode: 'ADMIN100',
      },
      {
        hasCompletedZiinaPayment: async () => false,
        hasServerPromoRedemption: async () => false,
        getPromoDiscount: async () => ({ valid: true, discountPct: 100, codeId: 'promo_1' }),
        redeemPromoCode,
      },
    );

    expect(result).toEqual({ ok: true, status: 'promo' });
    expect(redeemPromoCode).toHaveBeenCalledWith('promo_1', 'user_1', 'report_1');
  });

  it('preserves explicit admin bypass for paid report plans', async () => {
    const result = await resolveReportStartPaymentAuthorization({
      db,
      reportId: 'report_1',
      userId: 'admin_user',
      userEmail: 'admin@example.test',
      planType: '7day',
      requestedPaymentStatus: 'bypass',
      existingPaymentStatus: null,
      isAdmin: true,
    });

    expect(result).toEqual({ ok: true, status: 'bypass' });
  });
});
