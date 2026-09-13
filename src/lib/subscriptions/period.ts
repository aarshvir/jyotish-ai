/**
 * Subscription periods — pure, so the rules that decide who has access are tested,
 * not assumed.
 *
 * Ziina cannot charge a card twice on its own (no saved cards, no mandates), so a
 * subscription is a run of paid periods. Every completed payment for a subscription
 * plan extends access by one period. Nothing here knows how the payment was taken,
 * so automatic renewal can replace one-tap renewal later without touching these rules.
 */

export type SubscriptionPlan = 'monthly' | 'annual';

/** Checkout plan ids. Kept distinct from the report plans 'monthly' / 'annual', which predate subscriptions. */
export type SubscriptionPlanType = 'sub_monthly' | 'sub_annual';

export const PLAN_DAYS: Record<SubscriptionPlan, number> = {
  monthly: 30,
  annual: 365,
};

const DAY_MS = 86_400_000;

export function isSubscriptionPlanType(planType: string | null | undefined): planType is SubscriptionPlanType {
  return planType === 'sub_monthly' || planType === 'sub_annual';
}

export function planFromPlanType(planType: string | null | undefined): SubscriptionPlan | null {
  if (planType === 'sub_monthly') return 'monthly';
  if (planType === 'sub_annual') return 'annual';
  return null;
}

/**
 * The period a new payment buys.
 *
 * Paid before the current period ends → it stacks on the time already owed, so
 * renewing early never costs the customer days. Paid after it lapsed → it starts now,
 * so nobody pays for days they spent without access.
 */
export function nextPeriod(
  currentPeriodEnd: string | Date | null | undefined,
  plan: SubscriptionPlan,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const endMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : NaN;
  const startMs = Number.isFinite(endMs) && endMs > now.getTime() ? endMs : now.getTime();
  return { start: new Date(startMs), end: new Date(startMs + PLAN_DAYS[plan] * DAY_MS) };
}

/**
 * Access is derived from the period end, never stored as a flag, so a lapsed
 * subscription cannot stay "active" because a cron did not run.
 */
export function isActive(
  sub: { current_period_end: string | Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub) return false;
  const end = new Date(sub.current_period_end).getTime();
  return Number.isFinite(end) && end > now.getTime();
}

/** Whole days of access left, rounded up; 0 when lapsed. */
export function daysLeft(
  sub: { current_period_end: string | Date } | null | undefined,
  now: Date = new Date(),
): number {
  if (!isActive(sub, now)) return 0;
  return Math.ceil((new Date(sub!.current_period_end).getTime() - now.getTime()) / DAY_MS);
}

/** When to send the one renewal reminder before a period ends. */
export const RENEW_REMINDER_DAYS: Record<SubscriptionPlan, number> = {
  monthly: 3,
  annual: 14,
};

export function isDueForRenewalReminder(
  sub: { plan: SubscriptionPlan; current_period_end: string | Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub || !isActive(sub, now)) return false;
  return daysLeft(sub, now) <= RENEW_REMINDER_DAYS[sub.plan];
}
