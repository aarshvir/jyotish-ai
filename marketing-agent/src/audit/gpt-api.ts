import { readFileSync } from 'node:fs';
import { envStr } from '../render/env';
import { checkReviewBudget, recordReviewSpend } from './store';
import { buildPrompt, type LensSpec } from './runner';
import { extractJson, failedReport, normalizeReport, type LensReport } from './types';
import type { ReelArtifacts } from './artifacts';

/**
 * LAST-RESORT PAID PATH — the metered OpenAI vision API.
 *
 * Project law §3 is subscription-first, and the CLI probe on 2026-07-26 showed both the codex
 * CLI and the claude CLI can read image files, so this path is OFF by default and exists only
 * for the case where both subscriptions are down. It is additionally self-capped at $0.25 per
 * reel (under the $0.40 mandate ceiling) and every call is written to the review_spend ledger.
 *
 * Enable explicitly:  npm run loop:review -- <slug> --allow-paid
 */

const PAID_REEL_CAP_USD = 0.25;

/** USD per 1M tokens. Unknown models fall back to a deliberately pessimistic rate. */
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1-nano': { in: 0.1, out: 0.4 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
  'gpt-5-nano': { in: 0.05, out: 0.4 },
  'gpt-5-mini': { in: 0.25, out: 2.0 },
  'gpt-4o': { in: 2.5, out: 10.0 },
};
const FALLBACK_PRICE = { in: 1.0, out: 4.0 };

/** Cheapest vision-capable first. A 404/model error walks down the list. */
export const MODEL_CANDIDATES = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-4o'];

function price(model: string) {
  return PRICES[model] ?? PRICES[Object.keys(PRICES).find((k) => model.startsWith(k)) ?? ''] ?? FALLBACK_PRICE;
}

export function costOf(model: string, promptTokens: number, completionTokens: number): number {
  const p = price(model);
  return Math.round(((promptTokens * p.in + completionTokens * p.out) / 1e6) * 1e6) / 1e6;
}

/**
 * Read OPENAI_API_KEY the way src/render/env.ts does, then repair it: the key in
 * marketing-agent/.env is stored with a literal "\r\n" inside its quotes, which the API
 * rejects as an invalid key. Strip escape sequences and whitespace.
 */
export function openaiKey(): string | null {
  const raw = envStr('OPENAI_API_KEY');
  if (!raw) return null;
  const k = raw.replace(/\\r|\\n|\\t/g, '').replace(/\s+/g, '');
  return k.startsWith('sk-') ? k : null;
}

function imagePart(path: string) {
  const b64 = readFileSync(path).toString('base64');
  return { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' } };
}

/** One paid vision review. Returns a degraded report rather than throwing. */
export async function runGptApiLens(spec: LensSpec, a: ReelArtifacts, runId: string): Promise<LensReport> {
  const t0 = Date.now();
  const meta = { lens: spec.lens, stage: spec.stage, source: 'openai_api', durationMs: 0 };
  const key = openaiKey();
  if (!key) return failedReport({ ...meta, durationMs: Date.now() - t0 }, 'no usable OPENAI_API_KEY');

  const images = spec.withFrames ? a.frames : [];
  // gpt-4o-mini bills a low-detail image at ~2833 tokens; be pessimistic before the call.
  const estIn = 5000 + images.length * 2900;
  const estUsd = costOf(MODEL_CANDIDATES[0], estIn, 1200);
  const decision = checkReviewBudget(runId, a.slug, estUsd, spec.lens);
  if (!decision.allowed) return failedReport({ ...meta, durationMs: Date.now() - t0 }, `budget refused: ${decision.reason}`);
  if (decision.spent.reelUsd + estUsd > PAID_REEL_CAP_USD) {
    const why = `paid-path self-cap $${PAID_REEL_CAP_USD.toFixed(2)}/reel would be breached ($${decision.spent.reelUsd.toFixed(4)} spent)`;
    recordReviewSpend({ run_id: runId, slug: a.slug, lens: spec.lens, provider: 'openai_api', estimated_usd: estUsd, status: 'refused', detail: why });
    return failedReport({ ...meta, durationMs: Date.now() - t0 }, why);
  }

  const content: any[] = [{ type: 'text', text: buildPrompt({ ...spec, withFrames: false }, a) }];
  for (const f of images) {
    content.push({ type: 'text', text: f.label });
    content.push(imagePart(f.path));
  }

  let lastErr = 'no model attempted';
  for (const model of MODEL_CANDIDATES) {
    const isGpt5 = /^gpt-5/.test(model);
    const body: any = {
      model,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      [isGpt5 ? 'max_completion_tokens' : 'max_tokens']: 1500,
    };
    if (!isGpt5) body.temperature = 0.2;
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j: any = await res.json();
      if (j?.error) {
        lastErr = `${model}: ${j.error.code ?? j.error.type} — ${String(j.error.message).slice(0, 120)}`;
        // Model-shaped problems walk the candidate list; anything else (auth, quota) is fatal.
        if (/model|not found|does not exist|unsupported/i.test(String(j.error.message))) continue;
        recordReviewSpend({ run_id: runId, slug: a.slug, lens: spec.lens, provider: 'openai_api', model, status: 'error', detail: lastErr });
        return failedReport({ ...meta, durationMs: Date.now() - t0 }, lastErr);
      }
      const usage = j?.usage ?? {};
      const cost = costOf(model, Number(usage.prompt_tokens ?? 0), Number(usage.completion_tokens ?? 0));
      const text = String(j?.choices?.[0]?.message?.content ?? '');
      const parsed = extractJson(text);
      recordReviewSpend({
        run_id: runId, slug: a.slug, lens: spec.lens, provider: 'openai_api', model,
        prompt_tokens: Number(usage.prompt_tokens ?? 0), completion_tokens: Number(usage.completion_tokens ?? 0),
        images: images.length, cost_usd: cost, estimated_usd: estUsd,
        status: parsed ? 'ok' : 'error', detail: parsed ? `model=${model}` : 'unparseable JSON',
      });
      console.log(`[review]   PAID ${spec.lens} via ${model} — $${cost.toFixed(4)} (${usage.prompt_tokens ?? 0} in / ${usage.completion_tokens ?? 0} out)`);
      if (!parsed) return failedReport({ ...meta, source: model, durationMs: Date.now() - t0 }, `${model} returned no parseable JSON`);
      return normalizeReport(parsed, { lens: spec.lens, stage: spec.stage, source: model, durationMs: Date.now() - t0, costUsd: cost });
    } catch (e: any) {
      lastErr = `${model}: ${String(e?.message ?? e).slice(0, 160)}`;
    }
  }
  recordReviewSpend({ run_id: runId, slug: a.slug, lens: spec.lens, provider: 'openai_api', status: 'error', detail: lastErr });
  return failedReport({ ...meta, durationMs: Date.now() - t0 }, lastErr);
}
