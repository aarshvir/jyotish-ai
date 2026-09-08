/**
 * What the checkout hand-off card should say, as pure data.
 *
 * Kept out of the component so it can be tested in the repo's node-only vitest
 * environment, and so the rules below are stated once rather than tangled in JSX.
 *
 * The rules exist because of measured behaviour: every payment intent this
 * platform has ever created was abandoned on Ziina's hosted page WITHOUT a card
 * being entered. The page shows a personal name, leads with Apple/Google Pay, and
 * is UAE-licensed — all surprises to an Indian buyer who was not warned.
 */

export type CheckoutCurrency = 'INR' | 'AED' | 'USD';

export interface HandoffCopy {
  /** Indian cards are blocked from international payments by default (RBI). */
  showInternationalCardHelp: boolean;
  /** Say UPI is missing only where buyers expect it; elsewhere it's noise. */
  showUpiNote: boolean;
  /**
   * True when Ziina renders a name that isn't the brand, so the card must
   * explain it. Promising "Pay VedicHour" while Ziina says "Pay aarshvir" would
   * damage trust more than saying nothing, so this tracks the real value.
   */
  explainMerchantName: boolean;
}

export const BRAND = 'vedichour';

export function handoffCopy(currency: CheckoutCurrency, merchantName: string): HandoffCopy {
  const isIndia = currency === 'INR';
  return {
    showInternationalCardHelp: isIndia,
    showUpiNote: isIndia,
    explainMerchantName: merchantName.trim().toLowerCase() !== BRAND,
  };
}
