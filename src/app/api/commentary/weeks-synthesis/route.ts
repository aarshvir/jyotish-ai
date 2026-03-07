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
    reportStartDate: string;
    weeks: Array<{
      week_label: string;
      start_date: string;
      end_date: string;
      daily_scores: number[];
    }>;
    synthesis_context: {
      total_days: number;
      best_date: string;
      best_score: number;
      worst_date: string;
      worst_score: number;
      avg_score: number;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lagnaSign, mahadasha, antardasha, weeks, synthesis_context } = body;
  if (!lagnaSign || !weeks?.length) {
    return NextResponse.json({ error: 'lagnaSign and weeks required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate 6 weekly summaries AND the period synthesis. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Weeks:
${JSON.stringify(weeks, null, 2)}

Synthesis context:
${JSON.stringify(synthesis_context, null, 2)}

Return this JSON structure:
{
  "weeks": [
    {
      "week_index": 0,
      "week_label": "Mar 7–13",
      "overall_score": number,
      "theme": "one sentence",
      "analysis": "100-120 words",
      "moon_signs": ["Libra", "Scorpio", "Sagittarius"]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "200-250 words. Start with the single most important strategic insight about this entire period in ONE sentence in ALL CAPS. Then write: (1) the dominant transit configuration — name the planet, house, and what it activates for Cancer lagna; (2) the Rahu-Mercury dasha combination — what Rahu in the 6th house amplifies and what Mercury's 3rd/12th house lordship suppresses during this antardasha; (3) the Moon's journey — name the houses it passes through across the forecast period and describe the energy arc from start to finish; (4) close with a master directive for the period in CAPS.",
    "strategic_windows": [
      { "date": "YYYY-MM-DD", "score": 70, "nakshatra": "name", "reason": "50-60 words: why this day is powerful — name hora windows by time, yoga if auspicious, Moon house position, what activity is favored (contract review, client presentations, financial planning). Use synthesis_context.best_date and nearby high days." }
    ],
    "caution_dates": [
      { "date": "YYYY-MM-DD", "score": number, "nakshatra": "name", "reason": "50-60 words: what to AVOID, direct language." }
    ],
    "domain_priorities": {
      "career": "50-60 words: Name the specific Mars hora windows and times that favor career moves. Name the 10th house activations. State the single best day of the period for career action and why.",
      "money": "50-60 words: Name the 2nd and 11th house transit windows. State which hora planet governs wealth gains for Cancer lagna (Mars as yogakaraka). Name the primary financial risk this period.",
      "health": "50-60 words: Name the 6th house activations and Saturn's effect. Identify the highest-stress day and why. Give one specific rest or wellness directive.",
      "relationships": "50-60 words: Name the 7th house activations. Address Venus as badhaka lord for Cancer lagna — when Venus hora creates friction vs harmony. Give one concrete relationship directive."
    },
    "closing_paragraph": "60-80 words: Spiritual guidance. Reference Jupiter exalted in Cancer in the 12th house conjunct Ketu — what this moksha axis asks of the native during this period. Suggest one specific practice (mantra, ritual, or contemplation) appropriate to the current dasha. Close with one sentence about the longer arc of this Rahu-Mercury period."
  }
}

Start with { and end with }. No markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = safeParseJson<{ weeks: any[]; period_synthesis: any }>(text);
    return NextResponse.json({
      weeks: parsed.weeks ?? [],
      period_synthesis: parsed.period_synthesis ?? null,
    });
  } catch (err: any) {
    console.error('[weeks-synthesis]', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Commentary failed' }, { status: 500 });
  }
}
