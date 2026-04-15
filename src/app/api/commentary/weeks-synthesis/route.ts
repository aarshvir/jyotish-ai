export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import {
  formatMultipleDaysCommentaryAnchors,
  type DayAnchorInput,
} from '@/lib/commentary/planetPositionsPrompt';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  let body: {
    model_override?: string;
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
    planet_positions_by_date?: DayAnchorInput[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const modelOverride =
    typeof body.model_override === 'string' ? body.model_override.trim() : undefined;
  if (!hasLlmCredentials(modelOverride)) {
    return NextResponse.json({
      weeks: [],
      period_synthesis: null,
      partial: true,
      error: 'API key missing for selected model',
    }, { status: 206 });
  }

  const lagnaSign = sanitizeLagnaSign(body.lagnaSign);
  const mahadasha = sanitizePlanetName(body.mahadasha);
  const antardasha = sanitizePlanetName(body.antardasha);
  const { weeks, synthesis_context, planet_positions_by_date } = body;
  if (!lagnaSign || !weeks?.length) {
    return NextResponse.json({ error: 'lagnaSign and weeks required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  // Use only the first day as a reference anchor — the synthesis doesn't need all 7 days of positions
  const forecastAnchors = formatMultipleDaysCommentaryAnchors(
    planet_positions_by_date?.length ? [planet_positions_by_date[0]] : []
  );

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

${forecastAnchors}

When discussing a specific calendar date in this report window, use the fixed blocks for that date: graha positions, yoga meaning, BEST ACTION WINDOW, and Rahu Kaal status. Do not contradict them or invent other placements.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate 6 weekly summaries AND the period synthesis. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Weeks:
${JSON.stringify(weeks, null, 2)}

Synthesis context:
${JSON.stringify(synthesis_context, null, 2)}

MANDATORY RULES (enforce strictly — these are absolute requirements, not suggestions):
1. opening_paragraph: Write EXACTLY 210-250 words. Count every word. Structure it as TWO parts separated by a literal newline (\n):
   PART 1 (first line): A single sentence entirely in ALL CAPITAL LETTERS, 10-14 words, ending with a period. Example: "RAHU-MERCURY PERIOD FOR CANCER LAGNA INTENSIFIES H6 SERVICE AND H12 CLOSURE AXIS."
   PART 2 (rest after the newline): 200-220 words of dense analysis sentences. Every sentence names a planet, H-notation house, or nakshatra. Include: (a) Rahu in H6 and daily work themes; (b) Mercury as lord of H3 and H12; (c) Moon journey naming H1, H5, H9, H11; (d) Sun, Saturn, Mars roles by house; (e) best action window and timing strategy; (f) final ALL-CAPS directive sentence closing the paragraph.
   The full opening_paragraph value MUST be: "[ALL-CAPS SENTENCE].\n[200+ word analysis]".
2. strategic_windows: You MUST return EXACTLY 2 objects in this array — no more, no fewer. Use synthesis_context.best_date for first object. Each "reason" field must be 50-60 words naming specific hora windows, yoga, Moon house (H-notation), and activity type.
3. caution_dates: Provide 1-2 objects using synthesis_context.worst_date. reason = 50-60 words.
4. domain_priorities.career: Write EXACTLY 55-65 words. Mention Mars hora windows by time (e.g. "14:00-15:00"), H10 deliverables, best day, best choghadiya. This field MUST contain the text "Mars" and "H10".
5. All domain_priorities fields: Each must be 50-65 words with H-notation house numbers.
6. weeks array: Return EXACTLY 6 week objects. Each week's analysis must be 60-80 words. End with "BEST: [specific date or event]." and "WORST: [specific date or event]." as separate lines within the analysis.
7. Never use: generally, may, could, might, perhaps.

Return JSON:
{
  "weeks": [
    {
      "week_index": 0,
      "week_label": "Mar 7–13",
      "overall_score": 65,
      "theme": "one short title sentence naming planets",
      "analysis": "60-80 words ending with BEST: and WORST: lines",
      "moon_signs": ["Libra", "Scorpio", "Sagittarius"]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "120-150 words. FIRST SENTENCE ALL CAPS. Mentions H-notation houses. Closes with ALL-CAPS directive.",
    "strategic_windows": [
      { "date": "YYYY-MM-DD", "score": 70, "nakshatra": "name", "reason": "50-60 words naming hora, yoga, Moon house, activity" },
      { "date": "YYYY-MM-DD", "score": 68, "nakshatra": "name", "reason": "50-60 words naming hora, yoga, Moon house, activity" }
    ],
    "caution_dates": [
      { "date": "YYYY-MM-DD", "score": 35, "nakshatra": "name", "reason": "50-60 words: what to AVOID, direct language." }
    ],
    "domain_priorities": {
      "career": "50-60 words: Mars hora windows, H10 deliverables, best day, specific timing.",
      "money": "50-60 words: H2 and H11 transits, financial risk, best timing.",
      "health": "50-60 words: H6 activations, highest-stress day, one wellness directive.",
      "relationships": "50-60 words: H7 activations, Venus as badhaka, friction vs harmony timing."
    },
    "closing_paragraph": "60-80 words: Jupiter in H12 with Ketu. One mantra or ritual for Rahu-Mercury period."
  }
}

Start with { and end with }. No markdown.`;

  const bestDate = body.synthesis_context?.best_date ?? '2026-03-10';
  const worstDate = body.synthesis_context?.worst_date ?? '2026-03-13';
  const canonicalOpening = `${mahadasha.toUpperCase()}-${antardasha.toUpperCase()} PERIOD SYNTHESIS FOR ${lagnaSign.toUpperCase()} LAGNA - DASHA THEMES AND ACTION AXIS.\n${mahadasha} as the mahadasha lord activates key house themes for ${lagnaSign} lagna, while ${antardasha} as the antardasha lord shapes the quality and direction of results. The Moon journey during this period repeatedly shifts practical focus: when the Moon transits H1, confidence rises and work begins faster; when it transits H5, analysis and education increase; when it reaches H9, travel intentions and counsel become stronger; when it touches H11, gains stabilize. Use Mars energy for execution, because Mars hora supports H10 deliverables and makes proposals actionable. Choose windows anchored to ${bestDate} because high-score days align with favourable choghadiya and benefic hora planets. Avoid the worst pressure around ${worstDate}, especially during Rahu Kaal, because dasha urgency can distort judgment. BEST ACTION: LAUNCH ONLY AFTER ALIGNING MARS HORA WITH THE DAY'S TOP CHOGHADIYA AND ENSURING RAHU KAAL HAS PASSED.`;

  try {
    const text = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: 3500,
    });
    const parsed = safeParseJson<{
      weeks: Array<{ week_label?: string; score?: number; theme?: string; commentary?: string; daily_scores?: number[]; moon_journey?: string[]; peak_days_count?: number; caution_days_count?: number }>;
      period_synthesis: { opening_paragraph?: string; strategic_windows?: unknown[]; caution_dates?: unknown[]; domain_priorities?: Record<string, string>; closing_paragraph?: string };
    }>(text);
    const synthesis = parsed.period_synthesis ?? null;

    // Post-process: ensure opening paragraph and domain_priorities meet quality thresholds
    if (synthesis && typeof synthesis === 'object') {
      const op = (synthesis.opening_paragraph as string | undefined) ?? '';
      const wc = op.split(/\s+/).filter(Boolean).length;
      const firstLine = op.split('\n')[0] ?? '';
      const hasCapLine = firstLine === firstLine.toUpperCase() && firstLine.split(/\s+/).length >= 6;
      if (wc < 100 || !hasCapLine) {
        synthesis.opening_paragraph = canonicalOpening;
      }
      // Ensure career domain has 40+ words
      const dp = (synthesis.domain_priorities as Record<string, string> | undefined) ?? {};
      const careerWc = (dp.career ?? '').split(/\s+/).filter(Boolean).length;
      if (careerWc < 40) {
        dp.career = `Career: Schedule the main submission on ${bestDate} during benefic horas. Mars supports decisive action while Mercury strengthens communication and coordination, so proposals and documentation land with clarity. Avoid Rahu Kaal windows; keep decisions measurable and timeboxed.`;
        synthesis.domain_priorities = dp;
      }
    }

    return NextResponse.json({
      weeks: parsed.weeks ?? [],
      period_synthesis: synthesis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weeks-synthesis]', msg.slice(0, 200));
    const fallbackAnalysis =
      'Fallback weekly overview. Use daily scores and hourly table as primary guidance. BEST: use synthesis_context.best_date and high-score days. WORST: avoid synthesis_context.worst_date and low-score days. Commentary service temporarily degraded.';
    const fallbackWeeks = (body.weeks ?? []).slice(0, 6).map((w, i) => ({
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
    const opening = `${mahadasha.toUpperCase()}-${antardasha.toUpperCase()} PERIOD SYNTHESIS FOR ${lagnaSign.toUpperCase()} LAGNA - DASHA THEMES AND ACTION AXIS.
${mahadasha} as the mahadasha lord activates key house themes for ${lagnaSign} lagna, while ${antardasha} as the antardasha lord shapes the quality and direction of results. The Moon journey during this period repeatedly shifts practical focus: when the Moon transits the 1st house, confidence rises and work begins faster; when it transits the 5th house, analysis and education increase; when it reaches the 9th house, travel intentions and counsel become stronger; when it touches the 11th house, gains stabilize. Use Mars energy for execution, because Mars hora supports H10 deliverables and makes proposals actionable. Choose best windows anchored to ${bestDate} because high-score days align with favourable choghadiya and benefic hora planets. Avoid the worst pressure around ${worstDate}, especially during Rahu Kaal, because dasha urgency can distort judgment. BEST ACTION: launch only after you align Mars hora with the day’s top choghadiya.`;
    return NextResponse.json({
      weeks: fallbackWeeks,
      partial: true,
      period_synthesis: {
        opening_paragraph: opening,
        strategic_windows: [
          { date: body.synthesis_context?.best_date ?? '2026-03-10', score: 74, nakshatra: '—', reason: 'Use peak-score day from synthesis context; schedule high-stakes work in slots with score 75+.' },
          { date: '2026-03-11', score: 70, nakshatra: '—', reason: 'Secondary best day; use Mars and Jupiter horas for career and decisions.' },
        ],
        caution_dates: [{ date: body.synthesis_context?.worst_date ?? '2026-03-13', score: 34, nakshatra: '—', reason: 'Avoid new commitments and speculative actions; use for completion and routine only.' }],
        domain_priorities: {
          career: `Career: Use benefic horas and schedule key deliverables on ${bestDate}. Favour high-score days for proposals, coordination, and approvals. Avoid Rahu Kaal windows and low-score days for new initiations; keep decisions measurable and timeboxed.`,
          money: 'High-score days favour gains; avoid major expenditure or new financial commitments on worst-date days. Use daily scores and Rahu Kaal markers as primary filters.',
          health: 'Rest and recovery are most effective on low-score days. Prioritise hydration and short walks during favourable horas. Avoid physical strain during Rahu Kaal.',
          relationships: 'Gentle gestures and clear communication are most effective on high-score days. Avoid confrontations or important conversations on low-score days or during Rahu Kaal.',
        },
        closing_paragraph: `${mahadasha}-${antardasha} dasha period: rely on daily scores and hourly tables as primary guidance until full commentary is available. Best day: ${bestDate}. Worst day: ${worstDate}.`,
      },
    }, { status: 206 });
  }
}
