export const maxDuration = 300;
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

function buildFallbackMonths(body: any): { month_index: number; month_label: string; overall_score: number; career_score: number; money_score: number; health_score: number; love_score: number; theme: string; key_transits: string[]; analysis: string }[] {
  const fallbackScores = [48, 52, 58, 70, 73, 65];
  const inputMonths = Array.isArray(body?.months) ? body.months : [];

  return inputMonths.slice(0, 6).map((m: any, i: number) => {
    const overall_score = fallbackScores[i % fallbackScores.length];
    const month_label = String(m?.month_label ?? `Month ${i + 1}`);
    const analysis =
      `PHASE LINE — ${month_label} for Cancer lagna. ` +
      `Jupiter emphasis activates H12 while Saturn themes activate H8 through concrete transit work. ` +
      `Mars influence in H1 shapes courage and immediate execution. ` +
      `Mercury interaction highlights H3 for communication and service outcomes, with Rahu-like pressure demanding careful wording. ` +
      `Moon passage supports H11 gains and stabilizes the wealth channel. ` +
      `In this month, Rahu-Mercury axis strengthens competition yet forces disciplined commitments, so plan actions inside supportive windows. ` +
      `Best days follow whenever the hourly table aligns with benefic hora planets and favorable choghadiya. ` +
      `Worst days appear when the schedule overlaps inauspicious choghadiya, so delay signatures and avoid friction. ` +
      `Career action should target H10 deliverables, and health focus must protect H6 routines. ` +
      `Select one domain to advance and keep the workflow measurable through house-based alignment. ` +
      `Rating: ${overall_score}/100.`;

    return {
      month_index: typeof m?.month_index === 'number' ? m.month_index : i,
      month_label,
      overall_score,
      career_score: overall_score,
      money_score: overall_score,
      health_score: overall_score,
      love_score: overall_score,
      theme: 'Fallback monthly theme.',
      key_transits: [],
      analysis,
    };
  });
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
  if (!lagnaSign || !Array.isArray(months) || months.length === 0) {
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

analysis: Write 150-180 words. Include: (1) Dominant transit this month for ${lagnaSign} lagna — name planet, house number, and concrete effect. (2) Which 3-4 house numbers the Moon passes through and what each governs. (3) How Rahu-Mercury dasha interacts — amplifies or conflicts. (4) End with a BEST/WORST line. Never write generic sentences; every sentence names a planet, house, or nakshatra.

overall_score: Apply modifiers to base 55 and keep a wide range across months. Jupiter enters Cancer around mid-2026 giving June/July/August scores 70-75. Scores MUST range 42-75 across 6 months. Do not cluster all months at 52-65.

Return exactly 6 month objects in this structure:
{
  "months": [
    {
      "month_index": 0,
      "month_label": "March 2026",
      "overall_score": 55,
      "career_score": 55,
      "money_score": 55,
      "health_score": 55,
      "love_score": 55,
      "theme": "one italic sentence",
      "key_transits": ["4-5 strings naming planets/date ranges/house activation/effect"],
      "analysis": "150-180 word analysis"
    }
  ]
}

Same structure for each month. Start with { and end with }.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 7000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = safeParseJson<{ months: any[] }>(text);

    return NextResponse.json({ months: parsed.months ?? [] });
  } catch (err: any) {
    console.error('[months-first]', err?.message || err);
    return NextResponse.json({ months: buildFallbackMonths(body) });
  }
}

