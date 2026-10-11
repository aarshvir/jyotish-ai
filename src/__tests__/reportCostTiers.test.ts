import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runModelChain, type AnthropicLike } from '@/lib/llm/modelChain';
import { anthropicTuning } from '@/lib/llm/anthropicTuning';
import { costUsd } from '@/lib/llm/cost';
import { resolveReportTier, tierModel, TIER_MODELS, ROUTE_ENV, type TierRoute } from '@/lib/reports/qualityTier';
import { resolveHourlyBatchDays, resolveHourlyProseDays, resolveProseDayCount } from '@/lib/reports/hourlyProseWindow';

vi.mock('@/lib/llm/audit', () => ({ logLlmAudit: vi.fn() }));

const ROUTES = Object.keys(ROUTE_ENV) as TierRoute[];

describe('report tiers', () => {
  it('defaults to "current": nothing is pinned, so every route keeps the model order it has today', () => {
    expect(resolveReportTier({})).toBe('current');
    expect(resolveReportTier({ REPORT_TIER: 'nonsense' })).toBe('current');
    expect(resolveReportTier({ REPORT_TIER: ' Standard ' })).toBe('standard');
    for (const r of ROUTES) expect(tierModel(r, {})).toBeUndefined();
  });

  it('"standard" writes the reading on Sonnet 5.5 and the hourly prose on Haiku 5.5; "premium" on Opus 5.5 and Sonnet 5.5', () => {
    const env = { REPORT_TIER: 'standard' };
    expect(tierModel('daily', env)).toBe('claude-sonnet-5-5');
    expect(tierModel('months', env)).toBe('claude-sonnet-5-5');
    expect(tierModel('weeks', env)).toBe('claude-sonnet-5-5');
    expect(tierModel('nativity', env)).toBe('claude-sonnet-5-5');
    expect(tierModel('hourly', env)).toBe('claude-haiku-5-5');
    const p = { REPORT_TIER: 'premium' };
    expect(tierModel('daily', p)).toBe('claude-opus-5-5');
    expect(tierModel('hourly', p)).toBe('claude-sonnet-5-5');
  });

  it('a variable that pins one route beats the tier, and a blank one is ignored', () => {
    expect(tierModel('hourly', { REPORT_TIER: 'standard', REPORT_HOURLY_BATCH_MODEL: 'claude-haiku-4-5-20251001' })).toBe('claude-haiku-4-5-20251001');
    expect(tierModel('hourly', { REPORT_TIER: 'standard', REPORT_HOURLY_BATCH_MODEL: '  ' })).toBe('claude-haiku-5-5');
    expect(tierModel('months', { REPORT_MONTHLY_MODEL: 'gpt-5.6-terra' })).toBe('gpt-5.6-terra');
    expect(tierModel('daily', { REPORT_DAILY_MODEL: 'claude-opus-5' })).toBe('claude-opus-5');
  });

  it('every model a tier names has a known price, so a report’s cost can always be summed', () => {
    for (const tier of ['standard', 'premium'] as const) {
      for (const [route, model] of Object.entries(TIER_MODELS[tier])) expect(costUsd(model, 1000, 1000), `${tier}/${route}`).not.toBeNull();
    }
  });

  it('the measured per-call figures quoted in src/lib/reports/qualityTier.ts follow from tokens and list prices', () => {
    // Measured 2026-10-11, one 6-day daily-overviews call, invented person, same data each time.
    expect(costUsd('claude-sonnet-5-5', 18_596, 3_035)).toBeCloseTo(0.0675, 3);
    expect(costUsd('claude-haiku-5-5', 18_596, 2_799)).toBeCloseTo(0.0033, 3);
    // The call that was thrown away: Opus 5, cut off at its 10,000-token cap, then re-run elsewhere.
    expect(costUsd('claude-opus-5', 13_000, 10_000)).toBeCloseTo(0.315, 3);
    // Hourly prose per day: Haiku 4.5 (today's default) against Haiku 5.5.
    expect(costUsd('claude-haiku-4-5-20251001', 3_235, 4_155)).toBeCloseTo(0.024, 3);
    expect(costUsd('claude-haiku-5-5', 4_395, 3_575)).toBeCloseTo(0.0022, 3);
  });

  it('keeps the hourly window arithmetic the docs describe', () => {
    expect(resolveHourlyProseDays(undefined)).toBe(10);
    expect(resolveProseDayCount(10, 30)).toBe(10);
    expect(resolveHourlyBatchDays(10)).toBe(2);
    // Thirty days up front would need 5-day batches, which overran the output cap on Haiku 4.5.
    expect(resolveHourlyBatchDays(30)).toBe(5);
  });
});

