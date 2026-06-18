import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyReportReady } from './reportReady';

type Row = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
  db: null as { from: (table: string) => MockQuery } | null,
  sendEmail: vi.fn(),
  sendWhatsApp: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: () => mocks.db,
}));

vi.mock('./email', () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock('./whatsapp', () => ({
  sendWhatsApp: mocks.sendWhatsApp,
}));

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private nullFilters: string[] = [];
  private updatePayload: Row | null = null;

  constructor(private readonly rows: Row[]) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  is(column: string, value: unknown) {
    if (value === null) this.nullFilters.push(column);
    return this;
  }

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

  async maybeSingle() {
    const matched = this.matchedRows();
    if (this.updatePayload) {
      for (const row of matched) Object.assign(row, this.updatePayload);
    }
    return { data: matched[0] ?? null, error: null };
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matchedRows() {
    return this.rows.filter(
      (row) =>
        this.filters.every(([column, value]) => row[column] === value) &&
        this.nullFilters.every((column) => row[column] == null),
    );
  }

  private async execute() {
    if (this.updatePayload) {
      for (const row of this.matchedRows()) Object.assign(row, this.updatePayload);
    }
    return { data: null, error: null };
  }
}

function useReports(rows: Row[]) {
  mocks.db = {
    from(table: string) {
      expect(table).toBe('reports');
      return new MockQuery(rows);
    },
  };
}

describe('notifyReportReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leaves notify_sent_at unset when every configured channel fails', async () => {
    const reports = [
      {
        id: 'report_1',
        user_email: 'buyer@example.com',
        native_name: 'Aarsh',
        phone: null,
        plan_type: '7day',
        notify_sent_at: null,
      },
    ];
    useReports(reports);
    mocks.sendEmail.mockResolvedValueOnce({ ok: false, error: '503' });

    await notifyReportReady('report_1');

    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(reports[0].notify_sent_at).toBeNull();
  });

  it('marks notify_sent_at after a successful delivery', async () => {
    const reports = [
      {
        id: 'report_1',
        user_email: 'buyer@example.com',
        native_name: 'Aarsh',
        phone: null,
        plan_type: '7day',
        notify_sent_at: null,
      },
    ];
    useReports(reports);
    mocks.sendEmail.mockResolvedValueOnce({ ok: true });

    await notifyReportReady('report_1');

    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(typeof reports[0].notify_sent_at).toBe('string');
  });

  it('does not send again after notify_sent_at is already set', async () => {
    useReports([
      {
        id: 'report_1',
        user_email: 'buyer@example.com',
        native_name: 'Aarsh',
        phone: null,
        plan_type: '7day',
        notify_sent_at: '2026-06-18T20:00:00.000Z',
      },
    ]);

    await notifyReportReady('report_1');

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendWhatsApp).not.toHaveBeenCalled();
  });
});
