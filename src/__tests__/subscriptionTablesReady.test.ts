import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { subscriptionTablesReady } from '@/lib/subscriptions/access';

/**
 * Checkout refuses a subscription until the tables its grant writes to exist. This is
 * the guard against charging a customer for a period that cannot be recorded.
 */
function fakeDb(behaviour: Record<string, 'ok' | 'missing' | 'throws'>): SupabaseClient {
  return {
    from(table: string) {
      return {
        select() {
          return {
            limit() {
              const mode = behaviour[table] ?? 'missing';
              if (mode === 'throws') return Promise.reject(new Error('network down'));
              return Promise.resolve(
                mode === 'ok'
                  ? { data: [], error: null }
                  : { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${table}'` } },
              );
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('subscriptionTablesReady', () => {
  it('is ready when both tables answer', async () => {
    expect(await subscriptionTablesReady(fakeDb({ subscriptions: 'ok', subscription_periods: 'ok' }))).toBe(true);
  });

  it('is not ready before the migration has run', async () => {
    expect(await subscriptionTablesReady(fakeDb({}))).toBe(false);
  });

  it('is not ready when only one of the two tables exists', async () => {
    expect(await subscriptionTablesReady(fakeDb({ subscriptions: 'ok' }))).toBe(false);
    expect(await subscriptionTablesReady(fakeDb({ subscription_periods: 'ok' }))).toBe(false);
  });

  it('is not ready when the database cannot be reached', async () => {
    expect(await subscriptionTablesReady(fakeDb({ subscriptions: 'throws', subscription_periods: 'ok' }))).toBe(false);
  });
});
