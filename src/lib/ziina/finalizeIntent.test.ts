import { beforeEach, describe, expect, it, vi } from 'vitest';
import { finalizeCompletedZiinaIntent } from './finalizeIntent';
import { inngest } from '@/lib/inngest/client';

vi.mock('@/lib/ziina/server', () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/api/jobToken', () => ({
  createJobToken: vi.fn(() => 'test-job-token'),
  getPipelineJobTokenTtlSeconds: vi.fn(() => 3600),
}));

vi.mock('@/lib/promo/server', () => ({
  redeemPromoCode: vi.fn().mockResolvedValue(true),
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private notFilters: Array<[string, unknown]> = [];
  private updatePayload: Row | null = null;
  private upsertPayload: Row | null = null;
  private insertPayload: Row | null = null;

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

  neq(column: string, value: unknown) {
    this.notFilters.push([column, value]);
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const rows = this.rows();
    if (this.updatePayload) {
      for (const row of rows) Object.assign(row, this.updatePayload);
    }
    return { data: rows[0] ?? null, error: null };
  }

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

  upsert(payload: Row) {
    this.upsertPayload = payload;
    return this;
  }

  insert(payload: Row) {
    this.insertPayload = payload;
    return this;
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private rows() {
    return (this.tables[this.table] ?? []).filter(
      (row) =>
        this.filters.every(([column, value]) => row[column] === value) &&
        this.notFilters.every(([column, value]) => row[column] !== value),
    );
  }

  private async execute() {
    if (this.updatePayload) {
      for (const row of this.rows()) {
        Object.assign(row, this.updatePayload);
      }
    }
    if (this.upsertPayload) {
      const rows = this.tables[this.table] ?? [];
      const userId = this.upsertPayload.user_id;
      const idx = rows.findIndex((row) => row.user_id === userId);
      if (idx >= 0) rows[idx] = { ...rows[idx], ...this.upsertPayload };
      else rows.push({ ...this.upsertPayload });
      this.tables[this.table] = rows;
    }
    if (this.insertPayload) {
      const rows = this.tables[this.table] ?? [];
      rows.push({ ...this.insertPayload });
      this.tables[this.table] = rows;
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

const completedIntent = {
  id: 'intent_1',
  status: 'completed',
  amount: 999,
  currency_code: 'USD',
};

describe('finalizeCompletedZiinaIntent', () => {
  beforeEach(() => {
    vi.mocked(inngest.send).mockClear();
    process.env.INNGEST_EVENT_KEY = 'test-inngest-key';
  });

  it('rejects a completed payment bound to a different report owner', async () => {
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'report_victim',
          plan_type: '7day',
          status: 'pending',
          user_id: 'attacker_user',
        },
      ],
      reports: [{ id: 'report_victim', user_id: 'victim_user', payment_status: 'free' }],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: false, error: 'Payment is not bound to the report owner' });
    expect(tables.ziina_payments[0].status).toBe('pending');
    expect(tables.reports[0].payment_status).toBe('free');
  });

  it('can complete a paid forecast binding before the report row exists', async () => {
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'new_report',
          plan_type: '7day',
          status: 'pending',
          user_id: 'buyer_user',
        },
      ],
      reports: [],
      analytics_events: [],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: true, action: 'processed' });
    expect(tables.ziina_payments[0].status).toBe('completed');
    expect(tables.reports).toEqual([]);
  });

  it('regenerates when paying on a complete free/preview stub (same reportId)', async () => {
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'report_free',
          plan_type: '7day',
          status: 'pending',
          user_id: 'buyer_user',
          promo_code_id: null,
        },
      ],
      reports: [
        {
          id: 'report_free',
          user_id: 'buyer_user',
          user_email: 'buyer@example.com',
          native_name: 'Seeker',
          birth_date: '1990-01-15',
          birth_time: '10:30:00',
          birth_city: 'Dubai',
          birth_lat: 25.2,
          birth_lng: 55.27,
          current_city: null,
          current_lat: null,
          current_lng: null,
          timezone_offset: 240,
          plan_type: 'free',
          report_start_date: null,
          status: 'complete',
          generation_started_at: null,
          report_data: { days: [{ date: '2026-08-12', day_score: 70 }], months: [], weeks: [] },
          payment_status: 'free',
        },
      ],
      analytics_events: [],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: true, action: 'processed' });
    expect(tables.ziina_payments[0].status).toBe('completed');
    expect(tables.reports[0].payment_status).toBe('paid');
    expect(tables.reports[0].plan_type).toBe('7day');
    expect(tables.reports[0].status).toBe('generating');
    expect(tables.reports[0].report_data).toBeNull();
    expect(inngest.send).toHaveBeenCalledTimes(1);
    const sent = vi.mocked(inngest.send).mock.calls[0][0] as { id: string; name: string };
    expect(sent.name).toBe('report/generate');
    expect(sent.id).toMatch(/^report-generate:report_free:/);
    expect(sent.id).not.toBe('report-generate:report_free');
  });
});
