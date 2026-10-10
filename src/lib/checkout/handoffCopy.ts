/**
 * What the checkout hand-off card should say, as pure data.
 *
 * Kept out of the component so it can be tested in the repo's node-only vitest
 * environment, and so the rules below are stated once rather than tangled in JSX.
 *
 * The rules exist because of measured behaviour: every payment intent this
 * platform has ever created was abandoned on Ziina's hosted page WITHOUT a card
 * being entered. The page leads with Apple/Google Pay and is UAE-licensed — both
 * surprises to an Indian buyer who was not warned.
 *
 * The card never names the Ziina account holder. Owner, 2026-10-11: no personal
 * name may appear anywhere on the platform. The header on Ziina's own page is set in
 * the Ziina dashboard, not here.
 */

export type CheckoutCurrency = 'INR' | 'AED' | 'USD';

export interface HandoffCopy {
  /** Indian cards are blocked from international payments by default (RBI). */
  showInternationalCardHelp: boolean;
  /** Say UPI is missing only where buyers expect it; elsewhere it's noise. */
  showUpiNote: boolean;
}

export function handoffCopy(currency: CheckoutCurrency): HandoffCopy {
  const isIndia = currency === 'INR';
  return {
    showInternationalCardHelp: isIndia,
    showUpiNote: isIndia,
  };
}
