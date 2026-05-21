import {
  applyDiscount,
  getMonthlyUpgradeAmount,
  getPlanAmount,
  type SupportedCurrency,
  type ZiinaPaymentIntent,
} from './server';

const REUSABLE_ZIINA_STATUSES: ReadonlySet<ZiinaPaymentIntent['status']> = new Set([
  'requires_payment_instrument',
  'requires_user_action',
  'pending',
]);

function normalizeCurrency(currency: string): SupportedCurrency | null {
  if (currency === 'USD' || currency === 'INR' || currency === 'AED') return currency;
  return null;
}

export function expectedZiinaIntentAmount(
  planType: string,
  currency: SupportedCurrency,
  discountPct: number,
): number | null {
  try {
    if (planType === 'monthly_upgrade') return getMonthlyUpgradeAmount(currency);
    const baseAmount = getPlanAmount(planType, currency);
    return discountPct > 0 ? applyDiscount(baseAmount, discountPct, currency) : baseAmount;
  } catch {
    return null;
  }
}

export function getReusablePendingZiinaIntent(
  intent: ZiinaPaymentIntent,
  expected: {
    planType: string;
    currency: SupportedCurrency;
    discountPct: number;
  },
): { reusable: true; currency: SupportedCurrency } | { reusable: false; reason: string } {
  if (!REUSABLE_ZIINA_STATUSES.has(intent.status)) {
    return { reusable: false, reason: 'status_mismatch' };
  }

  const intentCurrency = normalizeCurrency(intent.currency_code);
  if (!intentCurrency || intentCurrency !== expected.currency) {
    return { reusable: false, reason: 'currency_mismatch' };
  }

  const expectedAmount = expectedZiinaIntentAmount(
    expected.planType,
    expected.currency,
    expected.discountPct,
  );
  if (expectedAmount == null || intent.amount !== expectedAmount) {
    return { reusable: false, reason: 'amount_mismatch' };
  }

  return { reusable: true, currency: intentCurrency };
}
