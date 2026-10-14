/**
 * Public free-chart wording. Legacy price-book exports remain for compatibility,
 * not as a readiness signal. Render any paid sales copy behind the server commercial gate.
 */
import { subscriptionPrice } from '@/lib/priceBook';
import { formatAmount } from '@/lib/ziina/amounts';

export const FREE_CHART_HREF = '/free-kundli';
export const FREE_CHART_DESCRIPTION =
  'Explore your rising sign, Moon sign, birth star and dasha with a free Vedic birth chart.';
export const FREE_CHART_FEATURES = [
  'Rising sign (Lagna) and Moon sign (Rashi)',
  'Birth star (Nakshatra) and pada',
  'Current main period and sub-period (Dasha)',
  'No sign-up or payment card',
] as const;

/** "₹999" */
export const INDIA_MONTHLY = formatAmount(subscriptionPrice('sub_monthly', 'INR'), 'INR');
/** "₹9,999" */
export const INDIA_YEARLY = formatAmount(subscriptionPrice('sub_annual', 'INR'), 'INR');

/** "₹999 or ₹9,999 in India" */
export const INDIA_PRICES = `${INDIA_MONTHLY} or ${INDIA_YEARLY} in India`;

/** "one monthly or yearly subscription (₹999 or ₹9,999 in India)" */
export const SUBSCRIPTION_LINE = `one monthly or yearly subscription (${INDIA_PRICES})`;
