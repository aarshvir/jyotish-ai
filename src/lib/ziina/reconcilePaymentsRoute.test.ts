import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/reconcile-payments/route';

const mocks = vi.hoisted(() => ({
  statusFilter: null as unknown[] | null,
  db: null as { from: (table: string) => ReconcileQuery } | null,
  runAbandonedCheckoutRecovery: vi.fn(),
  sendFounderDigest: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: () => mocks.db,
}));

vi.mock('@/lib/notify/lifecycle', () => ({
  runAbandonedCheckoutRecovery: mocks.runAbandonedCheckoutRecovery,
  sendFounderDigest: mocks.sendFounderDigest,
}));

vi.mock('@/lib/ziina/server', () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/ziina/finalizeIntent', () => ({
  finalizeCompletedZiinaIntent: vi.fn(),
}));

class ReconcileQuery {
  select() {
    return this;
  }

  in(column: string, values: unknown[]) {
    if (column === 'status') mocks.statusFilter = values;
    return this;
  }

  lt() {
    return this;
  }

  limit() {
    return this;
  }

  then<TResult1 = { data: never[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: never[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected);
  }
}

describe('GET /api/cron/reconcile-payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.statusFilter = null;
    mocks.runAbandonedCheckoutRecovery.mockResolvedValue({ ok: true, sent: 0 });
    mocks.sendFounderDigest.mockResolvedValue({ ok: true });
    mocks.db = {
      from(table: string) {
        expect(table).toBe('ziina_payments');
        return new ReconcileQuery();
      },
    };
    process.env.CRON_SECRET = 'test-secret';
  });

  it('scans cancelled superseded intents as well as pending intents', async () => {
    const request = new NextRequest('https://example.test/api/cron/reconcile-payments', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, reconciled: 0 });
    expect(mocks.statusFilter).toEqual(['pending', 'cancelled']);
  });
});
