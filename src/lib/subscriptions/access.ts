import type { SupabaseClient } from '@supabase/supabase-js';
import { ENTITLED_PAYMENT_STATUSES } from '@/lib/reports/entitlement';
import { isActive, type SubscriptionPlan } from './period';

/** Birth fields the dashboard and renew quiz copy onto the next entitled forecast. */
export const ENTITLED_NATAL_COLUMNS =
  'native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, personal_context' as const;

export interface EntitledNatal {
  native_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  personal_context: string | null;
}

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

/**
 * When the subscriber's most recent paid 30-day forecast started, or null if none has.
 *
 * Uses the later of created_at and generation_started_at. A report row can be created long
 * before it is generated (every checkout makes a draft), so keying the cooldown on created_at
 * alone let drafts made on day 0 all start, one after another, on day 25. Throws when the
 * lookup fails, so "could not check" is never read as "no recent forecast".
 */
export async function latestForecastStartedAt(
  db: SupabaseClient,
  userId: string,
  excludeReportId?: string,
): Promise<string | null> {
  let query = db
    .from('reports')
    .select('created_at, generation_started_at')
    .eq('user_id', userId)
    .in('payment_status', ['paid', 'promo'])
    .in('plan_type', ['monthly', 'annual']);
  if (excludeReportId) query = query.neq('id', excludeReportId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(`Forecast lookup failed: ${error.message}`);

  let latestMs = -Infinity;
  for (const row of (data ?? []) as { created_at?: string | null; generation_started_at?: string | null }[]) {
    for (const ts of [row.created_at, row.generation_started_at]) {
      const ms = ts ? new Date(ts).getTime() : NaN;
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
  }
  return Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null;
}

/**
 * Natal copied onto "start my next forecast" and `/start?renew=1`.
 *
 * Must ignore unpaid checkout drafts. Every Subscribe tap writes a `payment_status=unpaid`
 * row with whatever is in the quiz — including a family member's chart the buyer then
 * abandoned. The dashboard hides those drafts, but the status API used to return the newest
 * `birth_lat` row with no entitlement filter, so the next paid generation used the draft.
 * Throws when the lookup fails so a database error is never read as "no natal on file".
 */
export async function latestEntitledNatal(
  db: SupabaseClient,
  userId: string,
): Promise<EntitledNatal | null> {
  const { data, error } = await db
    .from('reports')
    .select(ENTITLED_NATAL_COLUMNS)
    .eq('user_id', userId)
    .in('payment_status', [...ENTITLED_PAYMENT_STATUSES])
    .not('birth_lat', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Natal lookup failed: ${error.message}`);
  return (data as EntitledNatal | null) ?? null;
}

/** When the next forecast unlocks, given the most recent one's creation time. */
export function nextForecastUnlock(lastForecastCreatedAt: string | Date | null | undefined): Date | null {
  if (!lastForecastCreatedAt) return null;
  const t = new Date(lastForecastCreatedAt).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + FORECAST_COOLDOWN_DAYS * 86_400_000);
}
