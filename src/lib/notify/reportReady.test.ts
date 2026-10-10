import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyReportReady } from './reportReady';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';

vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('./email', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('./whatsapp', () => ({
  sendWhatsApp: vi.fn(),
}));

vi.mock('@/lib/admin/analytics', () => ({
  isFreePlan: vi.fn(() => false),
}));

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

class MockQuery {
  private filters: Array<[string, unknown]> = [];
  private nullFilters: string[] = [];
  private updatePayload: Row | null = null;

  constructor(
    private readonly tables: Tables,
    private readonly table: string,
  ) {}

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

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

  async maybeSingle() {
    const rows = this.rows();
    if (this.updatePayload) {
      for (const row of rows) Object.assign(row, this.updatePayload);
    }
    return { data: rows[0] ?? null, error: null };
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
        this.nullFilters.every((column) => row[column] == null),
    );
  }

  private async execute() {
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

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedSendEmail = vi.mocked(sendEmail);
const mockedSendWhatsApp = vi.mocked(sendWhatsApp);

describe('notifyReportReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSendWhatsApp.mockResolvedValue({ ok: true });
  });

  it('clears the idempotency claim when delivery fails so a later retry can notify', async () => {
    const tables: Tables = {
      reports: [
        {
          id: 'report_1',
          user_email: 'seeker@example.com',
          native_name: 'Asha',
          phone: '',
          plan_type: '7day',
          notify_sent_at: null,
        },
      ],
    };
    mockedCreateServiceClient.mockReturnValue(createMockDb(tables) as never);
    mockedSendEmail
      .mockResolvedValueOnce({ ok: false, error: 'resend_timeout' })
      .mockResolvedValueOnce({ ok: true });

    await notifyReportReady('report_1');
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(tables.reports[0].notify_sent_at).toBeNull();

    await notifyReportReady('report_1');
    expect(mockedSendEmail).toHaveBeenCalledTimes(2);
    expect(typeof tables.reports[0].notify_sent_at).toBe('string');
  });

  it('keeps the idempotency claim after a successful delivery', async () => {
    const tables: Tables = {
      reports: [
        {
          id: 'report_1',
          user_email: 'seeker@example.com',
          native_name: 'Asha',
          phone: '',
          plan_type: '7day',
          notify_sent_at: null,
        },
      ],
    };
    mockedCreateServiceClient.mockReturnValue(createMockDb(tables) as never);
    mockedSendEmail.mockResolvedValue({ ok: true });

    await notifyReportReady('report_1');
    await notifyReportReady('report_1');

    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(typeof tables.reports[0].notify_sent_at).toBe('string');
  });
});
