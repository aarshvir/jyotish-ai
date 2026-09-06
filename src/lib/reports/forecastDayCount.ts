/**
 * Minimum persisted forecast days expected for a report plan.
 * Used to decide whether a "complete" row is durable enough to skip
 * post-payment regeneration (free/preview stores only 1 sample day).
 */
export function minForecastDaysForPlan(planType: string | null | undefined): number {
  const p = (planType ?? '').trim().toLowerCase();
  if (p === 'free' || p === 'preview') return 1;
  if (p === 'monthly' || p === 'annual' || p === 'monthly_upgrade') return 30;
  // 7day and unknown forecast SKUs
  return 7;
}
