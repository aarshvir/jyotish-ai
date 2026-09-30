import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZiinaPaymentIntent } from '@/lib/ziina/server';
import { reconcileUserPayments } from '@/lib/ziina/reconcileUser';

/**
 * A buyer who closes the tab before Ziina redirects, or whose payment confirms late, must
 * still get access the next time they open the quiz or dashboard. Ziina's plan sends no
 * webhooks, so this per-visitor check is the dependable recovery path.
 */

type Row = Record<string, unknown>;

/** Minimal PostgREST-style fake: filters by eq/in/gte on in-memory tables. */
function fakeDb(tables: Record<string, Row[]>): SupabaseClient {
  return {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let limit = Infinity;
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), q),
        in: (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(r[col])), q),
        gte: (col: string, val: string) => (filters.push((r) => String(r[col]) >= val), q),
        order: () => q,
        limit: (n: number) => ((limit = n), q),
        rows: () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, limit),
        maybeSingle: async () => ({ data: q.rows()[0] ?? null, error: null }),
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: q.rows(), error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const NOW = Date.parse('2026-09-13T12:00:00Z');
const recent = new Date(NOW - 60 * 60 * 1000).toISOString();
const old = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString();

function intent(status: ZiinaPaymentIntent['status']): ZiinaPaymentIntent {
  return { id: 'x', status, redirect_url: '', amount: 399900, currency_code: 'INR' };
}

