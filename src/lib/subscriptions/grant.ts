import type { SupabaseClient } from '@supabase/supabase-js';
import { isActive, nextPeriod, planFromPlanType } from './period';

export type SubscriptionGrantResult =
  | { ok: true; periodEnd: string; granted: boolean }
  | { ok: false; error: string };

interface PeriodRow {
  period_start: string;
  period_end: string;
}

interface SubscriptionRow {
  current_period_start: string;
  current_period_end: string;
}

/**
 * Extend a customer's subscription for one completed Ziina payment.
 *
 * Once per payment, whoever calls: the Ziina webhook, the verify redirect and the
 * reconcile cron can all finalize the same payment. The subscription_periods row is
 * keyed by the payment intent, so the first caller records the period and every later
 * caller re-applies exactly that period instead of adding another. That also heals a
 * finalize that recorded the period but lost the subscriptions write.
 *
 * Never shortens access: the stored end only ever moves later.
 */
export async function grantSubscriptionPeriod(
  db: SupabaseClient,
  args: {
    intentId: string;
    userId: string;
    planType: string;
    amount: number | null | undefined;
    currency: string | null | undefined;
    now?: Date;
  },
): Promise<SubscriptionGrantResult> {
  const plan = planFromPlanType(args.planType);
  if (!plan) return { ok: false, error: `Not a subscription plan: ${args.planType}` };
  const now = args.now ?? new Date();

  const recorded = await db
    .from('subscription_periods')
    .select('period_start, period_end')
    .eq('payment_intent_id', args.intentId)
    .maybeSingle();
  if (recorded.error) return { ok: false, error: recorded.error.message };

  let period = recorded.data as PeriodRow | null;
  let granted = false;

  if (!period) {
    const current = await db
      .from('subscriptions')
      .select('current_period_start, current_period_end')
      .eq('user_id', args.userId)
      .maybeSingle();
    if (current.error) return { ok: false, error: current.error.message };

    const next = nextPeriod((current.data as SubscriptionRow | null)?.current_period_end ?? null, plan, now);
    const candidate: PeriodRow = { period_start: next.start.toISOString(), period_end: next.end.toISOString() };

    const inserted = await db.from('subscription_periods').insert({
      payment_intent_id: args.intentId,
      user_id: args.userId,
      plan,
      period_start: candidate.period_start,
      period_end: candidate.period_end,
      amount: Math.max(0, Math.round(args.amount ?? 0)),
      currency: args.currency ?? 'USD',
    });

    if (!inserted.error) {
      period = candidate;
      granted = true;
    } else if (inserted.error.code === '23505') {
      // A concurrent finalizer recorded this payment first — use its period, not ours.
      const raced = await db
        .from('subscription_periods')
        .select('period_start, period_end')
        .eq('payment_intent_id', args.intentId)
        .maybeSingle();
      if (raced.error || !raced.data) {
        return { ok: false, error: raced.error?.message ?? 'Subscription period missing after a conflict' };
      }
      period = raced.data as PeriodRow;
    } else {
      return { ok: false, error: inserted.error.message };
    }
  }

  const stored = await db
    .from('subscriptions')
    .select('current_period_start, current_period_end')
    .eq('user_id', args.userId)
    .maybeSingle();
  if (stored.error) return { ok: false, error: stored.error.message };
  const existing = stored.data as SubscriptionRow | null;

  const keepEnd =
    existing !== null && new Date(existing.current_period_end).getTime() >= new Date(period.period_end).getTime();
  const periodEnd = keepEnd ? existing!.current_period_end : period.period_end;
  // A stacked renewal keeps the start of the unbroken run the customer is already in.
  const periodStart = existing && isActive(existing, now) ? existing.current_period_start : period.period_start;

  const upserted = await db.from('subscriptions').upsert(
    {
      user_id: args.userId,
      plan,
      provider: 'ziina',
      current_period_start: periodStart,
      current_period_end: periodEnd,
      canceled_at: null,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upserted.error) return { ok: false, error: upserted.error.message };

  return { ok: true, periodEnd, granted };
}
