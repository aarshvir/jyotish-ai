/**
 * Canonical report / pipeline plan types (what generation and UI understand).
 * Ziina also uses payment-only SKUs such as `monthly_upgrade` that must never
 * be written onto `reports.plan_type` or used as `PipelineInput.type`.
 */

const FORECAST_PLANS = new Set(['7day', 'monthly', 'annual']);

/**
 * Map a Ziina (or client) plan label onto the report generation plan.
 * - `monthly_upgrade` is a payment SKU for the Monthly delta; generation is Monthly.
 * - `free` is stored/shown as `preview`.
 */
export function toReportPlanType(planType: string | null | undefined): string {
  const raw = (planType ?? '').trim();
  const p = raw.toLowerCase();
  if (p === 'monthly_upgrade') return 'monthly';
  if (p === 'free') return 'preview';
  return raw || '7day';
}

/** Day-grid length for a generation plan (after {@link toReportPlanType}). */
export function forecastDayCount(planType: string | null | undefined, isPreview: boolean): number {
  const p = toReportPlanType(planType).toLowerCase();
  if (p === 'monthly' || p === 'annual') return 30;
  if (isPreview) return 1;
  return 7;
}

export function isForecastPlanType(planType: string | null | undefined): boolean {
  return FORECAST_PLANS.has(toReportPlanType(planType).toLowerCase());
}
