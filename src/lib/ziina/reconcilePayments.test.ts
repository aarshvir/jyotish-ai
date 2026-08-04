import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RECONCILE_EXPIRE_AFTER_MS,
  drainReconcilePayments,
  reconcileNonCompletedDecision,
} from '@/lib/ziina/reconcilePayments';
import type { ZiinaPaymentIntent } from '@/lib/ziina/server';

const finalizeMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ziina/finalizeIntent', () => ({
  finalizeCompletedZiinaIntent: finalizeMock,
}));

function intent(
  over: Partial<ZiinaPaymentIntent> & Pick<ZiinaPaymentIntent, 'status'>,
): ZiinaPaymentIntent {
  return {
    id: 'intent-1',
    redirect_url: 'https://pay.example',
    amount: 1000,
    currency_code: 'USD',
    ...over,
  };
}

type PayRow = {
  ziina_intent_id: string;
  report_id: string | null;
  plan_type: string | null;
  created_at: string;
  status: string;
  updated_at: string;
};

function makeDb(rows: PayRow[]) {
  const updates: Array<{ intentId: string; patch: Record<string, unknown> }> = [];

  const db = {
    updates,
    from(table: string) {
      expect(table).toBe('ziina_payments');
      const state: {
        op: 'select' | 'update';
        patch: Record<string, unknown>;
        filters: Record<string, unknown>;
        orderAsc?: boolean;
        limitN?: number;
      } = { op: 'select', patch: {}, filters: {} };

      const builder = {
        select() {
          state.op = 'select';
          return builder;
        },
        update(patch: Record<string, unknown>) {
          state.op = 'update';
          state.patch = patch;
          return builder;
        },
        eq(col: string, val: unknown) {
          state.filters[col] = val;
          return builder;
        },
        lt(col: string, val: unknown) {
          state.filters[`lt:${col}`] = val;
          return builder;
        },
        order(col: string, opts: { ascending: boolean }) {
          expect(col).toBe('created_at');
          state.orderAsc = opts.ascending;
          return builder;
        },
        limit(n: number) {
          state.limitN = n;
          return builder;
        },
        then(
          onfulfilled?: (value: { data: unknown; error: null }) => unknown,
          onrejected?: (reason: unknown) => unknown,
        ) {
          if (state.op === 'update') {
            const intentId = state.filters.ziina_intent_id as string;
            const statusEq = state.filters.status as string | undefined;
            const row = rows.find((r) => r.ziina_intent_id === intentId);
            if (row && (!statusEq || row.status === statusEq)) {
              Object.assign(row, state.patch);
              if (typeof state.patch.updated_at === 'string') {
                row.updated_at = state.patch.updated_at;
              } else if (state.patch.status) {
                row.updated_at = new Date().toISOString();
              }
              updates.push({ intentId, patch: { ...state.patch } });
            }
            return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
          }

          const cutoff = state.filters['lt:updated_at'] as string;
          const status = state.filters.status as string;
          let matched = rows.filter((r) => r.status === status && r.updated_at < cutoff);
          matched = matched.sort((a, b) => {
            const cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
            return state.orderAsc ? cmp : -cmp;
          });
          if (state.limitN != null) matched = matched.slice(0, state.limitN);
          return Promise.resolve({ data: matched.map((r) => ({ ...r })), error: null }).then(
            onfulfilled,
            onrejected,
          );
        },
      };
      return builder;
    },
  };

  return db;
}

describe('reconcileNonCompletedDecision', () => {
  const now = Date.parse('2026-08-04T20:00:00.000Z');

  it('closes failed/canceled Ziina intents so they leave the pending set', () => {
    expect(reconcileNonCompletedDecision('failed', '2026-08-01T00:00:00.000Z', now)).toEqual({
      kind: 'close',
      status: 'failed',
    });
    expect(reconcileNonCompletedDecision('canceled', '2026-08-01T00:00:00.000Z', now)).toEqual({
      kind: 'close',
      status: 'cancelled',
    });
  });

  it('expires still-payable intents older than the abandon window', () => {
    const old = new Date(now - RECONCILE_EXPIRE_AFTER_MS - 1000).toISOString();
    expect(reconcileNonCompletedDecision('pending', old, now)).toEqual({ kind: 'expire' });
    expect(reconcileNonCompletedDecision('requires_user_action', old, now)).toEqual({
      kind: 'expire',
    });
  });

  it('touches recent still-payable intents so the drain can advance pages', () => {
    const recent = new Date(now - 60 * 60 * 1000).toISOString();
    expect(reconcileNonCompletedDecision('pending', recent, now)).toEqual({ kind: 'touch' });
  });
});

