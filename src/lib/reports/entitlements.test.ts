import { describe, expect, it } from 'vitest';
import {
  FULL_REPORT_PAYMENT_STATUSES,
  canReadFullReportContent,
  isFullReportPaymentStatus,
} from './entitlements';

describe('report entitlements', () => {
  it('treats server-issued full report payment states as content-entitled', () => {
    for (const paymentStatus of FULL_REPORT_PAYMENT_STATUSES) {
      expect(
        canReadFullReportContent({
          isAdmin: false,
          planType: '7day',
          paymentStatus,
        }),
      ).toBe(true);
    }
  });

  it('allows free and preview plans without a full-report payment state', () => {
    expect(
      canReadFullReportContent({
        isAdmin: false,
        planType: 'free',
        paymentStatus: 'free',
      }),
    ).toBe(true);
    expect(
      canReadFullReportContent({
        isAdmin: false,
        planType: 'preview',
        paymentStatus: 'unpaid',
      }),
    ).toBe(true);
  });

  it('rejects unpaid paid-plan rows for non-admin users', () => {
    expect(
      canReadFullReportContent({
        isAdmin: false,
        planType: 'monthly',
        paymentStatus: 'unpaid',
      }),
    ).toBe(false);
  });

  it('normalizes payment status strings before checking full-report entitlement', () => {
    expect(isFullReportPaymentStatus(' PROMO ')).toBe(true);
    expect(isFullReportPaymentStatus('paid')).toBe(true);
    expect(isFullReportPaymentStatus('free')).toBe(false);
    expect(isFullReportPaymentStatus(null)).toBe(false);
  });
});
