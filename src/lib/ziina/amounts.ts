/**
 * Pure currency/discount arithmetic — NO secrets, NO network, NO env.
 * Safe to import from Client Components, unlike `./server`.
 *
 * This is the SINGLE implementation of "what does an X% off code actually cost?".
 * The onboard step-3 price the buyer SEES and the amount Ziina CHARGES both go
 * through `applyDiscount` here, so the two can never drift apart.
 *
 * Amounts are always base units: USD cents, AED fils, INR paise.
 */

export type SupportedCurrency = 'AED' | 'USD' | 'INR';

/** Format amount as display string for the given currency. */
export function formatAmount(amountBaseUnits: number, currency: SupportedCurrency): string {
  const major = amountBaseUnits / 100;
  // INR uses Indian-grouped thousands (₹1,499) so the landing switcher, /api/geo,
  // pricing page, dashboard, and upsell all render the SAME string for the same amount.
  if (currency === 'AED') return `AED ${major.toFixed(2)}`;
  if (currency === 'INR') return `₹${Math.round(major).toLocaleString('en-IN')}`;
  return `$${major.toFixed(2)}`;
}

/**
 * The largest "charm" price (…X.99 / ₹XX99) near a raw amount, in base units.
 * INR rounds to the nearest ₹100 then drops ₹1; USD/AED round to the nearest
 * major unit then drop one cent/fil.
 */
function charmPrice(rawBaseUnits: number, currency: SupportedCurrency): number {
  if (currency === 'INR') {
    const rupees = rawBaseUnits / 100;
    const rounded = Math.round(rupees / 100) * 100;
    return Math.max(99, rounded - 1) * 100;
  }
  const major = rawBaseUnits / 100;
  const rounded = Math.round(major);
  return Math.round(Math.max(0.99, rounded - 0.01) * 100);
}

/**
 * Round DOWN to the smallest unit we can both charge and display exactly.
 * INR display uses whole rupees (see formatAmount), so an INR charge must land
 * on a whole rupee or the shown price would disagree with the charged amount.
 */
function floorToDisplayableUnit(rawBaseUnits: number, currency: SupportedCurrency): number {
  const step = currency === 'INR' ? 100 : 1;
  return Math.max(step, Math.floor(rawBaseUnits / step) * step);
}

/**
 * Apply a percentage discount to a base-unit amount.
 *
 * HARD RULE: the returned amount is NEVER more than the exact discounted price.
 * "30% off" must mean at least 30% off at the till. Charm rounding is a nicety
 * that is kept ONLY when it lands at or below the exact figure; otherwise we
 * floor to the nearest displayable unit.
 *
 * Regression this guards: ₹799 − 30% is ₹559.30, but charm rounding produced
 * ₹599 — a 25% discount sold as 30%, i.e. a false price on a live payments site.
 */
export function applyDiscount(
  amountBaseUnits: number,
  discountPct: number,
  currency: SupportedCurrency,
): number {
  if (discountPct <= 0) return amountBaseUnits;
  if (discountPct >= 100) return 0;

  const exact = amountBaseUnits * (1 - discountPct / 100);
  const charm = charmPrice(exact, currency);
  if (charm <= exact) return charm;
  return floorToDisplayableUnit(exact, currency);
}
