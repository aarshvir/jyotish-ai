import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSuppressedSet } from './suppression';

function mockDb(result: { data: Array<{ email: string }> | null; error: { message: string } | null }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe('fetchSuppressedSet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes suppression addresses', async () => {
    const suppressed = await fetchSuppressedSet(
      mockDb({ data: [{ email: ' USER@Example.COM ' }], error: null }),
    );

    expect(suppressed).toEqual(new Set(['user@example.com']));
  });

  it('fails closed when suppressions cannot be verified', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      fetchSuppressedSet(mockDb({ data: null, error: { message: 'database unavailable' } })),
    ).rejects.toThrow('Could not verify email suppressions');
  });
});
