import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateNatal } from '@/lib/ephemeris/calculateNatal';
import { POST as kundali } from '@/app/api/kundali/teaser/route';
import { POST as synastry } from '@/app/api/synastry/teaser/route';
import { syntheticNatal } from '@/lib/tools/test-fixtures';

vi.mock('@/lib/api/rateLimit', () => ({ checkRateLimit: async () => ({ allowed: true }), getRateLimitKey: () => 'synthetic-test' }));
const person = { birth_date: '1990-05-15', birth_time: '09:30:00', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.209 };
beforeEach(() => {
  vi.stubEnv('EPHEMERIS_SERVICE_URL', 'https://deterministic.example/');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'must-never-be-forwarded');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(syntheticNatal)));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('birth transport and compatibility inputs', () => {
  it('does not forward a privileged header to a caller-controlled origin', async () => {
    for (const [handler, body] of [[kundali, { person }], [synastry, { partnerA: person, partnerB: person }]] as const) {
      const response = await handler(new NextRequest('https://untrusted.example/api/tools', { method: 'POST', body: JSON.stringify(body) }));
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    for (const [url, init] of vi.mocked(fetch).mock.calls) {
      expect(url).toBe('https://deterministic.example/natal-chart');
      expect(JSON.stringify(init)).not.toContain('must-never-be-forwarded');
      expect(init?.cache).toBe('no-store');
    }
  });

  it.each([null, {}, { person: { ...person, birth_time: '' } }, { person: { ...person, birth_date: '2025-02-30' } }])('rejects invalid free-chart input before contacting the provider', async body => {
    expect((await kundali(new NextRequest('https://example.test/api/kundali/teaser', { method: 'POST', body: JSON.stringify(body) }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles malformed provider data with a recoverable response', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ planets: {}, error: 'private-provider-detail' }));
    const response = await kundali(new NextRequest('https://example.test/api/kundali/teaser', { method: 'POST', body: JSON.stringify({ person }) }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-provider-detail');
  });

  it('returns a chart when the engine has no current period', async () => {
    const ended = { ...syntheticNatal, current_dasha: {}, functional_nature: { Sun: 'benefic' } };
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(ended));
    const chart = await calculateNatal({ ...person, birth_date: '1900-03-15' });
    expect(chart.lagna).toBe('Gemini');
    expect(chart.planets.Moon.sign).toBe('Sagittarius');
    expect(chart.current_dasha).toEqual({});
    expect(chart.functional_nature).toEqual({ Sun: 'benefic' });
  });

  it('preserves dasha sub-periods for existing full readings and bounds a stalled JSON body', async () => {
    const full = { ...syntheticNatal, dasha_sequence: [{ planet: 'Moon', start_date: '2020-01-01', end_date: '2030-01-01', antardasha: [{ planet: 'Mars', start_date: '2022-01-01', end_date: '2023-01-01' }] }] };
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(full));
    expect((await calculateNatal(person)).dasha_sequence[0].antardasha).toEqual(full.dasha_sequence[0].antardasha);
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: () => new Promise(() => {}) } as Response);
    const pending = expect(calculateNatal(person, undefined, 10)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(11);
    await pending;
  });
});
