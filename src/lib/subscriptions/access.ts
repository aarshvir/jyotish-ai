import type { SupabaseClient } from '@supabase/supabase-js';
import { isActive, type SubscriptionPlan } from './period';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  active: boolean;
}

/**
 * The customer's subscription, or null if they have never had one.
 *
 * Throws when the lookup itself fails instead of returning null. "We could not check"
 * must never be read as "not subscribed" — a transient database error would otherwise
 * send a paying customer back to the paywall.
 */
export async function getSubscription(
  db: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<SubscriptionState | null> {
  const { data, error } = await db
    .from('subscriptions')
    .select('plan, current_period_start, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Subscription lookup failed: ${error.message}`);
  if (!data) return null;
  const row = data as { plan: SubscriptionPlan; current_period_start: string; current_period_end: string };
  return {
    plan: row.plan,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    active: isActive({ current_period_end: row.current_period_end }, now),
  };
}

/**
 * True only when both tables a paid period is written to can be read. Checkout calls this
 * before creating a payment intent: if the migration has not been run (or the database is
 * unreachable) the customer must not be charged for a period that cannot be recorded.
 */
export async function subscriptionTablesReady(db: SupabaseClient): Promise<boolean> {
  try {
    const [periods, subs] = await Promise.all([
      db.from('subscription_periods').select('payment_intent_id').limit(1),
      db.from('subscriptions').select('user_id').limit(1),
    ]);
    return !periods.error && !subs.error;
  } catch {
    return false;
  }
}

/**
 * Days a subscriber waits between 30-day forecasts. Each forecast costs real model
 * spend, and the subscription price is set at 6x the cost of one a month — without a
 * cooldown one period could trigger unlimited generations.
 */
export const FORECAST_COOLDOWN_DAYS = 25;

/** When the next forecast unlocks, given the most recent one's creation time. */
export function nextForecastUnlock(lastForecastCreatedAt: string | Date | null | undefined): Date | null {
  if (!lastForecastCreatedAt) return null;
  const t = new Date(lastForecastCreatedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + FORECAST_COOLDOWN_DAYS * 86_400_000);
}
