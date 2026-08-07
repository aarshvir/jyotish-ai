import { describe, expect, it, vi } from 'vitest';
import { finalizeCompletedZiinaIntent } from './finalizeIntent';

vi.mock('@/lib/ziina/server', () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn() },
}));

vi.mock('@/lib/promo/server', () => ({
  redeemPromoCode: vi.fn(async () => true),
}));

vi.mock('@/lib/reports/extendMonthly', () => ({
  extendReportToMonthly: vi.fn(async () => ({ ok: true, message: 'mocked' })),
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

type MockDbOptions = {
  /** Fail the next N updates that set reports.payment_status = 'paid'. */
  failReportPaidGrants?: number;
};

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private notFilters: Array<[string, unknown]> = [];
  private updatePayload: Row | null = null;
  private upsertPayload: Row | null = null;

  constructor(
    private readonly tables: Tables,
    private readonly table: string,
    private readonly options: MockDbOptions,
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
    if (this.shouldFailPaidGrant()) {
      return { data: null, error: { message: 'simulated grant write failure' } };
    }
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

  private shouldFailPaidGrant(): boolean {
    if (this.table !== 'reports' || !this.updatePayload) return false;
    if (this.updatePayload.payment_status !== 'paid') return false;
    if ((this.options.failReportPaidGrants ?? 0) <= 0) return false;
    this.options.failReportPaidGrants! -= 1;
    return true;
  }

  private rows() {
    return (this.tables[this.table] ?? []).filter(
      (row) =>
        this.filters.every(([column, value]) => row[column] === value) &&
        this.notFilters.every(([column, value]) => row[column] !== value),
    );
  }

  private async execute() {
    if (this.shouldFailPaidGrant()) {
      return { data: null, error: { message: 'simulated grant write failure' } };
    }
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

function createMockDb(tables: Tables, options: MockDbOptions = {}) {
  return {
    from(table: string) {
      return new MockQuery(tables, table, options);
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

  it('surfaces a report entitlement grant failure after claiming payment', async () => {
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'report_1',
          plan_type: '7day',
          status: 'pending',
          user_id: 'buyer_user',
        },
      ],
      reports: [{ id: 'report_1', user_id: 'buyer_user', payment_status: 'unpaid' }],
      analytics_events: [],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables, { failReportPaidGrants: 1 }) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: false, error: 'simulated grant write failure' });
    expect(tables.ziina_payments[0].status).toBe('completed');
    expect(tables.reports[0].payment_status).toBe('unpaid');
  });

  it('heals a completed payment that never granted report entitlement', async () => {
    const tables: Tables = {
      ziina_payments: [
        {
          ziina_intent_id: 'intent_1',
          report_id: 'report_1',
          plan_type: '7day',
          status: 'completed',
          user_id: 'buyer_user',
        },
      ],
      reports: [{ id: 'report_1', user_id: 'buyer_user', payment_status: 'unpaid' }],
    };

    const result = await finalizeCompletedZiinaIntent(
      createMockDb(tables) as never,
      'intent_1',
      'https://example.test',
      { intent: completedIntent as never },
    );

    expect(result).toEqual({ ok: true, action: 'already_done' });
    expect(tables.reports[0].payment_status).toBe('paid');
    expect(tables.reports[0].payment_provider).toBe('ziina');
    expect(tables.reports[0].plan_type).toBe('7day');
  });
});
