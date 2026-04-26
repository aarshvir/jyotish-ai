import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import {
  anthropicErrorWarrantsProviderFallback,
  anthropicFailureIsRetriableWithFallback,
  geminiFailureIsRetriable,
  hasAnyChatFallbackKey,
  openAiFailureIsRetriable,
  runChatFallbackChain,
} from '@/lib/llm/fallbackChain';

const anthropicClient = process.env.ANTHROPIC_API_KEY?.trim()
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY.trim(),
      /** Commentary routes use maxDuration 300s and large max_tokens; 55s caused premature SDK timeouts. */
      timeout: 180_000,
      maxRetries: 0,
    })
  : null;

if (!anthropicClient) {
  console.error('[LLM] ANTHROPIC_API_KEY not set — Anthropic will NOT be used. Add it to Vercel Environment Variables.');
}

function extractAnthropicText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** True if we have an API key for the provider implied by model_override (default: Anthropic or chat fallback chain). */
export function hasLlmCredentials(modelOverride?: string | null): boolean {
  const m = String(modelOverride ?? '').trim();
  if (!m || m.startsWith('claude-')) {
    return Boolean(
      process.env.ANTHROPIC_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        (process.env.DEEPSEEK_API_KEY?.trim() &&
          process.env.LLM_FALLBACK_DEEPSEEK_ENABLED?.trim().toLowerCase() === 'true')
    );
  }
  if (m.startsWith('gpt-')) return Boolean(process.env.OPENAI_API_KEY);
  if (m.startsWith('gemini-')) return Boolean(process.env.GEMINI_API_KEY);
  if (m.startsWith('deepseek-')) return Boolean(process.env.DEEPSEEK_API_KEY);
  if (m.startsWith('grok-')) return Boolean(process.env.GROK_API_KEY);
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** OpenAI / xAI Responses API shape (output_text or output[].content[]). */
function extractResponsesApiText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const outText = d.output_text;
  if (typeof outText === 'string' && outText.trim()) return outText.trim();
  let text = '';
  const output = d.output;
  if (!Array.isArray(output)) return text;
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (!c || typeof c !== 'object') continue;
      const o = c as { type?: string; text?: string };
      if (o.type === 'text' && typeof o.text === 'string') text += o.text;
    }
  }
  return text.trim();
}

function extractGrokResponsesText(data: unknown): string {
  return extractResponsesApiText(data);
}

