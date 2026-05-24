import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createServiceClient: vi.fn(),
  checkRateLimit: vi.fn(),
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  inngestSend: vi.fn(),
  generateReportPipeline: vi.fn(),
  getPromoDiscount: vi.fn(),
  redeemPromoCode: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntent: vi.fn(),
  isZiinaConfigured: vi.fn(),
  countryToCurrency: vi.fn(),
}));

vi.mock('@/lib/api/requireAuth', () => ({
  requireAuth: mocks.requireAuth,
  BYPASS_SECRET: 'test-bypass-secret',
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: mocks.createServiceClient,
}));

vi.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getRateLimitKey: (_request: unknown, userId: string) => userId,
}));

vi.mock('@/lib/redis/locks', () => ({
  acquireLock: mocks.acquireLock,
  releaseLock: mocks.releaseLock,
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: mocks.inngestSend },
}));

vi.mock('@/lib/reports/orchestrator', () => ({
  generateReportPipeline: mocks.generateReportPipeline,
}));

vi.mock('@/lib/api/jobToken', () => ({
  createJobToken: () => 'job-token',
  getPipelineJobTokenTtlSeconds: () => 3600,
}));

vi.mock('@/lib/url/canonicalDispatchOrigin', () => ({
  getCanonicalDispatchOrigin: (origin: string) => origin,
}));

vi.mock('@/lib/observability/generationLog', () => ({
  appendReportGenerationLog: vi.fn(),
  clearReportGenerationLog: vi.fn(),
}));

vi.mock('@/lib/reports/reportErrors', () => ({
  inferReportGenerationErrorCode: vi.fn(() => 'UNKNOWN'),
  markReportAsFailed: vi.fn(),
}));

vi.mock('@/lib/promo/server', () => ({
  getPromoDiscount: mocks.getPromoDiscount,
  redeemPromoCode: mocks.redeemPromoCode,
}));

vi.mock('@/lib/ziina/server', () => ({
  createPaymentIntent: mocks.createPaymentIntent,
  getPaymentIntent: mocks.getPaymentIntent,
  isZiinaConfigured: mocks.isZiinaConfigured,
  countryToCurrency: mocks.countryToCurrency,
}));

import { POST as startReport } from '@/app/api/reports/start/route';
import { POST as createZiinaIntent } from '@/app/api/ziina/create-intent/route';

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private minFilters: Array<[string, string]> = [];
  private rowLimit: number | null = null;
  private insertPayload: Row | Row[] | null = null;
  private upsertPayload: Row | Row[] | null = null;
  private updatePayload: Row | null = null;

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

  gte(column: string, value: string) {
    this.minFilters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  limit(n: number) {
    this.rowLimit = n;
    return this;
  }

  async maybeSingle() {
    const rows = this.rows();
    return { data: rows[0] ?? null, error: null };
  }

  insert(payload: Row | Row[]) {
    this.insertPayload = payload;
    return this;
  }

  upsert(payload: Row | Row[]) {
    this.upsertPayload = payload;
    return this;
  }

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private rows() {
    const rows = this.tables[this.table] ?? [];
    const filtered = rows.filter((row) => {
      const eqMatches = this.filters.every(([column, value]) => row[column] === value);
      const gteMatches = this.minFilters.every(([column, value]) => {
        const rowValue = row[column];
        return typeof rowValue === 'string' && rowValue >= value;
      });
      return eqMatches && gteMatches;
    });
    return this.rowLimit == null ? filtered : filtered.slice(0, this.rowLimit);
  }

  private async execute() {
    if (this.insertPayload) {
      const rows = this.tables[this.table] ?? [];
      const payloads = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
      rows.push(...payloads.map((row) => ({ ...row })));
      this.tables[this.table] = rows;
    }

    if (this.upsertPayload) {
      const rows = this.tables[this.table] ?? [];
      const payloads = Array.isArray(this.upsertPayload) ? this.upsertPayload : [this.upsertPayload];
      for (const payload of payloads) {
        const idx = typeof payload.id === 'string'
          ? rows.findIndex((row) => row.id === payload.id)
          : -1;
        if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
        else rows.push({ ...payload });
      }
      this.tables[this.table] = rows;
    }

    if (this.updatePayload) {
      for (const row of this.rows()) {
        Object.assign(row, this.updatePayload);
      }
    }

    return { data: null, error: null };
  }
}

