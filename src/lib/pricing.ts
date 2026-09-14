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

/**
 * Every paid path now starts at the quiz (owner, 2026-09-13: sign-up, quiz, then a
 * subscription). The name is kept so the many existing "unlock" CTAs follow automatically.
 */
export const UNLOCK_7DAY_HREF = '/start';
/**
 * The free path is the free calculators: full results, no sign-up, leading into the quiz.
 * Labels like "Free birth chart — no card" stay true because this destination is free.
 */
export const UNLOCK_FREE_HREF = '/free-kundli';

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

/**
 * Currency for a server render, with the same precedence as /api/geo and checkout: the
 * visitor's own pick (vh_currency cookie), then their country (Vercel's x-vercel-ip-country).
 *
 * Server pages used to read an x-currency header "set by middleware", but the root
 * middleware.ts has never run (with src/app, Next.js only loads src/middleware.ts), so every
 * visitor saw USD on /pricing whatever their cookie or country.
 */
export function currencyForRequest(cookieCurrency: string | null | undefined, country: string | null | undefined): SupportedCurrency {
  if (cookieCurrency === 'USD' || cookieCurrency === 'INR' || cookieCurrency === 'AED') return cookieCurrency;
  const c = (country ?? '').toUpperCase();
  if (c === 'IN') return 'INR';
  if (c === 'AE') return 'AED';
  return 'USD';
}

/** Resolve a currency from an x-currency header value. */
export function currencyFromHeader(headerValue: string | null): SupportedCurrency {
  if (headerValue === 'AED' || headerValue === 'INR') return headerValue;
  return 'USD';
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANS — single source of truth for EVERY pricing surface (landing Pricing cards,
// landing PricingComparison table, /pricing page).
//
// Since 2026-09-13 there is no free report and nothing is sold one-time:
//   • Free = the calculators (Kundli facts, Lagna, Moon sign, dasha …): full results,
//     no sign-up. They lead into the quiz.
//   • Paid = one subscription through the quiz, billed monthly or yearly.
//
// Verified against the pipeline: a subscription period generates the 30-day plan,
// which carries the 12-month thematic outlook, the weekly synthesis, PDF / Markdown /
// calendar exports and Ask-your-report. Kundli analysis and matchmaking unlock for
// anyone with a paid report (api/kundali/compute, api/synastry/compute), so every
// subscriber has both. A new 30-day forecast unlocks every 25 days while subscribed.
// Never claim anything here the pipeline does not do.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'sub_monthly' | 'sub_annual';

export interface PlanCardDef {
  id: PlanId;
  name: string;
  description: string;
  /** Card bullets. Paid tiers follow the "Everything in X" convention. */
  features: readonly string[];
  cta: string;
  href: string;
  badge: 'Recommended' | null;
  /** Amber-highlighted card (Monthly). */
  featured: boolean;
}

export const PLAN_CARDS: readonly PlanCardDef[] = [
  {
    id: 'free',
    name: 'Free calculators',
    description: 'Your birth chart facts, straight away',
    features: [
      'Rising sign (Lagna), Moon sign and birth star',
      'The main life period you are in now (dasha)',
      'No sign-up and no card',
    ],
    cta: 'Use the free calculators',
    href: UNLOCK_FREE_HREF,
    badge: null,
    featured: false,
  },
  {
    id: 'sub_monthly',
    name: 'Monthly',
    description: 'Your next 30 days, planned hour by hour',
    features: [
      'Every hour of the next 30 days scored, with best and worst windows marked',
      'Written around what you tell us in the quiz',
      '12-month outlook and weekly synthesis',
      'Ask questions about your own chart',
      'Kundli analysis and matchmaking included',
      'PDF, Markdown and calendar export',
    ],
    cta: 'Start with the quiz',
    href: UNLOCK_7DAY_HREF,
    badge: 'Recommended',
    featured: true,
  },
  {
    id: 'sub_annual',
    name: 'Yearly',
    description: 'A new 30-day forecast every month, paid once a year',
    features: [
      'Everything in Monthly',
      'A fresh 30-day forecast each month for twelve months',
      'Priority email support',
    ],
    cta: 'Start with the quiz',
    href: UNLOCK_7DAY_HREF,
    badge: null,
    featured: false,
  },
] as const;

/** A comparison-table cell: included / not included / qualified note. */
export type FeatureCell = string | boolean;

export interface FeatureRow {
  label: string;
  free: FeatureCell;
  sub_monthly: FeatureCell;
  sub_annual: FeatureCell;
}

export interface FeatureGroup {
  group: string;
  rows: readonly FeatureRow[];
}

/** Feature-by-feature comparison matrix. Same ground truth as PLAN_CARDS. */
export const FEATURE_MATRIX: readonly FeatureGroup[] = [
  {
    group: 'Birth chart',
    rows: [
      { label: 'Rising sign, Moon sign and birth star', free: true, sub_monthly: true, sub_annual: true },
      { label: 'Current main period and sub-period (dasha)', free: true, sub_monthly: true, sub_annual: true },
      { label: 'Personalised birth-chart reading', free: false, sub_monthly: true, sub_annual: true },
      { label: 'Kundli analysis', free: false, sub_monthly: true, sub_annual: true },
      { label: 'Matchmaking (Gun Milan)', free: 'score only', sub_monthly: true, sub_annual: true },
    ],
  },
  {
    group: 'Daily timing',
    rows: [
      { label: 'Hourly windows (18 a day, scored 0–100)', free: false, sub_monthly: '30 days', sub_annual: '30 days, each month' },
      { label: 'A written reading for each day', free: false, sub_monthly: true, sub_annual: true },
      { label: 'Best and avoid windows, including Rahu Kaal', free: false, sub_monthly: true, sub_annual: true },
      { label: 'Hora and choghadiya for each window', free: false, sub_monthly: true, sub_annual: true },
    ],
  },
  {
    group: 'Looking ahead',
    rows: [
      { label: 'Weekly synthesis (6 weeks)', free: false, sub_monthly: true, sub_annual: true },
      { label: '12-month thematic outlook', free: false, sub_monthly: true, sub_annual: true },
      { label: 'A new 30-day forecast each month', free: false, sub_monthly: 'when you renew', sub_annual: true },
    ],
  },
  {
    group: 'Extras',
    rows: [
      { label: 'Ask questions about your chart', free: false, sub_monthly: true, sub_annual: true },
      { label: 'PDF, Markdown and calendar export', free: false, sub_monthly: true, sub_annual: true },
      { label: 'Priority email support', free: false, sub_monthly: false, sub_annual: true },
    ],
  },
] as const;

/** Deeper readings — included with a subscription, no longer sold one-time. */
export const STANDALONE_PRODUCTS = [
  {
    id: 'kundali',
    name: 'Kundali Analysis',
    href: '/kundali',
    description:
      'A personalized birth-chart reading in plain English — who you are, the life chapter you are in now, and your life-chapters timeline.',
    cta: 'See your free chart facts →',
  },
  {
    id: 'synastry',
    name: 'Matchmaking (Gun Milan)',
    href: '/synastry',
    description:
      'Enter two birth details and see your 36-point Ashtakoot score free. The full eight-fold breakdown and reading come with a subscription.',
    cta: 'Check your score →',
  },
] as const;
