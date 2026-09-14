import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkoutDraftInsertRow,
  checkoutDraftUnpaidPatch,
  persistUnpaidCheckoutDraft,
  type CheckoutDraftInput,
} from './checkoutDraft';

type Row = Record<string, unknown>;

function fakeDb(rows: Row[]) {
  const db = {
    from() {
      return {
        async upsert(row: Row, opts?: { ignoreDuplicates?: boolean }) {
          const i = rows.findIndex((r) => r.id === row.id);
          if (i < 0) rows.push({ ...row });
          else if (!opts?.ignoreDuplicates) rows[i] = { ...rows[i], ...row };
          return { error: null };
        },
        update(patch: Row) {
          const filters: [string, unknown][] = [];
          const q = {
            eq(col: string, val: unknown) {
              filters.push([col, val]);
              return q;
            },
            then(resolve: (v: { error: null }) => unknown) {
              for (const r of rows) {
                if (filters.every(([c, v]) => r[c] === v)) Object.assign(r, patch);
              }
              return resolve({ error: null });
            },
          };
          return q;
        },
      };
    },
  };
  return { db: db as unknown as SupabaseClient, rows };
}

const first: CheckoutDraftInput = {
  reportId: 'r1',
  userId: 'u1',
  userEmail: 'a@example.com',
  nativeName: 'Asha',
  birthDate: '1990-01-01',
  birthTime: '12:00:00',
  birthCity: 'Delhi',
  birthLat: 28.6,
  birthLng: 77.2,
  currentCity: null,
  currentLat: null,
  currentLng: null,
  timezoneOffset: 330,
  planType: 'monthly',
  reportStartDate: null,
  personalContext: 'Will I get the job in Mumbai?',
};

const retry: CheckoutDraftInput = {
  ...first,
  birthDate: '1991-06-15',
  birthTime: '14:30:00',
  birthCity: 'Jaipur',
  birthLat: 26.9,
  birthLng: 75.8,
  currentCity: 'Dubai',
  currentLat: 25.2,
  currentLng: 55.27,
  timezoneOffset: 240,
  personalContext: 'Should I move this year?',
};

describe('persistUnpaidCheckoutDraft', () => {
  it('inserts a new unpaid draft with the checkout birth data', async () => {
    const { db, rows } = fakeDb([]);
    const out = await persistUnpaidCheckoutDraft(db, first);
    expect(out).toEqual({ ok: true });
    expect(rows[0]).toMatchObject({
      id: 'r1',
      user_id: 'u1',
      birth_date: '1990-01-01',
      birth_time: '12:00:00',
      birth_city: 'Delhi',
      payment_status: 'unpaid',
      personal_context: 'Will I get the job in Mumbai?',
    });
  });

  it('overwrites birth data on an unpaid reuse of the same report id', async () => {
    const { db, rows } = fakeDb([
      { ...checkoutDraftInsertRow(first), personal_context: first.personalContext },
    ]);
    const out = await persistUnpaidCheckoutDraft(db, retry);
    expect(out).toEqual({ ok: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      birth_date: '1991-06-15',
      birth_time: '14:30:00',
      birth_city: 'Jaipur',
      current_city: 'Dubai',
      timezone_offset: 240,
      personal_context: 'Should I move this year?',
      payment_status: 'unpaid',
    });
  });

  it('does not clobber a report that was paid between the first tap and the retry', async () => {
    const paid = {
      ...checkoutDraftInsertRow(first),
      payment_status: 'paid',
      birth_date: '1990-01-01',
      personal_context: first.personalContext,
    };
    const { db, rows } = fakeDb([paid]);
    const out = await persistUnpaidCheckoutDraft(db, retry);
    expect(out).toEqual({ ok: true });
    expect(rows[0]).toMatchObject({
      payment_status: 'paid',
      birth_date: '1990-01-01',
      birth_city: 'Delhi',
      personal_context: first.personalContext,
    });
  });
});

describe('checkoutDraftUnpaidPatch', () => {
  it('never includes id, owner or payment_status so a paid row cannot be rewritten by accident', () => {
    const patch = checkoutDraftUnpaidPatch(retry);
    expect(patch).not.toHaveProperty('id');
    expect(patch).not.toHaveProperty('user_id');
    expect(patch).not.toHaveProperty('payment_status');
    expect(patch.birth_date).toBe('1991-06-15');
  });
});
