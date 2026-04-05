import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
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
 * 401 still allows fallback — Anthropic key may be invalid while OpenAI key is valid.
 */
export function anthropicFailureIsRetriableWithFallback(err: unknown): boolean {
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
  return [408, 409, 429, 500, 502, 503, 529].includes(status) || status >= 520;
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
};

async function completeOpenAiFallback(opts: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const key = trimEnv(process.env.OPENAI_API_KEY);
  if (!key) throw new Error('OPENAI_API_KEY missing for fallback');
  const model = trimEnv(process.env.LLM_FALLBACK_OPENAI_MODEL) || 'gpt-4o';
  const client = new OpenAI({ apiKey: key });
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
    model: 'grok-3-fast',
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
  const base = {
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens,
  };
  const errors: Error[] = [];

  if (!opts.skipOpenAI && trimEnv(process.env.OPENAI_API_KEY)) {
    try {
      const text = await completeOpenAiFallback(base);
      console.warn('[LLM fallback] success: OpenAI', trimEnv(process.env.LLM_FALLBACK_OPENAI_MODEL) || 'gpt-4o');
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      if (!openAiFailureIsRetriable(e)) throw err;
      console.warn('[LLM fallback] OpenAI failed, trying Gemini:', err.message.slice(0, 120));
    }
  }

  if (!opts.skipGemini && trimEnv(process.env.GEMINI_API_KEY)) {
    try {
      const text = await completeGeminiFallback(base);
      console.warn('[LLM fallback] success: Gemini', trimEnv(process.env.LLM_FALLBACK_GEMINI_MODEL) || 'gemini-2.0-flash');
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      if (!geminiFailureIsRetriable(e)) throw err;
      console.warn('[LLM fallback] Gemini failed, trying Grok:', err.message.slice(0, 120));
    }
  }

  if (trimEnv(process.env.GROK_API_KEY)) {
    try {
      const text = await completeGrokFallback(base);
      console.warn('[LLM fallback] success: Grok');
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
      console.warn('[LLM fallback] Grok failed, trying DeepSeek:', err.message.slice(0, 120));
    }
  }

  const deepseekEnabled = trimEnv(process.env.LLM_FALLBACK_DEEPSEEK_ENABLED).toLowerCase() === 'true';
  if (deepseekEnabled && trimEnv(process.env.DEEPSEEK_API_KEY)) {
    try {
      const text = await completeDeepSeekFallback(base);
      console.warn('[LLM fallback] success: DeepSeek');
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      errors.push(err);
    }
  }

  const summary = errors.map((e) => e.message).join(' | ');
  throw new Error(`LLM fallback chain exhausted: ${summary || 'no providers configured'}`);
}
