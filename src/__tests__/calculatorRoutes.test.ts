import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tools/chart/route';
import { GET } from '@/app/api/geocode/route';
import { syntheticNatal } from '@/lib/tools/test-fixtures';

const mocks = vi.hoisted(() => ({ allowed: true, cache: null as unknown, failCache: false, auth: vi.fn(), records: vi.fn(), cacheSet: vi.fn() }));
vi.mock('@/lib/api/rateLimit', () => ({ checkRateLimit: vi.fn(async () => ({ allowed: mocks.allowed })), getRateLimitKey: () => 'synthetic-test' }));
vi.mock('@/lib/redis/cache', () => ({
  stableCacheKey: () => 'synthetic-key',
  cacheGet: async () => { if (mocks.failCache) throw new Error('private cache host'); return mocks.cache; },
  cacheSet: mocks.cacheSet,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.auth }));
vi.mock('@/lib/supabase/admin', () => ({ createServiceClient: mocks.records }));

const birth = { birth_date: '2000-02-29', birth_time: '06:30:00', birth_city: 'London, UK', birth_lat: 51.5, birth_lng: 0 };
function chartRequest(body: unknown = { person: birth }) {
  return new NextRequest('https://untrusted-host.example/api/tools/chart', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}
function geoRequest(city = 'London, UK') { return new NextRequest(`https://example.test/api/geocode?city=${encodeURIComponent(city)}`); }

beforeEach(() => {
  mocks.allowed = true; mocks.cache = null; mocks.failCache = false;
  mocks.auth.mockClear(); mocks.records.mockClear(); mocks.cacheSet.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(syntheticNatal)));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('free calculator chart API', () => {
  it('returns every deterministic result anonymously without auth/newsletter writes, even with a legacy email', async () => {
    const response = await POST(chartRequest({ person: birth, email: 'synthetic@example.test' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const data = await response.json();
    expect(data).toMatchObject({ lagna: 'Gemini', moon_sign: 'Sagittarius', doshas: { manglik: { present: expect.any(Boolean) } } });
    expect(data).not.toHaveProperty('doshas_locked');
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.records).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).not.toContain('synthetic@example.test');
  });
  it('uses only the configured deterministic backend, never request origin or secret headers', async () => {
    vi.stubEnv('EPHEMERIS_SERVICE_URL', 'https://deterministic.example/');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-secret');
    await POST(chartRequest());
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][0]).toBe('https://deterministic.example/natal-chart');
    expect(JSON.stringify(calls)).not.toMatch(/private-service-secret|untrusted-host|x-service-key/);
    expect(JSON.parse(calls[0][1]?.body as string)).toEqual(birth);
  });
  it.each([null, {}, { person: null }, { person: { ...birth, birth_date: '2023-02-29' } }, { person: { ...birth, birth_date: '2999-01-01' } }, { person: { ...birth, birth_time: '' } }, { person: { ...birth, birth_time: '24:00:00' } }, { person: { ...birth, birth_lat: null } }])('rejects invalid payload before any calculation', async body => {
    expect((await POST(chartRequest(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('gives an honest unavailable explanation for unknown time, not a noon chart', async () => {
    const response = await POST(chartRequest({ person: { ...birth, birth_time_accuracy: 'unknown', birth_time: '' } }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'UNKNOWN_TIME' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps approximate output explicitly provisional', async () => {
    const response = await POST(chartRequest({ person: { ...birth, birth_time_accuracy: 'approximate' } }));
    expect(await response.json()).toMatchObject({ birth_time_accuracy: 'approximate' });
  });
  it('retains natal facts when live Saturn fails, with unknown rather than false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(syntheticNatal)).mockRejectedValueOnce(new Error('private birth data provider failure'));
    const response = await POST(chartRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ lagna: 'Gemini', doshas: { sadeSati: { present: null } } });
  });
  it('bounds natal calculation and recovers on retry', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    const pending = POST(chartRequest());
    await vi.advanceTimersByTimeAsync(16_001);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ code: 'CALCULATION_TIMEOUT' });
    expect((await POST(chartRequest())).status).toBe(200);
  });
  it('bounds live Saturn separately, preserving an unknown result', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(syntheticNatal)).mockImplementationOnce(() => new Promise(() => {}));
    const pending = POST(chartRequest());
    await vi.advanceTimersByTimeAsync(4_001);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ doshas: { sadeSati: { present: null } } });
  });
  it('never leaks arbitrary errors or malformed provider responses', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('birth details, provider token SECRET'));
    const response = await POST(chartRequest());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/birth details|SECRET|provider token/);
  });
  it('rate limits before performing calculation', async () => {
    mocks.allowed = false;
    expect((await POST(chartRequest())).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('geocode API', () => {
  it('returns sanitized candidates including real zero coordinates', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json([{ lat: '51.5', lon: '0', display_name: 'London, UK', provider_secret: 'secret' }, { lat: '0', lon: '-78.5', display_name: 'Town, Ecuador' }]));
    const response = await GET(geoRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ lat: 51.5, lon: 0, display_name: 'London, UK' }, { lat: 0, lon: -78.5, display_name: 'Town, Ecuador' }]);
  });
  it.each(['', 'x', 'x'.repeat(121), 'Town\nCountry'])('rejects invalid city query before provider call', async city => {
    expect((await GET(geoRequest(city))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds stalled location lookups and makes retry possible', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(Response.json([]));
    const pending = GET(geoRequest());
    await vi.advanceTimersByTimeAsync(6_001);
    expect((await pending).status).toBe(504);
    expect((await GET(geoRequest())).status).toBe(200);
  });
  it('tolerates cache failures without exposing internals', async () => {
    mocks.failCache = true;
    mocks.cacheSet.mockRejectedValue(new Error('private cache host'));
    vi.mocked(fetch).mockResolvedValue(Response.json([]));
    expect((await GET(geoRequest())).status).toBe(200);
  });
  it('sanitizes cached candidates too', async () => {
    mocks.cache = [{ lat: 51.5, lon: 0, display_name: 'London, UK', secret: 'secret' }];
    expect(await (await GET(geoRequest())).json()).toEqual([{ lat: 51.5, lon: 0, display_name: 'London, UK' }]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns safe errors for provider failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private search query provider secret'));
    const response = await GET(geoRequest());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(/private|provider|secret/);
  });
});
