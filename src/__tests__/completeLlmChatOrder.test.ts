import { describe, it, expect, vi, beforeEach } from 'vitest';

const { runModelChain } = vi.hoisted(() => ({
  runModelChain: vi.fn(async () => ({ text: 'from the owner chain', rung: 'openai', model: 'gpt-5.6-terra' })),
}));
vi.mock('@/lib/llm/modelChain', () => ({ runModelChain }));

describe('default model order for report commentary', () => {
  beforeEach(() => runModelChain.mockClear());

  it('sends a call with no model override through the owner model chain', async () => {
    const { completeLlmChat } = await import('@/lib/llm/routeCompletion');
    const text = await completeLlmChat({ systemPrompt: 'S', userPrompt: 'U', maxTokens: 900, auditStage: 'weeks-synthesis' });
    expect(text).toBe('from the owner chain');
    expect(runModelChain).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 900, auditStage: 'weeks-synthesis' }));
  });

  it('treats a blank override (the new monthly default) as no override', async () => {
    const { completeLlmChat } = await import('@/lib/llm/routeCompletion');
    await completeLlmChat({ modelOverride: '  ', systemPrompt: 'S', userPrompt: 'U', maxTokens: 6000 });
    expect(runModelChain).toHaveBeenCalledOnce();
  });

  it('the fallback chain skips the rungs already tried upstream', async () => {
    const { runChatFallbackChain } = await import('@/lib/llm/fallbackChain');
    await runChatFallbackChain({ systemPrompt: 'S', userPrompt: 'U', maxTokens: 10, skipOpenAI: true });
    expect(runModelChain).toHaveBeenCalledWith(expect.objectContaining({ skip: ['openai', 'anthropic'] }));
    runModelChain.mockClear();
    await runChatFallbackChain({ systemPrompt: 'S', userPrompt: 'U', maxTokens: 10 });
    expect(runModelChain).toHaveBeenCalledWith(expect.objectContaining({ skip: ['anthropic'] }));
  });
});
