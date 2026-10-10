/**
 * Pure decision helpers for report-bound (forecast / subscription) checkout.
 * Kept free of I/O so create-intent's double-charge prevention can be unit-tested
 * without standing up Ziina + Supabase.
 */

/**
 * A second payable intent must not be minted when this report is already entitled
 * OR a Ziina payment for it has already been claimed completed.
 *
 * reports.payment_status lags the claim: finalize flips ziina_payments to
 * `completed` first, then grants the row. If that grant write fails, verify sends
 * the buyer to /start?payment=error. The quiz reused the same report id for 30
 * minutes, saw `unpaid`, and opened a new charge — the standalone unlock path
 * already refused this (`hasCompletedPayment`), the upgrade route already
 * refused it, and this helper is the forecast equivalent.
 */
export function isReportCheckoutAlreadyPaid(input: {
  reportEntitled: boolean;
  hasCompletedPayment: boolean;
}): boolean {
  return input.reportEntitled || input.hasCompletedPayment;
}
