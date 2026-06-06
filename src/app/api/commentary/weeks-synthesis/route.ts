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
import { checkRateLimit, getRateLimitKey, shouldRateLimitLlmForUser } from '@/lib/api/rateLimit';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { assertRequiredScriptureGrounding, buildScripturePromptBlock } from '@/lib/rag/sourceValidation';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (shouldRateLimitLlmForUser(auth)) {
    const { allowed } = await checkRateLimit(
      `weeks-synthesis:${getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined)}`,
      5,
      60_000,
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

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
    scripture_context?: string;
    require_scripture_grounding?: boolean;
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
  const scriptureBlock = buildScripturePromptBlock(body.scripture_context);
  if (body.require_scripture_grounding) {
    try {
      assertRequiredScriptureGrounding(body.scripture_context, 'weeks-synthesis');
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err), weeks: [], period_synthesis: null },
        { status: 503 },
      );
    }
  }

  // Use only the first day as a reference anchor — the synthesis doesn't need all 7 days of positions
  const forecastAnchors = formatMultipleDaysCommentaryAnchors(
    planet_positions_by_date?.length ? [planet_positions_by_date[0]] : []
  );

  const systemPrompt = `You are a Vedic astrologer writing a personal weekly strategy guide and period synthesis. Your job is to give this person a clear, practical picture of what each week holds and how to navigate the overall period. Write in plain, direct English — like a trusted advisor, not a textbook.

${forecastAnchors}

${scriptureBlock}

When discussing specific dates in this report window, use the verified data above. Do not contradict or invent other placements.

LANGUAGE RULES:
- Never write H-notation in output. Say "your career zone", "your relationship area", "your financial sector", "your health area", "your creativity zone" etc.
- Translate planetary combinations into outcomes: "Jupiter in your career zone" not "Jupiter in H10."
- "Yogakaraka" → "your most powerful planet for this period", "badhaka" → "a planet that creates friction and delays", "dusthana" → "a challenging sector of life."
- Hora windows are fine (e.g. "Mars hora 14:00–15:00") — they help the user plan. Always add a plain-English activity: "Mars hora 14:00–15:00 — best for bold career moves, direct conversations, or physical action."
- Mars hora = action and career energy. Jupiter hora = wisdom, planning, expansion. Venus hora = relationships, creativity, money. Saturn hora = discipline, slow steady progress. Mercury hora = communication, writing, learning.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate 6 weekly summaries AND the period synthesis. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Weeks:
${JSON.stringify(weeks, null, 2)}

Synthesis context:
${JSON.stringify(synthesis_context, null, 2)}

MANDATORY RULES (enforce strictly — a user paid $100 for this):
1. opening_paragraph: Write EXACTLY 210-250 words structured as TWO parts separated by a literal newline (\n):
   PART 1 (first line): A single sentence entirely in ALL CAPITAL LETTERS, 10-14 words, ending with a period. Name the planetary period theme in plain terms. Example: "YOUR RAHU-MERCURY PERIOD IS ACTIVATING RAPID GROWTH AND SERVICE-SECTOR OPPORTUNITIES." or "SATURN PERIOD FOR TAURUS — A CHAPTER OF DISCIPLINE, CONSOLIDATION AND LASTING REWARD."
   PART 2 (200-220 words): Plain-English synthesis of what this period means for this person. Cover: (a) what the dominant planetary period is unlocking in their life — career, relationships, inner work, finances? (b) what the supporting period adds to the timing — faster, slower, more emotional, more practical? (c) how the Moon's rhythm through the period creates peaks and valleys — name the areas of life affected (not H-numbers); (d) the single best strategic window of the entire period and what to do in it; (e) the single biggest risk and how to navigate it in plain terms; (f) close with a final ALL-CAPS action sentence that tells them exactly what to do.
2. strategic_windows: EXACTLY 2 objects. Use synthesis_context.best_date for first. Each "reason": 50-60 words naming specific timing windows by approximate time (e.g. "Mars hora 14:00–15:00 for bold career moves"), the energy quality of that date, and a plain-English recommended activity.
3. caution_dates: 1-2 objects using synthesis_context.worst_date. reason = 50-60 words. Use direct language: "Do not", "Avoid". Name the problematic planetary energy in plain terms and what it disrupts.
4. domain_priorities — each field 55-65 words with specific timing windows and plain-English guidance:
   career: Name Mars hora windows with approximate time, the best day for bold career moves, one clear action to take this period.
   money: Name the best timing window for financial decisions, one money opportunity, one financial risk to avoid.
   health: Name the most vulnerable period, one specific wellness directive, one protective practice.
   relationships: Name the best timing for relationship conversations or repairs, Venus hora windows, one friction period to handle gently.
5. weeks array: EXACTLY 6 week objects. Each week analysis: 150-200 words. Structure: one plain-English context sentence about the week's overall energy → 3-4 sentences of practical guidance for that week's specific planetary conditions → BEST: and WORST: lines as the final two lines.
6. Never use: H-notation, yogakaraka, dusthana, badhaka, trikona, kendra, generally, may, could, might, perhaps, various, often, sometimes.

Return JSON (no placeholder text — write real analysis):
{
  "weeks": [
    {
      "week_index": 0,
      "week_label": "Mar 7–13",
      "overall_score": 65,
      "theme": "one short title sentence naming the dominant planetary energy",
      "analysis": "150-200 words of real weekly analysis ending with BEST: [date/reason]. WORST: [date/reason]. as separate lines",
      "moon_signs": ["Libra", "Scorpio", "Sagittarius"]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "210-250 words: ALL-CAPS sentence.\\nThen 200-220 word analysis as specified above.",
    "strategic_windows": [
      { "date": "YYYY-MM-DD", "score": 70, "nakshatra": "name", "reason": "50-60 words: specific hora time, yoga, Moon house H-notation, recommended activity" },
      { "date": "YYYY-MM-DD", "score": 68, "nakshatra": "name", "reason": "50-60 words: specific hora time, yoga, Moon house H-notation, recommended activity" }
    ],
    "caution_dates": [
      { "date": "YYYY-MM-DD", "score": 35, "nakshatra": "name", "reason": "50-60 words: what to avoid, naming afflicting planets and houses directly." }
    ],
    "domain_priorities": {
      "career": "55-65 words: Mars hora time windows, H10 deliverables, best day name, best choghadiya. Must contain Mars and H10.",
      "money": "55-65 words: H2 and H11 transit details, financial risk, best timing window.",
      "health": "55-65 words: H6 activations, most stressful date, specific wellness directive.",
      "relationships": "55-65 words: H7 activations, Venus role for this lagna, friction vs harmony timing."
    },
    "closing_paragraph": "60-80 words: Jupiter's current house position and its meaning. One specific mantra or ritual recommendation for the dasha period. Close with an action statement."
  }
}

Start with { and end with }. No markdown.`;

  const bestDate = body.synthesis_context?.best_date ?? '2026-03-10';
  const worstDate = body.synthesis_context?.worst_date ?? '2026-03-13';

  try {
    const text = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: 8000,
    });
    const parsed = safeParseJson<{
      weeks: Array<{ week_label?: string; score?: number; overall_score?: number; theme?: string; analysis?: string; commentary?: string; daily_scores?: number[]; moon_journey?: string[]; peak_days_count?: number; caution_days_count?: number }>;
      period_synthesis: { opening_paragraph?: string; strategic_windows?: unknown[]; caution_dates?: unknown[]; domain_priorities?: Record<string, string>; closing_paragraph?: string };
    }>(text);
    const synthesis = parsed.period_synthesis ?? null;

    // Minimal quality guard: if opening_paragraph is missing or clearly a placeholder, inject a basic fallback
    if (synthesis && typeof synthesis === 'object') {
      const op = (synthesis.opening_paragraph as string | undefined) ?? '';
      const wc = op.split(/\s+/).filter(Boolean).length;
      if (wc < 50) {
        synthesis.opening_paragraph = `${mahadasha.toUpperCase()}-${antardasha.toUpperCase()} PERIOD SYNTHESIS FOR ${lagnaSign.toUpperCase()} LAGNA — DASHA THEMES AND ACTION WINDOWS.\n${mahadasha} as mahadasha lord activates key house themes for ${lagnaSign} lagna, while ${antardasha} as antardasha lord shapes timing and results quality. The Moon journey through H1 builds confidence, H5 heightens analysis, H9 activates fortune, and H11 stabilizes gains. Use Mars hora for H10 execution and Mercury hora for communication. Best action window anchored to ${bestDate} — align benefic hora with top choghadiya. Avoid pressure around ${worstDate} especially during Rahu Kaal. BEST ACTION: LAUNCH ONLY AFTER ALIGNING BENEFIC HORA WITH TOP CHOGHADIYA AND CONFIRMING RAHU KAAL HAS PASSED.`;
      }
    }

    return NextResponse.json({
      weeks: parsed.weeks ?? [],
      period_synthesis: synthesis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weeks-synthesis]', msg.slice(0, 200));
    const fallbackAnalysis = "Use the daily score calendar below to find your best days this week, and the hourly table for precision timing.";
    const fallbackWeeks = (body.weeks ?? []).slice(0, 6).map((w, i) => ({
      week_index: i,
      week_label: w.week_label ?? `Week ${i + 1}`,
      overall_score: 65,
      theme: "A steady week - check daily scores for the best moments.",
      analysis: fallbackAnalysis,
      commentary: fallbackAnalysis,
      moon_signs: [],
    }));
    const bestDate = body.synthesis_context?.best_date ?? '';
    const worstDate = body.synthesis_context?.worst_date ?? '';
    const opening = [
      'Your forecast covers the key patterns shaping your career, relationships, finances, and wellbeing over the next several weeks.',
      bestDate ? `Your strongest opening falls around ${bestDate} — a good window for important decisions and new starts.` : '',
      worstDate ? `Around ${worstDate}, ease off a little — patience and review work better than big launches then.` : '',
      'Use the daily score calendar for the best days, and the hourly detail for precision timing.',
    ].filter(Boolean).join(' ');
    return NextResponse.json({
      weeks: fallbackWeeks,
      partial: true,
      period_synthesis: {
        opening_paragraph: opening,
        strategic_windows: bestDate ? [
          { date: bestDate, score: 74, nakshatra: '—', reason: 'A strong window — good for proposals, important conversations, and new initiatives.' },
        ] : [],
        caution_dates: worstDate ? [
          { date: worstDate, score: 34, nakshatra: '—', reason: 'Better for patience, review, and completion than new starts.' },
        ] : [],
        domain_priorities: {
          career: `Use your highest-scoring days for proposals, key conversations, and decisions. Avoid new initiatives on low-score days — save those for preparation and review.`,
          money: 'Align larger financial decisions with your peak-scoring days. Low-score stretches are better for budgeting and reviewing than for new commitments.',
          health: 'Rest and recovery land best on lower-score days. Protect your energy during demanding stretches and keep consistent routines.',
          relationships: 'Important conversations land well on high-score days. Avoid pressing sensitive topics during challenging periods.',
        },
        closing_paragraph: bestDate
          ? `Make the most of your strongest windows — small timing adjustments compound into meaningful results over the forecast period. Your best opening is around ${bestDate}.`
          : 'Make the most of your strongest windows — small timing adjustments compound into meaningful results over the forecast period.',
      },
    }, { status: 206 });
  }
}
