import Anthropic from '@anthropic-ai/sdk';
import { cleanEnv } from '@/lib/env';
import { logLlmAudit } from '@/lib/llm/audit';

/**
 * THE MODEL ORDER — one chain, used by every report-generation call.
 *
 * Owner instruction 2026-09-13: GPT 5.6 Terra (high reasoning) → Claude Opus 5 → Grok → DeepSeek
 * V4.1-Flash (max). Before this, nativity called Opus directly, completeLlmChat defaulted to Opus, and a
 * separate fallback chain ran OpenAI → Grok → DeepSeek behind it — three orders in three places.
 *
 * Three lessons from measuring real paid-report prompts are built in here, because each one silently
 * produced a stub or a failed paid report before:
 *
 *  1. RUNGS RUN ONE AFTER ANOTHER INSIDE ONE INNGEST STEP (290 s in production). A rung that hangs to a
 *     fixed timeout leaves the next rung no time at all, so every rung gets `min(its cap, time left)` and
 *     a rung that cannot possibly finish is skipped rather than started and killed.
 *  2. TRUNCATION IS FAILURE. Opus 5 at max_tokens 8,000 stopped mid-JSON and a stub shipped; DeepSeek
 *     returned `finish_reason: length`. A response that ran out of budget moves to the next rung.
 *  3. REASONING TOKENS ARE BILLED INSIDE THE OUTPUT BUDGET. gpt-5.6-terra at high reasoning used 4,046
 *     reasoning tokens on one nativity; DeepSeek with thinking used 21–28k characters of reasoning. A
 *     caller asking for 900 tokens would get nothing back, so reasoning rungs get headroom on top.
 *
 * Measured on the real production nativity prompt (3k system + 22k user characters):
 *   gpt-5.6-terra high   82 s,   7,335 output tokens (4,046 reasoning)   complete
 *   claude-opus-5       127–163 s, ~11k output tokens                  complete at 16,000
 *   deepseek-flash max   ~45 s, thinking on, max_tokens 32,768           complete
 *   Grok                 UNVERIFIED — xAI returns 403 (credits exhausted) and will not list models.
 *
 * Every successful call logs one `{"type":"llm_usage", ...}` line (tokens, reasoning, seconds, rung) so
 * the real cost of a report can be summed from logs instead of estimated.
 */

export type Rung = 'openai' | 'anthropic' | 'grok' | 'deepseek';

export const OWNER_MODEL_ORDER: readonly Rung[] = ['openai', 'anthropic', 'grok', 'deepseek'];

/** Model per rung. Env overrides exist so a model can be swapped without a deploy of new code. */
export function chainModels(): Record<Rung, string> {
  return {
    openai: cleanEnv(process.env.LLM_OPENAI_MODEL) || 'gpt-5.6-terra',
    anthropic: cleanEnv(process.env.LLM_ANTHROPIC_MODEL) || 'claude-opus-5',
    // Owner asked for "Grok 6 4.6 extra high". The exact id cannot be verified until xAI credits are
    // restored; grok-4.20 is the newest id this account has ever answered to. Set LLM_GROK_MODEL once known.
    grok: cleanEnv(process.env.LLM_GROK_MODEL) || 'grok-4.20',
    deepseek: cleanEnv(process.env.LLM_DEEPSEEK_MODEL) || 'deepseek-flash',
  };
}

function keyFor(rung: Rung): string {
  switch (rung) {
    case 'openai':
      return cleanEnv(process.env.OPENAI_API_KEY);
    case 'anthropic':
      return cleanEnv(process.env.ANTHROPIC_API_KEY);
    case 'grok':
      return cleanEnv(process.env.GROK_API_KEY);
    case 'deepseek':
      return cleanEnv(process.env.DEEPSEEK_API_KEY);
  }
}

/** Longest a single rung may run, even when the deadline would allow more. */
export const RUNG_CAP_MS: Record<Rung, number> = {
  openai: 150_000,
  anthropic: 240_000,
  grok: 150_000,
  deepseek: 120_000,
};

/** With less time left than this, a rung is skipped instead of started and certainly killed. */
export const RUNG_MIN_MS: Record<Rung, number> = {
  openai: 25_000,
  anthropic: 25_000,
  grok: 25_000,
  deepseek: 20_000,
};

/** Kept back from every deadline so the caller can still parse, persist and respond. */
export const DEADLINE_SAFETY_MS = 3_000;

/** Default overall deadline when the caller gives none: inside a 300 s route with room to respond. */
export const DEFAULT_CHAIN_BUDGET_MS = 280_000;

/** Reasoning is billed inside the output budget; this is added on top of what the caller needs. */
export const REASONING_HEADROOM_TOKENS = 12_000;

