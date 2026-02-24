export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return Response.json({
      ok: false,
      error: 'ANTHROPIC_API_KEY is not set or is still the placeholder value',
    });
  }

  const client = new Anthropic.default({ apiKey });

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    });
    return Response.json({ ok: true, msg });
  } catch (e: any) {
    return Response.json({
      ok: false,
      error: e.message || String(e),
      status: e.status,
    });
  }
}
