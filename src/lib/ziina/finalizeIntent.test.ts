import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inngest } from '@/lib/inngest/client';
import { finalizeCompletedZiinaIntent } from './finalizeIntent';

vi.mock('@/lib/ziina/server', () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn() },
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private updatePayload: Row | null = null;
  private upsertPayload: Row | null = null;

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
    const rows = this.rows();
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

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private rows() {
    return (this.tables[this.table] ?? []).filter((row) =>
      this.filters.every(([column, value]) => row[column] === value),
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
    vi.clearAllMocks();
    delete process.env.INNGEST_EVENT_KEY;
    process.env.JOB_TOKEN_SECRET = 'test-job-secret';
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

  it('marks a pre-created paid report row and dispatches generation after payment', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-inngest-key';
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
      reports: [
        {
          id: 'new_report',
          user_id: 'buyer_user',
          user_email: 'buyer@example.test',
          native_name: 'Buyer',
          birth_date: '1990-01-02',
          birth_time: '10:30:00',
          birth_city: 'Delhi, India',
          birth_lat: 28.6139,
          birth_lng: 77.209,
          current_city: null,
          current_lat: null,
          current_lng: null,
          timezone_offset: 330,
          plan_type: '7day',
          report_start_date: '2026-06-01',
          status: 'pending_payment',
          generation_started_at: null,
          report_data: null,
          payment_status: 'unpaid',
        },
      ],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: true, action: 'processed' });
    expect(tables.ziina_payments[0]).toMatchObject({
      status: 'completed',
      amount: 999,
      currency: 'USD',
    });
    expect(tables.reports[0]).toMatchObject({
      payment_status: 'paid',
      payment_provider: 'ziina',
      status: 'generating',
    });
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'report/generate',
        data: expect.objectContaining({
          reportId: 'new_report',
          userId: 'buyer_user',
          input: expect.objectContaining({
            city: 'Delhi, India',
            lat: 28.6139,
            lng: 77.209,
            forecastStart: '2026-06-01',
            paymentStatus: 'paid',
          }),
        }),
      }),
    );
  });
});
