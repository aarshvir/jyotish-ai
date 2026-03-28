export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { requireAuth } from '@/lib/api/requireAuth';

const anthropic = process.env.ANTHROPIC_API_KEY?.trim()
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() })
  : null;

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  let body: {
    lagnaSign: string;
    lagnaDegreee?: number;
    moonSign: string;
    moonNakshatra: string;
    mahadasha: string;
    antardasha: string;
    md_end?: string;
    ad_end?: string;
    planets: Record<string, unknown>;
    model_override?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    lagnaSign,
    lagnaDegreee,
    moonSign,
    moonNakshatra,
    mahadasha,
    antardasha,
    md_end,
    ad_end,
    planets,
  } = body;
  if (!lagnaSign) {
    return NextResponse.json({ error: 'lagnaSign required' }, { status: 400 });
  }

  const modelOverride =
    typeof body.model_override === 'string' ? body.model_override.trim() : undefined;

  if (modelOverride && !hasLlmCredentials(modelOverride)) {
    return NextResponse.json(
      { error: 'API key missing for selected model_override provider' },
      { status: 503 },
    );
  }

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a specific planet, house, or nakshatra.

Return ONLY valid JSON with two keys: lagna_analysis, dasha_interpretation. No markdown, no backticks.`;

  const planetLines = Object.entries(planets ?? {})
    .map(([p, d]) => {
      const row = d as { sign?: string; house?: number };
      return `${p} in ${row.sign ?? '?'} (house ${row.house ?? '?'})`;
    })
    .join('\n');

  const planetBlock = [
    `ACTUAL NATAL PLANETARY POSITIONS — sidereal Lahiri, whole-sign houses from ${lagnaSign} lagna:`,
    planetLines,
    ``,
    `STRICT RULE: Use ONLY these positions.`,
    `Do NOT invent any planetary placement.`,
    `Do NOT place planets in houses not listed above.`,
    ``,
  ].join('\n');

  const userPrompt = `Generate lagna analysis and dasha interpretation for this native.

${planetBlock}

Lagna: ${lagnaSign} ${(lagnaDegreee ?? 0).toFixed(2)}°
Moon: ${moonSign} / ${moonNakshatra}
Current dasha: ${mahadasha} MD (until ${md_end ?? '?'}) / ${antardasha} AD (until ${ad_end ?? '?'})

Additional chart payload (reference only; graha signs/houses above are authoritative):
${JSON.stringify(planets, null, 2)}

Return this exact JSON:
{
  "lagna_analysis": "150-200 words. Must cover: ${lagnaSign} rising sign character and physical traits, lagna lord placement and house (e.g. Moon in Leo 2H for Cancer lagna means X), dominant yoga of the chart and its effect, overall life direction. Name specific planets, houses, nakshatras in every sentence.",
  "dasha_interpretation": "100-150 words. Cover: ${mahadasha} lord's house rulership for this lagna and what house themes dominate, ${antardasha} lord's rulership and how it modifies the MD expression, practical guidance for what to pursue and avoid in this exact period."
}

Start with { and end with }. No markdown.`;

  try {
    let rawText: string;
    if (modelOverride) {
      rawText = await completeLlmChat({
        modelOverride,
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
      });
    } else {
      if (!anthropic) {
        return NextResponse.json({ error: 'API key missing' }, { status: 500 });
      }
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawText = extractText(response);
    }

    const parsed = safeParseJson<{ lagna_analysis?: string; dasha_interpretation?: string }>(rawText);
    return NextResponse.json({
      lagna_analysis: parsed.lagna_analysis ?? '',
      dasha_interpretation: parsed.dasha_interpretation ?? '',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[nativity-text]', msg);
    return NextResponse.json({ error: msg || 'Commentary failed' }, { status: 500 });
  }
}
