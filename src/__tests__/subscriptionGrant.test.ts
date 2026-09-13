import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { grantSubscriptionPeriod } from '@/lib/subscriptions/grant';

/**
 * A minimal in-memory stand-in for the three tables grant.ts touches, supporting exactly
 * the call shapes it uses: select().eq().maybeSingle(), insert(), upsert(onConflict).
 * Primary keys are enforced, so the "one period per payment" rule is tested for real.
 */
type Row = Record<string, unknown>;
function fakeDb(opts: { failUpsert?: boolean } = {}) {
  const tables: Record<string, Row[]> = { subscriptions: [], subscription_periods: [] };
  const keyOf: Record<string, string> = { subscriptions: 'user_id', subscription_periods: 'payment_intent_id' };

  const db = {
    from(table: string) {
      const rows = tables[table];
      const key = keyOf[table];
      return {
        select() {
          const filters: [string, unknown][] = [];
          const q = {
            eq(col: string, val: unknown) {
              filters.push([col, val]);
              return q;
            },
            async maybeSingle() {
              const hit = rows.find((r) => filters.every(([c, v]) => r[c] === v));
              return { data: hit ? { ...hit } : null, error: null };
            },
          };
          return q;
        },
        async insert(row: Row) {
          if (rows.some((r) => r[key] === row[key])) {
            return { error: { code: '23505', message: 'duplicate key' } };
          }
          rows.push({ ...row });
          return { error: null };
        },
        async upsert(row: Row) {
          if (opts.failUpsert) return { error: { code: 'XX000', message: 'write failed' } };
          const i = rows.findIndex((r) => r[key] === row[key]);
          if (i >= 0) rows[i] = { ...rows[i], ...row };
          else rows.push({ ...row });
          return { error: null };
        },
      };
    },
  };
  return { db: db as unknown as SupabaseClient, tables };
}

const NOW = new Date('2026-09-13T12:00:00Z');
const DAY = 86_400_000;
const USER = '11111111-2222-4333-8444-555555555555';

describe('grantSubscriptionPeriod', () => {
  it('starts a first monthly subscription now, for 30 days', async () => {
    const { db, tables } = fakeDb();
    const r = await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 399900, currency: 'INR', now: NOW });
    expect(r).toEqual({ ok: true, granted: true, periodEnd: new Date(NOW.getTime() + 30 * DAY).toISOString() });
    expect(tables.subscriptions[0]).toMatchObject({ user_id: USER, plan: 'monthly', provider: 'ziina' });
    expect(tables.subscription_periods).toHaveLength(1);
  });

  it('extends access exactly once when the same payment is finalized again', async () => {
    const { db, tables } = fakeDb();
    const args = { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 399900, currency: 'INR', now: NOW };
    const first = await grantSubscriptionPeriod(db, args);
    // Webhook, verify redirect and reconcile cron can all land on the same payment, later.
    const again = await grantSubscriptionPeriod(db, { ...args, now: new Date(NOW.getTime() + 2 * DAY) });
    expect(again).toMatchObject({ ok: true, granted: false });
    expect(again.ok && again.periodEnd).toBe(first.ok && first.periodEnd);
    expect(tables.subscription_periods).toHaveLength(1);
  });

  it('stacks an early renewal on top of the days still owed', async () => {
    const { db } = fakeDb();
    await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 399900, currency: 'INR', now: NOW });
    const renew = await grantSubscriptionPeriod(db, {
      intentId: 'pi_2', userId: USER, planType: 'sub_monthly', amount: 399900, currency: 'INR',
      now: new Date(NOW.getTime() + 27 * DAY),
    });
    expect(renew.ok && renew.periodEnd).toBe(new Date(NOW.getTime() + 60 * DAY).toISOString());
  });

  it('keeps the start of the unbroken run on a stacked renewal', async () => {
    const { db, tables } = fakeDb();
    await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    await grantSubscriptionPeriod(db, { intentId: 'pi_2', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: new Date(NOW.getTime() + 10 * DAY) });
    expect(tables.subscriptions[0].current_period_start).toBe(NOW.toISOString());
  });

  it('starts fresh after a lapse, so nobody pays for days without access', async () => {
    const { db } = fakeDb();
    await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    const later = new Date(NOW.getTime() + 45 * DAY);
    const back = await grantSubscriptionPeriod(db, { intentId: 'pi_2', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: later });
    expect(back.ok && back.periodEnd).toBe(new Date(later.getTime() + 30 * DAY).toISOString());
  });

  it('never shortens access when a monthly payment lands after an annual one', async () => {
    const { db } = fakeDb();
    const annual = await grantSubscriptionPeriod(db, { intentId: 'pi_a', userId: USER, planType: 'sub_annual', amount: 1, currency: 'INR', now: NOW });
    // Re-finalizing the older annual payment after a monthly renewal must not rewind the end.
    await grantSubscriptionPeriod(db, { intentId: 'pi_m', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    const reapplied = await grantSubscriptionPeriod(db, { intentId: 'pi_a', userId: USER, planType: 'sub_annual', amount: 1, currency: 'INR', now: NOW });
    expect(reapplied.ok && new Date(reapplied.periodEnd).getTime()).toBeGreaterThan(annual.ok ? new Date(annual.periodEnd).getTime() : 0);
  });

  it('refuses a plan that is not a subscription', async () => {
    const { db, tables } = fakeDb();
    const r = await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'monthly', amount: 1, currency: 'INR', now: NOW });
    expect(r.ok).toBe(false);
    expect(tables.subscription_periods).toHaveLength(0);
  });

  it('surfaces a failed subscriptions write instead of reporting success', async () => {
    const { db } = fakeDb({ failUpsert: true });
    const r = await grantSubscriptionPeriod(db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    expect(r).toEqual({ ok: false, error: 'write failed' });
  });

  it('heals a lost subscriptions write on the next finalize', async () => {
    const failing = fakeDb({ failUpsert: true });
    await grantSubscriptionPeriod(failing.db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    expect(failing.tables.subscription_periods).toHaveLength(1);
    expect(failing.tables.subscriptions).toHaveLength(0);

    // Same data, working writes: the retry re-applies the recorded period.
    const healed = fakeDb();
    healed.tables.subscription_periods.push(...failing.tables.subscription_periods);
    const r = await grantSubscriptionPeriod(healed.db, { intentId: 'pi_1', userId: USER, planType: 'sub_monthly', amount: 1, currency: 'INR', now: NOW });
    expect(r).toMatchObject({ ok: true, granted: false });
    expect(healed.tables.subscriptions).toHaveLength(1);
  });
});
