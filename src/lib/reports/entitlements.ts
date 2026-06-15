export const FULL_REPORT_PAYMENT_STATUSES = ['paid', 'promo', 'bypass'] as const;

export type FullReportPaymentStatus = (typeof FULL_REPORT_PAYMENT_STATUSES)[number];

export function isFullReportPaymentStatus(status: unknown): status is FullReportPaymentStatus {
  if (typeof status !== 'string') return false;
  return (FULL_REPORT_PAYMENT_STATUSES as readonly string[]).includes(status.trim().toLowerCase());
}

export function isFreeOrPreviewPlan(planType: unknown): boolean {
  if (typeof planType !== 'string') return false;
  const normalized = planType.trim().toLowerCase();
  return normalized === 'free' || normalized === 'preview';
}

export function canReadFullReportContent(params: {
  isAdmin: boolean;
  planType: unknown;
  paymentStatus: unknown;
}): boolean {
  return (
    params.isAdmin ||
    isFreeOrPreviewPlan(params.planType) ||
    isFullReportPaymentStatus(params.paymentStatus)
  );
}
