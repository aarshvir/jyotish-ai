import Anthropic from '@anthropic-ai/sdk';
import { hasAnyChatFallbackKey, runChatFallbackChain } from '@/lib/llm/fallbackChain';
import { logLlmAudit } from '@/lib/llm/audit';

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

export const anthropic = apiKey
  ? new Anthropic({ apiKey, timeout: 55_000, maxRetries: 0 })
  : (null as unknown as Anthropic);

const FALLBACK_SYSTEM =
  'You are an expert Vedic astrology assistant. Answer with clarity and precision.';

export async function generateAstrologyAnalysis(prompt: string): Promise<string> {
  const delays = [2000, 4000, 8000];
  let lastError: unknown;

  if (anthropic && apiKey) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          messages: [{ role: 'user', content: prompt }],
        });

        const textContent = message.content.find((block) => block.type === 'text');
        const out = textContent && 'text' in textContent ? textContent.text : '';
        if (out.trim()) logLlmAudit('generateAstrologyAnalysis', 'anthropic', 'claude-sonnet-4-6');
        return out;
      } catch (error: unknown) {
        lastError = error;
        const status = (error as { status?: number })?.status;

        if (status === 401) {
          console.warn('generateAstrologyAnalysis: Anthropic 401 — trying fallback chain');
          break;
        }

        if ((status === 429 || status === 529) && attempt < 2) {
          const delay = status === 529 ? 5000 : delays[attempt];
          console.warn(`Anthropic ${status}, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
          continue;
        }
      }
    }
  }

  if (hasAnyChatFallbackKey()) {
    try {
      return await runChatFallbackChain({
        systemPrompt: FALLBACK_SYSTEM,
        userPrompt: prompt,
        maxTokens: 16000,
        auditStage: 'generateAstrologyAnalysis',
      });
    } catch (fallbackErr) {
      lastError = fallbackErr;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('ANTHROPIC_API_KEY is not set and no fallback LLM keys configured');
}
