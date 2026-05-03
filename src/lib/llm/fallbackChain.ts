import OpenAI from 'openai';
import { logLlmAudit } from '@/lib/llm/audit';
import { cleanEnv } from '@/lib/env';

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

/**
 * When Anthropic fails for account/credit/billing, use the next provider
 * without treating it as a prompt or payload failure.
 */
export function anthropicErrorWarrantsProviderFallback(err: unknown): boolean {
  const status = getHttpStatus(err);
  if (status === 401 || status === 402 || status === 403) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /credit|billing|balance|payment|invoice|quota|overage|insufficient|too low|funds|add funds|spend limit|usage limit|account disabled|exhausted.*quota|credit exhausted/i.test(
    msg,
  );
}

function messageSuggestsNetwork(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(msg) ||
    msg.includes('socket')
  );
}

/**
 * Anthropic 400s are usually bad requests, except billing/credit/quota-shaped
 * failures, which should immediately fall through to OpenAI.
 */
export function anthropicFailureIsRetriableWithFallback(err: unknown): boolean {
  if (anthropicErrorWarrantsProviderFallback(err)) return true;
  const status = getHttpStatus(err);
  if (status === 400) return false;
  if (status === undefined) return messageSuggestsNetwork(err) || true;
  return true;
}

export function openAiFailureIsRetriable(err: unknown): boolean {
  const status = getHttpStatus(err);
  if (status === undefined) return messageSuggestsNetwork(err) || true;
  return [400, 401, 402, 403, 408, 409, 429, 500, 502, 503, 529].includes(status) || status >= 520;
}

function env(s: string | undefined): string {
  return cleanEnv(s);
}

export function hasAnyChatFallbackKey(): boolean {
  return Boolean(
    env(process.env.OPENAI_API_KEY) ||
      env(process.env.GROK_API_KEY) ||
      env(process.env.DEEPSEEK_API_KEY),
  );
}

export type FallbackChainOpts = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  /** When true, skip OpenAI because it was already attempted upstream. */
  skipOpenAI?: boolean;
  /** Label for structured llm_audit logs, e.g. nativity or forecast_narrative. */
  auditStage?: string;
};

async function completeOpenAiFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<{ model: string; text: string }> {
  const key = env(process.env.OPENAI_API_KEY);
  if (!key) throw new Error('OPENAI_API_KEY missing for fallback');
  const model = env(process.env.LLM_FALLBACK_OPENAI_MODEL) || 'gpt-5.5';
  const client = new OpenAI({ apiKey: key, timeout: 120_000, maxRetries: 1 });
  const input = [
    { role: 'system' as const, content: opts.systemPrompt },
    { role: 'user' as const, content: opts.userPrompt },
  ];

  if (/^gpt-5/i.test(model)) {
    const responsesApi = (
      client as unknown as {
        responses?: { create: (args: Record<string, unknown>) => Promise<unknown> };
      }
    ).responses;
    if (responsesApi?.create) {
      const r = await responsesApi.create({
        model,
        reasoning: { effort: 'high' },
        input,
        max_output_tokens: Math.min(opts.maxTokens, 16000),
      });
      const text = extractResponsesText(r);
      if (text) return { model, text };
      throw new Error('OpenAI Responses fallback returned empty content');
    }
  }

  const tokenParam = /^gpt-5/i.test(model)
    ? { max_completion_tokens: Math.min(opts.maxTokens, 16000) }
    : { max_tokens: Math.min(opts.maxTokens, 16000) };
  const r = await client.chat.completions.create({
    model,
    ...tokenParam,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
  });
  const text = (r.choices[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI fallback returned empty content');
  return { model, text };
}

function extractResponsesText(data: unknown): string {
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
      if (p.type === 'text' && typeof p.text === 'string') text += p.text;
    }
  }
  return text.trim();
}

function grokCandidates(): string[] {
  const configured = env(process.env.LLM_FALLBACK_GROK_MODEL);
  const list = env(process.env.LLM_FALLBACK_GROK_MODELS)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [
    ...(configured ? [configured] : []),
    ...list,
    'grok-4.20',
    'grok-4',
    'grok-3',
    'grok-2-1212',
  ].filter((model, index, all) => all.indexOf(model) === index);
}

async function completeGrokFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<{ model: string; text: string }> {
  const key = env(process.env.GROK_API_KEY);
  if (!key) throw new Error('GROK_API_KEY missing for fallback');
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1', timeout: 90_000, maxRetries: 1 });
  const errors: string[] = [];

  for (const model of grokCandidates()) {
    try {
      const r = await client.chat.completions.create({
        model,
        max_tokens: Math.min(opts.maxTokens, 8192),
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userPrompt },
        ],
      });
      const text = (r.choices[0]?.message?.content ?? '').trim();
      if (!text) throw new Error('empty content');
      return { model, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${msg.slice(0, 180)}`);
    }
  }

  throw new Error(`Grok fallback exhausted: ${errors.join(' | ')}`);
}

async function completeDeepSeekFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<{ model: string; text: string }> {
  const key = env(process.env.DEEPSEEK_API_KEY);
  if (!key) throw new Error('DEEPSEEK_API_KEY missing for fallback');
  const model = env(process.env.LLM_FALLBACK_DEEPSEEK_MODEL) || 'deepseek-chat';
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com', timeout: 90_000, maxRetries: 1 });
  const r = await client.chat.completions.create({
    model,
    max_tokens: Math.min(opts.maxTokens, 8192),
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
  });
  const text = (r.choices[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('DeepSeek fallback returned empty content');
  return { model, text };
}

/**
 * Runs after Anthropic fails. Order is intentionally fixed:
 * OpenAI -> Grok -> DeepSeek.
 */
export async function runChatFallbackChain(opts: FallbackChainOpts): Promise<string> {
  const auditStage = opts.auditStage ?? 'fallback_chain';
  const base = {
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens,
  };
  const errors: Error[] = [];

  if (!opts.skipOpenAI && env(process.env.OPENAI_API_KEY)) {
    try {
      const { model, text } = await completeOpenAiFallback(base);
      console.warn('[LLM fallback] success: OpenAI', model);
      logLlmAudit(auditStage, 'openai', model);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      console.warn('[LLM fallback] OpenAI failed, trying Grok:', err.message.slice(0, 160));
    }
  }

  if (env(process.env.GROK_API_KEY)) {
    try {
      const { model, text } = await completeGrokFallback(base);
      console.warn('[LLM fallback] success: Grok', model);
      logLlmAudit(auditStage, 'grok', model);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      console.warn('[LLM fallback] Grok failed, trying DeepSeek:', err.message.slice(0, 160));
    }
  }

  if (env(process.env.DEEPSEEK_API_KEY)) {
    try {
      const { model, text } = await completeDeepSeekFallback(base);
      console.warn('[LLM fallback] success: DeepSeek', model);
      logLlmAudit(auditStage, 'deepseek', model);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
    }
  }

  const summary = errors.map((e) => e.message).join(' | ');
  throw new Error(`LLM fallback chain exhausted: ${summary || 'no providers configured'}`);
}
