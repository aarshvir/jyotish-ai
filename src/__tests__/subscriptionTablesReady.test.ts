import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { subscriptionTablesReady } from '@/lib/subscriptions/access';

/**
 * Checkout refuses a subscription until the tables its grant writes to exist, in the
 * shape the grant writes. A user_id column on the 20260727 pivot table is not enough:
 * that read succeeds and the later upsert of `plan` fails after the customer is charged.
 */
function fakeDb(behaviour: Record<string, 'ok' | 'missing' | 'throws' | 'legacy'>): SupabaseClient {
  return {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            limit() {
              const mode = behaviour[table] ?? 'missing';
              if (mode === 'throws') return Promise.reject(new Error('network down'));
              if (mode === 'legacy' || (table === 'subscriptions' && !String(columns).includes('plan'))) {
                return Promise.resolve({
                  data: null,
                  error: { code: '42703', message: 'column subscriptions.plan does not exist' },
                });
              }
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

  it('is not ready when subscriptions is still the pivot table and has no plan column', async () => {
    expect(await subscriptionTablesReady(fakeDb({ subscriptions: 'legacy', subscription_periods: 'ok' }))).toBe(false);
  });
});
