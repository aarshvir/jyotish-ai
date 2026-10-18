import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { manualIntentId, recordManualPayment, validateManualPayment } from '@/lib/subscriptions/manualPayment';

type Row = Record<string, unknown>;

/** In-memory auth users plus the two subscription tables grant.ts writes. */
function fakeDb(users: { id: string; email: string }[]) {
  const tables: Record<string, Row[]> = { subscriptions: [], subscription_periods: [] };
  const keyOf: Record<string, string> = { subscriptions: 'user_id', subscription_periods: 'payment_intent_id' };
  const db = {
    auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } },
    from(table: string) {
      const rows = tables[table];
      const key = keyOf[table];
      return {
        select() {
          const filters: [string, unknown][] = [];
          const q = {
            eq(c: string, v: unknown) {
              filters.push([c, v]);
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
          if (rows.some((r) => r[key] === row[key])) return { error: { code: '23505', message: 'dup' } };
          rows.push({ ...row });
          return { error: null };
        },
        async upsert(row: Row) {
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

const NOW = new Date('2026-10-18T12:00:00Z');
const USER = { id: '11111111-2222-4333-8444-555555555555', email: 'Buyer@Example.com' };
const base = { email: 'buyer@example.com', planType: 'sub_monthly', reference: 'UPI123456789', amount: 999, currency: 'inr' };

describe('manual (UPI / bank) payments', () => {
  it('builds an idempotency key from the reference and rejects junk', () => {
    expect(manualIntentId(' UPI 1234 5678 ')).toBe('manual:UPI12345678');
    expect(manualIntentId('abc')).toBeNull();
    expect(manualIntentId('has/slash/chars')).toBeNull();
  });

  it('validates every field', () => {
    expect(validateManualPayment(base)).toBeNull();
    expect(validateManualPayment({ ...base, email: 'nope' })).toMatch(/email/i);
    expect(validateManualPayment({ ...base, planType: 'monthly' })).toMatch(/plan/i);
    expect(validateManualPayment({ ...base, amount: 0 })).toMatch(/amount/i);
    expect(validateManualPayment({ ...base, currency: 'rupees' })).toMatch(/currency/i);
  });

  it('activates a 30-day monthly subscription, matching the email case-insensitively', async () => {
    const { db, tables } = fakeDb([USER]);
    const r = await recordManualPayment(db, base, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.granted).toBe(true);
    expect(new Date(r.periodEnd).getTime() - NOW.getTime()).toBe(30 * 86_400_000);
    expect(tables.subscriptions[0]).toMatchObject({ user_id: USER.id, plan: 'monthly' });
    expect(tables.subscription_periods[0]).toMatchObject({ payment_intent_id: 'manual:UPI123456789', currency: 'INR' });
  });

  it('never grants the same payment reference twice', async () => {
    const { db, tables } = fakeDb([USER]);
    await recordManualPayment(db, base, NOW);
    const again = await recordManualPayment(db, base, new Date(NOW.getTime() + 3600_000));
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.granted).toBe(false);
    expect(tables.subscription_periods).toHaveLength(1);
  });

  it('refuses when the buyer has no account yet', async () => {
    const { db, tables } = fakeDb([]);
    const r = await recordManualPayment(db, base, NOW);
    expect(r.ok).toBe(false);
    expect(tables.subscriptions).toHaveLength(0);
  });
});
