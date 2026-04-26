import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { logLlmAudit } from '@/lib/llm/audit';

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

/**
 * When Anthropic fails for account/credit/billing (or clearly billing-shaped 400s),
 * use the next provider (e.g. OpenAI) without treating it as a bad payload.
 * Does **not** include 429/5xx (those are retried on Claude first in ForecastAgent).
 */
export function anthropicErrorWarrantsProviderFallback(err: unknown): boolean {
  const status = getHttpStatus(err);
  if (status === 401 || status === 402 || status === 403) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // Some orgs return 400 with a billing/credit body; 402 is "Payment Required" when sent.
  return /credit|billing|balance|payment|invoice|quota|overage|insufficient|too low|funds|add funds|spend limit|usage limit|account disabled|exhausted.*quota|credit exhausted/i.test(
    lower,
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
 * After Anthropic fails: allow trying another provider unless the error is a bad request (same payload likely fails).
 * 401 / 402 / 403 and credit/billing-shaped 400s allow fallback to OpenAI when Claude credits or auth fail.
 */
export function anthropicFailureIsRetriableWithFallback(err: unknown): boolean {
  if (anthropicErrorWarrantsProviderFallback(err)) return true;
  const status = getHttpStatus(err);
  if (status === 400) return false;
  if (status === undefined) {
    return messageSuggestsNetwork(err) || true;
  }
  return true;
}

export function openAiFailureIsRetriable(err: unknown): boolean {
  const status = getHttpStatus(err);
  if (status === 400) return false;
  if (status === undefined) return messageSuggestsNetwork(err) || true;
  // 401/402/403: key or org billing — continue chain to Gemini/Grok
  return [401, 402, 403, 408, 409, 429, 500, 502, 503, 529].includes(status) || status >= 520;
}

export function geminiFailureIsRetriable(err: unknown): boolean {
  const status = getHttpStatus(err);
  if (status === 400) return false;
  if (status === undefined) return messageSuggestsNetwork(err) || true;
  return [429, 500, 503, 529].includes(status) || status >= 520;
}

function trimEnv(s: string | undefined): string {
  return (s ?? '').trim();
}

export function hasAnyChatFallbackKey(): boolean {
  const deepseekOn =
    trimEnv(process.env.LLM_FALLBACK_DEEPSEEK_ENABLED).toLowerCase() === 'true' &&
    Boolean(trimEnv(process.env.DEEPSEEK_API_KEY));
  return Boolean(
    trimEnv(process.env.OPENAI_API_KEY) ||
      trimEnv(process.env.GEMINI_API_KEY) ||
      trimEnv(process.env.GROK_API_KEY) ||
      deepseekOn
  );
}

export type FallbackChainOpts = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  /** When true, skip OpenAI (e.g. OpenAI was already attempted upstream). */
  skipOpenAI?: boolean;
  /** When true, skip Gemini (e.g. explicit gemini-* call already failed). */
  skipGemini?: boolean;
  /** Label for structured llm_audit logs (e.g. nativity, forecast_narrative). */
  auditStage?: string;
};

async function completeOpenAiFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const key = trimEnv(process.env.OPENAI_API_KEY);
  if (!key) throw new Error('OPENAI_API_KEY missing for fallback');
  const model = trimEnv(process.env.LLM_FALLBACK_OPENAI_MODEL) || 'gpt-5.5';
  const client = new OpenAI({ apiKey: key, timeout: 35_000, maxRetries: 0 });
  const r = await client.chat.completions.create({
    model,
    max_tokens: Math.min(opts.maxTokens, 16000),
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
  });
  const text = (r.choices[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('OpenAI fallback returned empty content');
  return text;
}

async function completeGeminiFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const key = trimEnv(process.env.GEMINI_API_KEY);
  if (!key) throw new Error('GEMINI_API_KEY missing for fallback');
  const modelId = trimEnv(process.env.LLM_FALLBACK_GEMINI_MODEL) || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: opts.systemPrompt,
  });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
    generationConfig: { maxOutputTokens: opts.maxTokens },
  });
  const text = result.response.text();
  if (!text?.trim()) throw new Error('Gemini fallback returned empty response');
  return text.trim();
}

async function completeDeepSeekFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const key = trimEnv(process.env.DEEPSEEK_API_KEY);
  if (!key) throw new Error('DEEPSEEK_API_KEY missing for fallback');
  const model = trimEnv(process.env.LLM_FALLBACK_DEEPSEEK_MODEL) || 'deepseek-chat';
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
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
  return text;
}

async function completeGrokFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const key = trimEnv(process.env.GROK_API_KEY);
  if (!key) throw new Error('GROK_API_KEY missing for fallback');
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1' });
  const r = await client.chat.completions.create({
    model: 'grok-4.2',
    max_tokens: Math.min(opts.maxTokens, 8192),
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
  });
  const text = (r.choices[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('Grok fallback returned empty content');
  return text;
}

/**
 * OpenAI → Gemini → Grok → optional DeepSeek. Never calls Anthropic.
 */
export async function runChatFallbackChain(opts: FallbackChainOpts): Promise<string> {
  const auditStage = opts.auditStage ?? 'fallback_chain';
  const base = {
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens,
  };
  const errors: Error[] = [];

  if (!opts.skipOpenAI && trimEnv(process.env.OPENAI_API_KEY)) {
    try {
      const text = await completeOpenAiFallback(base);
      const om = trimEnv(process.env.LLM_FALLBACK_OPENAI_MODEL) || 'gpt-5.5';
      console.warn('[LLM fallback] success: OpenAI', om);
      logLlmAudit(auditStage, 'openai', om);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      if (!openAiFailureIsRetriable(e)) throw err;
      console.warn('[LLM fallback] OpenAI failed, trying Grok:', err.message.slice(0, 120));
    }
  }

  if (trimEnv(process.env.GROK_API_KEY)) {
    try {
      const text = await completeGrokFallback(base);
      console.warn('[LLM fallback] success: Grok');
      logLlmAudit(auditStage, 'grok', 'grok-4.2');
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      console.warn('[LLM fallback] Grok failed, trying Gemini:', err.message.slice(0, 120));
    }
  }

  if (!opts.skipGemini && trimEnv(process.env.GEMINI_API_KEY)) {
    try {
      const text = await completeGeminiFallback(base);
      const gm = trimEnv(process.env.LLM_FALLBACK_GEMINI_MODEL) || 'gemini-2.0-flash';
      console.warn('[LLM fallback] success: Gemini', gm);
      logLlmAudit(auditStage, 'gemini', gm);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      if (!geminiFailureIsRetriable(e)) throw err;
      console.warn('[LLM fallback] Gemini failed, trying DeepSeek:', err.message.slice(0, 120));
    }
  }

  const deepseekEnabled = trimEnv(process.env.LLM_FALLBACK_DEEPSEEK_ENABLED).toLowerCase() === 'true';
  if (deepseekEnabled && trimEnv(process.env.DEEPSEEK_API_KEY)) {
    try {
      const text = await completeDeepSeekFallback(base);
      const dm = trimEnv(process.env.LLM_FALLBACK_DEEPSEEK_MODEL) || 'deepseek-chat';
      console.warn('[LLM fallback] success: DeepSeek');
      logLlmAudit(auditStage, 'deepseek', dm);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
    }
  }

  const summary = errors.map((e) => e.message).join(' | ');
  throw new Error(`LLM fallback chain exhausted: ${summary || 'no providers configured'}`);
}
