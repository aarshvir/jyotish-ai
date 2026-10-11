/**
 * The Blueprint's model port.
 *
 * The Blueprint is a ₹199 product, so its narrative does not start on the most expensive
 * rung of the owner's model order. It is pinned to `REPORT_BLUEPRINT_MODEL` (default
 * Claude Sonnet 5.5, $2 / $10 per million tokens) and falls back to the owner's full model
 * chain (src/lib/llm/modelChain.ts) if that call fails, is cut off, or does not return JSON.
 * Set REPORT_BLUEPRINT_MODEL=chain to use the chain from the first call.
 *
 * Why the call is made with fetch and explicit thinking settings: Sonnet 5.5 and Haiku 5.5
 * think by default and thinking counts toward max_tokens. The first real run of this
 * generator was cut off at 4,800 tokens with the default settings, then re-ran on Opus 5.
 * Writing structured prose from supplied facts does not need up-front thinking, so it is
 * switched off (Sonnet 5.5: "between_tools", the lowest setting; Haiku 5.5: "disabled").
 */

import { cleanEnv } from '@/lib/env';
import { runModelChain } from '@/lib/llm/modelChain';
import { anthropicTuning } from '@/lib/llm/anthropicTuning';
import { parseModelJson } from './json';
import type { LlmPort, LlmResult } from './deps';

export const DEFAULT_BLUEPRINT_MODEL = 'claude-sonnet-5-5';

function mustBeJson(text: string): void {
  if (parseModelJson(text) === null) throw new Error('not valid JSON');
}

interface AnthropicReply {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

async function callAnthropic(model: string, key: string, system: string, user: string, maxTokens: number): Promise<LlmResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }], ...anthropicTuning(model) }),
    signal: AbortSignal.timeout(150_000),
  });
  const body = (await res.json().catch(() => ({}))) as AnthropicReply;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.error?.message ?? 'no detail'}`.slice(0, 200));
  if (body.stop_reason === 'max_tokens') throw new Error(`truncated at max_tokens ${maxTokens}`);
  const text = (body.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
  try {
    mustBeJson(text);
  } catch (e) {
    const dir = process.env.BLUEPRINT_DEBUG_DIR;
    if (dir) {
      // Dry-run aid: keep the reply that failed so the failure can be read, never in production.
      const { mkdirSync, writeFileSync } = await import('node:fs');
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/bad-json-${Date.now()}.txt`, text);
    }
    throw e;
  }
  return { text, model, usage: { input: body.usage?.input_tokens ?? null, output: body.usage?.output_tokens ?? null } };
}

export function createBlueprintLlm(): LlmPort {
  return {
    async complete({ system, user, maxTokens, stage }): Promise<LlmResult> {
      const pinned = cleanEnv(process.env.REPORT_BLUEPRINT_MODEL) || DEFAULT_BLUEPRINT_MODEL;
      const key = cleanEnv(process.env.ANTHROPIC_API_KEY);
      if (pinned !== 'chain' && pinned.startsWith('claude-') && key) {
        try {
          const r = await callAnthropic(pinned, key, system, user, maxTokens);
          console.log(JSON.stringify({ type: 'llm_usage', stage, rung: 'anthropic_pinned', model: pinned, input: r.usage.input, output: r.usage.output }));
          return r;
        } catch (e) {
          console.warn(`[blueprint] pinned ${pinned} failed for ${stage}; using the model chain:`, e instanceof Error ? e.message.slice(0, 160) : e);
        }
      }
      const out = await runModelChain({ systemPrompt: system, userPrompt: user, maxTokens, auditStage: stage, validate: mustBeJson });
      return { text: out.text, model: out.model, usage: { input: out.usage.input ?? null, output: out.usage.output ?? null } };
    },
  };
}
