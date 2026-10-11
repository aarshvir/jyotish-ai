/**
 * Plan wording for the homepage and its FAQ, built from the price book so it can never state a
 * price the checkout does not charge. Pure (no env, no network), so it is safe in Client Components.
 *
 * The homepage speaks about "one monthly or yearly subscription" and names the India prices,
 * because that is the audience this copy is written for. Other currencies are shown on /pricing.
 */
import { subscriptionPrice } from '@/lib/priceBook';
import { formatAmount } from '@/lib/ziina/amounts';

/** "₹999" */
export const INDIA_MONTHLY = formatAmount(subscriptionPrice('sub_monthly', 'INR'), 'INR');
/** "₹9,999" */
export const INDIA_YEARLY = formatAmount(subscriptionPrice('sub_annual', 'INR'), 'INR');

/** "₹999 or ₹9,999 in India" */
export const INDIA_PRICES = `${INDIA_MONTHLY} or ${INDIA_YEARLY} in India`;

/** "one monthly or yearly subscription (₹999 or ₹9,999 in India)" */
export const SUBSCRIPTION_LINE = `one monthly or yearly subscription (${INDIA_PRICES})`;