export function reasoningOutputBudget(maxTokens: number): number {
  return Math.min(Math.max(maxTokens, 1) + REASONING_HEADROOM_TOKENS, 32_000);
}

/**
 * DeepSeek "max": thinking ON with a large budget. At 8,192 it reasons until truncated; at 32,768 and
 * 64,000 it finished with complete, parseable JSON (measured 2026-09-13).
 */
export function deepSeekMaxRequest(model: string, systemPrompt: string, userPrompt: string, maxTokens: number) {
  return {
    model,
    thinking: { type: 'enabled' as const },
    max_tokens: Math.min(64_000, Math.max(32_768, maxTokens + 24_000)),
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
  };
}

export function responsesRequest(model: string, systemPrompt: string, userPrompt: string, maxTokens: number) {
  return {
    model,
    reasoning: { effort: 'high' as const },
    max_output_tokens: reasoningOutputBudget(maxTokens),
    input: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
  };
}

/** Text from an OpenAI / xAI Responses API payload (`output_text`, or `output[].content[].text`). */
export function responsesText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const direct = (data as { output_text?: unknown }).output_text;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return '';
  let text = '';
  for (const item of output) {
    const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : undefined;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const p = part as { type?: unknown; text?: unknown };
      if ((p.type === 'output_text' || p.type === 'text') && typeof p.text === 'string') text += p.text;
    }
  }
  return text.trim();
}

