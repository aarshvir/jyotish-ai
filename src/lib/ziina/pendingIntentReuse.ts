/**
 * Decide whether an existing Ziina payment intent can be safely reused, or whether
 * a fresh one must be created.
 *
 * The create-intent route reuses a recent pending intent (within 90s) to avoid
 * spawning duplicates. But it must NOT reuse one whose currency or amount no longer
 * matches what the buyer now wants — otherwise a user who switched currency or applied
 * a promo between attempts would be charged the STALE amount. This validates that.
 */
import {
  applyDiscount,
  getPlanAmount,
  type SupportedCurrency,
  type ZiinaPaymentIntent,
} from '@/lib/ziina/server';

/** Ziina statuses where the intent is still payable (a fresh redirect would charge). */
const PAYABLE_STATUSES: ReadonlySet<ZiinaPaymentIntent['status']> = new Set<ZiinaPaymentIntent['status']>([
  'requires_payment_instrument',
  'requires_user_action',
  'pending',
]);

/** The amount (base units) a plan should cost in a currency after an optional % discount. */
export function expectedIntentAmount(
  planType: string,
  currency: SupportedCurrency,
  discountPct: number,
): number {
  const base = getPlanAmount(planType, currency);
  return discountPct > 0 ? applyDiscount(base, discountPct, currency) : base;
}

/**
 * Return the existing intent if it should be reused, or null if the caller must
 * create a fresh one.
 *
 * - completed  → reuse (the buyer already paid; never spawn a new chargeable intent)
 * - payable + same currency + same amount → reuse (the normal abandon-and-return case)
 * - payable but currency/amount changed   → null (buyer switched currency or applied a
 *                                            promo; the stale intent would charge wrong)
 * - failed / canceled / missing           → null (dead intent — make a fresh one)
 */
export function getReusablePendingZiinaIntent(
  intent: ZiinaPaymentIntent | null | undefined,
  want: { planType: string; currency: SupportedCurrency; discountPct: number },
): ZiinaPaymentIntent | null {
  if (!intent) return null;
  // Never create a fresh chargeable intent over one that's already paid.
  if (intent.status === 'completed') return intent;
  if (!PAYABLE_STATUSES.has(intent.status)) return null;
  if (intent.currency_code !== want.currency) return null;
  if (intent.amount !== expectedIntentAmount(want.planType, want.currency, want.discountPct)) return null;
  return intent;
}
