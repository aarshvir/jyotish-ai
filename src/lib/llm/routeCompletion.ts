import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { cleanEnv } from '@/lib/env';
import {
  anthropicErrorWarrantsProviderFallback,
  anthropicFailureIsRetriableWithFallback,
  hasAnyChatFallbackKey,
  runChatFallbackChain,
} from '@/lib/llm/fallbackChain';
import { runModelChain } from '@/lib/llm/modelChain';

const anthropicApiKey = cleanEnv(process.env.ANTHROPIC_API_KEY);

const anthropicClient = anthropicApiKey
  ? new Anthropic({
      apiKey: anthropicApiKey,
      /** Commentary routes use maxDuration 300s and large max_tokens; 55s caused premature SDK timeouts. */
      timeout: 180_000,
      // Retry transient blips (429/500/529 overloaded, network) at the SDK level with
      // backoff, so a single hiccup doesn't surface as a 206 — which now fails paid
      // reports closed (#107). Bounded so it stays within the 300s phase budget.
      maxRetries: 2,
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
  const hasAnthropic = Boolean(cleanEnv(process.env.ANTHROPIC_API_KEY));
  const hasOpenAI = Boolean(cleanEnv(process.env.OPENAI_API_KEY));
  const hasGemini = Boolean(cleanEnv(process.env.GEMINI_API_KEY));
  const hasDeepSeek = Boolean(cleanEnv(process.env.DEEPSEEK_API_KEY));
  const hasGrok = Boolean(cleanEnv(process.env.GROK_API_KEY));

  let ok: boolean;
  if (!m || m.startsWith('claude-')) {
    ok = hasAnthropic || hasOpenAI || hasGrok || hasDeepSeek;
  } else if (m.startsWith('gpt-')) {
    ok = hasOpenAI;
  } else if (m.startsWith('gemini-')) {
    ok = hasGemini;
  } else if (m.startsWith('deepseek-')) {
    ok = Boolean(cleanEnv(process.env.DEEPSEEK_API_KEY));
  } else if (m.startsWith('grok-')) {
    ok = hasGrok;
  } else {
    ok = hasAnthropic || hasOpenAI || hasGrok || hasDeepSeek;
  }

  if (!ok) {
    console.error('[LLM] No credentials available for model override', {
      modelOverride: m || '(default)',
      hasAnthropic,
      hasOpenAI,
      hasGemini,
      hasDeepSeek,
      hasGrok,
    });
  }
  return ok;
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
        model: 'gpt-5.6-sol',
        reasoning: { effort: 'high' },
        input,
        max_output_tokens: maxOut,
      });
      const text = extractResponsesApiText(r);
      if (text) return text;
    }
  } catch (e) {
    console.error('OpenAI responses (gpt-5.6-sol high reasoning) SDK error:', e);
  }

  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
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
 * Unified completion for commentary routes: the owner's model chain by default; an explicit model_override pins one provider (comparisons, or a deliberately pinned env model).
 */
export async function completeLlmChat(opts: {
  modelOverride?: string | null;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  /** Label for llm_audit logs. */
  auditStage?: string;
}): Promise<string> {
  const raw = (opts.modelOverride ?? '').trim();

  // No explicit model: the owner's order (GPT-5.6-terra high → Opus 5 → Grok → DeepSeek max), with
  // deadline-aware fall-through and truncation treated as failure. See src/lib/llm/modelChain.ts.
  if (!raw) {
    const { text } = await runModelChain({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      maxTokens: opts.maxTokens,
      auditStage: opts.auditStage ?? 'commentary',
    });
    return text;
  }
  const modelId = raw;

  // Explicit claude-* override (comparisons / a deliberately pinned env model).
  if (modelId.startsWith('claude-')) {
    if (anthropicClient) {
      console.log(`[LLM] Using Anthropic model: ${modelId}`);
      const t0 = Date.now();
      let truncated = false;
      try {
        const response = await anthropicClient.messages.create({
          model: modelId.startsWith('claude-') ? modelId : 'claude-opus-5',
          max_tokens: opts.maxTokens,
          system: opts.systemPrompt,
          messages: [{ role: 'user', content: opts.userPrompt }],
        });
        // Same usage line as the model chain, so a pinned model's cost is visible too (hourly-batch).
        console.log(
          JSON.stringify({
            type: 'llm_usage',
            stage: opts.auditStage ?? 'commentary_pinned',
            rung: 'anthropic_pinned',
            model: modelId,
            ms: Date.now() - t0,
            input: response.usage?.input_tokens ?? null,
            output: response.usage?.output_tokens ?? null,
            reasoning: null,
            fallbacks: 0,
          }),
        );
        // A reply cut off at max_tokens is half a JSON document; never hand it to the caller as an answer.
        if (response.stop_reason === 'max_tokens') {
          truncated = true;
          throw new Error(`${modelId} truncated at max_tokens ${opts.maxTokens}`);
        }
        return extractAnthropicText(response);
      } catch (anthropicErr: unknown) {
        if (truncated && hasAnyChatFallbackKey()) {
          console.warn(`[LLM] ${modelId} truncated — running the model chain instead`);
          return runChatFallbackChain({
            systemPrompt: opts.systemPrompt,
            userPrompt: opts.userPrompt,
            maxTokens: opts.maxTokens,
            auditStage: opts.auditStage,
          });
        }
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
      console.error('[LLM] ANTHROPIC_API_KEY missing - falling back to OpenAI/Grok/DeepSeek. Set ANTHROPIC_API_KEY in Vercel to use Claude.');
      return runChatFallbackChain({
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
      });
    }
    throw new Error('ANTHROPIC_API_KEY is not configured and no fallback providers available');
  }

  if (modelId === 'gpt-5.5-high-reasoning' || modelId === 'gpt-5.4-high-reasoning') {
    const key = cleanEnv(process.env.OPENAI_API_KEY);
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
    const key = cleanEnv(process.env.OPENAI_API_KEY);
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
      if (!hasAnyChatFallbackKey()) {
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
    const key = cleanEnv(process.env.GEMINI_API_KEY);
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
      if (!hasAnyChatFallbackKey()) {
        throw geminiOuter;
      }
      console.warn('[LLM] Gemini primary failed, running OpenAI/Grok/DeepSeek fallback chain');
      return runChatFallbackChain({
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        maxTokens: opts.maxTokens,
      });
    }
  }

  if (modelId.startsWith('deepseek-')) {
    const key = cleanEnv(process.env.DEEPSEEK_API_KEY);
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
    const key = cleanEnv(process.env.GROK_API_KEY);
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
    model: 'claude-opus-5',
    max_tokens: opts.maxTokens,
    system: opts.systemPrompt,
    messages: [{ role: 'user', content: opts.userPrompt }],
  });
  return extractAnthropicText(response);
}
