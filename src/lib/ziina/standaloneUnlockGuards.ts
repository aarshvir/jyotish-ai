/**
 * Pure decision helpers for standalone Kundali / Synastry checkout guards.
 * Kept free of I/O so create-intent's double-charge prevention can be unit-tested
 * without standing up Ziina + Supabase.
 */

export type StandaloneUnlockDecision =
  | { action: 'already_unlocked' }
  | { action: 'reuse_pending'; intentId: string; redirectUrl: string; amount: number }
  | { action: 'mint_new' };

/**
 * Decide whether a standalone unlock checkout should short-circuit, reuse a
 * pending intent, or mint a new one. Mirrors the forecast alreadyPaid / 90s
 * pending-reuse path that create-intent previously skipped for report_id=null.
 */
export function decideStandaloneUnlockCheckout(input: {
  hasUnlockRow: boolean;
  hasCompletedPayment: boolean;
  reusablePending: { id: string; redirect_url: string; amount: number } | null;
}): StandaloneUnlockDecision {
  if (input.hasUnlockRow || input.hasCompletedPayment) {
    return { action: 'already_unlocked' };
  }
  if (input.reusablePending) {
    return {
      action: 'reuse_pending',
      intentId: input.reusablePending.id,
      redirectUrl: input.reusablePending.redirect_url,
      amount: input.reusablePending.amount,
    };
  }
  return { action: 'mint_new' };
}
