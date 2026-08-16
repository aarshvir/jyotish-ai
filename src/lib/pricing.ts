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

/** Canonical free→paid unlock. Every preview/report CTA must use this so NEWUSER30 cannot drift. */
export const UNLOCK_7DAY_HREF = '/onboard?plan=7day&promo=NEWUSER30';
export const UNLOCK_FREE_HREF = '/onboard?plan=free';

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

// ─────────────────────────────────────────────────────────────────────────────
// PLAN FEATURES — single source of truth for EVERY pricing surface
// (landing Pricing cards, landing PricingComparison table, /pricing page).
//
// Verified against the report pipeline (src/lib/reports/orchestrator.ts) and
// the report page gating (src/app/(app)/report/[id]/page.tsx):
//   • dayCount: '7day' → 7 days; 'monthly'/'annual' → 30 days, at 18 scored
//     windows per day. Free/preview persists the natal chart + ONE sample day
//     only — months/weeks/synthesis are stripped at save time.
//   • The 12-month thematic outlook AND the weekly synthesis (6 windows) are
//     generated and saved for EVERY paid plan — including 7-Day. They are NOT
//     Monthly- or Annual-only. Never present them as such.
//   • PDF, Markdown and calendar (.ics) exports plus Ask-your-report are
//     available on ALL paid plans (gated on preview only), never Monthly-only.
//   • Annual's generated report is identical to Monthly's; its differentiation
//     is service-level (priority email support, 1-year access). List shared
//     content as "Everything in Monthly Oracle" — never as if it were unique.
//   • There is NO user-facing "re-generate" feature — do not claim one.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | '7day' | 'monthly' | 'annual';

export interface PlanCardDef {
  id: PlanId;
  name: string;
  description: string;
  /** Card bullets. Paid tiers follow the "Everything in X" convention. */
  features: readonly string[];
  cta: string;
  href: string;
  badge: 'Recommended' | 'Best Value' | null;
  /** Amber-highlighted card (Monthly). */
  featured: boolean;
}

export const PLAN_CARDS: readonly PlanCardDef[] = [
  {
    id: 'free',
    name: 'Free Kundli',
    description: 'Free Janam Kundali & birth chart',
    features: [
      'Complete natal chart with all planets',
      'Rising sign + Moon sign analysis',
      'Current life-period (Vimshottari Dasha)',
      'Yogas + life-chapters timeline',
      'One sample day of hourly windows',
    ],
    cta: 'Get Free Kundli',
    href: '/onboard?plan=free',
    badge: null,
    featured: false,
  },
  {
    id: '7day',
    name: '7-Day Forecast',
    description: 'Full week of hourly precision',
    features: [
      '126 scored hourly windows (18/day × 7 days)',
      'AI narrative for every day',
      'Best & avoid windows + Rahu Kaal alerts',
      '12-month thematic outlook',
      'Weekly synthesis (6 weeks)',
      'Personalised birth-chart narrative',
      'PDF, Markdown & calendar export',
    ],
    cta: 'Get 7-Day Forecast',
    href: '/onboard?plan=7day',
    badge: null,
    featured: false,
  },
  {
    id: 'monthly',
    name: 'Monthly Oracle',
    description: '30 days of precision guidance',
    features: [
      'Everything in 7-Day Forecast',
      '540 scored hourly windows (18/day × 30 days)',
      'AI narrative for all 30 days',
      'Peak & caution dates across the full month',
    ],
    cta: 'Get Monthly Oracle',
    href: '/onboard?plan=monthly',
    badge: 'Recommended',
    featured: true,
  },
  {
    id: 'annual',
    name: 'Annual Oracle',
    description: 'A year of access + priority support',
    features: [
      'Everything in Monthly Oracle — 30-day hourly forecast, 12-month outlook, exports',
      '1-year report access',
      'Priority email support',
    ],
    cta: 'Get Annual Oracle',
    href: '/onboard?plan=annual',
    badge: 'Best Value',
    featured: false,
  },
] as const;

/** A comparison-table cell: included / not included / qualified note. */
export type FeatureCell = string | boolean;

export interface FeatureRow {
  label: string;
  free: FeatureCell;
  '7day': FeatureCell;
  monthly: FeatureCell;
  annual: FeatureCell;
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
      { label: 'Free Kundli (Janam Kundali)', free: true, '7day': true, monthly: true, annual: true },
      { label: 'Rising sign + Moon sign + birth star', free: true, '7day': true, monthly: true, annual: true },
      { label: 'Current main period + sub-period (Dasha)', free: true, '7day': true, monthly: true, annual: true },
      { label: 'All 9 planetary placements', free: true, '7day': true, monthly: true, annual: true },
      { label: 'Yogas + life-chapters timeline', free: true, '7day': true, monthly: true, annual: true },
      { label: 'Personalised birth-chart narrative', free: 'basic', '7day': true, monthly: true, annual: true },
    ],
  },
  {
    group: 'Daily timing',
    rows: [
      { label: 'Hourly Vedic windows (18/day, scored 0–100)', free: '1 sample day', '7day': '7 days', monthly: '30 days', annual: '30 days' },
      { label: 'AI narrative per day', free: 'sample day', '7day': true, monthly: true, annual: true },
      { label: 'Peak & avoid window alerts (incl. Rahu Kaal)', free: 'sample day', '7day': true, monthly: true, annual: true },
      { label: 'Hora & choghadiya rulers per window', free: 'sample day', '7day': true, monthly: true, annual: true },
    ],
  },
  {
    group: 'Forecast horizon',
    rows: [
      { label: '7-day hour-level forecast', free: false, '7day': true, monthly: true, annual: true },
      { label: '30-day hour-level forecast', free: false, '7day': false, monthly: true, annual: true },
      { label: 'Weekly synthesis (6-week outlook)', free: false, '7day': true, monthly: true, annual: true },
      { label: '12-month thematic outlook', free: false, '7day': true, monthly: true, annual: true },
      { label: 'Timing by life domain (career, money, health)', free: false, '7day': true, monthly: true, annual: true },
    ],
  },
  {
    group: 'Exports & access',
    rows: [
      { label: 'PDF report', free: false, '7day': true, monthly: true, annual: true },
      { label: 'Markdown export', free: false, '7day': true, monthly: true, annual: true },
      { label: 'Best dates → calendar (.ics)', free: false, '7day': true, monthly: true, annual: true },
      { label: 'Ask-your-report questions', free: false, '7day': true, monthly: true, annual: true },
      { label: '24h no-questions refund', free: 'n/a', '7day': true, monthly: true, annual: true },
      { label: 'Priority email support + 1-year access', free: false, '7day': false, monthly: false, annual: true },
    ],
  },
] as const;

/** Standalone one-time products shown alongside the forecast plans. */
export const STANDALONE_PRODUCTS = [
  {
    id: 'kundali',
    name: 'Kundali Analysis',
    href: '/kundali',
    description:
      'A personalized birth-chart reading in plain English — who you are, the life chapter you are in now, and your life-chapters timeline. Instant.',
    cta: 'Get your reading →',
  },
  {
    id: 'synastry',
    name: 'Matchmaking (Gun Milan)',
    href: '/synastry',
    description:
      'Enter two birth details and get your 36-point Ashtakoot compatibility score with a full eight-fold breakdown. The classical Kundli matching, computed instantly.',
    cta: 'Check compatibility →',
  },
] as const;
