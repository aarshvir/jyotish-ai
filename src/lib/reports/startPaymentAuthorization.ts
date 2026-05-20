export interface PromoValidationResult {
  valid: boolean;
  discountPct: number;
  codeId?: string;
}

export type ReportStartPaymentResolution =
  | {
      ok: true;
      planType: string;
      paymentStatus: string;
    }
  | {
      ok: false;
      status: number;
      code: 'PAYMENT_REQUIRED' | 'PAYMENT_LOOKUP_FAILED' | 'PROMO_REDEMPTION_FAILED';
      error: string;
    };

interface ResolveReportStartPaymentStatusOptions {
  reportId: string;
  userId: string;
  userEmail?: string;
  requestedPlanType?: string | null;
  existingPlanType?: string | null;
  requestedPaymentStatus?: string | null;
  isAdmin: boolean;
  promoCode?: string | null;
  hasCompletedPayment: (reportId: string, userId: string) => Promise<boolean>;
  hasRedeemedFullPromo: (reportId: string, userId: string) => Promise<boolean>;
  validatePromoCode: (code: string, email?: string) => Promise<PromoValidationResult>;
  redeemPromoCode: (codeId: string, userId: string, reportId: string) => Promise<void>;
}

export function normalizeReportStartPlanType(planType: string | null | undefined): string {
  const normalized = (planType ?? '').trim();
  return normalized || '7day';
}

export function reportStartPlanRequiresPayment(planType: string | null | undefined): boolean {
  const normalized = normalizeReportStartPlanType(planType);
  return normalized !== 'free' && normalized !== 'preview';
}

export async function resolveReportStartPaymentStatus({
  reportId,
  userId,
  userEmail,
  requestedPlanType,
  existingPlanType,
  requestedPaymentStatus,
  isAdmin,
  promoCode,
  hasCompletedPayment,
  hasRedeemedFullPromo,
  validatePromoCode,
  redeemPromoCode,
}: ResolveReportStartPaymentStatusOptions): Promise<ReportStartPaymentResolution> {
  const requestedPlan = (requestedPlanType ?? '').trim();
  const planType = normalizeReportStartPlanType(requestedPlan || existingPlanType);
  const requestedStatus = (requestedPaymentStatus ?? '').trim();

  if (isAdmin && requestedStatus) {
    return { ok: true, planType, paymentStatus: requestedStatus };
  }

  let hasPaid = false;
  try {
    hasPaid = await hasCompletedPayment(reportId, userId);
  } catch (error) {
    console.warn(
      '[reports/start] completed payment lookup failed:',
      error instanceof Error ? error.message : error,
    );
    return {
      ok: false,
      status: 500,
      code: 'PAYMENT_LOOKUP_FAILED',
      error: 'Could not verify payment status. Please retry in a minute.',
    };
  }

  if (hasPaid) {
    return { ok: true, planType, paymentStatus: 'paid' };
  }

  if (!reportStartPlanRequiresPayment(planType)) {
    return { ok: true, planType, paymentStatus: 'free' };
  }

  if (await hasRedeemedFullPromo(reportId, userId)) {
    return { ok: true, planType, paymentStatus: 'promo' };
  }

  const code = (promoCode ?? '').trim();
  if (code) {
    const promo = await validatePromoCode(code, userEmail);
    if (promo.valid && promo.discountPct >= 100 && promo.codeId) {
      try {
        await redeemPromoCode(promo.codeId, userId, reportId);
      } catch (error) {
        console.warn(
          '[reports/start] promo redemption failed:',
          error instanceof Error ? error.message : error,
        );
        return {
          ok: false,
          status: 500,
          code: 'PROMO_REDEMPTION_FAILED',
          error: 'Could not redeem promo code. Please retry in a minute.',
        };
      }
      return { ok: true, planType, paymentStatus: 'promo' };
    }
  }

  return {
    ok: false,
    status: 402,
    code: 'PAYMENT_REQUIRED',
    error: 'Payment is required before starting this report.',
  };
}