describe('drainReconcilePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finalizes a recent completed payment even when older abandoned pendings exist', async () => {
    const cutoff = '2026-08-04T19:55:00.000Z';
    const rows: PayRow[] = [
      // 25 older abandoned checkouts would previously fill a fixed limit(20) forever.
      ...Array.from({ length: 25 }, (_, i) => ({
        ziina_intent_id: `old-${i}`,
        report_id: `r-old-${i}`,
        plan_type: '7day',
        created_at: `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
        status: 'pending',
        updated_at: '2026-07-20T10:00:00.000Z',
      })),
      {
        ziina_intent_id: 'paid-closed-browser',
        report_id: 'r-paid',
        plan_type: '7day',
        created_at: '2026-08-04T12:00:00.000Z',
        status: 'pending',
        updated_at: '2026-08-04T12:00:00.000Z',
      },
    ];
    const db = makeDb(rows);
    // Mirror production finalize: claim the row out of pending.
    finalizeMock.mockImplementation(async (_db, intentId: string) => {
      const row = rows.find((r) => r.ziina_intent_id === intentId);
      if (row) {
        row.status = 'completed';
        row.updated_at = new Date().toISOString();
      }
      return { ok: true, action: 'processed' as const };
    });
    const getPaymentIntent = vi.fn(async (id: string) => {
      if (id === 'paid-closed-browser') return intent({ id, status: 'completed' });
      return intent({ id, status: 'pending' });
    });

    const result = await drainReconcilePayments(db as never, {
      dispatchOrigin: 'https://www.vedichour.com',
      getPaymentIntent,
      cutoffIso: cutoff,
      nowMs: Date.parse('2026-08-04T20:00:00.000Z'),
      timeBudgetMs: 30_000,
      pageSize: 20,
    });

    expect(finalizeMock).toHaveBeenCalledWith(
      db,
      'paid-closed-browser',
      'https://www.vedichour.com',
      expect.objectContaining({ intent: expect.objectContaining({ status: 'completed' }) }),
    );
    expect(result.reconciled).toBeGreaterThanOrEqual(1);
    expect(result.results.some((r) => r.intentId === 'paid-closed-browser')).toBe(true);
    // Drain walked past the first page (touched/expired older rows), not stuck on 20.
    expect(result.scanned).toBeGreaterThan(20);
  });

  it('closes terminal Ziina statuses so they stop clogging the pending scan', async () => {
    const cutoff = '2026-08-04T19:55:00.000Z';
    const rows: PayRow[] = [
      {
        ziina_intent_id: 'dead-failed',
        report_id: 'r1',
        plan_type: '7day',
        created_at: '2026-08-03T10:00:00.000Z',
        status: 'pending',
        updated_at: '2026-08-03T10:00:00.000Z',
      },
      {
        ziina_intent_id: 'dead-canceled',
        report_id: 'r2',
        plan_type: '7day',
        created_at: '2026-08-03T11:00:00.000Z',
        status: 'pending',
        updated_at: '2026-08-03T11:00:00.000Z',
      },
    ];
    const db = makeDb(rows);
    finalizeMock.mockResolvedValue({ ok: true, action: 'processed' });
    const getPaymentIntent = vi.fn(async (id: string) =>
      intent({ id, status: id === 'dead-failed' ? 'failed' : 'canceled' }),
    );

    const result = await drainReconcilePayments(db as never, {
      dispatchOrigin: 'https://www.vedichour.com',
      getPaymentIntent,
      cutoffIso: cutoff,
      nowMs: Date.parse('2026-08-04T20:00:00.000Z'),
      timeBudgetMs: 10_000,
    });

    expect(result.results).toEqual(
      expect.arrayContaining([
        { intentId: 'dead-failed', action: 'closed:failed' },
        { intentId: 'dead-canceled', action: 'closed:canceled' },
      ]),
    );
    expect(rows.find((r) => r.ziina_intent_id === 'dead-failed')?.status).toBe('failed');
    expect(rows.find((r) => r.ziina_intent_id === 'dead-canceled')?.status).toBe('cancelled');
  });
});
