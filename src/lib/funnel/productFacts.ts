/**
 * Product facts the quiz is allowed to state as policy.
 *
 * An interstitial sentence that says "we do not sell gemstones" is only allowed to ship
 * while the matching fact below is true. Turn a fact off and every sentence that depends
 * on it disappears from the funnel (see `policyLine` in interstitials.ts), so a pivot
 * can never leave an outdated promise on screen.
 *
 * Each entry says where the fact is checkable. If you cannot point at something a
 * visitor could verify, it does not belong here.
 */

export const PRODUCT_FACTS = {
  /** There is no shop, checkout or upsell for gemstones anywhere in the product (code audit, 2026-10-11). */
  no_gemstone_sales: true,
  /** There is no puja, ritual or "remedy" purchase anywhere in the product. */
  no_puja_sales: true,
  /** Plans are a flat price per period (see /pricing). Nothing is billed per minute. */
  flat_price_not_per_minute: true,
  /** /refund: full refund on request within 24 hours, no questions asked. */
  refund_24h: true,
  /** The never-say list (death, illness, curses, divorce, lifespan, a child's sex) is published policy and is enforced by the reading's lint. */
  no_fear_predictions: true,
} as const;

export type FactKey = keyof typeof PRODUCT_FACTS;

export function factHolds(key: FactKey): boolean {
  return PRODUCT_FACTS[key] === true;
}
