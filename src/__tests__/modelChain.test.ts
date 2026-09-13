import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runModelChain,
  OWNER_MODEL_ORDER,
  RUNG_CAP_MS,
  RUNG_MIN_MS,
  DEADLINE_SAFETY_MS,
  reasoningOutputBudget,
  deepSeekMaxRequest,
  responsesRequest,
  responsesText,
  type AnthropicLike,
} from '@/lib/llm/modelChain';

vi.mock('@/lib/llm/audit', () => ({ logLlmAudit: vi.fn() }));

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

type Behaviour = 'ok' | 'fail' | 'truncate' | 'empty';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** A fake world where each provider behaves as told, recording the order it was called in. */
function world(b: Partial<Record<'openai' | 'anthropic' | 'grok' | 'deepseek', Behaviour>>) {
  const calls: string[] = [];
  const timeouts: Record<string, number> = {};
  const bodies: Record<string, unknown> = {};
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const rung = u.includes('openai.com') ? 'openai' : u.includes('x.ai') ? 'grok' : 'deepseek';
    calls.push(rung);
    bodies[rung] = JSON.parse(String(init?.body ?? '{}'));
    const beh = b[rung] ?? 'ok';
    if (beh === 'fail') return jsonResponse({ error: 'down' }, 503);
    if (rung === 'deepseek') {
      if (beh === 'truncate') return jsonResponse({ choices: [{ finish_reason: 'length', message: { content: '{"half' } }] });
      if (beh === 'empty') return jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: '' } }] });
      return jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: `answer from ${rung}` } }] });
    }
    if (beh === 'truncate') return jsonResponse({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } });
    if (beh === 'empty') return jsonResponse({ status: 'completed', output: [] });
    return jsonResponse({ status: 'completed', output: [{ content: [{ type: 'output_text', text: `answer from ${rung}` }] }] });
  }) as unknown as typeof fetch;

  const anthropic: AnthropicLike = {
    messages: {
      create: vi.fn(async (_p, options) => {
        calls.push('anthropic');
        timeouts.anthropic = options?.timeout ?? -1;
        const beh = b.anthropic ?? 'ok';
        if (beh === 'fail') throw Object.assign(new Error('overloaded'), { status: 529 });
        if (beh === 'truncate') return { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"half' }] };
        if (beh === 'empty') return { stop_reason: 'end_turn', content: [] };
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'answer from anthropic' }] };
      }),
    },
  };
  return { calls, timeouts, bodies, deps: { fetchImpl, anthropic } };
}

const base = { systemPrompt: 'S', userPrompt: 'U', maxTokens: 900, auditStage: 'test' };

describe('the owner model order', () => {
  it('is GPT → Opus → Grok → DeepSeek', () => {
    expect(OWNER_MODEL_ORDER).toEqual(['openai', 'anthropic', 'grok', 'deepseek']);
  });

  it('answers from GPT when GPT is healthy, calling nothing else', async () => {
    const w = world({});
    const r = await runModelChain({ ...base, deps: w.deps });
    expect(r.rung).toBe('openai');
    expect(w.calls).toEqual(['openai']);
  });

  it.each([
    [{ openai: 'fail' as const }, 'anthropic', ['openai', 'anthropic']],
    [{ openai: 'fail' as const, anthropic: 'fail' as const }, 'grok', ['openai', 'anthropic', 'grok']],
    [{ openai: 'fail' as const, anthropic: 'fail' as const, grok: 'fail' as const }, 'deepseek', ['openai', 'anthropic', 'grok', 'deepseek']],
  ])('falls through in order: %o → %s', async (beh, expected, calls) => {
    const w = world(beh);
    const r = await runModelChain({ ...base, deps: w.deps });
    expect(r.rung).toBe(expected);
    expect(w.calls).toEqual(calls);
  });

  it('throws with every rung’s reason when all fail', async () => {
    const w = world({ openai: 'fail', anthropic: 'fail', grok: 'fail', deepseek: 'fail' });
    await expect(runModelChain({ ...base, deps: w.deps })).rejects.toThrow(/openai[\s\S]*anthropic[\s\S]*grok[\s\S]*deepseek/);
  });
});

