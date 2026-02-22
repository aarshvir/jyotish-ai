import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateAstrologyAnalysis(prompt: string): Promise<string> {
  try {
    console.log('🔮 Anthropic client - Calling Claude...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('✅ Anthropic client - Response received');
    const textContent = message.content.find((block) => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
  } catch (error: any) {
    console.error('❌ Anthropic client error:', error);
    console.error('❌ Anthropic client error details:', {
      message: error.message,
      status: error.status,
      type: error.type,
    });
    throw error;
  }
}
