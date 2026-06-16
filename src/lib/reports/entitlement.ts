export type ReportPaymentStatus = string | null | undefined;
export type ReportPlanType = string | null | undefined;

export function normalizeReportPlanType(planType: ReportPlanType): string {
  return String(planType ?? '').trim().toLowerCase();
}

export function normalizeReportPaymentStatus(paymentStatus: ReportPaymentStatus): string {
  return String(paymentStatus ?? '').trim().toLowerCase();
}

export function isFreeReportPlan(planType: ReportPlanType): boolean {
  const normalized = normalizeReportPlanType(planType);
  return normalized === 'free' || normalized === 'preview';
}

export function hasPaidReportAccess(paymentStatus: ReportPaymentStatus): boolean {
  const normalized = normalizeReportPaymentStatus(paymentStatus);
  return normalized === 'paid' || normalized === 'promo';
}

export function canReadReportContent(input: {
  planType: ReportPlanType;
  paymentStatus: ReportPaymentStatus;
  isAdmin?: boolean;
}): boolean {
  return input.isAdmin === true || isFreeReportPlan(input.planType) || hasPaidReportAccess(input.paymentStatus);
}

export function canAskReportQuestion(input: {
  paymentStatus: ReportPaymentStatus;
  isAdmin?: boolean;
}): boolean {
  return input.isAdmin === true || hasPaidReportAccess(input.paymentStatus);
}
