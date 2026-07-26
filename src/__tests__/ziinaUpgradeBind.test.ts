import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  requireAuth,
  createServiceClient,
  createPaymentIntent,
  getPaymentIntent,
  getReusablePendingZiinaIntent,
  emitUpsellEvent,
  isZiinaConfigured,
  countryToCurrency,
  formatAmount,
  getMonthlyUpgradeAmount,
} = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createServiceClient: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntent: vi.fn(),
  getReusablePendingZiinaIntent: vi.fn(),
  emitUpsellEvent: vi.fn(),
  isZiinaConfigured: vi.fn(() => true),
  countryToCurrency: vi.fn(() => 'USD' as const),
  formatAmount: vi.fn(() => '$9'),
  getMonthlyUpgradeAmount: vi.fn(() => 900),
}));

vi.mock('@/lib/api/requireAuth', () => ({ requireAuth }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceClient }));
vi.mock('@/lib/ziina/server', () => ({
  createPaymentIntent,
  getPaymentIntent,
  countryToCurrency,
  formatAmount,
  getMonthlyUpgradeAmount,
  isZiinaConfigured,
}));
vi.mock('@/lib/ziina/pendingIntentReuse', () => ({ getReusablePendingZiinaIntent }));
vi.mock('@/lib/analytics/upsellEvents', () => ({ emitUpsellEvent }));

import { POST } from '@/app/api/ziina/upgrade/route';

function upgradeRequest(reportId: string) {
  return new NextRequest('https://vedichour.com/api/ziina/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId }),
  });
}

function mockDb(opts: {
  report: Record<string, unknown> | null;
  completedUpgrade?: Record<string, unknown> | null;
  pendingUpgrade?: Record<string, unknown> | null;
  parentPay?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
}) {
  const insert = vi.fn(async () => ({ data: null, error: opts.insertError ?? null }));
  const updateEqChain = {
    eq() {
      return this;
    },
    then(onfulfilled: (v: { data: null; error: null }) => unknown) {
      return Promise.resolve({ data: null, error: null }).then(onfulfilled);
    },
  };

  return {
    insert,
    from(table: string) {
      if (table === 'reports') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: opts.report, error: null };
          },
        };
      }
      let mode: 'parent' | 'completed' | 'pending' = 'parent';
      return {
        select() {
          return this;
        },
        update() {
          return updateEqChain;
        },
        insert,
        eq(column: string, value: unknown) {
          if (column === 'plan_type' && value === 'monthly_upgrade') mode = 'completed';
          if (column === 'status' && value === 'completed') mode = 'completed';
          if (column === 'status' && value === 'pending') mode = 'pending';
          if (column === 'plan_type' && value === '7day') mode = 'parent';
          return this;
        },
        order() {
          return this;
        },
        gte() {
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          if (mode === 'parent') return { data: opts.parentPay ?? null, error: null };
          if (mode === 'completed') return { data: opts.completedUpgrade ?? null, error: null };
          if (mode === 'pending') return { data: opts.pendingUpgrade ?? null, error: null };
          return { data: null, error: null };
        },
      };
    },
  };
}

describe('POST /api/ziina/upgrade bind insert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ user: { id: 'user_1', email: 'a@b.com' } });
    isZiinaConfigured.mockReturnValue(true);
    createPaymentIntent.mockResolvedValue({
      id: 'intent_up_1',
      redirect_url: 'https://ziina.test/pay',
      amount: 900,
      currency_code: 'USD',
    });
    getReusablePendingZiinaIntent.mockReturnValue(null);
  });

  it('returns 500 without redirectUrl when ziina_payments insert fails', async () => {
    const db = mockDb({
      report: { id: 'rep_1', user_id: 'user_1', plan_type: '7day', payment_status: 'paid' },
      insertError: { message: 'insert failed' },
    });
    createServiceClient.mockReturnValue(db);

    const res = await POST(upgradeRequest('rep_1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.redirectUrl).toBeUndefined();
    expect(body.error).toMatch(/bind/i);
    expect(db.insert).toHaveBeenCalledOnce();
    expect(emitUpsellEvent).not.toHaveBeenCalled();
  });

  it('returns redirectUrl when the bind insert succeeds', async () => {
    const db = mockDb({
      report: { id: 'rep_1', user_id: 'user_1', plan_type: '7day', payment_status: 'paid' },
      insertError: null,
    });
    createServiceClient.mockReturnValue(db);

    const res = await POST(upgradeRequest('rep_1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.redirectUrl).toBe('https://ziina.test/pay');
    expect(emitUpsellEvent).toHaveBeenCalledOnce();
  });
});
