/**
 * Canonical price table derived from Ziina plan definitions.
 * Import this in Server Components to render prices without skeleton loaders.
 *
 * All major-unit values (not base units):
 *   USD: dollars  INR: rupees  AED: dirhams
 */
import {
  type SupportedCurrency,
  ZIINA_PLANS,
  getPlanAmount,
  formatAmount,
} from './ziina/server';

export type { SupportedCurrency };

export const PRICE_TABLE = {
  USD: { '7day': 9.99,  monthly: 19.99, annual: 49.99  },
  INR: { '7day': 799,   monthly: 1499,  annual: 3999   },
  AED: { '7day': 37.99, monthly: 69.99, annual: 184.99 },
} as const;

/** Display string for a single plan in the requested currency. */
export function getDisplayPrice(planId: string, currency: SupportedCurrency): string {
  const amount = getPlanAmount(planId, currency);
  return formatAmount(amount, currency);
}

/** All plan display prices for a given currency (planId → display string). */
export function getPricesForCurrency(
  currency: SupportedCurrency,
): Record<string, string> {
  const prices: Record<string, string> = {};
  for (const planId of Object.keys(ZIINA_PLANS)) {
    prices[planId] = getDisplayPrice(planId, currency);
  }
  return prices;
}

/** Resolve a currency from the x-currency request header (set by middleware). */
export function currencyFromHeader(headerValue: string | null): SupportedCurrency {
  if (headerValue === 'AED' || headerValue === 'INR') return headerValue;
  return 'USD';
}
