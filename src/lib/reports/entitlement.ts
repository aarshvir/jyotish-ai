/**
 * Two DIFFERENT questions live on `reports.payment_status`. Conflating them is how
 * promo-entitled buyers ended up locked out of the monthly upgrade.
 *
 *  - "Is this report entitled to paid content?"  → isEntitledPaymentStatus()
 *      'paid'   — a completed Ziina payment
 *      'promo'  — a server-validated 100%-off code (redemption already booked)
 *      'bypass' — an admin/e2e grant (never client-settable: reports/start collapses
 *                 any client-claimed non-'free' status to 'unpaid')
 *
 *  - "Did money actually change hands?"          → hasPaidMoney()
 *      'paid' only. Use for revenue counts, CRM `paidEver`, founder digests —
 *      anywhere a promo/admin grant must NOT read as revenue.
 */

export const ENTITLED_PAYMENT_STATUSES = ['paid', 'promo', 'bypass'] as const;

export type EntitledPaymentStatus = (typeof ENTITLED_PAYMENT_STATUSES)[number];

/** Entitled to paid report content (bought it, redeemed a 100% code, or was granted it). */
export function isEntitledPaymentStatus(status: string | null | undefined): boolean {
  return (ENTITLED_PAYMENT_STATUSES as readonly string[]).includes((status ?? '').trim());
}

/** Real revenue only. NOT an entitlement check — a promo user is entitled but has paid nothing. */
export function hasPaidMoney(status: string | null | undefined): boolean {
  return (status ?? '').trim() === 'paid';
}
