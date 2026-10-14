import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserChartsResponse } from '@/app/api/user/charts/route';
import { mergeSavedCharts } from '@/components/dashboard/savedCharts';
import { SavedChartLists } from '@/components/dashboard/SavedChartsPanel';

const mock = vi.hoisted(() => ({ auth: vi.fn(), createClient: vi.fn(), from: vi.fn(), results: {} as Record<string, unknown>, queries: {} as Record<string, { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> }> }));
vi.mock('@/lib/api/requireAuth', () => ({ requireAuth: mock.auth }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mock.createClient }));
import { GET } from '@/app/api/user/charts/route';

const owner = 'authenticated-owner-id';
const kundaliRow = { id: 'existing-kundali', person: { name: 'Returning person' }, created_at: '2026-10-01T00:00:00Z' };
const synastryRow = { id: 'existing-match', partner_a: { name: 'First person' }, partner_b: { name: 'Second person' }, ashtakoot: { total: 27 }, created_at: '2026-10-02T00:00:00Z' };
const request = () => new NextRequest('http://localhost/api/user/charts?user_id=another-owner');
const render = (charts: UserChartsResponse | null, transportError = false) => renderToStaticMarkup(React.createElement(SavedChartLists, { charts, transportError }));

beforeEach(() => {
  vi.stubGlobal('React', React);
  mock.auth.mockReset(); mock.createClient.mockReset(); mock.from.mockReset();
  mock.auth.mockResolvedValue({ user: { id: owner } });
  mock.createClient.mockResolvedValue({ from: mock.from });
  mock.results = { kundali_charts: { data: [kundaliRow], error: null }, synastry_charts: { data: [synastryRow], error: null } };
  mock.queries = {};
  mock.from.mockImplementation((table: string) => {
    const result = mock.results[table];
    if (result === 'construction-error') throw new Error('Query construction failed');
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
    query.limit.mockImplementation(() => result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
    mock.queries[table] = query;
    return query;
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('saved charts recovery API and actual list rendering', () => {
  it('keeps both database failures unavailable, never genuinely empty', async () => {
    mock.results.kundali_charts = { data: null, error: { message: 'Internal table unavailable' } };
    mock.results.synastry_charts = { data: null, error: { message: 'Private query detail' } };
    const response = await GET(request());
    const payload = await response.json() as UserChartsResponse;
    expect(response.status).toBe(200);
    expect(payload).toEqual({ kundali: [], synastry: [], unavailable: { kundali: true, synastry: true } });
    const html = render(payload);
    expect(html).toContain('Could not retrieve this collection');
    expect(html).not.toContain('No saved');
    expect(JSON.stringify(payload)).not.toMatch(/Internal table|Private query/);
  });

  it.each(['kundali_charts', 'synastry_charts'])('preserves the successful collection when %s fails', async table => {
    mock.results[table] = { data: null, error: { message: 'Unavailable' } };
    const response = await GET(request());
    const payload = await response.json() as UserChartsResponse;
    expect(payload.unavailable).toEqual({ kundali: table === 'kundali_charts', synastry: table === 'synastry_charts' });
    if (table === 'kundali_charts') {
      expect(payload.synastry).toHaveLength(1);
      expect(render(payload)).toContain('/synastry/existing-match');
      expect(render(payload)).not.toContain('No saved Kundli');
    } else {
      expect(payload.kundali).toHaveLength(1);
      expect(render(payload)).toContain('/kundali/existing-kundali');
      expect(render(payload)).not.toContain('No saved matches');
    }
  });

  it('shows genuine empty states only after successful empty queries', async () => {
    mock.results.kundali_charts = { data: [], error: null };
    mock.results.synastry_charts = { data: [], error: null };
    const payload = await (await GET(request())).json() as UserChartsResponse;
    expect(payload.unavailable).toEqual({ kundali: false, synastry: false });
    expect(render(payload)).toContain('No saved Kundli readings found');
    expect(render(payload)).toContain('No saved matches found');
    expect(render(payload)).not.toContain('Could not retrieve');
  });

  it.each([new Error('Read rejected'), 'construction-error'])('flags exceptions without dropping the other collection', async failure => {
    mock.results.kundali_charts = failure;
    const payload = await (await GET(request())).json() as UserChartsResponse;
    expect(payload.unavailable).toEqual({ kundali: true, synastry: false });
    expect(payload.synastry).toHaveLength(1);
  });

  it('filters both reads by the authenticated owner, preserves RLS client and never trusts query ownership', async () => {
    const response = await GET(request());
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    for (const table of ['kundali_charts', 'synastry_charts']) {
      expect(mock.queries[table].eq).toHaveBeenCalledExactlyOnceWith('user_id', owner);
      expect(mock.queries[table].order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mock.queries[table].limit).toHaveBeenCalledWith(50);
    }
  });

  it('never queries records when authentication fails', async () => {
    mock.auth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    expect((await GET(request())).status).toBe(401);
    expect(mock.createClient).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('flags both collections on a database-client failure', async () => {
    mock.createClient.mockRejectedValue(new Error('Connection unavailable'));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ kundali: [], synastry: [], unavailable: { kundali: true, synastry: true } });
  });
});

describe('saved-chart refresh continuity', () => {
  const previous: UserChartsResponse = {
    kundali: [{ id: 'previous-kundali', name: 'Previous saved reading', created_at: '2026-10-01T00:00:00Z' }],
    synastry: [{ id: 'previous-match', partnerA: 'A', partnerB: 'B', score: 28, created_at: '2026-10-01T00:00:00Z' }],
    unavailable: { kundali: false, synastry: false },
  };
  it('keeps both previous collections visible on failed refresh, with explicit stale guidance', () => {
    const merged = mergeSavedCharts(previous, { kundali: [], synastry: [], unavailable: { kundali: true, synastry: true } });
    expect(merged.kundali).toEqual(previous.kundali); expect(merged.synastry).toEqual(previous.synastry);
    expect(render(merged)).toContain('/kundali/previous-kundali');
    expect(render(merged)).toContain('/synastry/previous-match');
    expect(render(merged)).toContain('last successful load');
    expect(render(merged)).not.toContain('No saved');
  });
  it('updates the successful collection and preserves only the failed collection', () => {
    const merged = mergeSavedCharts(previous, { kundali: [], synastry: [], unavailable: { kundali: true, synastry: false } });
    expect(merged.kundali).toEqual(previous.kundali); expect(merged.synastry).toEqual([]);
    expect(render(merged)).toContain('No saved matches found');
    expect(render(merged)).not.toContain('No saved Kundli');
  });
  it('keeps items visible after an HTTP or network failure and never shows a false empty state initially', () => {
    expect(render(previous, true)).toContain('/kundali/previous-kundali');
    expect(render(previous, true)).toContain('last successful load');
    expect(render(null, true)).not.toContain('No saved');
    expect(render(null, true)).toContain('Could not retrieve');
  });
  it('replaces a previous collection with genuine empty results on a successful reload', () => {
    const result = mergeSavedCharts(previous, { kundali: [], synastry: [], unavailable: { kundali: false, synastry: false } });
    expect(result.kundali).toEqual([]); expect(result.synastry).toEqual([]);
    expect(render(result)).toContain('No saved Kundli readings found');
  });
});
