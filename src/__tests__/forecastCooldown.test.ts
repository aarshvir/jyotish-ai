import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { latestForecastStartedAt, nextForecastUnlock, FORECAST_COOLDOWN_DAYS } from '@/lib/subscriptions/access';

/**
 * The 25-day cooldown between a subscriber's 30-day forecasts must count from when the last
 * forecast actually STARTED. Every checkout creates a draft report row, so keying it on
 * created_at let drafts made on day 0 all start, one after another, on day 25.
 */

type Row = { id: string; user_id: string; payment_status: string; plan_type: string; created_at: string; generation_started_at: string | null };

function fakeDb(rows: Row[], fail = false): SupabaseClient {
  return {
    from() {
      const filters: ((r: Row) => boolean)[] = [];
      const q = {
        select: () => q,
        eq: (c: keyof Row, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: keyof Row, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        neq: (c: keyof Row, v: unknown) => (filters.push((r) => r[c] !== v), q),
        order: () => q,
        limit: () => q,
        then: (resolve: (v: unknown) => unknown) =>
          resolve(fail ? { data: null, error: { message: 'boom' } } : { data: rows.filter((r) => filters.every((f) => f(r))), error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const DAY0 = '2026-09-01T10:00:00.000Z';
const DAY25 = '2026-09-26T10:00:00.000Z';

describe('forecast cooldown', () => {
  it('counts from a draft that was created on day 0 but started on day 25', async () => {
    const db = fakeDb([
      { id: 'a', user_id: 'u1', payment_status: 'paid', plan_type: 'monthly', created_at: DAY0, generation_started_at: DAY25 },
      { id: 'b', user_id: 'u1', payment_status: 'unpaid', plan_type: 'monthly', created_at: DAY0, generation_started_at: null },
    ]);
    const last = await latestForecastStartedAt(db, 'u1', 'b');
    expect(last).toBe(DAY25);
    const unlock = nextForecastUnlock(last)!;
    expect(unlock.getTime()).toBe(Date.parse(DAY25) + FORECAST_COOLDOWN_DAYS * 86_400_000);
  });

  it('ignores unpaid drafts and other people', async () => {
    const db = fakeDb([
      { id: 'a', user_id: 'u1', payment_status: 'unpaid', plan_type: 'monthly', created_at: DAY25, generation_started_at: null },
      { id: 'b', user_id: 'u2', payment_status: 'paid', plan_type: 'monthly', created_at: DAY25, generation_started_at: DAY25 },
    ]);
    expect(await latestForecastStartedAt(db, 'u1')).toBeNull();
  });

  it('falls back to created_at for a paid report that has not started generating yet', async () => {
    const db = fakeDb([{ id: 'a', user_id: 'u1', payment_status: 'paid', plan_type: 'monthly', created_at: DAY0, generation_started_at: null }]);
    expect(await latestForecastStartedAt(db, 'u1')).toBe(DAY0);
  });

  it('throws rather than reporting no forecast when the lookup fails', async () => {
    await expect(latestForecastStartedAt(fakeDb([], true), 'u1')).rejects.toThrow('Forecast lookup failed');
  });
});
