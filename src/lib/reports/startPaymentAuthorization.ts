import { getPromoDiscount, redeemPromoCode } from '@/lib/promo/server';
import { createServiceClient } from '@/lib/supabase/admin';

type ServiceDb = ReturnType<typeof createServiceClient>;

export type ReportStartPaymentStatusResult =
  | { ok: true; status: string }
  | { ok: false; error: string; code: 'PAYMENT_REQUIRED' | 'PROMO_INVALID' | 'PROMO_REDEEM_FAILED' };

type PromoDiscountResult = Awaited<ReturnType<typeof getPromoDiscount>>;

type PaymentAuthorizationDeps = {
  hasCompletedZiinaPayment?: (db: ServiceDb, reportId: string, userId: string) => Promise<boolean>;
  hasServerPromoRedemption?: (db: ServiceDb, reportId: string, userId: string) => Promise<boolean>;
  getPromoDiscount?: (code: string, email?: string) => Promise<PromoDiscountResult>;
  redeemPromoCode?: (codeId: string, userId: string, orderId?: string) => Promise<void>;
};

const PAID_FORECAST_PLANS = new Set(['7day', 'monthly', 'annual']);

export function normalizeReportStartPlanType(planType: string | null | undefined): string {
  const normalized = (planType ?? '').trim();
  if (!normalized) return '7day';
  return normalized === 'free' ? 'preview' : normalized;
}

export function isPaidForecastPlan(planType: string | null | undefined): boolean {
  return PAID_FORECAST_PLANS.has(normalizeReportStartPlanType(planType));
}

export async function hasCompletedZiinaPayment(
  db: ServiceDb,
  reportId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('ziina_payments')
    .select('ziina_intent_id')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[reports/start] completed payment lookup failed:', error.message);
    return false;
  }
  return !!data;
}

async function hasServerPromoRedemption(
  db: ServiceDb,
  reportId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('promo_redemptions')
    .select('id')
    .eq('user_id', userId)
    .eq('order_id', reportId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[reports/start] promo redemption lookup failed:', error.message);
    return false;
  }
  return !!data;
}

export async function resolveReportStartPaymentAuthorization(
  input: {
    db: ServiceDb;
    reportId: string;
    userId: string;
    userEmail?: string;
    planType: string | null | undefined;
    requestedPaymentStatus: string | null | undefined;
    existingPaymentStatus: string | null | undefined;
    isAdmin: boolean;
    promoCode?: string | null;
  },
  deps: PaymentAuthorizationDeps = {},
): Promise<ReportStartPaymentStatusResult> {
  const planType = normalizeReportStartPlanType(input.planType);
  const requested = input.requestedPaymentStatus?.trim();
  const existing = input.existingPaymentStatus?.trim();
  const completedLookup = deps.hasCompletedZiinaPayment ?? hasCompletedZiinaPayment;
  const redemptionLookup = deps.hasServerPromoRedemption ?? hasServerPromoRedemption;
  const promoLookup = deps.getPromoDiscount ?? getPromoDiscount;
  const promoRedeemer = deps.redeemPromoCode ?? redeemPromoCode;

  if (input.isAdmin) {
    if (requested) return { ok: true, status: requested };
    if (await completedLookup(input.db, input.reportId, input.userId)) {
      return { ok: true, status: 'paid' };
    }
    if (existing) return { ok: true, status: existing };
    return { ok: true, status: isPaidForecastPlan(planType) ? 'bypass' : 'free' };
  }

  if (!isPaidForecastPlan(planType)) {
    return { ok: true, status: 'free' };
  }

  if (await completedLookup(input.db, input.reportId, input.userId)) {
    return { ok: true, status: 'paid' };
  }

  if (await redemptionLookup(input.db, input.reportId, input.userId)) {
    return { ok: true, status: 'promo' };
  }

  const promoCode = input.promoCode?.trim();
  if (promoCode) {
    const promo = await promoLookup(promoCode, input.userEmail);
    if (!promo.valid || promo.discountPct < 100 || !promo.codeId) {
      return {
        ok: false,
        error: promo.reason ?? 'This promo code does not cover the selected plan.',
        code: 'PROMO_INVALID',
      };
    }

    try {
      await promoRedeemer(promo.codeId, input.userId, input.reportId);
    } catch (err) {
      console.error('[reports/start] promo redemption failed:', err);
      return {
        ok: false,
        error: 'Could not redeem promo code. Please try again.',
        code: 'PROMO_REDEEM_FAILED',
      };
    }
    return { ok: true, status: 'promo' };
  }

  return {
    ok: false,
    error: 'Payment is required before starting this report plan.',
    code: 'PAYMENT_REQUIRED',
  };
}