describe('reconcileUserPayments', () => {
  it('finalizes a pending payment that completed at Ziina and returns its report', async () => {
    const db = fakeDb({
      ziina_payments: [{ ziina_intent_id: 'pi_1', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'r1', created_at: recent }],
    });
    const finalize = vi.fn().mockResolvedValue({ ok: true, action: 'processed' });
    const out = await reconcileUserPayments(db, 'u1', {
      dispatchOrigin: 'https://example.test',
      getPaymentIntent: async () => intent('completed'),
      finalize,
      nowMs: NOW,
    });
    expect(finalize).toHaveBeenCalledWith(db, 'pi_1', 'https://example.test', { intent: expect.objectContaining({ status: 'completed' }) });
    expect(out.granted).toEqual([{ intentId: 'pi_1', reportId: 'r1', planType: 'sub_monthly' }]);
  });

  it('finalizes a superseded cancelled intent that Ziina still completed', async () => {
    // Buyer paid the first Ziina tab, then a retry marked that row cancelled and
    // they closed the laptop before the success redirect. The new pending checkout
    // was never paid. Only the cancelled row was charged.
    const db = fakeDb({
      ziina_payments: [
        { ziina_intent_id: 'pi_paid_old', user_id: 'u1', status: 'cancelled', plan_type: 'sub_monthly', report_id: 'r1', created_at: recent },
        { ziina_intent_id: 'pi_retry', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'r1', created_at: recent },
      ],
    });
    const finalize = vi.fn().mockResolvedValue({ ok: true, action: 'processed' });
    const getPaymentIntent = vi.fn(async (id: string) =>
      intent(id === 'pi_paid_old' ? 'completed' : 'pending'),
    );
    const out = await reconcileUserPayments(db, 'u1', {
      dispatchOrigin: 'https://example.test',
      getPaymentIntent,
      finalize,
      nowMs: NOW,
    });
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledWith(db, 'pi_paid_old', 'https://example.test', {
      intent: expect.objectContaining({ status: 'completed' }),
    });
    expect(out.granted).toEqual([{ intentId: 'pi_paid_old', reportId: 'r1', planType: 'sub_monthly' }]);
  });

  it('does not grant a cancelled intent Ziina never completed', async () => {
    const db = fakeDb({
      ziina_payments: [
        { ziina_intent_id: 'pi_abandoned', user_id: 'u1', status: 'cancelled', plan_type: 'sub_monthly', report_id: 'r1', created_at: recent },
      ],
    });
    const finalize = vi.fn();
    const out = await reconcileUserPayments(db, 'u1', {
      dispatchOrigin: 'https://example.test',
      getPaymentIntent: async () => intent('canceled'),
      finalize,
      nowMs: NOW,
    });
    expect(finalize).not.toHaveBeenCalled();
    expect(out.granted).toEqual([]);
    expect(out.checked).toBe(1);
  });

  it('leaves a payment that is still pending at Ziina alone', async () => {
    const db = fakeDb({
      ziina_payments: [{ ziina_intent_id: 'pi_1', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'r1', created_at: recent }],
    });
    const finalize = vi.fn();
    const out = await reconcileUserPayments(db, 'u1', {
      dispatchOrigin: 'https://example.test',
      getPaymentIntent: async () => intent('pending'),
      finalize,
      nowMs: NOW,
    });
    expect(finalize).not.toHaveBeenCalled();
    expect(out.granted).toEqual([]);
  });

  it('heals a completed subscription payment whose period was never recorded', async () => {
    const db = fakeDb({
      ziina_payments: [{ ziina_intent_id: 'pi_2', user_id: 'u1', status: 'completed', plan_type: 'sub_annual', report_id: 'r2', created_at: recent }],
      subscription_periods: [],
      reports: [{ id: 'r2', payment_status: 'unpaid' }],
    });
    const getPaymentIntent = vi.fn();
    const finalize = vi.fn().mockResolvedValue({ ok: true, action: 'already_done' });
    const out = await reconcileUserPayments(db, 'u1', { dispatchOrigin: 'https://example.test', getPaymentIntent, finalize, nowMs: NOW });
    expect(finalize).toHaveBeenCalledWith(db, 'pi_2', 'https://example.test');
    expect(out.granted.map((g) => g.reportId)).toEqual(['r2']);
  });

  it('does nothing for a completed payment whose access already landed', async () => {
    const db = fakeDb({
      ziina_payments: [{ ziina_intent_id: 'pi_3', user_id: 'u1', status: 'completed', plan_type: 'sub_monthly', report_id: 'r3', created_at: recent }],
      subscription_periods: [{ payment_intent_id: 'pi_3' }],
      reports: [{ id: 'r3', payment_status: 'paid' }],
    });
    const finalize = vi.fn();
    const getPaymentIntent = vi.fn();
    const out = await reconcileUserPayments(db, 'u1', { dispatchOrigin: 'https://example.test', getPaymentIntent, finalize, nowMs: NOW });
    expect(finalize).not.toHaveBeenCalled();
    expect(getPaymentIntent).not.toHaveBeenCalled();
    expect(out.checked).toBe(0);
  });

  it("never touches another visitor's payments or ones older than the window", async () => {
    const db = fakeDb({
      ziina_payments: [
        { ziina_intent_id: 'pi_other', user_id: 'u2', status: 'pending', plan_type: 'sub_monthly', report_id: 'r9', created_at: recent },
        { ziina_intent_id: 'pi_old', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'r8', created_at: old },
      ],
    });
    const getPaymentIntent = vi.fn();
    const out = await reconcileUserPayments(db, 'u1', { dispatchOrigin: 'https://example.test', getPaymentIntent, finalize: vi.fn(), nowMs: NOW });
    expect(getPaymentIntent).not.toHaveBeenCalled();
    expect(out.checked).toBe(0);
  });

  it('keeps going when Ziina errors for one payment', async () => {
    const db = fakeDb({
      ziina_payments: [
        { ziina_intent_id: 'pi_a', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'ra', created_at: recent },
        { ziina_intent_id: 'pi_b', user_id: 'u1', status: 'pending', plan_type: 'sub_monthly', report_id: 'rb', created_at: recent },
      ],
    });
    const getPaymentIntent = vi.fn().mockRejectedValueOnce(new Error('Ziina 502')).mockResolvedValueOnce(intent('completed'));
    const finalize = vi.fn().mockResolvedValue({ ok: true, action: 'processed' });
    const out = await reconcileUserPayments(db, 'u1', { dispatchOrigin: 'https://example.test', getPaymentIntent, finalize, nowMs: NOW });
    expect(out.granted.map((g) => g.intentId)).toEqual(['pi_b']);
  });
});
