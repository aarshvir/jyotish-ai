import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inngest } from '@/lib/inngest/client';
import { finalizeCompletedZiinaIntent } from '@/lib/ziina/finalizeIntent';
import { dispatchBlueprintGenerate, failBlueprint, isBlueprintDoc, loadBlueprintJob, saveBlueprint, todayAt } from './deliver';
import type { BlueprintDoc } from './types';

vi.mock('@/lib/ziina/server', () => ({ getPaymentIntent: vi.fn() }));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/lib/api/jobToken', () => ({ createJobToken: vi.fn(() => 'tok'), getPipelineJobTokenTtlSeconds: vi.fn(() => 3600) }));
vi.mock('@/lib/promo/server', () => ({ redeemPromoCode: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/reports/extendMonthly', () => ({ extendReportToMonthly: vi.fn(async () => ({ ok: true })) }));

// Invented rows only — this repository is public.

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

/** A small in-memory PostgREST stand-in: eq/neq filters, update/upsert/insert, awaitable or maybeSingle. */
function fakeDb(tables: Tables) {
  return {
    from(table: string) {
      const eqs: [string, unknown][] = [];
      const nes: [string, unknown][] = [];
      let patch: Row | null = null;
      let upsert: Row | null = null;
      let insert: Row | null = null;
      const rows = () => (tables[table] ?? []).filter((r) => eqs.every(([c, v]) => r[c] === v) && nes.every(([c, v]) => r[c] !== v));
      const run = () => {
        if (patch) for (const r of rows()) Object.assign(r, patch);
        if (upsert) {
          const list = (tables[table] ??= []);
          const i = list.findIndex((r) => r.user_id === upsert!.user_id);
          if (i >= 0) list[i] = { ...list[i], ...upsert };
          else list.push({ ...upsert });
        }
        if (insert) (tables[table] ??= []).push({ ...insert });
      };
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => (eqs.push([c, v]), q),
        neq: (c: string, v: unknown) => (nes.push([c, v]), q),
        limit: () => q,
        update: (p: Row) => ((patch = p), q),
        upsert: (p: Row) => ((upsert = p), q),
        insert: (p: Row) => ((insert = p), q),
        maybeSingle: async () => {
          // Like PostgREST: the rows an UPDATE ... RETURNING reports are the ones that matched before it changed them.
          const found = rows();
          run();
          return { data: found[0] ?? null, error: null };
        },
        then: (res: (v: { data: null; error: null }) => unknown) => {
          run();
          return Promise.resolve({ data: null, error: null }).then(res);
        },
      };
      return q;
    },
  };
}

const NOW = Date.parse('2026-10-11T20:00:00Z');
const draft = (over: Row = {}): Row => ({
  id: 'r1',
  user_id: 'u1',
  user_email: 'a@example.test',
  native_name: 'Asha',
  birth_date: '1991-03-14',
  birth_time: '06:40:00',
  birth_city: 'Pune, India',
  birth_lat: 18.52,
  birth_lng: 73.86,
  timezone_offset: 330,
  plan_type: 'blueprint',
  payment_status: 'paid',
  status: 'pending',
  generation_started_at: null,
  report_data: null,
  personal_context: 'What is weighing on me most: Work and money.',
  ...over,
});
const doc = { kind: 'blueprint', version: 1, sections: [] } as unknown as BlueprintDoc;

describe('loadBlueprintJob', () => {
  it('builds the generator input from a paid blueprint row, with the reader’s local date', async () => {
    const r = await loadBlueprintJob(fakeDb({ reports: [draft()] }) as never, 'r1', NOW);
    expect(r).toEqual({
      ok: true,
      userId: 'u1',
      input: {
        name: 'Asha',
        birthDate: '1991-03-14',
        birthTime: '06:40',
        city: 'Pune, India',
        lat: 18.52,
        lng: 73.86,
        personalContext: 'What is weighing on me most: Work and money.',
        plan: 'blueprint',
        // 20:00 UTC is already the next day at +05:30.
        today: '2026-10-12',
      },
    });
  });

  it('never builds for an unpaid row, another plan, a missing row, or a finished document', async () => {
    const skip = async (row: Row | null) => {
      const r = await loadBlueprintJob(fakeDb({ reports: row ? [row] : [] }) as never, 'r1', NOW);
      return r.ok ? 'built' : r.skip;
    };
    expect(await skip(draft({ payment_status: 'unpaid' }))).toBe('not paid');
    expect(await skip(draft({ plan_type: 'monthly' }))).toBe('not a blueprint plan');
    expect(await skip(null)).toBe('no such report');
    expect(await skip(draft({ status: 'complete', report_data: doc }))).toBe('already complete');
    // A complete forecast row that is somehow marked blueprint but holds no document is rebuilt.
    expect(await skip(draft({ status: 'complete', report_data: { days: [] } }))).toBe('built');
  });

  it('refuses to guess a chart for a row with no birth place', async () => {
    await expect(loadBlueprintJob(fakeDb({ reports: [draft({ birth_lat: null })] }) as never, 'r1', NOW)).rejects.toThrow('no birth details');
  });

  it('treats a missing personal_context column as an empty brief, not a failure', async () => {
    const db = fakeDb({ reports: [draft()] });
    const orig = db.from.bind(db);
    db.from = ((t: string) => {
      const q = orig(t);
      const sel = q.select;
      q.select = ((cols: string) => {
        const r = sel();
        if (cols === 'personal_context') r.maybeSingle = (async () => ({ data: null, error: { message: 'column does not exist' } })) as never;
        return r;
      }) as never;
      return q;
    }) as never;
    const r = await loadBlueprintJob(db as never, 'r1', NOW);
    expect(r.ok && r.input.personalContext).toBe('');
  });

  it('todayAt follows the offset', () => {
    expect(todayAt(330, NOW)).toBe('2026-10-12');
    expect(todayAt(-300, NOW)).toBe('2026-10-11');
    expect(todayAt(null, NOW)).toBe('2026-10-11');
  });
});

describe('saving and failing', () => {
  it('stores the document in report_data and marks the row complete', async () => {
    const tables: Tables = { reports: [draft({ status: 'generating' })] };
    await saveBlueprint(fakeDb(tables) as never, 'r1', 'u1', doc);
    expect(tables.reports[0].status).toBe('complete');
    expect(isBlueprintDoc(tables.reports[0].report_data)).toBe(true);
  });

  it('records a failure without ever overwriting a finished document', async () => {
    const t1: Tables = { reports: [draft({ status: 'generating' })] };
    await failBlueprint(fakeDb(t1) as never, 'r1', 'u1', 'ephemeris down');
    expect(t1.reports[0].status).toBe('error');
    expect((t1.reports[0].report_data as { error: string }).error).toBe('ephemeris down');

    const t2: Tables = { reports: [draft({ status: 'complete', report_data: doc })] };
    await failBlueprint(fakeDb(t2) as never, 'r1', 'u1', 'late failure');
    expect(t2.reports[0].status).toBe('complete');
    expect(isBlueprintDoc(t2.reports[0].report_data)).toBe(true);
  });
});

describe('dispatchBlueprintGenerate', () => {
  beforeEach(() => {
    vi.mocked(inngest.send).mockClear();
    process.env.INNGEST_EVENT_KEY = 'test-key';
  });

  it('sends one event for a paid, unstarted blueprint', async () => {
    expect(await dispatchBlueprintGenerate(fakeDb({ reports: [draft()] }) as never, 'r1', NOW)).toBe('sent');
    const sent = vi.mocked(inngest.send).mock.calls[0][0] as { id: string; name: string; data: { reportId: string } };
    expect(sent).toMatchObject({ name: 'blueprint/generate', id: 'blueprint-generate:r1', data: { reportId: 'r1' } });
  });

  it('leaves alone: unpaid rows, finished documents, and a run that started minutes ago', async () => {
    expect(await dispatchBlueprintGenerate(fakeDb({ reports: [draft({ payment_status: 'unpaid' })] }) as never, 'r1', NOW)).toBe('skipped');
    expect(await dispatchBlueprintGenerate(fakeDb({ reports: [draft({ status: 'complete', report_data: doc })] }) as never, 'r1', NOW)).toBe('skipped');
    const young = new Date(NOW - 5 * 60_000).toISOString();
    expect(await dispatchBlueprintGenerate(fakeDb({ reports: [draft({ status: 'generating', generation_started_at: young })] }) as never, 'r1', NOW)).toBe('skipped');
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it('lets "try again" through with a fresh event id once a run has failed or gone stale', async () => {
    await dispatchBlueprintGenerate(fakeDb({ reports: [draft({ status: 'error' })] }) as never, 'r1', NOW);
    const stale = new Date(NOW - 90 * 60_000).toISOString();
    await dispatchBlueprintGenerate(fakeDb({ reports: [draft({ status: 'generating', generation_started_at: stale })] }) as never, 'r1', NOW);
    const ids = vi.mocked(inngest.send).mock.calls.map((c) => (c[0] as { id: string }).id);
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(id).toMatch(/^blueprint-generate:r1:/);
  });

  it('says so when background jobs are not configured, instead of pretending', async () => {
    delete process.env.INNGEST_EVENT_KEY;
    expect(await dispatchBlueprintGenerate(fakeDb({ reports: [draft()] }) as never, 'r1', NOW)).toBe('unavailable');
  });
});

describe('payment completion starts the blueprint, and only the blueprint', () => {
  const intent = { id: 'intent_1', status: 'completed', amount: 199, currency_code: 'INR' };
  beforeEach(() => {
    vi.mocked(inngest.send).mockClear();
    process.env.INNGEST_EVENT_KEY = 'test-key';
  });

  for (const plan of ['blueprint', 'blueprint_plus30']) {
    it(`a fresh ${plan} payment grants the row and sends blueprint/generate (not report/generate)`, async () => {
      const tables: Tables = {
        ziina_payments: [{ ziina_intent_id: 'intent_1', report_id: 'r1', plan_type: plan, status: 'pending', user_id: 'u1' }],
        reports: [draft({ plan_type: plan, payment_status: 'unpaid' })],
        analytics_events: [],
      };
      const result = await finalizeCompletedZiinaIntent(fakeDb(tables) as never, 'intent_1', 'https://example.test', { intent: intent as never });
      expect(result).toEqual({ ok: true, action: 'processed' });
      expect(tables.reports[0].payment_status).toBe('paid');
      expect(tables.reports[0].plan_type).toBe(plan);
      const sent = vi.mocked(inngest.send).mock.calls.map((c) => (c[0] as { name: string }).name);
      expect(sent).toEqual(['blueprint/generate']);
    });
  }

  it('a payment that was claimed but never granted is healed, and the blueprint is started', async () => {
    const tables: Tables = {
      ziina_payments: [{ ziina_intent_id: 'intent_1', report_id: 'r1', plan_type: 'blueprint', status: 'completed', user_id: 'u1' }],
      reports: [draft({ payment_status: 'unpaid' })],
      analytics_events: [],
    };
    const result = await finalizeCompletedZiinaIntent(fakeDb(tables) as never, 'intent_1', 'https://example.test', { intent: intent as never });
    expect(result).toEqual({ ok: true, action: 'already_done' });
    expect(tables.reports[0].payment_status).toBe('paid');
    expect(vi.mocked(inngest.send).mock.calls.map((c) => (c[0] as { name: string }).name)).toEqual(['blueprint/generate']);
  });

  it('a second verify of an already-delivered blueprint sends nothing', async () => {
    const tables: Tables = {
      ziina_payments: [{ ziina_intent_id: 'intent_1', report_id: 'r1', plan_type: 'blueprint', status: 'completed', user_id: 'u1' }],
      reports: [draft({ status: 'complete', report_data: doc })],
      analytics_events: [],
    };
    await finalizeCompletedZiinaIntent(fakeDb(tables) as never, 'intent_1', 'https://example.test', { intent: intent as never });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it('a forecast payment still starts the forecast pipeline, never a blueprint', async () => {
    const tables: Tables = {
      ziina_payments: [{ ziina_intent_id: 'intent_1', report_id: 'r2', plan_type: '7day', status: 'pending', user_id: 'u1' }],
      reports: [draft({ id: 'r2', plan_type: '7day', payment_status: 'unpaid' })],
      analytics_events: [],
    };
    await finalizeCompletedZiinaIntent(fakeDb(tables) as never, 'intent_1', 'https://example.test', { intent: intent as never });
    expect(vi.mocked(inngest.send).mock.calls.map((c) => (c[0] as { name: string }).name)).toEqual(['report/generate']);
  });
});
