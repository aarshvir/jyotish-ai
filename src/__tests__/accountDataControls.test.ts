import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as removeAccount } from '@/app/api/account/delete/route';
import { GET as exportAccount } from '@/app/api/account/export/route';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), deleteUser: vi.fn() }));
vi.mock('@/lib/api/requireAuth', () => ({ requireAuth: mocks.auth }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceClient: mocks.client }));

type Result = { data: unknown; error: { message: string } | null };
type Operation = { table: string; action: string; filters: Array<[string, string]> };
let operations: Operation[];
let failTable: string | null;
let throwTable: string | null;

class Query implements PromiseLike<Result> {
  action = 'read';
  filters: Array<[string, string]> = [];
  constructor(readonly table: string) {}
  select(_columns: string) { void _columns; return this; }
  delete() { this.action = 'delete'; return this; }
  update(_values: Record<string, unknown>) { void _values; this.action = 'update'; return this; }
  eq(column: string, value: string) { this.filters.push([column, value]); return this; }
  or(filter: string) { this.filters.push(['or', filter]); return this; }
  maybeSingle() { return this; }
  then<T1 = Result, T2 = never>(fulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null, rejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null): PromiseLike<T1 | T2> {
    operations.push({ table: this.table, action: this.action, filters: this.filters });
    const pending = this.table === throwTable ? Promise.reject(new Error('private-provider-detail'))
      : Promise.resolve({ data: this.table === 'user_profiles' ? { id: 'synthetic-owner' } : [], error: this.table === failTable ? { message: 'private-provider-detail' } : null });
    return pending.then(fulfilled, rejected);
  }
}

const request = (body: unknown = { confirm: 'DELETE', userId: 'must-be-ignored' }) => new NextRequest('https://example.test/api/account/delete', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); operations = []; failTable = null; throwTable = null;
  mocks.auth.mockResolvedValue({ user: { id: 'synthetic-owner', email: 'synthetic@example.invalid' } });
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.client.mockReturnValue({ from: (table: string) => new Query(table), auth: { admin: { deleteUser: mocks.deleteUser } } });
});

describe('owner-scoped account data controls (isolated fixtures, no real database)', () => {
  it('enforces authentication and deliberate confirmation before any mutation', async () => {
    for (const body of [null, {}, { confirm: 'delete' }]) expect((await removeAccount(request(body))).status).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    expect((await removeAccount(request())).status).toBe(401);
    expect((await exportAccount(new NextRequest('https://example.test/api/account/export'))).status).toBe(401);
  });

  it.each(['reports', 'kundali_charts', 'synastry_charts', 'user_profiles', 'feedback', 'newsletter_subscribers'])('keeps sign-in until %s cleanup is confirmed and acknowledges partial removal', async table => {
    failTable = table;
    const response = await removeAccount(request());
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toMatchObject({ code: 'DELETE_INCOMPLETE' });
    expect(data.error).toContain('may already have been removed');
    expect(data.error).not.toContain('unchanged');
    expect(data.error).not.toContain('private-provider-detail');
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(operations.at(-1)?.table).toBe(table);
  });

  it('stops later mutations after an unknown write outcome and permits an idempotent retry', async () => {
    throwTable = 'kundali_charts';
    expect((await removeAccount(request())).status).toBe(503);
    expect(operations.map(operation => operation.table)).toEqual(['reports', 'kundali_charts']);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    throwTable = null; operations = [];
    expect((await removeAccount(request())).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledWith('synthetic-owner');
    for (const operation of operations) {
      const expected = ['newsletter_subscribers', 'promo_usage'].includes(operation.table) ? 'synthetic@example.invalid' : 'synthetic-owner';
      expect(operation.filters[0][1]).toBe(expected);
    }
  });

  it('reports an uncertain final auth closure separately from an unchanged account', async () => {
    mocks.deleteUser.mockRejectedValue(new Error('unknown-close-outcome'));
    const response = await removeAccount(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('closure could not be confirmed');
  });

  it.each(['reports', 'feedback', 'referrals'])('refuses an incomplete %s export instead of producing a false empty download', async table => {
    failTable = table;
    const response = await exportAccount(new NextRequest('https://example.test/api/account/export'));
    expect(response.status).toBe(503);
    expect(response.headers.get('content-disposition')).toBeNull();
    expect(await response.json()).toMatchObject({ code: 'EXPORT_UNAVAILABLE' });
    expect(operations.every(operation => operation.action === 'read')).toBe(true);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('exports genuine empty collections with scope and owner filters, without querying an absent email', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'synthetic-owner' } });
    const response = await exportAccount(new NextRequest('https://example.test/api/account/export'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const data = await response.json();
    expect(data).toMatchObject({ account: { id: 'synthetic-owner' }, reports: [], newsletter: [] });
    expect(data.scope).toContain('separately saved quiz links are not included');
    expect(operations.some(operation => operation.table === 'newsletter_subscribers')).toBe(false);
    expect(operations.every(operation => operation.action === 'read' && operation.filters[0][1].includes('synthetic-owner'))).toBe(true);
  });
});
