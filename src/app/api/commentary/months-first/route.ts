export const maxDuration = 120;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';

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
    mahadasha: string;
    antardasha: string;
    startMonth: string;
    months: Array<{ month_label: string; month_index: number; key_transits_hint?: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lagnaSign, mahadasha, antardasha, months } = body;
  if (!lagnaSign || !months?.length) {
    return NextResponse.json({ error: 'lagnaSign and months required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate monthly summaries for months 1-6. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Months to analyse:
${JSON.stringify(months, null, 2)}

Return exactly 6 month objects in this structure:
{
  "months": [
    {
      "month_index": 0,
      "month_label": "March 2026",
      "overall_score": number 40-80,
      "career_score": number,
      "money_score": number,
      "health_score": number,
      "love_score": number,
      "theme": "one italic sentence",
      "key_transits": ["4-5 bullet strings, each naming a planet, date range, house activation, and effect"],
      "analysis": "Write 150-180 words covering: (1) The dominant transit event of this month for ${lagnaSign} lagna — name the specific planet, which house it is transiting (by number), and the concrete effect on career, wealth, or health. Write: 'Jupiter transiting Gemini in the 12th house amplifies foreign expenditure and isolates conventional social networks' not 'planetary positions bring change'. (2) Which 3-4 houses the Moon passes through this month — name each house and what it governs in this chart specifically. (3) How the Rahu-Mercury dasha interacts with this month's dominant transit — does it amplify or conflict with the monthly energy? (4) ONE concrete recommendation: which domain to prioritize (career/finance/health/relationships) and the specific planetary reason why. Never write a generic sentence. Name houses by number, planets by name, nakshatras by name where relevant.",
      "overall_score": "Must reflect actual transit quality. Apply these modifiers to base 55: Jupiter transiting H1 (Cancer): +18; Jupiter transiting H12 (Gemini): -5; Saturn transiting H8: -10; Mars in lagna (Cancer): +12; Mercury Rx month: -8; Moon spends majority in H11: +10; Moon spends majority in H8 or H12: -8; Amavasya falls mid-month: -5. Scores MUST range 42-75 across 12 months. Do not cluster scores between 52-65."
    }
  ]
}

Same structure for each of the 6 months. Start with { and end with }.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = safeParseJson<{ months: any[] }>(text);
    return NextResponse.json({ months: parsed.months ?? [] });
  } catch (err: any) {
    console.error('[months-first]', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Commentary failed' }, { status: 500 });
  }
}
