/**
 * What a model call costs, from the tokens the provider reported.
 *
 * List prices in USD per million tokens, read from each provider's pricing page on
 * 2026-10-11 (platform.claude.com/docs/en/about-claude/pricing,
 * developers.openai.com/api/docs/pricing, api-docs.deepseek.com/quick_start/pricing).
 * Reasoning tokens are billed as output by all three, and the providers' `output` counts
 * already include them, so cost = input × in + output × out.
 *
 * DeepSeek has an off-peak rate; the peak rate is used here, so an estimate is never low.
 * A model not in the table returns null rather than a guess. Update this table whenever a
 * provider changes a price; `llmCost.test.ts` pins the arithmetic, not the prices.
 */

export interface ModelPrice {
  /** USD per million input tokens. */
  in: number;
  /** USD per million output tokens (reasoning included). */
  out: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  // Anthropic
  'claude-opus-5-5': { in: 4, out: 20 },
  'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5-5': { in: 2, out: 10 },
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5 },
  'claude-haiku-4-5': { in: 1, out: 5 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
  // OpenAI
  'gpt-5.6-sol': { in: 4, out: 20 },
  'gpt-5.6-terra': { in: 2, out: 12 },
  'gpt-5.6-luna': { in: 0.2, out: 1.2 },
  'gpt-5.5': { in: 5, out: 30 },
  'gpt-5.4-mini': { in: 0.75, out: 4.5 },
  // DeepSeek (peak rate)
  'deepseek-flash': { in: 0.3, out: 1.2 },
  'deepseek-v4-flash': { in: 0.3, out: 1.2 },
  'deepseek-v4-pro': { in: 1.32, out: 3.96 },
};

export function priceOf(model: string | null | undefined): ModelPrice | null {
  if (!model) return null;
  return MODEL_PRICES[model] ?? null;
}

/** USD for one call, or null when the model's price is not in the table. */
export function costUsd(model: string | null | undefined, input: number | null | undefined, output: number | null | undefined): number | null {
  const p = priceOf(model);
  if (!p || input == null || output == null) return null;
  return (input * p.in + output * p.out) / 1_000_000;
}
