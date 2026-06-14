const PAID_REPORT_PLANS = new Set(['7day', 'monthly', 'annual']);

export function normalizeReportPlanType(planType: string | null | undefined): string | null {
  const normalized = planType?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isFreeReportPlan(planType: string | null | undefined): boolean {
  const normalized = normalizeReportPlanType(planType);
  return normalized === 'free' || normalized === 'preview';
}

export function isPaidReportPlan(planType: string | null | undefined): boolean {
  const normalized = normalizeReportPlanType(planType);
  return normalized != null && PAID_REPORT_PLANS.has(normalized);
}

export function resolveReportPlanForStart({
  requestedPlanType,
  existingPlanType,
  completedPaymentPlanType,
  pendingPaymentPlanType,
}: {
  requestedPlanType?: string | null;
  existingPlanType?: string | null;
  completedPaymentPlanType?: string | null;
  pendingPaymentPlanType?: string | null;
}): {
  effectivePlanType: string;
  isFreePlan: boolean;
  serverBoundPaidPlanType: string | null;
} {
  const serverBoundPaidPlanType =
    (isPaidReportPlan(completedPaymentPlanType) && normalizeReportPlanType(completedPaymentPlanType)) ||
    (isPaidReportPlan(existingPlanType) && normalizeReportPlanType(existingPlanType)) ||
    (isPaidReportPlan(pendingPaymentPlanType) && normalizeReportPlanType(pendingPaymentPlanType)) ||
    null;

  const requestedOrStoredPlan =
    normalizeReportPlanType(requestedPlanType) ??
    normalizeReportPlanType(existingPlanType) ??
    '7day';
  const effectivePlanType = serverBoundPaidPlanType ?? requestedOrStoredPlan;

  return {
    effectivePlanType,
    isFreePlan: isFreeReportPlan(effectivePlanType),
    serverBoundPaidPlanType,
  };
}
