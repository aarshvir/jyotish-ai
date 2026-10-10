import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZiinaPaymentIntent } from '@/lib/ziina/server';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';
import { isSubscriptionPlanType } from '@/lib/subscriptions/period';

/** How far back a returning visitor's own payments are re-checked. */
export const USER_RECONCILE_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Bounds the Ziina calls one page load can make for pending and completed rows. */
export const USER_RECONCILE_MAX_ROWS = 3;
/**
 * Superseded intents, separate from the pending/completed cap. create-intent marks an
 * older checkout `cancelled` when the buyer starts another, but that Ziina tab can still
 * be paid. Those rows must not compete with a still-pending payment for the 3-row cap.
 */
export const USER_RECONCILE_CANCELLED_MAX = 5;

type PaymentRow = {
  ziina_intent_id: string;
  report_id: string | null;
  plan_type: string | null;
  status: string;
};

export type UserReconcileResult = {
  checked: number;
  /** Payments that now grant access: finalized just now, or healed after a failed grant. */
  granted: { intentId: string; reportId: string | null; planType: string | null }[];
};

type Finalize = typeof finalizeCompletedZiinaIntent;

/**
 * Re-checks the signed-in visitor's own recent payments whenever they come back (the quiz
 * and dashboard call /api/subscription/status), and grants whatever they paid for.
 *
 * Ziina's Individual plan sends no webhooks, and the daily reconcile cron has shown no sign
 * of running in production, so without this a buyer who closed the tab before Ziina
 * redirected — or whose payment confirmed a minute late — could be charged and never get
 * access. Three cases:
 *  - pending here, completed at Ziina → finalize (claims, grants, dispatches generation);
 *  - completed here but the grant never landed (no subscription period / report not paid)
 *    → finalize again, which takes its idempotent heal path;
 *  - cancelled here because a later checkout superseded it, but Ziina still completed
 *    that older tab → finalize. The buyer often closes that tab before the success
 *    redirect, and nothing else re-checks a cancelled row (the cron only scans pending,
 *    and this plan has no webhooks).
 * Finalize is idempotent per intent, so a race with verify or the cron is harmless.
 */
export async function reconcileUserPayments(
  db: SupabaseClient,
  userId: string,
  opts: {
    dispatchOrigin: string;
    getPaymentIntent: (intentId: string) => Promise<ZiinaPaymentIntent>;
    nowMs?: number;
    finalize?: Finalize;
  },
): Promise<UserReconcileResult> {
  const finalize = opts.finalize ?? finalizeCompletedZiinaIntent;
  const since = new Date((opts.nowMs ?? Date.now()) - USER_RECONCILE_WINDOW_MS).toISOString();
  const result: UserReconcileResult = { checked: 0, granted: [] };

  const { data, error } = await db
    .from('ziina_payments')
    .select('ziina_intent_id, report_id, plan_type, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'completed'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(USER_RECONCILE_MAX_ROWS);
  if (error) throw new Error(`Payment lookup failed: ${error.message}`);

  // Own query so a stack of abandoned cancellations cannot push a still-pending
  // payment out of the 3-row cap above.
  const { data: cancelled, error: cancelledErr } = await db
    .from('ziina_payments')
    .select('ziina_intent_id, report_id, plan_type, status')
    .eq('user_id', userId)
    .eq('status', 'cancelled')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(USER_RECONCILE_CANCELLED_MAX);
  if (cancelledErr) throw new Error(`Payment lookup failed: ${cancelledErr.message}`);

  for (const row of (data ?? []) as PaymentRow[]) {
    await recoverPaymentRow(db, row, opts, finalize, result);
  }
  for (const row of (cancelled ?? []) as PaymentRow[]) {
    await recoverPaymentRow(db, row, opts, finalize, result);
  }
  return result;
}

async function recoverPaymentRow(
  db: SupabaseClient,
  row: PaymentRow,
  opts: {
    dispatchOrigin: string;
    getPaymentIntent: (intentId: string) => Promise<ZiinaPaymentIntent>;
  },
  finalize: Finalize,
  result: UserReconcileResult,
): Promise<void> {
  const grant = { intentId: row.ziina_intent_id, reportId: row.report_id, planType: row.plan_type };
  try {
    if (row.status === 'completed') {
      if (!(await grantMissing(db, row))) return;
      result.checked++;
      const healed = await finalize(db, row.ziina_intent_id, opts.dispatchOrigin);
      if (healed.ok) result.granted.push(grant);
      else console.error('[ziina/reconcileUser] heal failed:', row.ziina_intent_id, healed.error);
      return;
    }

    result.checked++;
    const intent = await opts.getPaymentIntent(row.ziina_intent_id);
    if (intent.status !== 'completed') return;
    const fin = await finalize(db, row.ziina_intent_id, opts.dispatchOrigin, { intent });
    if (fin.ok && (fin.action === 'processed' || fin.action === 'already_done')) {
      result.granted.push(grant);
    } else if (!fin.ok) {
      console.error('[ziina/reconcileUser] finalize failed:', row.ziina_intent_id, fin.error);
    }
  } catch (e) {
    console.error('[ziina/reconcileUser]', row.ziina_intent_id, e);
  }
}

/** A completed payment whose access never landed: no period recorded, or its report still unpaid. */
async function grantMissing(db: SupabaseClient, row: PaymentRow): Promise<boolean> {
  if (row.plan_type && isSubscriptionPlanType(row.plan_type)) {
    const { data, error } = await db
      .from('subscription_periods')
      .select('payment_intent_id')
      .eq('payment_intent_id', row.ziina_intent_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return true;
  }
  if (!row.report_id) return false;
  const { data: report, error } = await db
    .from('reports')
    .select('payment_status')
    .eq('id', row.report_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) return false;
  const status = (report as { payment_status?: string | null }).payment_status;
  return status !== 'paid' && status !== 'promo';
}
