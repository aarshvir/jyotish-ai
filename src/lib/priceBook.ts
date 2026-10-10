/**
 * PRICE BOOK — the one place VedicHour prices are decided.
 *
 * Pure: no secrets, no network, no env. Safe to import from Client Components, so the
 * quiz funnel, /pricing, /api/geo and checkout all read the same numbers.
 *
 * What lives here:
 *   1. charmDown()        — localized "charm" rounding, always DOWN (₹3,800 → ₹3,499).
 *   2. PRICE_SETS         — the live subscription prices and the recommended ones.
 *                           ACTIVE_PRICE_SET picks which one is live: flipping it is one line.
 *   3. EXPERIMENTS        — the funnel's price tests (quiz spec §9 E3/E4) as config.
 *   4. COST_MODEL         — the honest cost basis the floor tests check every price against.
 *
 * Every amount is in base units (paise / cents / fils), like Ziina.
 * docs/PRICING_RESEARCH.md explains every number.
 */

import type { SupportedCurrency } from './ziina/amounts';

export type { SupportedCurrency };

/** Currencies checkout charges in today. */
export const CURRENCIES: readonly SupportedCurrency[] = ['INR', 'USD', 'AED'] as const;

/**
 * Currencies Ziina's Payment Intent API also accepts (docs.ziina.com/supported-currencies,
 * checked 2026-10-11) that the price book can already price, but that checkout, the
 * currency cookie and the switcher do not handle yet. CAD, AUD and SGD are NOT accepted
 * by Ziina, so they are deliberately absent: never show a currency we cannot charge.
 */
export const READY_CURRENCIES = ['GBP', 'EUR'] as const;
export type PriceCurrency = SupportedCurrency | (typeof READY_CURRENCIES)[number];

/**
 * Units of each currency per 1 USD. Used only to DERIVE a local price from a USD anchor
 * and to check margins — never to charge. Mid-market 2026-10-10 (open.er-api.com).
 * Revisit when the rupee moves more than ~3%.
 */
