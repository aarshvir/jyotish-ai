/**
 * Decide whether /api/reports/start may proceed after redeemPromoCode returns.
 *
 * The RPC returns false for BOTH:
 *   - max_uses cap reached (redemption rolled back)
 *   - idempotent duplicate order_id (ON CONFLICT DO NOTHING)
 *
 * Once-per-user codes use a stable `promo:{codeId}:{userId}` order_id. A false
 * result with room under the cap therefore means THIS USER already booked the
 * code — usually a concurrent second reportId that raced past hasUserRedeemed.
 * Proceeding would grant multiple free paid-tier reports from one once-per-user
 * code. Only same-report retries (row already payment_status='promo') may continue.
 */

export type PromoRedeemGateDecision =
  | { action: 'proceed' }
  | { action: 'block'; code: 'PROMO_LIMIT_REACHED' | 'PROMO_ALREADY_USED'; error: string };

export function decideAfterPromoRedeem(opts: {
  booked: boolean;
  oncePerUser: boolean;
  capReached: boolean;
  /** This report row already carries a server-granted promo entitlement. */
  reportAlreadyPromo: boolean;
}): PromoRedeemGateDecision {
  if (opts.booked) return { action: 'proceed' };

  if (opts.capReached) {
    return {
      action: 'block',
      code: 'PROMO_LIMIT_REACHED',
      error: 'This code has reached its usage limit.',
    };
  }

  if (opts.oncePerUser && !opts.reportAlreadyPromo) {
    return {
      action: 'block',
      code: 'PROMO_ALREADY_USED',
      error: 'You have already used this coupon.',
    };
  }

  // Unlimited codes (per-report order_id) or once-per-user same-report retry.
  return { action: 'proceed' };
}
