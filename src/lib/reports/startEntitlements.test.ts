import { describe, expect, it } from 'vitest';
import { resolveReportPlanForStart } from './startEntitlements';

describe('resolveReportPlanForStart', () => {
  it('does not allow a paid checkout draft to be downgraded to a free report by request body', () => {
    expect(
      resolveReportPlanForStart({
        requestedPlanType: 'free',
        existingPlanType: '7day',
        completedPaymentPlanType: null,
        pendingPaymentPlanType: null,
      }),
    ).toMatchObject({
      effectivePlanType: '7day',
      isFreePlan: false,
      serverBoundPaidPlanType: '7day',
    });
  });

  it('binds completed payments to the paid plan even when the request asks for preview', () => {
    expect(
      resolveReportPlanForStart({
        requestedPlanType: 'preview',
        existingPlanType: null,
        completedPaymentPlanType: 'annual',
        pendingPaymentPlanType: null,
      }),
    ).toMatchObject({
      effectivePlanType: 'annual',
      isFreePlan: false,
      serverBoundPaidPlanType: 'annual',
    });
  });

  it('keeps a pending checkout binding paid-gated until payment or promo entitlement exists', () => {
    expect(
      resolveReportPlanForStart({
        requestedPlanType: 'free',
        existingPlanType: null,
        completedPaymentPlanType: null,
        pendingPaymentPlanType: 'monthly',
      }),
    ).toMatchObject({
      effectivePlanType: 'monthly',
      isFreePlan: false,
      serverBoundPaidPlanType: 'monthly',
    });
  });

  it('still allows a fresh free report when there is no server-bound paid state', () => {
    expect(
      resolveReportPlanForStart({
        requestedPlanType: 'free',
        existingPlanType: null,
        completedPaymentPlanType: null,
        pendingPaymentPlanType: null,
      }),
    ).toMatchObject({
      effectivePlanType: 'free',
      isFreePlan: true,
      serverBoundPaidPlanType: null,
    });
  });
});
