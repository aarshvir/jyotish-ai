export async function GET() {
  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  console.log('🔍 Debug - API Key exists:', !!apiKey);
  console.log('🔍 Debug - API Key length:', apiKey?.length);
  console.log('🔍 Debug - API Key starts with:', apiKey?.substring(0, 10));
  console.log('🔍 Debug - API Key is placeholder:', apiKey === 'your_anthropic_api_key');
  
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return Response.json({ 
      ok: false, 
      error: 'ANTHROPIC_API_KEY is not set or is still the placeholder value',
      keyExists: !!apiKey,
      isPlaceholder: apiKey === 'your_anthropic_api_key',
    });
  }
  
  const client = new Anthropic.default({ apiKey });
  
  try {
    console.log('🔍 Debug - Attempting Claude API call...');
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }]
    });
    console.log('✅ Debug - Claude API call succeeded');
    return Response.json({ ok: true, msg });
  } catch(e: any) {
    console.error('❌ Debug - Claude API call failed:', e);
    return Response.json({ 
      ok: false, 
      error: e.message || String(e),
      status: e.status,
      type: e.type,
    });
  }
}
