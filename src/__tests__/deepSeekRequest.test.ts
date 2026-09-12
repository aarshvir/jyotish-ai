import { describe, it, expect } from 'vitest';
import { deepSeekRequest } from '@/lib/llm/fallbackChain';

const opts = { systemPrompt: 'SYSTEM', userPrompt: 'USER', maxTokens: 8000 };

describe('deepSeekRequest — the DeepSeek fallback rung', () => {
  it('disables thinking on deepseek-flash, or V4.1-Flash reasons until truncated', () => {
    expect(deepSeekRequest('deepseek-flash', opts)).toMatchObject({ thinking: { type: 'disabled' } });
  });

  it('disables thinking on other non-reasoner ids too', () => {
    expect(deepSeekRequest('deepseek-v4-pro', opts)).toMatchObject({ thinking: { type: 'disabled' } });
  });

  it('leaves an explicitly configured reasoner model to think', () => {
    expect(deepSeekRequest('deepseek-reasoner', opts)).not.toHaveProperty('thinking');
  });

  it('caps max_tokens at 8192 and sends system before user', () => {
    const body = deepSeekRequest('deepseek-flash', { ...opts, maxTokens: 20_000 });
    expect(body.max_tokens).toBe(8192);
    expect(body.messages).toEqual([
      { role: 'system', content: 'SYSTEM' },
      { role: 'user', content: 'USER' },
    ]);
  });
});
