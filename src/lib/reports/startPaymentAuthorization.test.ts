import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPaidReportPlan,
  resolveReportStartPaymentAuthorization,
} from './startPaymentAuthorization';
import { getPromoDiscount, redeemPromoCode } from '@/lib/promo/server';

vi.mock('@/lib/promo/server', () => ({
  getPromoDiscount: vi.fn(),
  redeemPromoCode: vi.fn(),
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

class MockQuery {
  private filters: Array<[string, unknown]> = [];

  constructor(
    private readonly tables: Tables,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const rows = this.tables[this.table] ?? [];
    const match = rows.find((row) =>
      this.filters.every(([column, value]) => row[column] === value),
    );
    return { data: match ?? null, error: null };
  }
}

function createMockDb(tables: Tables) {
  return {
    from(table: string) {
      return new MockQuery(tables, table);
    },
  };
}

const baseParams = {
  reportId: 'report_1',
  userId: '00000000-0000-4000-8000-000000000001',
  userEmail: 'user@example.com',
  existing: null,
  isAdmin: false,
};

describe('report start payment authorization', () => {
  beforeEach(() => {
    vi.mocked(getPromoDiscount).mockReset();
    vi.mocked(redeemPromoCode).mockReset();
    vi.mocked(redeemPromoCode).mockResolvedValue({ redeemed: true, alreadyRedeemed: false });
  });

  it('classifies forecast plans as paid and preview/free plans as free', () => {
    expect(isPaidReportPlan('7day')).toBe(true);
    expect(isPaidReportPlan('monthly')).toBe(true);
    expect(isPaidReportPlan('annual')).toBe(true);
    expect(isPaidReportPlan('free')).toBe(false);
    expect(isPaidReportPlan('preview')).toBe(false);
  });

  it('rejects client-spoofed bypass for paid plans without a completed payment', async () => {
    const result = await resolveReportStartPaymentAuthorization({
      ...baseParams,
      db: createMockDb({ ziina_payments: [], promo_redemptions: [] }) as never,
      body: { plan_type: '7day', payment_status: 'bypass' },
    });

    expect(result).toEqual({
      ok: false,
      status: 402,
      code: 'PAYMENT_REQUIRED',
      error: 'Payment is required before starting this report.',
    });
    expect(getPromoDiscount).not.toHaveBeenCalled();
    expect(redeemPromoCode).not.toHaveBeenCalled();
  });

  it('trusts paid status only when a completed Ziina payment is bound to the report and user', async () => {
    const result = await resolveReportStartPaymentAuthorization({
      ...baseParams,
      db: createMockDb({
        ziina_payments: [
          {
            report_id: 'report_1',
            user_id: '00000000-0000-4000-8000-000000000001',
            status: 'completed',
            ziina_intent_id: 'intent_1',
          },
        ],
      }) as never,
      body: { plan_type: 'monthly', payment_status: 'paid' },
    });

    expect(result).toEqual({ ok: true, paymentStatus: 'paid' });
  });

  it('allows a paid plan with a server-validated full promo and records redemption', async () => {
    vi.mocked(getPromoDiscount).mockResolvedValue({
      valid: true,
      discountPct: 100,
      codeId: 'promo_1',
    });

    const result = await resolveReportStartPaymentAuthorization({
      ...baseParams,
      db: createMockDb({ ziina_payments: [], promo_redemptions: [] }) as never,
      body: { plan_type: 'annual', payment_status: 'promo', promoCode: 'ADMIN100' },
    });

    expect(result).toEqual({ ok: true, paymentStatus: 'promo' });
    expect(getPromoDiscount).toHaveBeenCalledWith('ADMIN100', 'user@example.com');
    expect(redeemPromoCode).toHaveBeenCalledWith(
      'promo_1',
      '00000000-0000-4000-8000-000000000001',
      'report_1',
    );
  });

  it('allows retrying an existing promo report only when a redemption exists', async () => {
    const result = await resolveReportStartPaymentAuthorization({
      ...baseParams,
      db: createMockDb({
        ziina_payments: [],
        promo_redemptions: [
          {
            id: 'redemption_1',
            order_id: 'report_1',
            user_id: '00000000-0000-4000-8000-000000000001',
          },
        ],
      }) as never,
      existing: { plan_type: '7day', payment_status: 'promo' },
      body: { plan_type: '7day', payment_status: 'promo' },
    });

    expect(result).toEqual({ ok: true, paymentStatus: 'promo' });
    expect(getPromoDiscount).not.toHaveBeenCalled();
    expect(redeemPromoCode).not.toHaveBeenCalled();
  });
});
