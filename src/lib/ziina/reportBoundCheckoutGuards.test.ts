import { describe, expect, it } from 'vitest';
import { isReportCheckoutAlreadyPaid } from './reportBoundCheckoutGuards';

describe('isReportCheckoutAlreadyPaid', () => {
  it('blocks a second charge when the report row is already entitled', () => {
    expect(isReportCheckoutAlreadyPaid({ reportEntitled: true, hasCompletedPayment: false })).toBe(true);
  });

  it('blocks a second charge when Ziina already claimed the payment, even if the report is still unpaid', () => {
    // Concrete trigger: finalize claims ziina_payments.completed, grant write fails,
    // buyer hits Subscribe again on the reused report id within 30 minutes.
    expect(isReportCheckoutAlreadyPaid({ reportEntitled: false, hasCompletedPayment: true })).toBe(true);
  });

  it('allows minting only when nothing has been paid for this report', () => {
    expect(isReportCheckoutAlreadyPaid({ reportEntitled: false, hasCompletedPayment: false })).toBe(false);
  });
});
