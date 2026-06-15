/**
 * Decide whether an existing Ziina payment intent can be safely reused, or whether
 * a fresh one must be created.
 *
 * The create-intent route reuses a recent pending intent (within 90s) to avoid
 * spawning duplicates. But it must NOT reuse one whose currency or amount no longer
 * matches what the buyer now wants — otherwise a user who switched currency or applied
 * a promo between attempts would be redirected to the STALE intent and charged the
 * wrong amount. This validates the existing intent against the buyer's current request.
 */
import type { SupportedCurrency, ZiinaPaymentIntent } from '@/lib/ziina/server';

/** Ziina statuses where the intent is still pending/awaiting payment (a fresh redirect would charge). */
const PAYABLE_STATUSES: ReadonlySet<ZiinaPaymentIntent['status']> = new Set<ZiinaPaymentIntent['status']>([
  'requires_payment_instrument',
  'requires_user_action',
  'pending',
]);

export interface ReusableIntentRequest {
  /** The currency the buyer is checking out in now. */
  currency: SupportedCurrency;
  /** The amount (base units) this checkout should cost now — see computeIntentAmount. */
  expectedAmount: number;
}

/**
 * Return the existing intent only if it is still pending/awaiting AND its currency and
 * amount match the buyer's current selection; otherwise return null so the caller
 * creates a fresh intent.
 *
 * - pending/awaiting + same currency + same amount → reuse (normal abandon-and-return)
 * - currency or amount changed (currency switch / promo applied) → null (stale → fresh)
 * - completed / failed / canceled / missing → null (not pending → fresh)
 */
export function getReusablePendingZiinaIntent(
  existingIntent: ZiinaPaymentIntent | null | undefined,
  { currency, expectedAmount }: ReusableIntentRequest,
): ZiinaPaymentIntent | null {
  if (!existingIntent) return null;
  if (!PAYABLE_STATUSES.has(existingIntent.status)) return null;
  if (existingIntent.currency_code !== currency) return null;
  if (existingIntent.amount !== expectedAmount) return null;
  return existingIntent;
}
