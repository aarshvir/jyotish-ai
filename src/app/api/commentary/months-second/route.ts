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
  const fallbackScores = [70, 73, 68, 62, 58, 52];
  const inputMonths = Array.isArray(body?.months) ? body.months : [];

  return inputMonths.slice(0, 6).map((m: any, i: number) => {
    const overall_score = fallbackScores[i % fallbackScores.length];
    const month_label = String(m?.month_label ?? `Month ${i + 7}`);
    const analysis =
      `PHASE LINE — ${month_label} for Cancer lagna. ` +
      `Jupiter emphasis interacts with H12 and H1 outcomes, shaping wealth and execution. ` +
      `Saturn themes activate H8, pushing disciplined repairs and delayed gratification. ` +
      `Mars and Mercury interplay strengthens H3 communication and service delivery through focused steps. ` +
      `Moon majority supports H11 gains while Rahu influence demands risk control. ` +
      `Choose career actions aligned with H10 deliverables and prioritize health routines via H6. ` +
      `Rahu-Mercury dasha can amplify competition, so avoid friction and use direct wording. ` +
      `Best days arrive when hora timing aligns with supportive choghadiya and stable house activation. ` +
      `Worst days arrive when inauspicious choghadiya overlaps with Rahu pressure, so postpone signatures and protect momentum.`;

    return {
      month_index: typeof m?.month_index === 'number' ? m.month_index : i + 6,
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

  const userPrompt = `Generate monthly summaries for months 7-12. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Months to analyse:
${JSON.stringify(months, null, 2)}

analysis: Write 150-180 words in grandmaster style. Every sentence must name a planet, house, or nakshatra. Include dominant transit, Moon house journey (3-4 houses), and Rahu-Mercury interaction. End with BEST/WORST line. Never write generic sentences.

overall_score: Apply wide modifiers across months; keep a wide range and avoid clustering at 52-65. Scores MUST range 42-75 across 6 months. Do not cluster all months at 52-65.

Return exactly 6 month objects in this structure:
{
  "months": [
    {
      "month_index": 6,
      "month_label": "September 2026",
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

Same structure for each of the 6 months. Start with { and end with }.`;

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
    console.error('[months-second]', err?.message || err);
    return NextResponse.json({ months: buildFallbackMonths(body) });
  }
}

