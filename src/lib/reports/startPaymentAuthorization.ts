import type { createServiceClient } from '@/lib/supabase/admin';
import { getPromoDiscount, redeemPromoCode } from '@/lib/promo/server';

type ServiceDb = ReturnType<typeof createServiceClient>;

export interface ReportStartPaymentBody {
  plan_type?: string | null;
  payment_status?: string | null;
  promoCode?: string | null;
}

export interface ExistingReportPaymentState {
  plan_type: string | null;
  payment_status: string | null;
}

export type ReportStartPaymentAuthorization =
  | {
      ok: true;
      paymentStatus: string;
    }
  | {
      ok: false;
      status: number;
      code: 'PAYMENT_REQUIRED' | 'PROMO_INVALID';
      error: string;
    };

export function normalizedReportPlan(planType: string | null | undefined): string {
  const normalized = (planType ?? '').trim().toLowerCase();
  return normalized || '7day';
}

export function isPaidReportPlan(planType: string | null | undefined): boolean {
  const normalized = normalizedReportPlan(planType);
  return normalized !== 'free' && normalized !== 'preview';
}

function safeNonPaidPaymentStatus(
  requested: string | null | undefined,
  planType: string | null | undefined,
): string {
  if (isPaidReportPlan(planType)) return 'unpaid';
  const trimmed = requested?.trim();
  if (trimmed === 'promo' || trimmed === 'free' || trimmed === 'bypass') return trimmed;
  return 'free';
}

async function hasCompletedZiinaPayment(
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

async function hasExistingPromoRedemption(
  db: ServiceDb,
  reportId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('promo_redemptions')
    .select('id')
    .eq('order_id', reportId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[reports/start] promo redemption lookup failed:', error.message);
    return false;
  }
  return !!data;
}

export async function resolveReportStartPaymentAuthorization({
  db,
  reportId,
  userId,
  userEmail,
  body,
  existing,
  isAdmin,
}: {
  db: ServiceDb;
  reportId: string;
  userId: string;
  userEmail?: string;
  body: ReportStartPaymentBody;
  existing: ExistingReportPaymentState | null;
  isAdmin: boolean;
}): Promise<ReportStartPaymentAuthorization> {
  const effectivePlan = normalizedReportPlan(body.plan_type ?? existing?.plan_type);
  const requestedStatus =
    typeof body.payment_status === 'string' ? body.payment_status.trim() : undefined;

  if (isAdmin) {
    return {
      ok: true,
      paymentStatus: requestedStatus || existing?.payment_status || (isPaidReportPlan(effectivePlan) ? 'bypass' : 'free'),
    };
  }

  if (await hasCompletedZiinaPayment(db, reportId, userId)) {
    return { ok: true, paymentStatus: 'paid' };
  }

  if (!isPaidReportPlan(effectivePlan)) {
    return {
      ok: true,
      paymentStatus: safeNonPaidPaymentStatus(requestedStatus ?? existing?.payment_status, effectivePlan),
    };
  }

  if (existing?.payment_status === 'promo' && await hasExistingPromoRedemption(db, reportId, userId)) {
    return { ok: true, paymentStatus: 'promo' };
  }

  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
  if (promoCode) {
    const promo = await getPromoDiscount(promoCode, userEmail);
    if (!promo.valid || promo.discountPct < 100 || !promo.codeId) {
      return {
        ok: false,
        status: 402,
        code: 'PROMO_INVALID',
        error: 'A valid full-discount promo code is required to start this paid report without payment.',
      };
    }

    if (!await hasExistingPromoRedemption(db, reportId, userId)) {
      const redemption = await redeemPromoCode(promo.codeId, userId, reportId);
      if (!redemption.redeemed) {
        console.warn('[reports/start] promo redemption failed:', redemption.error);
        return {
          ok: false,
          status: 402,
          code: 'PROMO_INVALID',
          error: 'This promo code could not be redeemed. Please try another code or contact support.',
        };
      }
    }
    return { ok: true, paymentStatus: 'promo' };
  }

  return {
    ok: false,
    status: 402,
    code: 'PAYMENT_REQUIRED',
    error: 'Payment is required before starting this report.',
  };
}
