import { describe, expect, it, vi } from 'vitest';
import {
  reportStartPlanRequiresPayment,
  resolveReportStartPaymentStatus,
} from '@/lib/reports/startPaymentAuthorization';

function deps(overrides?: {
  hasCompletedPayment?: () => Promise<boolean>;
  hasRedeemedFullPromo?: () => Promise<boolean>;
  validatePromoCode?: () => Promise<{ valid: boolean; discountPct: number; codeId?: string }>;
}) {
  return {
    hasCompletedPayment: vi.fn(overrides?.hasCompletedPayment ?? (async () => false)),
    hasRedeemedFullPromo: vi.fn(overrides?.hasRedeemedFullPromo ?? (async () => false)),
    validatePromoCode: vi.fn(
      overrides?.validatePromoCode ?? (async () => ({ valid: false, discountPct: 0 })),
    ),
    redeemPromoCode: vi.fn(async () => undefined),
  };
}

const baseRequest = {
  reportId: 'report_1',
  userId: 'user_1',
  userEmail: 'user@example.com',
};

describe('report start payment authorization', () => {
  it('treats paid forecast plan types as requiring payment', () => {
    expect(reportStartPlanRequiresPayment('7day')).toBe(true);
    expect(reportStartPlanRequiresPayment('monthly')).toBe(true);
    expect(reportStartPlanRequiresPayment('annual')).toBe(true);
    expect(reportStartPlanRequiresPayment(undefined)).toBe(true);
    expect(reportStartPlanRequiresPayment('preview')).toBe(false);
    expect(reportStartPlanRequiresPayment('free')).toBe(false);
  });

  it('rejects a paid plan when a non-admin caller only supplies client payment_status', async () => {
    const mocks = deps();

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: 'monthly',
      requestedPaymentStatus: 'bypass',
      isAdmin: false,
      ...mocks,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: 'PAYMENT_REQUIRED',
    });
    expect(mocks.validatePromoCode).not.toHaveBeenCalled();
    expect(mocks.redeemPromoCode).not.toHaveBeenCalled();
  });

  it('allows a paid plan when a completed Ziina payment exists', async () => {
    const mocks = deps({ hasCompletedPayment: async () => true });

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: '7day',
      requestedPaymentStatus: 'promo',
      isAdmin: false,
      ...mocks,
    });

    expect(result).toEqual({ ok: true, planType: '7day', paymentStatus: 'paid' });
  });

  it('allows a paid plan with a validated full promo code and records the redemption', async () => {
    const mocks = deps({
      validatePromoCode: async () => ({ valid: true, discountPct: 100, codeId: 'code_1' }),
    });

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: 'annual',
      promoCode: 'ADMIN100',
      isAdmin: false,
      ...mocks,
    });

    expect(result).toEqual({ ok: true, planType: 'annual', paymentStatus: 'promo' });
    expect(mocks.redeemPromoCode).toHaveBeenCalledWith('code_1', 'user_1', 'report_1');
  });

  it('allows a paid plan with an existing full-promo redemption for retries', async () => {
    const mocks = deps({ hasRedeemedFullPromo: async () => true });

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: 'monthly',
      requestedPaymentStatus: 'promo',
      isAdmin: false,
      ...mocks,
    });

    expect(result).toEqual({ ok: true, planType: 'monthly', paymentStatus: 'promo' });
    expect(mocks.validatePromoCode).not.toHaveBeenCalled();
  });

  it('allows free plans without trusting bypass or promo status from the client', async () => {
    const mocks = deps();

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: 'preview',
      requestedPaymentStatus: 'bypass',
      isAdmin: false,
      ...mocks,
    });

    expect(result).toEqual({ ok: true, planType: 'preview', paymentStatus: 'free' });
  });

  it('preserves explicit admin bypass payment status for test/admin runs', async () => {
    const mocks = deps();

    const result = await resolveReportStartPaymentStatus({
      ...baseRequest,
      requestedPlanType: '7day',
      requestedPaymentStatus: 'bypass',
      isAdmin: true,
      ...mocks,
    });

    expect(result).toEqual({ ok: true, planType: '7day', paymentStatus: 'bypass' });
    expect(mocks.hasCompletedPayment).not.toHaveBeenCalled();
  });
});
