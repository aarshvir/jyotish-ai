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

Return this JSON structure. Each week's analysis must be a dense paragraph in grandmaster style: key yogas and transits for the week, then end with "BEST: [date or event]." and "WORST: [date or event]." so the reader gets clear best/worst days for that week.
{
  "weeks": [
    {
      "week_index": 0,
      "week_label": "Mar 7–13",
      "overall_score": number,
      "theme": "one short title sentence (e.g. Saturn Combust + Jupiter Direct)",
      "analysis": "100-120 words. Dense paragraph. Include BEST: and WORST: with specific dates or events.",
      "moon_signs": ["Libra", "Scorpio", "Sagittarius"]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "200-250 words. First sentence in ALL CAPS. Then: (1) dominant transit - planet, house number, effect for Cancer lagna; (2) Rahu-Mercury dasha - Rahu in H6 and Mercury 3rd/12th lordship; (3) Moon journey across houses; (4) close with master directive in CAPS.",
    "strategic_windows": [
      { "date": "YYYY-MM-DD", "score": 70, "nakshatra": "name", "reason": "50-60 words: hora windows, yoga, Moon house, specific activities. Use synthesis_context.best_date and nearby." }
    ],
    "caution_dates": [
      { "date": "YYYY-MM-DD", "score": 35, "nakshatra": "name", "reason": "50-60 words: what to AVOID, direct language." }
    ],
    "domain_priorities": {
      "career": "50-60 words: Mars hora windows and times, best day for career action and why.",
      "money": "50-60 words: 2nd and 11th house transits, primary financial risk.",
      "health": "50-60 words: 6th house activations, highest-stress day, one wellness directive.",
      "relationships": "50-60 words: 7th house activations, Venus as badhaka - friction vs harmony."
    },
    "closing_paragraph": "60-80 words: Jupiter in H12 conjunct Ketu. One practice (mantra or ritual) for Rahu-Mercury period. Longer arc."
  }
}

Start with { and end with }. No markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
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
    const fallbackAnalysis =
      'Fallback weekly overview. Use daily scores and hourly table as primary guidance. BEST: use synthesis_context.best_date and high-score days. WORST: avoid synthesis_context.worst_date and low-score days. Commentary service temporarily degraded.';
    const fallbackWeeks = (body.weeks ?? []).slice(0, 6).map((w: any, i: number) => ({
      week_index: i,
      week_label: w.week_label ?? `Week ${i + 1}`,
      overall_score: 65,
      theme: 'Weekly energy arc.',
      analysis: fallbackAnalysis,
      commentary: fallbackAnalysis,
      moon_signs: [],
    }));
    const bestDate = body.synthesis_context?.best_date ?? '2026-03-10';
    const worstDate = body.synthesis_context?.worst_date ?? '2026-03-13';
    const opening = `RAHU-MERCURY PERIOD SYNTHESIS FOR CANCER LAGNA - H6 SERVICE AND H12 CLOSURE.
Rahu in the 6th house intensifies competition and makes everyday duties unavoidable, so Mercury as the antardasha lord must guide every message with precision. For Cancer lagna, Mercury rules the 3rd and the 12th houses, therefore communication strategy and hidden expenses move together; when Rahu-Mercury is activated, coordination improves if you document plans. The Moon journey during this period repeatedly shifts practical focus: when the Moon transits the 1st house, confidence rises and work begins faster; when it transits the 5th house, analysis and education increase; when it reaches the 9th house, travel intentions and counsel become stronger; when it touches the 11th house, gains stabilize. Use Mars energy for execution, because Mars hora supports H10 deliverables and makes proposals actionable. Choose best windows anchored to ${bestDate} because high-score days align with favourable choghadiya and benefic hora planets. Avoid the worst pressure around ${worstDate}, especially during Rahu Kaal, because H6 urgency can distort judgment. BEST ACTION: launch only after you align Mars hora with the day’s top choghadiya.`;
    return NextResponse.json({
      weeks: fallbackWeeks,
      period_synthesis: {
        opening_paragraph: opening,
        strategic_windows: [
          { date: body.synthesis_context?.best_date ?? '2026-03-10', score: 74, nakshatra: '—', reason: 'Use peak-score day from synthesis context; schedule high-stakes work in slots with score 75+.' },
          { date: '2026-03-11', score: 70, nakshatra: '—', reason: 'Secondary best day; use Mars and Jupiter horas for career and decisions.' },
        ],
        caution_dates: [{ date: body.synthesis_context?.worst_date ?? '2026-03-13', score: 34, nakshatra: '—', reason: 'Avoid new commitments and speculative actions; use for completion and routine only.' }],
        domain_priorities: {
          career: `Career: Use Mars hora for H10 deliverables and schedule the main submission on ${bestDate}. Mars supports action while Mercury strengthens wording and coordination through H3 and H12, so emails, proposals, and documentation land with clarity. Avoid Rahu Kaal-heavy hours because Rahu in H6 increases urgency and Saturn influence in H8 delays approvals; keep decisions measurable and timeboxed.`,
          money: '2nd and 11th house transits favour gains on high-score days; avoid major expenditure on worst-date days.',
          health: '6th house activations; prioritise rest on low-score days and hydrate. One wellness directive: short walks during favourable horas.',
          relationships: '7th house and Venus as badhaka; gentle gestures on favourable days, avoid confrontations on worst days.',
        },
        closing_paragraph: 'Jupiter in 12th with Ketu supports moksha axis. One mantra or remedial practice during Rahu-Mercury period. Rely on score tables until full commentary is available.',
      },
    });
  }
}
