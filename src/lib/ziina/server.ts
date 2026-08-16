/**
 * Ziina payment gateway — server-side only.
 *
 * Env var required: ZIINA_API_TOKEN
 * Obtain from: https://app.ziina.com → Settings → API Keys
 *
 * Amount rules (Ziina uses base units, like cents):
 *   AED: 1 AED = 100 fils  → 37.99 AED = 3799
 *   USD: 1 USD = 100 cents → 9.99 USD  = 999
 *   INR: 1 INR = 100 paise → 799 INR   = 79900
 */

import { applyDiscount, formatAmount, type SupportedCurrency } from './amounts';

// Re-exported so existing server-side imports keep working. The implementations
// live in ./amounts (pure, client-safe) so the price the buyer SEES on onboard
// step 3 is computed by the exact same function that sets the Ziina charge.
export { applyDiscount, formatAmount };
export type { SupportedCurrency };

const ZIINA_BASE_URL = 'https://api-v2.ziina.com/api';

// ── Plan pricing ─────────────────────────────────────────────────────────────
// Amounts in base units (fils / cents / paise).
// AED prices: USD price × ~3.67, rounded to nearest X.99 AED.
export interface ZiinaPlan {
  name: string;
  /** Amount in base units of the currency */
  amountAED: number;
  amountUSD: number;
  amountINR: number;
}

export const ZIINA_PLANS: Record<string, ZiinaPlan> = {
  '7day':    { name: 'VedicHour 7-Day Forecast',  amountAED: 3799,  amountUSD: 999,   amountINR: 79900  },
  'monthly': { name: 'VedicHour Monthly Oracle',  amountAED: 6999,  amountUSD: 1999,  amountINR: 149900 },
  'annual':  { name: 'VedicHour Annual Oracle',   amountAED: 18499, amountUSD: 4999,  amountINR: 399900 },
  /** Delta only: Monthly − 7-day (used for post-checkout upsell) */
  'monthly_upgrade': {
    name: 'VedicHour Monthly Oracle (upgrade from 7-day)',
    amountAED: 3200,
    amountUSD: 1000,
    amountINR: 70000,
  },
  /** Ashtakoot compatibility (matchmaking) — standalone product. $9.99 / ₹899 / AED 36.99 */
  synastry: {
    name: 'VedicHour Matchmaking (Ashtakoot)',
    amountAED: 3699,
    amountUSD: 999,
    amountINR: 89900,
  },
  /** High-level Kundali (birth chart) analysis — standalone product. $9.99 / ₹899 / AED 36.99 */
  kundali: {
    name: 'VedicHour Kundali Analysis',
    amountAED: 3699,
    amountUSD: 999,
    amountINR: 89900,
  },
};

/** 10% off the upgrade delta vs paying full monthly after already owning 7-day */
export const UPGRADE_DELTA_DISCOUNT_PCT = 10;

/** Map Vercel's x-vercel-ip-country header to a currency. */
export function countryToCurrency(country: string | null): SupportedCurrency {
  if (!country) return 'USD';
  const c = country.toUpperCase();
  if (c === 'AE') return 'AED';
  if (c === 'IN') return 'INR';
  return 'USD';
}

/** Get amount for a plan in the given currency (base units). */
export function getPlanAmount(planType: string, currency: SupportedCurrency): number {
  const plan = ZIINA_PLANS[planType];
  if (!plan) throw new Error(`Unknown plan: ${planType}`);
  if (currency === 'AED') return plan.amountAED;
  if (currency === 'INR') return plan.amountINR;
  return plan.amountUSD;
}

/** Upgrade delta (Monthly − 7-day) after UPGRADE_DELTA_DISCOUNT_PCT, in base units. */
export function getMonthlyUpgradeAmount(currency: SupportedCurrency): number {
  const raw = getPlanAmount('monthly_upgrade', currency);
  return applyDiscount(raw, UPGRADE_DELTA_DISCOUNT_PCT, currency);
}

// ── Ziina API client ──────────────────────────────────────────────────────────

function getApiToken(): string {
  const token = process.env.ZIINA_API_TOKEN;
  if (!token) throw new Error('ZIINA_API_TOKEN is not set');
  return token;
}

export function isZiinaConfigured(): boolean {
  const token = process.env.ZIINA_API_TOKEN ?? '';
  return token.length > 0;
}

export interface CreatePaymentIntentInput {
  planType: string;
  currency: SupportedCurrency;
  reportId: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  message?: string;
  /** Percentage discount 0-99 (100 = free, handled by caller before reaching here) */
  discountPct?: number;
  /** Set true to create a test payment (no real charge) */
  test?: boolean;
}

export interface ZiinaPaymentIntent {
  id: string;
  status: 'requires_payment_instrument' | 'requires_user_action' | 'pending' | 'completed' | 'failed' | 'canceled';
  redirect_url: string;
  amount: number;
  currency_code: string;
}

/**
 * Resolve the charge amount (base units) for a plan in a currency after an optional
 * percentage discount. Single source of truth shared by createPaymentIntent and the
 * pending-intent reuse check, so an "expected amount" can never drift from what was
 * actually charged.
 */
export function computeIntentAmount(
  planType: string,
  currency: SupportedCurrency,
  discountPct?: number,
): number {
  const baseAmount = getPlanAmount(planType, currency);
  if (planType === 'monthly_upgrade') {
    return applyDiscount(baseAmount, UPGRADE_DELTA_DISCOUNT_PCT, currency);
  }
  if (discountPct && discountPct > 0) {
    return applyDiscount(baseAmount, discountPct, currency);
  }
  return baseAmount;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<ZiinaPaymentIntent> {
  const token = getApiToken();
  const amount = computeIntentAmount(input.planType, input.currency, input.discountPct);
  const plan = ZIINA_PLANS[input.planType]!;

  const body = {
    amount,
    currency_code: input.currency,
    message: input.message ?? plan.name,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    failure_url: input.failureUrl,
    ...(input.test ? { test: true } : {}),
  };

  const res = await fetch(`${ZIINA_BASE_URL}/payment_intent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ziina API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  return res.json() as Promise<ZiinaPaymentIntent>;
}

export async function getPaymentIntent(intentId: string): Promise<ZiinaPaymentIntent> {
  const token = getApiToken();

  const res = await fetch(`${ZIINA_BASE_URL}/payment_intent/${intentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ziina API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  return res.json() as Promise<ZiinaPaymentIntent>;
}
