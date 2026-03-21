export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export async function POST(req: NextRequest) {
  if (!anthropic) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

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
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lagnaSign, lagnaDegreee, moonSign, moonNakshatra, mahadasha, antardasha, md_end, ad_end, planets } = body;
  if (!lagnaSign) {
    return NextResponse.json({ error: 'lagnaSign required' }, { status: 400 });
  }

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a specific planet, house, or nakshatra.

Return ONLY valid JSON with two keys: lagna_analysis, dasha_interpretation. No markdown, no backticks.`;

  const userPrompt = `Generate lagna analysis and dasha interpretation for this native.

Lagna: ${lagnaSign} ${(lagnaDegreee ?? 0).toFixed(2)}°
Moon: ${moonSign} / ${moonNakshatra}
Current dasha: ${mahadasha} MD (until ${md_end ?? '?'}) / ${antardasha} AD (until ${ad_end ?? '?'})

Planetary positions:
${JSON.stringify(planets, null, 2)}

Return this exact JSON:
{
  "lagna_analysis": "150-200 words. Must cover: ${lagnaSign} rising sign character and physical traits, lagna lord placement and house (e.g. Moon in Leo 2H for Cancer lagna means X), dominant yoga of the chart and its effect, overall life direction. Name specific planets, houses, nakshatras in every sentence.",
  "dasha_interpretation": "100-150 words. Cover: ${mahadasha} lord's house rulership for this lagna and what house themes dominate, ${antardasha} lord's rulership and how it modifies the MD expression, practical guidance for what to pursue and avoid in this exact period."
}

Start with { and end with }. No markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = safeParseJson<{ lagna_analysis?: string; dasha_interpretation?: string }>(text);
    return NextResponse.json({
      lagna_analysis: parsed.lagna_analysis ?? '',
      dasha_interpretation: parsed.dasha_interpretation ?? '',
    });
  } catch (err: any) {
    console.error('[nativity-text]', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Commentary failed' }, { status: 500 });
  }
}
