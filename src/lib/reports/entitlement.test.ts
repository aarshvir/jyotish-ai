import { describe, expect, it } from 'vitest';
import { canAskReportQuestion, canReadReportContent, hasPaidReportAccess } from './entitlement';

describe('report entitlement helpers', () => {
  it('treats paid and server-validated promo statuses as paid access', () => {
    expect(hasPaidReportAccess('paid')).toBe(true);
    expect(hasPaidReportAccess('promo')).toBe(true);
    expect(hasPaidReportAccess('unpaid')).toBe(false);
    expect(hasPaidReportAccess('free')).toBe(false);
  });

  it('allows completed content for free previews and paid/promo reports', () => {
    expect(canReadReportContent({ planType: 'preview', paymentStatus: 'free' })).toBe(true);
    expect(canReadReportContent({ planType: 'free', paymentStatus: 'free' })).toBe(true);
    expect(canReadReportContent({ planType: 'monthly', paymentStatus: 'paid' })).toBe(true);
    expect(canReadReportContent({ planType: 'annual', paymentStatus: 'promo' })).toBe(true);
    expect(canReadReportContent({ planType: 'monthly', paymentStatus: 'unpaid' })).toBe(false);
  });

  it('keeps Ask a report limited to paid/promo reports, plus admins', () => {
    expect(canAskReportQuestion({ paymentStatus: 'paid' })).toBe(true);
    expect(canAskReportQuestion({ paymentStatus: 'promo' })).toBe(true);
    expect(canAskReportQuestion({ paymentStatus: 'free' })).toBe(false);
    expect(canAskReportQuestion({ paymentStatus: 'unpaid' })).toBe(false);
    expect(canAskReportQuestion({ paymentStatus: 'unpaid', isAdmin: true })).toBe(true);
  });
});