/** Token counts reported by the provider for one call. Any field may be missing. */
export interface ChainUsage {
  input?: number;
  output?: number;
  /** Reasoning tokens, already included in `output` by every provider that reports them. */
  reasoning?: number;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Usage from an OpenAI / xAI Responses API payload. */
export function responsesUsage(data: Record<string, unknown>): ChainUsage {
  const u = (data.usage ?? {}) as { input_tokens?: unknown; output_tokens?: unknown; output_tokens_details?: { reasoning_tokens?: unknown } };
  return { input: num(u.input_tokens), output: num(u.output_tokens), reasoning: num(u.output_tokens_details?.reasoning_tokens) };
}

/** Usage from a DeepSeek chat-completions payload. */
export function chatUsage(data: Record<string, unknown>): ChainUsage {
  const u = (data.usage ?? {}) as { prompt_tokens?: unknown; completion_tokens?: unknown; completion_tokens_details?: { reasoning_tokens?: unknown } };
  return { input: num(u.prompt_tokens), output: num(u.completion_tokens), reasoning: num(u.completion_tokens_details?.reasoning_tokens) };
}

/** The slice of the Anthropic SDK this module uses — injectable for tests. */
export interface AnthropicLike {
  messages: {
    create(
      params: { model: string; max_tokens: number; system: string; messages: { role: 'user'; content: string }[] },
      options?: { timeout?: number },
    ): Promise<{
      content: { type: string; text?: string }[];
      stop_reason?: string | null;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

export interface ChainDeps {
  fetchImpl?: typeof fetch;
  anthropic?: AnthropicLike | null;
  now?: () => number;
}

export interface ChainOpts {
  systemPrompt: string;
  userPrompt: string;
  /** Tokens the caller actually needs in the answer. Reasoning headroom is added per rung. */
  maxTokens: number;
  auditStage: string;
  /** Absolute epoch-ms deadline for the whole chain. Defaults to now + DEFAULT_CHAIN_BUDGET_MS. */
  deadlineAt?: number;
  /** Rungs already tried upstream. */
  skip?: readonly Rung[];
  /** Throw to reject a rung's output (e.g. JSON that does not parse) and move to the next rung. */
  validate?: (text: string) => void;
  deps?: ChainDeps;
}

export interface ChainResult {
  text: string;
  rung: Rung;
  model: string;
  usage: ChainUsage;
  ms: number;
}

let sharedAnthropic: AnthropicLike | null | undefined;
function defaultAnthropic(): AnthropicLike | null {
  if (sharedAnthropic !== undefined) return sharedAnthropic;
  const key = keyFor('anthropic');
  // maxRetries 0: SDK-level retries would silently spend the next rung's deadline.
  sharedAnthropic = key ? (new Anthropic({ apiKey: key, maxRetries: 0 }) as unknown as AnthropicLike) : null;
  return sharedAnthropic;
}

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  key: string,
  body: unknown,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`invalid JSON response: ${raw.slice(0, 120)}`);
  }
}

async function callRung(
  rung: Rung,
  model: string,
  key: string,
  o: ChainOpts,
  timeoutMs: number,
  deps: Required<Pick<ChainDeps, 'fetchImpl'>> & { anthropic: AnthropicLike | null },
): Promise<{ text: string; usage: ChainUsage }> {
  switch (rung) {
    case 'openai':
    case 'grok': {
      const url = rung === 'openai' ? 'https://api.openai.com/v1/responses' : 'https://api.x.ai/v1/responses';
      const data = await postJson(deps.fetchImpl, url, key, responsesRequest(model, o.systemPrompt, o.userPrompt, o.maxTokens), timeoutMs);
      if (data.status === 'incomplete') {
        throw new Error(`truncated (status incomplete: ${JSON.stringify(data.incomplete_details ?? {})})`);
      }
      const text = responsesText(data);
      if (!text) throw new Error('empty output');
      return { text, usage: responsesUsage(data) };
    }
    case 'anthropic': {
      if (!deps.anthropic) throw new Error('Anthropic client unavailable');
      const r = await deps.anthropic.messages.create(
        {
          model,
          max_tokens: o.maxTokens,
          system: o.systemPrompt,
          messages: [{ role: 'user', content: o.userPrompt }],
        },
        { timeout: timeoutMs },
      );
      if (r.stop_reason === 'max_tokens') throw new Error(`truncated at max_tokens ${o.maxTokens}`);
      const text = r.content
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('')
        .trim();
      if (!text) throw new Error('empty output');
      return { text, usage: { input: num(r.usage?.input_tokens), output: num(r.usage?.output_tokens) } };
    }
    case 'deepseek': {
      const data = await postJson(
        deps.fetchImpl,
        'https://api.deepseek.com/chat/completions',
        key,
        deepSeekMaxRequest(model, o.systemPrompt, o.userPrompt, o.maxTokens),
        timeoutMs,
      );
      const choice = (data.choices as { finish_reason?: string; message?: { content?: string | null } }[] | undefined)?.[0];
      if (choice?.finish_reason === 'length') throw new Error('truncated (finish_reason length)');
      const text = (choice?.message?.content ?? '').trim();
      if (!text) throw new Error('empty output');
      return { text, usage: chatUsage(data) };
    }
  }
}

/**
 * Walk the owner's model order until one rung returns a complete, valid answer before the deadline.
 * Throws with every rung's reason when none does.
 */
export async function runModelChain(o: ChainOpts): Promise<ChainResult> {
  const now = o.deps?.now ?? Date.now;
  const deadlineAt = o.deadlineAt ?? now() + DEFAULT_CHAIN_BUDGET_MS;
  const deps = {
    fetchImpl: o.deps?.fetchImpl ?? fetch,
    anthropic: o.deps && 'anthropic' in o.deps ? (o.deps.anthropic ?? null) : defaultAnthropic(),
  };
  const models = chainModels();
  const skipped = new Set(o.skip ?? []);
  const reasons: string[] = [];

  for (const rung of OWNER_MODEL_ORDER) {
    const model = models[rung];
    if (skipped.has(rung)) continue;
    const key = rung === 'anthropic' ? (deps.anthropic ? 'sdk' : '') : keyFor(rung);
    if (!key) {
      reasons.push(`${rung}: no API key`);
      continue;
    }
    const remaining = deadlineAt - now() - DEADLINE_SAFETY_MS;
    if (remaining < RUNG_MIN_MS[rung]) {
      reasons.push(`${rung}: skipped, only ${Math.max(0, Math.round(remaining / 1000))}s left`);
      continue;
    }
    const timeoutMs = Math.min(RUNG_CAP_MS[rung], remaining);
    const t0 = now();
    try {
      const { text, usage } = await callRung(rung, model, key, o, timeoutMs, deps);
      o.validate?.(text);
      const ms = now() - t0;
      logLlmAudit(o.auditStage, rung, model);
      console.log(
        JSON.stringify({
          type: 'llm_usage',
          stage: o.auditStage,
          rung,
          model,
          ms,
          input: usage.input ?? null,
          output: usage.output ?? null,
          reasoning: usage.reasoning ?? null,
          fallbacks: reasons.length,
        }),
      );
      if (rung !== OWNER_MODEL_ORDER[0]) {
        console.warn(`[model-chain] ${o.auditStage}: answered by ${rung} (${model}) after: ${reasons.join(' | ')}`);
      }
      return { text, rung, model, usage, ms };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      reasons.push(`${rung} ${model} after ${Math.round((now() - t0) / 1000)}s: ${msg.slice(0, 180)}`);
      console.warn(`[model-chain] ${o.auditStage}: ${rung} (${model}) failed — ${msg.slice(0, 160)}`);
    }
  }

  throw new Error(`Model chain exhausted for ${o.auditStage}: ${reasons.join(' | ') || 'no providers configured'}`);
}

/** Test seam: forget the cached Anthropic client so a test's env changes take effect. */
export function __resetModelChainForTests(): void {
  sharedAnthropic = undefined;
}