describe('truncation and emptiness are failures, not answers', () => {
  it.each([
    ['GPT status incomplete', { openai: 'truncate' as const }, 'anthropic'],
    ['Opus stop_reason max_tokens (the stub that shipped)', { openai: 'fail' as const, anthropic: 'truncate' as const }, 'grok'],
    ['DeepSeek finish_reason length', { openai: 'fail' as const, anthropic: 'fail' as const, grok: 'fail' as const, deepseek: 'truncate' as const }, null],
    ['GPT empty output', { openai: 'empty' as const }, 'anthropic'],
  ])('%s moves on', async (_label, beh, expected) => {
    const w = world(beh);
    if (expected === null) {
      await expect(runModelChain({ ...base, deps: w.deps })).rejects.toThrow(/truncated/);
    } else {
      expect((await runModelChain({ ...base, deps: w.deps })).rung).toBe(expected);
    }
  });

  it('rejects an answer the caller’s validator refuses, and tries the next rung', async () => {
    const w = world({});
    const r = await runModelChain({
      ...base,
      deps: w.deps,
      validate: (t) => {
        if (t.includes('openai')) throw new Error('JSON parse failed');
      },
    });
    expect(r.rung).toBe('anthropic');
  });
});

describe('deadlines — rungs run one after another inside one step', () => {
  it('skips a rung that has no API key', async () => {
    delete process.env.OPENAI_API_KEY;
    const w = world({});
    const r = await runModelChain({ ...base, deps: w.deps });
    expect(r.rung).toBe('anthropic');
    expect(w.calls).toEqual(['anthropic']);
  });

  it('gives a rung only the time that is left, capped at its own limit', async () => {
    let t = 1_000_000;
    const w = world({ openai: 'fail' });
    await runModelChain({ ...base, deps: { ...w.deps, now: () => t }, deadlineAt: t + 100_000 });
    expect(w.timeouts.anthropic).toBe(100_000 - DEADLINE_SAFETY_MS);
    await runModelChain({ ...base, deps: { ...w.deps, now: () => t }, deadlineAt: t + 10_000_000 });
    expect(w.timeouts.anthropic).toBe(RUNG_CAP_MS.anthropic);
    t += 0;
  });

  it('skips rungs that cannot possibly finish, but still runs a faster rung that can', async () => {
    const t = 5_000_000;
    const w = world({});
    // 1 ms short of the 25 s GPT/Opus/Grok need — but DeepSeek only needs 20 s, so it still runs.
    const r = await runModelChain({ ...base, deps: { ...w.deps, now: () => t }, deadlineAt: t + DEADLINE_SAFETY_MS + RUNG_MIN_MS.openai - 1 });
    expect(r.rung).toBe('deepseek');
    expect(w.calls).toEqual(['deepseek']);
  });

  it('starts nothing when no rung has time to finish', async () => {
    const t = 5_000_000;
    const w = world({});
    await expect(
      runModelChain({ ...base, deps: { ...w.deps, now: () => t }, deadlineAt: t + DEADLINE_SAFETY_MS + RUNG_MIN_MS.deepseek - 1 }),
    ).rejects.toThrow(/skipped/);
    expect(w.calls).toEqual([]);
  });
});

describe('request shapes', () => {
  it('asks GPT for high reasoning with headroom above what the caller needs', () => {
    const body = responsesRequest('gpt-5.6-terra', 'S', 'U', 900);
    expect(body.reasoning).toEqual({ effort: 'high' });
    expect(body.max_output_tokens).toBe(900 + 12_000);
    expect(reasoningOutputBudget(30_000)).toBe(32_000);
  });

  it('asks DeepSeek for thinking with a budget that does not truncate', () => {
    const body = deepSeekMaxRequest('deepseek-flash', 'S', 'U', 900);
    expect(body.thinking).toEqual({ type: 'enabled' });
    expect(body.max_tokens).toBeGreaterThanOrEqual(32_768);
    expect(deepSeekMaxRequest('deepseek-flash', 'S', 'U', 50_000).max_tokens).toBe(64_000);
  });

  it('sends GPT the owner’s model and reads Responses API text', async () => {
    const w = world({});
    await runModelChain({ ...base, deps: w.deps });
    expect((w.bodies.openai as { model: string }).model).toBe('gpt-5.6-terra');
    expect(responsesText({ output_text: ' hi ' })).toBe('hi');
    expect(responsesText({ output: [{ content: [{ type: 'output_text', text: 'a' }, { type: 'text', text: 'b' }] }] })).toBe('ab');
  });
});
