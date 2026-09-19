import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { latestEntitledNatal, type EntitledNatal } from '@/lib/subscriptions/access';

/**
 * "Start my next 30-day forecast" copies natal from /api/subscription/status. Checkout
 * writes an unpaid draft on every Subscribe tap, so the newest birth_lat row is often an
 * abandoned quiz — not the last paid chart. The helper must skip those drafts.
 */

type Row = EntitledNatal & {
  id: string;
  user_id: string;
  payment_status: string;
  created_at: string;
};

function natal(partial: Partial<Row> & Pick<Row, 'id' | 'user_id' | 'payment_status' | 'created_at' | 'birth_lat'>): Row {
  return {
    native_name: 'Seeker',
    birth_date: '1990-01-01',
    birth_time: '12:00:00',
    birth_city: 'New Delhi',
    birth_lng: 77.2,
    current_city: null,
    current_lat: null,
    current_lng: null,
    personal_context: null,
    ...partial,
  };
}

function fakeDb(rows: Row[], fail = false): SupabaseClient {
  return {
    from() {
      const filters: ((r: Row) => boolean)[] = [];
      let descending = false;
      let limited = Infinity;
      const finish = () => {
        if (fail) return { data: null, error: { message: 'boom' } };
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (descending) out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
        out = out.slice(0, Number.isFinite(limited) ? limited : out.length);
        return { data: out, error: null };
      };
      const q = {
        select: () => q,
        eq: (c: keyof Row, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: keyof Row, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        not: (c: keyof Row, op: string, v: unknown) => {
          if (op === 'is' && v === null) filters.push((r) => r[c] != null);
          return q;
        },
        order: (_c: string, opts?: { ascending?: boolean }) => {
          descending = opts?.ascending === false;
          return q;
        },
        limit: (n: number) => {
          limited = n;
          return q;
        },
        maybeSingle: async () => {
          const r = finish();
          if (r.error) return r;
          return { data: (r.data as Row[])[0] ?? null, error: null };
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

describe('latestEntitledNatal', () => {
  it('skips a newer unpaid checkout draft and returns the last paid natal', async () => {
    const paid = natal({
      id: 'paid',
      user_id: 'u1',
      payment_status: 'paid',
      created_at: '2026-09-01T10:00:00.000Z',
      native_name: 'Aarsh',
      birth_date: '1994-06-15',
      birth_time: '09:10:00',
      birth_city: 'Dubai',
      birth_lat: 25.2,
      birth_lng: 55.3,
      personal_context: 'Should I change jobs?',
    });
    const abandoned = natal({
      id: 'draft',
      user_id: 'u1',
      payment_status: 'unpaid',
      created_at: '2026-09-10T10:00:00.000Z',
      native_name: 'Spouse',
      birth_date: '1996-02-02',
      birth_time: '18:30:00',
      birth_city: 'Mumbai',
      birth_lat: 19.07,
      birth_lng: 72.87,
      personal_context: 'When will we have a child?',
    });
    const got = await latestEntitledNatal(fakeDb([abandoned, paid]), 'u1');
    expect(got?.native_name).toBe('Aarsh');
    expect(got?.birth_date).toBe('1994-06-15');
    expect(got?.birth_time).toBe('09:10:00');
    expect(got?.birth_city).toBe('Dubai');
    expect(got?.personal_context).toBe('Should I change jobs?');
  });

  it('accepts promo and bypass the same way as other entitled reports', async () => {
    const unpaid = natal({
      id: 'draft',
      user_id: 'u1',
      payment_status: 'unpaid',
      created_at: '2026-09-13T10:00:00.000Z',
      birth_lat: 1,
    });
    expect(
      (await latestEntitledNatal(
        fakeDb([
          unpaid,
          natal({ id: 'promo', user_id: 'u1', payment_status: 'promo', created_at: '2026-09-12T10:00:00.000Z', birth_lat: 28.6 }),
        ]),
        'u1',
      ))?.birth_lat,
    ).toBe(28.6);
    expect(
      (await latestEntitledNatal(
        fakeDb([
          unpaid,
          natal({ id: 'bypass', user_id: 'u1', payment_status: 'bypass', created_at: '2026-09-12T10:00:00.000Z', birth_lat: 40.7 }),
        ]),
        'u1',
      ))?.birth_lat,
    ).toBe(40.7);
  });

  it('returns null when the only rows are unpaid drafts or other people', async () => {
    const db = fakeDb([
      natal({ id: 'a', user_id: 'u1', payment_status: 'unpaid', created_at: '2026-09-10T00:00:00.000Z', birth_lat: 25 }),
      natal({ id: 'b', user_id: 'u2', payment_status: 'paid', created_at: '2026-09-10T00:00:00.000Z', birth_lat: 19 }),
    ]);
    expect(await latestEntitledNatal(db, 'u1')).toBeNull();
  });

  it('throws rather than reporting no natal when the lookup fails', async () => {
    await expect(latestEntitledNatal(fakeDb([], true), 'u1')).rejects.toThrow('Natal lookup failed');
  });
});
