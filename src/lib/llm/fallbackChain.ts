import { cleanEnv } from '@/lib/env';
import { runModelChain } from '@/lib/llm/modelChain';

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

/**
 * The fallback chain now IS the owner's model order, minus the rungs already tried upstream.
 * Kept as a named export because explicit-override paths (a pinned claude-* or gpt-* model in
 * routeCompletion) and ForecastAgent call it after their own first attempt fails.
 */
export async function runChatFallbackChain(opts: FallbackChainOpts): Promise<string> {
  const { text } = await runModelChain({
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens,
    auditStage: opts.auditStage ?? 'fallback_chain',
    skip: opts.skipOpenAI ? ['openai', 'anthropic'] : ['anthropic'],
  });
  return text;
}
