/**
 * Payment-recovery drain for `/api/cron/reconcile-payments`.
 *
 * Ziina Individual has no webhooks — completion is verify-redirect + this cron.
 * A fixed `.limit(20)` with no ordering, that skips non-completed intents without
 * mutating the row, can forever re-select the same abandoned backlog and starve a
 * real completed payment that never hit verify (buyer closed the browser).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZiinaPaymentIntent } from '@/lib/ziina/server';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';

export const RECONCILE_PAGE_SIZE = 20;
/** Leave headroom under the route's 60s maxDuration for lifecycle work + cold start. */
export const RECONCILE_TIME_BUDGET_MS = 45_000;
/** Still-payable intents older than this leave the pending set (Ziina won't complete them). */
export const RECONCILE_EXPIRE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const TERMINAL_NON_COMPLETE = new Set<ZiinaPaymentIntent['status']>(['failed', 'canceled']);

export type ReconcileRow = {
  ziina_intent_id: string;
  report_id?: string | null;
  plan_type?: string | null;
  created_at?: string | null;
};

export type ReconcileAction = { intentId: string; action: string };

export type ReconcileDrainResult = {
  reconciled: number;
  scanned: number;
  results: ReconcileAction[];
  error?: string;
};

function mapTerminalStatus(ziinaStatus: 'failed' | 'canceled'): 'failed' | 'cancelled' {
  return ziinaStatus === 'canceled' ? 'cancelled' : 'failed';
}

/**
 * Decide the local status transition for a non-completed Ziina intent.
 * - terminal (failed/canceled) → close our pending row so it leaves the scan set
 * - still payable + older than expire window → expire
 * - still payable + recent → touch (bump updated_at) so the next page can advance
 */
export function reconcileNonCompletedDecision(
  ziinaStatus: ZiinaPaymentIntent['status'],
  createdAt: string | null | undefined,
  nowMs: number = Date.now(),
): { kind: 'close'; status: 'failed' | 'cancelled' } | { kind: 'expire' } | { kind: 'touch' } | { kind: 'skip' } {
  if (TERMINAL_NON_COMPLETE.has(ziinaStatus)) {
    return { kind: 'close', status: mapTerminalStatus(ziinaStatus as 'failed' | 'canceled') };
  }
  if (
    ziinaStatus === 'pending' ||
    ziinaStatus === 'requires_payment_instrument' ||
    ziinaStatus === 'requires_user_action'
  ) {
    const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
    if (Number.isFinite(createdMs) && nowMs - createdMs > RECONCILE_EXPIRE_AFTER_MS) {
      return { kind: 'expire' };
    }
    return { kind: 'touch' };
  }
  // Unknown Ziina status — touch so we rotate past it rather than wedging the queue.
  return { kind: 'touch' };
}

type GetPaymentIntent = (intentId: string) => Promise<ZiinaPaymentIntent>;

/**
 * Drain pending (and optionally other recoverable) ziina_payments rows until the
 * time budget is exhausted. Each scanned row leaves the `< cutoff` pending set
 * via finalize, terminal close, expire, or updated_at touch — so one cron run
 * walks beyond the first page instead of re-reading the same 20 forever.
 */
export async function drainReconcilePayments(
  db: SupabaseClient,
  opts: {
    dispatchOrigin: string;
    getPaymentIntent: GetPaymentIntent;
    cutoffIso: string;
    nowMs?: number;
    timeBudgetMs?: number;
    pageSize?: number;
  },
): Promise<ReconcileDrainResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const deadline = nowMs + (opts.timeBudgetMs ?? RECONCILE_TIME_BUDGET_MS);
  const pageSize = opts.pageSize ?? RECONCILE_PAGE_SIZE;
  const results: ReconcileAction[] = [];
  let reconciled = 0;
  let scanned = 0;

  while (Date.now() < deadline) {
    const { data: batch, error } = await db
      .from('ziina_payments')
      .select('ziina_intent_id, report_id, plan_type, created_at')
      .eq('status', 'pending')
      .lt('updated_at', opts.cutoffIso)
      // Newest first: closed-browser completions are recent; drain those before old abandons.
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (error) {
      console.error('[cron/reconcile-payments] query failed:', error.message);
      return { reconciled, scanned, results, error: error.message };
    }
    if (!batch || batch.length === 0) break;

    for (const raw of batch) {
      if (Date.now() >= deadline) break;
      const row = raw as ReconcileRow;
      const intentId = row.ziina_intent_id;
      scanned++;

      try {
        const intent = await opts.getPaymentIntent(intentId);
        if (intent.status === 'completed') {
          const fin = await finalizeCompletedZiinaIntent(db, intentId, opts.dispatchOrigin, { intent });
          results.push({
            intentId,
            action: fin.ok ? fin.action : `error:${fin.error.slice(0, 80)}`,
          });
          if (fin.ok && (fin.action === 'processed' || fin.action === 'already_done')) {
            reconciled++;
          }
          continue;
        }

        const decision = reconcileNonCompletedDecision(intent.status, row.created_at, Date.now());
        if (decision.kind === 'close') {
          await db
            .from('ziina_payments')
            .update({ status: decision.status })
            .eq('ziina_intent_id', intentId)
            .eq('status', 'pending');
          results.push({ intentId, action: `closed:${intent.status}` });
        } else if (decision.kind === 'expire') {
          await db
            .from('ziina_payments')
            .update({ status: 'expired' })
            .eq('ziina_intent_id', intentId)
            .eq('status', 'pending');
          results.push({ intentId, action: 'expired' });
        } else {
          // Touch updated_at (trigger on UPDATE) so this row leaves the cutoff window
          // and the next page can advance within the same cron run.
          await db
            .from('ziina_payments')
            .update({ updated_at: new Date().toISOString() })
            .eq('ziina_intent_id', intentId)
            .eq('status', 'pending');
          results.push({ intentId, action: `skipped:${intent.status}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[cron/reconcile-payments] intent', intentId, ':', msg);
        // Touch so a persistently erroring intent cannot wedge the head of the queue.
        try {
          await db
            .from('ziina_payments')
            .update({ updated_at: new Date().toISOString() })
            .eq('ziina_intent_id', intentId)
            .eq('status', 'pending');
        } catch {
          /* best-effort rotation */
        }
        results.push({ intentId, action: `error:${msg.slice(0, 80)}` });
      }
    }

    // Full page processed (or time up). Loop fetches the next eligible page.
    if (batch.length < pageSize) break;
  }

  return { reconciled, scanned, results };
}
