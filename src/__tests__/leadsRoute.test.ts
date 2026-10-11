import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Invented addresses only — this repository is public.

vi.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetAt: 0 })),
  getRateLimitKey: () => 'test',
}));
vi.mock('@/lib/analytics/server', () => ({ emitServerEvent: vi.fn(async () => {}) }));

const createServiceClient = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createServiceClient: () => createServiceClient() }));

const SESSION = '7d3c1f9e-1111-4222-8333-444455556666';
const payload = (over: Record<string, unknown> = {}) => ({
  sessionId: SESSION,
  slug: 'repeating-lessons',
  lang: 'en',
  email: 'asha.test@example.invalid',
  source: 'quiz_s15',
  consent: { service: true, marketing: true },
  answers: { focus_area: 'career', birth_date: '1990-04-12', birth_city: 'Testpur', birth_city_lat: '26.85', birth_city_lng: '80.95', birth_time_known: 'unknown' },
  ...over,
});
const post = (body: unknown) =>
  new NextRequest('http://localhost/api/lead/capture', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-vercel-ip-country': 'IN' } });

/** A fake supabase client: tables that "do not exist" return the error PostgREST would. */
function fakeDb(tables: { leads?: boolean; consent?: boolean; suppressed?: string[] }) {
  const calls: string[] = [];
  const inserted: { table: string; row: unknown }[] = [];
  const missing = (t: string) => ({ data: null, error: { message: `relation "public.${t}" does not exist` } });
  const rows: Record<string, unknown>[] = [];
  const db = {
    from(table: string) {
      calls.push(table);
      const chain: Record<string, unknown> = {};
      const res = (v: unknown) => Promise.resolve(v);
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.limit = () => (table === 'email_suppressions' ? res({ data: (tables.suppressed ?? []).map((email) => ({ email })), error: null }) : chain);
      chain.maybeSingle = () => (tables.leads ? res({ data: rows[0] ?? null, error: null }) : res(missing('leads')));
      chain.insert = (r: unknown) => {
        inserted.push({ table, row: r });
        if (table === 'leads') {
          if (!tables.leads) return { select: () => ({ single: () => res(missing('leads')) }) };
          rows.push({ id: '00000000-0000-4000-8000-000000000009', ...(r as object) });
          return { select: () => ({ single: () => res({ data: { id: '00000000-0000-4000-8000-000000000009' }, error: null }) }) };
        }
        return res(tables.consent ? { error: null } : { error: { message: 'relation "public.consent_events" does not exist' } });
      };
      chain.upsert = () => res({ error: null });
      chain.update = () => ({ eq: () => res({ error: null }) });
      return chain;
    },
  };
  return { db, calls, inserted };
}

beforeEach(() => {
  vi.resetModules();
  createServiceClient.mockReset();
  process.env.UNSUBSCRIBE_SECRET = 'unit-test-signing-key-not-a-secret';
  delete process.env.RESEND_API_KEY;
  process.env.LEADS_DRY_RUN = '1';
});

describe('POST /api/lead/capture', () => {
  it('refuses a request with no consent and a bad address, without touching the database', async () => {
    const { POST } = await import('@/app/api/lead/capture/route');
    expect((await POST(post(payload({ consent: { service: false } })))).status).toBe(400);
    expect((await POST(post(payload({ email: 'nope' })))).status).toBe(400);
    expect((await POST(post('garbage'))).status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('says plainly that nothing was saved when there is no database, and sends nothing', async () => {
    createServiceClient.mockImplementation(() => {
      throw new Error('no env');
    });
    const { POST } = await import('@/app/api/lead/capture/route');
    const res = await POST(post(payload()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, saved: false, emailed: false, reason: 'storage_unavailable' });
  });

  it('keeps a marketing-consented address on the old newsletter list while the leads table is missing', async () => {
    const f = fakeDb({ leads: false });
    createServiceClient.mockReturnValue(f.db);
    const { POST } = await import('@/app/api/lead/capture/route');
    const res = await POST(post(payload()));
    expect(await res.json()).toMatchObject({ saved: false, reason: 'storage_unavailable' });
    expect(f.calls).toContain('newsletter_subscribers');
  });

  it('saves, records consent and reports a dry run honestly: saved, not emailed', async () => {
    const f = fakeDb({ leads: true, consent: true });
    createServiceClient.mockReturnValue(f.db);
    const { POST } = await import('@/app/api/lead/capture/route');
    const res = await POST(post(payload()));
    const j = await res.json();
    expect(j).toEqual({ ok: true, saved: true, emailed: false, reason: 'dry_run' });
    expect(JSON.stringify(j)).not.toContain('asha.test');
    expect(f.calls).toEqual(expect.arrayContaining(['leads', 'consent_events', 'email_suppressions']));
  });

  it('does not send to an unsubscribed address', async () => {
    const f = fakeDb({ leads: true, consent: true, suppressed: ['asha.test@example.invalid'] });
    createServiceClient.mockReturnValue(f.db);
    const { POST } = await import('@/app/api/lead/capture/route');
    expect(await (await POST(post(payload()))).json()).toEqual({ ok: true, saved: true, emailed: false, reason: 'suppressed' });
  });

  it('stores nothing for a child’s birth date', async () => {
    const f = fakeDb({ leads: true, consent: true });
    createServiceClient.mockReturnValue(f.db);
    const { POST } = await import('@/app/api/lead/capture/route');
    const res = await POST(post(payload({ answers: { birth_date: '2015-01-01', focus_area: 'family' } })));
    expect(await res.json()).toEqual({ ok: true, saved: false, emailed: false, reason: 'minor' });
    expect(f.calls).not.toContain('consent_events');
  });
});

describe('GET /api/quiz/resume', () => {
  it('404s a missing or forged token', async () => {
    const { GET } = await import('@/app/api/quiz/resume/route');
    const bad = await GET(new NextRequest('http://localhost/api/quiz/resume?t=forged.token'));
    expect(bad.status).toBe(404);
    const none = await GET(new NextRequest('http://localhost/api/quiz/resume'));
    expect(none.status).toBe(404);
  });
});

describe('unsubscribing', () => {
  it('writes the withdrawal to the consent ledger for both purposes, without storing the address', async () => {
    const f = fakeDb({ leads: true, consent: true });
    const { recordUnsubscribe } = await import('@/lib/leads/withdraw');
    await recordUnsubscribe(f.db as never, 'Asha.Test@Example.invalid', 'list_unsubscribe_post');
    const rows = f.inserted.filter((i) => i.table === 'consent_events').flatMap((i) => i.row as Record<string, unknown>[]);
    expect(rows.map((r) => `${r.purpose}:${r.action}:${r.source}`)).toEqual(['service:withdrawn:list_unsubscribe_post', 'marketing:withdrawn:list_unsubscribe_post']);
    expect(JSON.stringify(rows)).not.toMatch(/asha/i);
  });

  it('never throws, even when the tables do not exist', async () => {
    const f = fakeDb({ leads: false, consent: false });
    const { recordUnsubscribe } = await import('@/lib/leads/withdraw');
    await expect(recordUnsubscribe(f.db as never, 'asha.test@example.invalid', 'unsubscribe_link')).resolves.toBeUndefined();
  });
});