export const FX_PER_USD: Record<PriceCurrency, number> = {
  USD: 1,
  INR: 96.87,
  AED: 3.6725, // pegged
  GBP: 0.756,
  EUR: 0.892,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Charm rounding
// ─────────────────────────────────────────────────────────────────────────────

/** Largest value of the form k*step - 1 that is <= x (x and result in whole units). */
function floorToEnding(x: number, step: number): number {
  return Math.floor((x + 1) / step) * step - 1;
}

/**
 * Round a raw amount DOWN to the nearest local charm price, in base units.
 *
 *   INR  under ₹100: ends in 9 (₹49, ₹99) · ₹100–999: 49/99 (₹149, ₹199, ₹799)
 *        ₹1,000–9,999: 499/999 (₹1,499, ₹3,499) · ₹10,000+: 999 (₹47,999)
 *   USD  under $100: .99 ($4.99, $14.99, $41.99) · $100+: whole dollars ending 9 ($499)
 *        GBP and EUR follow the USD rule (£10.99, €12.99, €109)
 *   AED  under 100: .99 (AED 18.99, 54.99) · 100–999: whole dirhams ending 9 (AED 159)
 *        1,000+: 49/99 (AED 1,849)
 *
 * Never rounds up: a computed ₹3,800 shows as ₹3,499, not ₹3,999. An amount below the
 * smallest charm point is returned unchanged (floored to a displayable unit).
 */
export function charmDown(baseUnits: number, currency: PriceCurrency): number {
  if (!Number.isFinite(baseUnits) || baseUnits <= 0) return 0;

  if (currency === 'INR') {
    const r = Math.floor(baseUnits / 100); // whole rupees: INR displays without paise
    let c: number;
    if (r < 100) c = floorToEnding(r, 10);
    else if (r < 1_000) c = floorToEnding(r, 50);
    else if (r < 10_000) c = floorToEnding(r, 500);
    else c = floorToEnding(r, 1_000);
    return (c > 0 ? c : r) * 100;
  }

  if (currency === 'AED') {
    const fils = Math.floor(baseUnits);
    const dirhams = Math.floor(fils / 100);
    if (dirhams < 100) {
      const c = floorToEnding(fils, 100); // AED N.99
      return c > 0 ? c : fils;
    }
    if (dirhams < 1_000) {
      const d = floorToEnding(dirhams, 10); // AED …9
      return d >= 100 ? d * 100 : 99_99;
    }
    return floorToEnding(dirhams, 50) * 100; // AED …49 / …99
  }

  // USD, GBP, EUR
  const cents = Math.floor(baseUnits);
  if (cents < 100_00) {
    const c = floorToEnding(cents, 100); // N.99
    return c > 0 ? c : cents;
  }
  const d = floorToEnding(Math.floor(cents / 100), 10); // …9
  return d >= 100 ? d * 100 : 99_99; // 100–108 → 99.99, the top of the band below
}

/** True when an amount is already a charm price (charmDown leaves it alone). */
export function isCharmPrice(baseUnits: number, currency: PriceCurrency): boolean {
  return charmDown(baseUnits, currency) === baseUnits;
}

/** Convert a USD amount (cents) into a charm price in another currency, rounding down. */
export function localizeFromUsd(usdCents: number, currency: PriceCurrency): number {
  return charmDown(usdCents * FX_PER_USD[currency], currency);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Price points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A price point. INR is set by hand for the Indian market: it is NOT a currency
 * conversion, because Indian buyers are priced on Indian willingness to pay. USD is set
 * by hand for everyone else. AED (and GBP/EUR) follow USD through FX + charmDown unless
 * AED is pinned.
 */
export interface PricePoint {
  INR: number;
  USD: number;
  /** Pin an AED price; when absent it is derived from USD. */
  AED?: number;
}

/** Major units → base units, for readability in the tables below. */
const p = (inr: number, usd: number, aed?: number): PricePoint => ({
  INR: Math.round(inr * 100),
  USD: Math.round(usd * 100),
  ...(aed !== undefined ? { AED: Math.round(aed * 100) } : {}),
});

export function amountFor(point: PricePoint, currency: PriceCurrency): number {
  if (currency === 'INR') return point.INR;
  if (currency === 'USD') return point.USD;
  if (currency === 'AED') return point.AED ?? localizeFromUsd(point.USD, 'AED');
  return localizeFromUsd(point.USD, currency);
}

export type SubscriptionSku = 'sub_monthly' | 'sub_annual';
export const SUBSCRIPTION_MONTHS: Record<SubscriptionSku, number> = { sub_monthly: 1, sub_annual: 12 };

/**
 * `current` is what production charges today (set 2026-09-13 on the old $6.50 all-Opus
 * cost basis). `recommended` is docs/PRICING_RESEARCH.md §8. Nothing changes for buyers
 * until ACTIVE_PRICE_SET is flipped, which needs the owner's yes.
 */
export const PRICE_SETS = {
  current: {
    sub_monthly: p(3_999, 41.99, 159),
    sub_annual: p(47_999, 499, 1_849),
  },
  recommended: {
    sub_monthly: p(999, 14.99), // AED 54.99 derived
    sub_annual: p(9_999, 119), // AED 429 derived. India: ten months' price for twelve
  },
} as const satisfies Record<string, Record<SubscriptionSku, PricePoint>>;

export type PriceSetId = keyof typeof PRICE_SETS;

/** THE live switch. 'current' until the owner approves the recommendation. */
export const ACTIVE_PRICE_SET: PriceSetId = 'current';

export function subscriptionPrice(
  sku: SubscriptionSku,
  currency: PriceCurrency,
  set: PriceSetId = ACTIVE_PRICE_SET,
): number {
  return amountFor(PRICE_SETS[set][sku], currency);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Funnel price experiments (VEDICHOUR_QUIZ_SPEC §5 S17–S18, §9 E3/E4)
// ─────────────────────────────────────────────────────────────────────────────

export type FunnelSku = 'report_entry' | 'bump_30day' | 'downsell_7day' | 'sub_monthly';

export interface ExperimentArm {
  price: PricePoint;
  /** Relative traffic share while the experiment is enabled. */
  weight: number;
  /**
   * Set when this arm knowingly sells below the cost floor (COST_MODEL), with the reason.
   * The floor test fails for any arm below the floor that does not say so.
   */
  belowFloor?: string;
}

export interface PriceExperiment {
  /** What the price is charged for. */
  sku: FunnelSku;
  /** Off → everyone gets the control arm. */
  enabled: boolean;
  control: string;
  arms: Record<string, ExperimentArm>;
  /**
   * Which visitors the experiment varies for. 'IN' tests change only the INR price
   * (others always see control); 'ROW' tests change only USD/AED.
   */
  market: 'IN' | 'ROW' | 'ALL';
}

export const EXPERIMENTS = {
  /** E3 — entry report ("Full Karmic Blueprint"), S17. ROW is $4.99 in every arm. */
  price_report: {
    sku: 'report_entry',
    enabled: false,
    control: 'inr199',
    market: 'IN',
    arms: {
      inr149: { price: p(149, 4.99), weight: 1 },
      inr199: { price: p(199, 4.99), weight: 1 },
      inr299: { price: p(299, 4.99), weight: 1 },
    },
  },
  /** S17 order bump ("your next 30 days"). Must ride in the SAME charge as the report. */
  price_bump: {
    sku: 'bump_30day',
    enabled: false,
    control: 'inr99',
    market: 'ALL',
    arms: { inr99: { price: p(99, 1.99), weight: 1 } },
  },
  /** S18 down-sell after a declined upsell: 7-day forecast. ROW price is our choice; the spec names only ₹149. */
  price_downsell: {
    sku: 'downsell_7day',
    enabled: false,
    control: 'inr149',
    market: 'ALL',
    arms: { inr149: { price: p(149, 3.99), weight: 1 } },
  },
  /** E4 (India half) — monthly forecast upsell at S18. Control = the recommended ₹999. */
  price_monthly_in: {
    sku: 'sub_monthly',
    enabled: false,
    control: 'inr999',
    market: 'IN',
    arms: {
      inr499: {
        price: p(499, 14.99),
        weight: 1,
        belowFloor:
          'Owner-requested test arm: about 54% margin at daily use, and a one-month buyer loses money once the first run costs more than about $2. Run it only with the first-run budget at measured cost.',
      },
      inr799: { price: p(799, 14.99), weight: 1 },
      inr999: { price: p(999, 14.99), weight: 1 },
    },
  },
  /** E4 (rest of world) — $41.99 (today's price) vs $14.99. INR here is unused (India uses price_monthly_in). */
  price_monthly_row: {
    sku: 'sub_monthly',
    enabled: false,
    control: 'usd4199',
    market: 'ROW',
    arms: {
      usd4199: { price: p(999, 41.99, 159), weight: 1 },
      usd1499: { price: p(999, 14.99), weight: 1 },
    },
  },
} as const satisfies Record<string, PriceExperiment>;

export type ExperimentId = keyof typeof EXPERIMENTS;

/** FNV-1a: stable, dependency-free hash for sticky arm assignment. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function marketOf(currency: PriceCurrency): 'IN' | 'ROW' {
  return currency === 'INR' ? 'IN' : 'ROW';
}

/**
 * Sticky arm for a visitor (pass a session or user id). The same id always gets the same
 * arm, so a refresh can never change the price someone was shown (spec H6).
 * Returns the control arm when the experiment is off or the visitor is outside its market.
 */
export function assignArm(expId: ExperimentId, unitId: string, currency: PriceCurrency): string {
  return assignArmIn(EXPERIMENTS[expId], expId, unitId, currency);
}

/** assignArm for any experiment definition (exported for tests). */
export function assignArmIn(exp: PriceExperiment, expId: string, unitId: string, currency: PriceCurrency): string {
  if (!exp.enabled) return exp.control;
  if (exp.market !== 'ALL' && exp.market !== marketOf(currency)) return exp.control;
  const entries = Object.entries(exp.arms);
  const total = entries.reduce((s, [, a]) => s + a.weight, 0);
  let ticket = (hash32(`${expId}:${unitId}`) / 0x1_0000_0000) * total;
  for (const [id, arm] of entries) {
    ticket -= arm.weight;
    if (ticket < 0) return id;
  }
  return exp.control;
}

/**
 * Price for an experiment arm (base units). Unknown arm → control, so a stale cookie can
 * never produce an unpriced checkout.
 */
export function experimentPrice(expId: ExperimentId, arm: string | null | undefined, currency: PriceCurrency): number {
  const exp: PriceExperiment = EXPERIMENTS[expId];
  const chosen = (arm && exp.arms[arm]) || exp.arms[exp.control]!;
  return amountFor(chosen.price, currency);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Honest cost model (docs/PRICING_RESEARCH.md §4–§5)
// ─────────────────────────────────────────────────────────────────────────────

export const COST_MODEL = {
  /**
   * Model + infra cost of one daily-active subscriber-month, in USD. Measured
   * 2026-09-13 on a real stored 30-day forecast: ~$1.00 to generate, ≤$1.60 if every
   * day is opened. Ask-your-report was not measured, so $0.40 is added for it.
   * (The old $6.50 basis priced every call on the most expensive model, with retries, on
   * every day: a ceiling, not a cost.)
   */
  monthlyServeUsd: 2.0,
  /**
   * EXTRA first-run generation spend per new subscriber (USD), on top of the month above.
   * The owner wants room for a richer first forecast (~$5–7 all-in). Set by market,
   * because a $5 extra is affordable at $14.99 and not at ₹499 (PRICING_RESEARCH §5).
   */
  firstRunExtraUsd: { IN: 1.0, ROW: 5.0 } as Record<'IN' | 'ROW', number>,
  /**
   * One-time funnel products (S17–S18): ESTIMATED generation cost, not yet measured.
   * Re-measure once the Karmic Blueprint pipeline exists.
   */
  oneTimeCostUsd: { report_entry: 0.5, bump_30day: 0.3, downsell_7day: 0.4 } as Record<
    Exclude<FunnelSku, 'sub_monthly'>,
    number
  >,
  /**
   * Ziina's cut as a share of the charge (ziina.com business-fees page, 29 Jun 2026, plus
   * its FX help article): 2.6% base, +1.5% for a non-AED charge or a foreign card, and a
   * 1.2% FX markup when a non-AED charge converts to the AED payout. AED assumes a
   * foreign card (worst case; a UAE card pays 2.6%).
   */
  feePct: { INR: 0.053, USD: 0.053, GBP: 0.053, EUR: 0.053, AED: 0.041 } as Record<PriceCurrency, number>,
  /** Ziina fixed fee per charge, AED 1, in USD. An order bump in the same charge avoids it. */
  feeFixedUsd: 1 / 3.6725,
  /** Expected share of revenue refunded (RevenueCat 2026: AI-app median 4.2%). */
  refundRate: 0.05,
  /**
   * Subscription floor: at daily use, serve cost may take at most 30% of what we keep
   * after fees and refunds (a 70% margin, about 3.3x). Typical software gross margin;
   * replaces the earlier 6x-of-$6.50 rule.
   */
  minSteadyMargin: 0.7,
  /** One-time products: net must be at least this multiple of estimated generation cost. */
  oneTimeMarkup: 2,
} as const;

export interface UnitEconomics {
  grossUsd: number;
  feesUsd: number;
  refundsUsd: number;
  netUsd: number;
}

/**
 * What one charge is worth after Ziina fees and the expected refund rate, in USD.
 * Pass `fixedFee: false` for an add-on carried in the same charge (an order bump).
 */
export function netOfCharge(
  baseUnits: number,
  currency: PriceCurrency,
  opts: { fixedFee?: boolean } = {},
): UnitEconomics {
  const grossUsd = baseUnits / 100 / FX_PER_USD[currency];
  const feesUsd = grossUsd * COST_MODEL.feePct[currency] + (opts.fixedFee === false ? 0 : COST_MODEL.feeFixedUsd);
  const refundsUsd = grossUsd * COST_MODEL.refundRate;
  return { grossUsd, feesUsd, refundsUsd, netUsd: grossUsd - feesUsd - refundsUsd };
}

/** Share of net left after daily-use serve cost over `months` (subscriptions). */
export function steadyMargin(baseUnits: number, currency: PriceCurrency, months: number): number {
  const { netUsd } = netOfCharge(baseUnits, currency);
  return 1 - (COST_MODEL.monthlyServeUsd * months) / netUsd;
}

/**
 * Profit on a buyer who pays once and never renews: net of the first payment minus the
 * first month's serve cost and the market's extra first-run budget. Negative = loss.
 */
export function firstPaymentProfitUsd(
  baseUnits: number,
  currency: PriceCurrency,
  firstRunExtraUsd: number = COST_MODEL.firstRunExtraUsd[marketOf(currency)],
): number {
  return netOfCharge(baseUnits, currency).netUsd - COST_MODEL.monthlyServeUsd - firstRunExtraUsd;
}
