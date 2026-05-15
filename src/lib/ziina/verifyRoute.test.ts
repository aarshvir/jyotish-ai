import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/ziina/verify/route';
import { getPaymentIntent } from '@/lib/ziina/server';

vi.mock('@/lib/ziina/server', () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn() },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: () => mockDb,
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

let tables: Tables;
let mockDb: ReturnType<typeof createMockDb>;

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private updatePayload: Row | null = null;
  private upsertPayload: Row | null = null;

  constructor(
    private readonly allTables: Tables,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  async maybeSingle() {
    if (
      this.table === 'ziina_payments' &&
      this.filters.some(([column, value]) => column === 'ziina_intent_id' && value === 'intent_db_down')
    ) {
      return { data: null, error: { message: 'database unavailable' } };
    }
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
    return (this.allTables[this.table] ?? []).filter((row) =>
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
      const rows = this.allTables[this.table] ?? [];
      const userId = this.upsertPayload.user_id;
      const idx = rows.findIndex((row) => row.user_id === userId);
      if (idx >= 0) rows[idx] = { ...rows[idx], ...this.upsertPayload };
      else rows.push({ ...this.upsertPayload });
      this.allTables[this.table] = rows;
    }
    return { data: null, error: null };
  }
}

function createMockDb(allTables: Tables) {
  return {
    from(table: string) {
      return new MockQuery(allTables, table);
    },
  };
}

function requestFor(pathAndQuery: string) {
  return new NextRequest(`https://example.test${pathAndQuery}`);
}

describe('GET /api/ziina/verify', () => {
  beforeEach(() => {
    tables = { ziina_payments: [], user_synastry_unlock: [] };
    mockDb = createMockDb(tables);
    vi.mocked(getPaymentIntent).mockReset();
    vi.mocked(getPaymentIntent).mockResolvedValue({
      id: 'intent_1',
      status: 'completed',
      amount: 499,
      currency_code: 'USD',
    } as never);
  });

  it('finalizes standalone synastry payments that intentionally have no report binding', async () => {
    tables.ziina_payments.push({
      ziina_intent_id: 'intent_1',
      report_id: null,
      plan_type: 'synastry',
      status: 'pending',
      user_id: 'buyer_user',
    });

    const response = await GET(
      requestFor('/api/ziina/verify?intentId=intent_1&planType=synastry&status=success'),
    );

    expect(response.headers.get('location')).toBe('https://example.test/synastry?unlocked=1');
    expect(tables.ziina_payments[0].status).toBe('completed');
    expect(tables.user_synastry_unlock).toEqual([
      expect.objectContaining({ user_id: 'buyer_user' }),
    ]);
  });

  it('does not trust URL reportId parameters when the server binding lookup fails', async () => {
    const response = await GET(
      requestFor(
        '/api/ziina/verify?intentId=intent_db_down&planType=7day&status=success&reportId=tampered_report',
      ),
    );

    expect(response.headers.get('location')).toBe('https://example.test/onboard?payment=error');
    expect(getPaymentIntent).not.toHaveBeenCalled();
  });
});