describe('thinking settings', () => {
  it('turns up-front thinking off for Sonnet 5.5 and Haiku 5.5, and adds nothing for models the routes already pin', () => {
    expect(anthropicTuning('claude-sonnet-5-5')).toEqual({ thinking: { type: 'between_tools' }, output_config: { effort: 'medium' } });
    expect(anthropicTuning('claude-haiku-5-5')).toEqual({ thinking: { type: 'disabled' }, output_config: { effort: 'medium' } });
    expect(anthropicTuning('claude-haiku-4-5-20251001')).toEqual({});
    expect(anthropicTuning('claude-opus-5', {})).toEqual({});
  });

  it('applies an effort to Opus only when LLM_ANTHROPIC_EFFORT asks for one', () => {
    expect(anthropicTuning('claude-opus-5', { LLM_ANTHROPIC_EFFORT: 'medium' })).toEqual({ output_config: { effort: 'medium' } });
    expect(anthropicTuning('claude-opus-5-5', { LLM_ANTHROPIC_EFFORT: 'low' })).toEqual({ output_config: { effort: 'low' } });
    expect(anthropicTuning('claude-opus-5', { LLM_ANTHROPIC_EFFORT: 'extreme' })).toEqual({});
  });
});

describe('the model chain: pinned model and wasted calls', () => {
  const KEYS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY'] as const;
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      process.env[k] = `test-${k}`;
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
  });

  function setup(anthropicBehaviour: (model: string) => 'ok' | 'truncate') {
    const models: string[] = [];
    const anthropic: AnthropicLike = {
      messages: {
        create: vi.fn(async (p) => {
          models.push(p.model);
          const b = anthropicBehaviour(p.model);
          return b === 'truncate'
            ? { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"half' }], usage: { input_tokens: 13_000, output_tokens: 10_000 } }
            : { stop_reason: 'end_turn', content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 500, output_tokens: 300 } };
        }),
      },
    };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503 })) as unknown as typeof fetch;
    return { models, anthropic, fetchImpl };
  }
  const base = { systemPrompt: 'S', userPrompt: 'U', maxTokens: 900, auditStage: 'test' };

  it('tries a pinned Claude model first, before the owner’s order, and stops there when it answers', async () => {
    const w = setup(() => 'ok');
    const r = await runModelChain({ ...base, pin: 'claude-sonnet-5-5', deps: { fetchImpl: w.fetchImpl, anthropic: w.anthropic } });
    expect(r.model).toBe('claude-sonnet-5-5');
    expect(w.models).toEqual(['claude-sonnet-5-5']);
    expect(w.fetchImpl).not.toHaveBeenCalled(); // GPT was never asked
  });

  it('falls back to the owner’s order when the pinned model fails', async () => {
    const w = setup((m) => (m === 'claude-sonnet-5-5' ? 'truncate' : 'ok'));
    const r = await runModelChain({ ...base, pin: 'claude-sonnet-5-5', deps: { fetchImpl: w.fetchImpl, anthropic: w.anthropic } });
    expect(w.models[0]).toBe('claude-sonnet-5-5');
    expect(r.rung).toBe('anthropic'); // GPT is down in this world, so Opus answers next
    expect(r.model).not.toBe('claude-sonnet-5-5');
  });

  it('does not try the same Claude model twice when the pin is also the chain’s own Claude model', async () => {
    const w = setup(() => 'truncate');
    await expect(runModelChain({ ...base, pin: 'claude-opus-5', deps: { fetchImpl: w.fetchImpl, anthropic: w.anthropic } })).rejects.toThrow();
    expect(w.models.filter((m) => m === 'claude-opus-5')).toHaveLength(1);
  });

  it('logs a thrown-away (cut-off) call with its tokens, so a report’s cost includes it', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void lines.push(String(a[0])));
    const w = setup((m) => (m === 'claude-opus-5' ? 'truncate' : 'ok'));
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('openai.com')) return new Response('{}', { status: 429 });
      return new Response('{}', { status: 503 });
    }) as unknown as typeof fetch;
    await runModelChain({ ...base, deps: { fetchImpl, anthropic: w.anthropic } }).catch(() => undefined);
    const wasted = lines.map((l) => { try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; } }).filter((j) => j && j.wasted === true);
    expect(wasted).toHaveLength(1);
    expect(wasted[0]).toMatchObject({ type: 'llm_usage', rung: 'anthropic', model: 'claude-opus-5', input: 13_000, output: 10_000, wasted: true });
    expect(costUsd('claude-opus-5', 13_000, 10_000)).toBeCloseTo(0.315, 3);
  });
});
