import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey
  ? new Anthropic({ apiKey })
  : (null as unknown as Anthropic);

export async function generateAstrologyAnalysis(prompt: string): Promise<string> {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not set. Check .env.local');
  }

  const delays = [2000, 4000, 8000];
  let lastError: any;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = message.content.find((block) => block.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : '';
    } catch (error: any) {
      lastError = error;
      const status = error?.status;

      if (status === 401) throw new Error('Invalid Anthropic API key. Check .env.local');

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

  throw lastError ?? new Error('Anthropic API call failed after retries');
}