/** GPT-5.5 + reasoning effort high (alias ids: gpt-5.5-high-reasoning, gpt-5.4-high-reasoning). */
async function completeOpenAiGpt55HighReasoning(opts: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const input = [
    { role: 'system' as const, content: opts.systemPrompt },
    { role: 'user' as const, content: opts.userPrompt },
  ];
  const maxOut = Math.min(opts.maxTokens, 16000);

  try {
    const client = new OpenAI({ apiKey: opts.apiKey });
    const responsesApi = (
      client as unknown as {
        responses?: { create: (args: Record<string, unknown>) => Promise<unknown> };
      }
    ).responses;
    if (responsesApi?.create) {
      const r = await responsesApi.create({
        model: 'gpt-5.5',
        reasoning: { effort: 'high' },
        input,
        max_output_tokens: maxOut,
      });
      const text = extractResponsesApiText(r);
      if (text) return text;
    }
  } catch (e) {
    console.error('OpenAI responses (gpt-5.5 high reasoning) SDK error:', e);
  }

  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.5',
      reasoning: { effort: 'high' },
      input,
      max_output_tokens: maxOut,
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) {
    throw new Error(`OpenAI responses API error: HTTP ${resp.status} ${raw}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`OpenAI responses API error: invalid JSON ${raw.slice(0, 200)}`);
  }
  const text = extractResponsesApiText(data);
  if (!text) {
    throw new Error(`OpenAI responses API error: empty output (HTTP ${resp.status})`);
  }
  return text;
}

/** Grok 4.20 — xAI Responses API (beta); falls back to raw HTTP if SDK has no responses. */
async function completeGrokResponsesApi(opts: {
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
}): Promise<string> {
  const input = [
    { role: 'system' as const, content: opts.systemPrompt },
    { role: 'user' as const, content: opts.userPrompt },
  ];

  try {
    const client = new OpenAI({ apiKey: opts.apiKey, baseURL: 'https://api.x.ai/v1' });
    const responsesApi = (
      client as unknown as {
        responses?: { create: (args: Record<string, unknown>) => Promise<unknown> };
      }
    ).responses;
    if (responsesApi?.create) {
      const r = await responsesApi.create({
        model: opts.modelId,
        reasoning: { effort: opts.reasoningEffort },
        input,
        max_output_tokens: Math.min(opts.maxTokens, 16000),
      });
      return extractGrokResponsesText(r);
    }
  } catch (e) {
    console.error('Grok responses SDK error:', e);
  }

  const resp = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.modelId,
      reasoning: { effort: opts.reasoningEffort },
      input,
      max_output_tokens: Math.min(opts.maxTokens, 16000),
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) {
    throw new Error(`Grok responses API error: HTTP ${resp.status} ${raw}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Grok responses API error: invalid JSON ${raw.slice(0, 200)}`);
  }
  const text = extractGrokResponsesText(data);
  if (!text) {
    throw new Error(`Grok responses API error: empty output (HTTP ${resp.status})`);
  }
  return text;
}

/**
 * Unified completion for commentary routes (Anthropic default; optional model_override for comparisons).
 */
export async function completeLlmChat(opts: {
  modelOverride?: string | null;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<string> {
  const raw = (opts.modelOverride ?? '').trim();
  const modelId = raw || 'claude-sonnet-4-6';

  // Anthropic (default or explicit claude-*)
  if (!raw || modelId.startsWith('claude-')) {
    if (anthropicClient) {
      console.log(`[LLM] Using Anthropic model: ${modelId}`);
      try {
        const response = await anthropicClient.messages.create({
          model: modelId.startsWith('claude-') ? modelId : 'claude-sonnet-4-6',
          max_tokens: opts.maxTokens,
          system: opts.systemPrompt,
          messages: [{ role: 'user', content: opts.userPrompt }],
        });
        return extractAnthropicText(response);
      } catch (anthropicErr: unknown) {
        const errStatus = (anthropicErr as { status?: number })?.status;
        const errMsg = anthropicErr instanceof Error ? anthropicErr.message : String(anthropicErr);
        console.error(`[LLM] Anthropic ${modelId} failed — HTTP ${errStatus ?? 'unknown'}: ${errMsg.slice(0, 200)}`);
        if (!anthropicFailureIsRetriableWithFallback(anthropicErr)) {
          throw anthropicErr;
        }
        const msg = errMsg;
        if (anthropicErrorWarrantsProviderFallback(anthropicErr)) {
          console.warn('[LLM] Claude unavailable or credits/billing — falling back to OpenAI / chain:', msg.slice(0, 160));
        } else {
          console.warn('[LLM] Anthropic failed, running fallback chain:', msg.slice(0, 120));
        }
        if (!hasAnyChatFallbackKey()) {
          throw anthropicErr;
        }
        return runChatFallbackChain({
          systemPrompt: opts.systemPrompt,
          userPrompt: opts.userPrompt,
          maxTokens: opts.maxTokens,
        });
      }
    }

    if (hasAnyChatFallbackKey()) {
      console.error('[LLM] ANTHROPIC_API_KEY missing — falling back to OpenAI/Gemini/Grok. Set ANTHROPIC_API_KEY in Vercel to use Claude.');
      return runChatFallbackChain({
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
      });
    }
    throw new Error('ANTHROPIC_API_KEY is not configured and no fallback providers available');
  }

  if (modelId === 'gpt-5.5-high-reasoning' || modelId === 'gpt-5.4-high-reasoning') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not configured');
    try {
      return await completeOpenAiGpt55HighReasoning({
        apiKey: key,
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`OpenAI GPT-5.5 high-reasoning error: ${msg}`);
    }
  }

  if (modelId.startsWith('gpt-')) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not configured');
    const client = new OpenAI({ apiKey: key });
    const useCompletionTokens = /^gpt-5/i.test(modelId);
    try {
      const r = await client.chat.completions.create({
        model: modelId,
        ...(useCompletionTokens
          ? { max_completion_tokens: Math.min(opts.maxTokens, 16000) }
          : { max_tokens: opts.maxTokens }),
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userPrompt },
        ],
      });
      return (r.choices[0]?.message?.content ?? '').trim();
    } catch (openErr: unknown) {
      if (!openAiFailureIsRetriable(openErr) || !hasAnyChatFallbackKey()) {
        throw openErr;
      }
      console.warn('[LLM] OpenAI primary model failed, continuing fallback chain');
      return runChatFallbackChain({
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
        skipOpenAI: true,
      });
    }
  }

  if (modelId.startsWith('gemini-')) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: opts.systemPrompt,
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens },
      });
      try {
        const text = result.response.text();
        if (!text) throw new Error('Gemini returned empty response');
        return text;
      } catch (geminiErr) {
        throw new Error(
          `Gemini text extraction failed: ${geminiErr instanceof Error ? geminiErr.message : String(geminiErr)}`
        );
      }
    } catch (geminiOuter: unknown) {
      if (!geminiFailureIsRetriable(geminiOuter) || !hasAnyChatFallbackKey()) {
        throw geminiOuter;
      }
      console.warn('[LLM] Gemini primary failed, running OpenAI → Gemini → DeepSeek fallback chain');
      return runChatFallbackChain({
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
      });
    }
  }

  if (modelId.startsWith('deepseek-')) {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DEEPSEEK_API_KEY is not configured');
    const client = new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
    const r = await client.chat.completions.create({
      model: modelId,
      max_tokens: opts.maxTokens,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
    });
    return (r.choices[0]?.message?.content ?? '').trim();
  }

  if (modelId.startsWith('grok-')) {
    const key = process.env.GROK_API_KEY;
    if (!key) throw new Error('GROK_API_KEY is not configured');
    const client = new OpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1' });

    if (modelId.startsWith('grok-4.20')) {
      const reasoningEffort: 'low' | 'medium' | 'high' = modelId.includes('reasoning')
        ? 'high'
        : 'medium';
      try {
        return await completeGrokResponsesApi({
          apiKey: key,
          modelId,
          systemPrompt: opts.systemPrompt,
          userPrompt: opts.userPrompt,
          maxTokens: opts.maxTokens,
          reasoningEffort,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Grok responses API error: ${msg}`);
      }
    }

    try {
      const r = await client.chat.completions.create({
        model: modelId,
        max_tokens: Math.min(opts.maxTokens, 8192),
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userPrompt },
        ],
      });
      return (r.choices[0]?.message?.content ?? '').trim();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Grok chat API error: ${msg}`);
    }
  }

  if (!anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: opts.maxTokens,
    system: opts.systemPrompt,
    messages: [{ role: 'user', content: opts.userPrompt }],
  });
  return extractAnthropicText(response);
}
