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
};

export type SupportedCurrency = 'AED' | 'USD' | 'INR';

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

/** Format amount as display string for the given currency. */
export function formatAmount(amountBaseUnits: number, currency: SupportedCurrency): string {
  const major = amountBaseUnits / 100;
  if (currency === 'AED') return `AED ${major.toFixed(2)}`;
  if (currency === 'INR') return `₹${(major).toFixed(0)}`;
  return `$${major.toFixed(2)}`;
}

/**
 * Apply a percentage discount to a base-unit amount and round to the
 * nearest "pretty" price for the given currency:
 *   INR → nearest 99 paise  (e.g. 559.30 → 49900 → ₹499)
 *   AED → nearest .99 fils  (e.g. 2659 → 2699 AED fils → AED 26.99)
 *   USD → nearest .99 cents (e.g. 699 → 699 → $6.99)
 */
export function applyDiscount(amountBaseUnits: number, discountPct: number, currency: SupportedCurrency): number {
  if (discountPct <= 0) return amountBaseUnits;
  if (discountPct >= 100) return 0;

  const raw = amountBaseUnits * (1 - discountPct / 100);

  if (currency === 'INR') {
    // Round to nearest 100 (1 INR), then subtract 1 to get XX99
    const rupees = raw / 100;
    const rounded = Math.round(rupees / 100) * 100;
    // Ensure minimum of 99 paise (₹1 minimum)
    const pretty = Math.max(99, rounded - 1);
    return pretty * 100;
  }

  // AED and USD: round to nearest 100 base units (1 major unit), then subtract 1 cent/fil
  const major = raw / 100;
  const rounded = Math.round(major);
  const pretty = Math.max(0.99, rounded - 0.01);
  return Math.round(pretty * 100);
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

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<ZiinaPaymentIntent> {
  const token = getApiToken();
  const baseAmount = getPlanAmount(input.planType, input.currency);
  const amount = input.discountPct ? applyDiscount(baseAmount, input.discountPct, input.currency) : baseAmount;
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