function createMockDb(tables: Tables) {
  return {
    from(table: string) {
      return new MockQuery(tables, table);
    },
  };
}

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const birthPayload = {
  name: 'Aarsh',
  birth_date: '1990-01-02',
  birth_time: '03:04:00',
  birth_city: 'Mumbai, India',
  birth_lat: 19.076,
  birth_lng: 72.8777,
  timezone_offset: 330,
};

describe('payment flow guards', () => {
  let tables: Tables;

  beforeEach(() => {
    tables = {
      reports: [],
      ziina_payments: [],
      promo_redemptions: [],
    };

    vi.clearAllMocks();
    mocks.createServiceClient.mockReturnValue(createMockDb(tables));
    mocks.requireAuth.mockResolvedValue({
      user: { id: 'user_1', email: 'buyer@example.test' },
    });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, resetAt: 0 });
    mocks.acquireLock.mockResolvedValue(true);
    mocks.releaseLock.mockResolvedValue(undefined);
    mocks.inngestSend.mockResolvedValue(undefined);
    mocks.isZiinaConfigured.mockReturnValue(true);
    mocks.countryToCurrency.mockReturnValue('USD');
    mocks.createPaymentIntent.mockResolvedValue({
      id: 'intent_1',
      redirect_url: 'https://pay.example.test/intent_1',
      amount: 999,
    });
    process.env.INNGEST_EVENT_KEY = 'test-inngest-key';
  });

  it('blocks paid report generation without a completed payment or trusted promo', async () => {
    const response = await startReport(
      jsonRequest('https://app.example.test/api/reports/start', {
        reportId: 'report_1',
        ...birthPayload,
        plan_type: '7day',
        payment_status: 'bypass',
      }),
    );

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PAYMENT_REQUIRED',
    });
    expect(tables.reports).toEqual([]);
    expect(mocks.inngestSend).not.toHaveBeenCalled();
    expect(mocks.releaseLock).toHaveBeenCalledWith('report:report_1:generation');
  });

  it('allows a paid report start only after validating and recording a full promo', async () => {
    mocks.getPromoDiscount.mockResolvedValue({
      valid: true,
      discountPct: 100,
      codeId: 'promo_1',
    });
    mocks.redeemPromoCode.mockImplementation(async (_codeId: string, userId: string, orderId: string) => {
      tables.promo_redemptions.push({ id: 'redemption_1', user_id: userId, order_id: orderId });
    });

    const response = await startReport(
      jsonRequest('https://app.example.test/api/reports/start', {
        reportId: 'report_1',
        ...birthPayload,
        plan_type: '7day',
        payment_status: 'promo',
        promoCode: 'ADMIN100',
      }),
    );

    expect(response.status).toBe(202);
    expect(tables.reports[0]).toMatchObject({
      id: 'report_1',
      user_id: 'user_1',
      plan_type: '7day',
      payment_status: 'promo',
      status: 'generating',
    });
    expect(mocks.getPromoDiscount).toHaveBeenCalledWith('ADMIN100', 'buyer@example.test');
    expect(mocks.redeemPromoCode).toHaveBeenCalledWith('promo_1', 'user_1', 'report_1');
    expect(mocks.inngestSend).toHaveBeenCalledOnce();
  });

  it('creates a pending report draft before binding a Ziina checkout intent', async () => {
    const response = await createZiinaIntent(
      jsonRequest('https://app.example.test/api/ziina/create-intent', {
        planType: '7day',
        reportId: 'report_1',
        ...birthPayload,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      intentId: 'intent_1',
      redirectUrl: 'https://pay.example.test/intent_1',
    });
    expect(tables.reports[0]).toMatchObject({
      id: 'report_1',
      user_id: 'user_1',
      native_name: 'Aarsh',
      birth_city: 'Mumbai, India',
      plan_type: '7day',
      status: 'pending_payment',
      payment_status: 'unpaid',
    });
    expect(tables.ziina_payments[0]).toMatchObject({
      ziina_intent_id: 'intent_1',
      report_id: 'report_1',
      user_id: 'user_1',
      plan_type: '7day',
      status: 'pending',
    });
  });
});
