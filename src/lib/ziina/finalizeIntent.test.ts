import { describe, expect, it, vi } from 'vitest';
import { finalizeCompletedZiinaIntent } from './finalizeIntent';
import { inngest } from '@/lib/inngest/client';

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
  private notFilters: Array<[string, unknown]> = [];
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

  neq(column: string, value: unknown) {
    this.notFilters.push([column, value]);
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const rows = this.rows();
    // Model Supabase's .update(...).select().maybeSingle(): apply the pending update
    // to the matched row(s) and return the (now updated) first row.
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

  it('does not label an upgrade monthly before its 30 days are persisted', async () => {
    const previousEventKey = process.env.INNGEST_EVENT_KEY;
    process.env.INNGEST_EVENT_KEY = 'test-key';
    vi.mocked(inngest.send).mockResolvedValue(undefined as never);
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'report_1',
          plan_type: 'monthly_upgrade',
          status: 'pending',
          user_id: 'buyer_user',
        },
      ],
      reports: [
        {
          id: 'report_1',
          user_id: 'buyer_user',
          payment_status: 'paid',
          plan_type: '7day',
        },
      ],
      analytics_events: [],
    };

    try {
      const result = await finalizeCompletedZiinaIntent(
        createMockDb(tables) as never,
        'intent_1',
        'https://example.test',
        { intent: completedIntent as never },
      );

      expect(result).toEqual({ ok: true, action: 'processed' });
      expect(tables.ziina_payments[0].status).toBe('completed');
      expect(tables.reports[0].plan_type).toBe('7day');
      expect(tables.reports[0].upsell_converted_at).toEqual(expect.any(String));
      expect(inngest.send).toHaveBeenCalledWith({
        id: 'report-extend:report_1',
        name: 'report/extend',
        data: { reportId: 'report_1', baseUrl: 'https://example.test' },
      });
    } finally {
      if (previousEventKey === undefined) delete process.env.INNGEST_EVENT_KEY;
      else process.env.INNGEST_EVENT_KEY = previousEventKey;
    }
  });
});
