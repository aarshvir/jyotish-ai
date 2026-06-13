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
1. opening_paragraph: Write EXACTLY 200-240 words as a warm, direct advisor statement — like a trusted mentor speaking to this person. Do NOT use ALL-CAPS. Do NOT use a headline format. Write it as flowing prose.
   Structure: (a) Open with a 2-sentence verdict naming this planetary period and what it means for this specific rising sign — what area of life is being activated, what is the defining quality of this chapter? (b) What the supporting sub-period adds — does it speed things up, slow them down, bring emotional depth or practical focus? (c) The single best opportunity this period offers and specifically what to do. (d) The single biggest risk and how to navigate it in plain terms.
   The opening_paragraph must sound like a real person speaking about THIS person's specific situation. Not generic. Not template.
2. strategic_windows: EXACTLY 2 objects. Use synthesis_context.best_date for first. Each "reason": 50-60 words explaining WHY that specific date is strong — what planetary alignment makes it good, what area of life benefits, and one specific action recommended.
3. caution_dates: 1-2 objects using synthesis_context.worst_date. reason = 50-60 words. Use direct language: "Hold off on...", "Be patient with...". Name what kind of action to avoid and why in plain terms.
4. domain_priorities — each field 50-60 words of specific, actionable guidance:
   career: Best period/dates for bold career moves, what to push on, what to protect.
   money: Best timing for financial decisions, one opportunity, one risk to avoid.
   health: Most demanding period for energy, one specific wellness directive.
   relationships: Best timing for important conversations, one friction period to handle gently.
5. weeks array: EXACTLY 6 week objects. Each week analysis: 120-160 words. One plain-English sentence about the week → practical guidance → BEST: and WORST: lines at the end.
6. Never use: H-notation, yogakaraka, dusthana, badhaka, trikona, kendra, generally, may, could, might, perhaps, various, often, sometimes. Never use ALL-CAPS.

Return JSON (no placeholder text — write real analysis):
{
  "weeks": [
    {
      "week_index": 0,
      "week_label": "Mar 7–13",
      "overall_score": 65,
      "theme": "A steady week — good for focused work and relationship maintenance",
      "analysis": "120-160 words of real weekly analysis ending with BEST: [specific date/reason]. WORST: [specific date/reason]. as separate lines",
      "moon_signs": ["Libra", "Scorpio", "Sagittarius"]
    }
  ],
  "period_synthesis": {
    "opening_paragraph": "200-240 words: Warm, direct advisor statement. No ALL-CAPS. No headlines. Flowing prose about what this person's current planetary period means for their life specifically.",
    "strategic_windows": [
      { "date": "YYYY-MM-DD", "score": 70, "nakshatra": "—", "reason": "50-60 words: why this date is strong, which life area benefits, and one specific action to take." },
      { "date": "YYYY-MM-DD", "score": 68, "nakshatra": "—", "reason": "50-60 words: why this date is strong, what to focus on." }
    ],
    "caution_dates": [
      { "date": "YYYY-MM-DD", "score": 35, "nakshatra": "—", "reason": "50-60 words: what to avoid and why in plain terms." }
    ],
    "domain_priorities": {
      "career": "50-60 words: specific guidance on career timing this period, what to push on, what to avoid.",
      "money": "50-60 words: specific financial timing guidance, best window, key risk.",
      "health": "50-60 words: energy peaks and troughs, specific wellness directive.",
      "relationships": "50-60 words: best timing for important conversations, friction period to handle gently."
    },
    "closing_paragraph": "50-70 words: One specific action recommendation that captures the highest-leverage move for this person right now."
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

    // Quality guard: if opening_paragraph is missing or too short, inject a plain warm fallback
    if (synthesis && typeof synthesis === 'object') {
      const op = (synthesis.opening_paragraph as string | undefined) ?? '';
      const wc = op.split(/\s+/).filter(Boolean).length;
      if (wc < 50) {
        synthesis.opening_paragraph = `You are in your ${mahadasha} period${antardasha && antardasha !== 'Unknown' ? `, with ${antardasha} as the current sub-period` : ''} — a chapter that brings ${mahadasha}'s qualities and themes to the foreground of your experience. For ${lagnaSign} rising, this period activates specific areas of your life that are ready for growth and attention. The defining quality of this chapter is movement: things that have been building are now ready to be acted on. Use your highest-scoring windows for decisions that require commitment, and treat the lower-scoring stretches as preparation time. Your best opening this period falls around ${bestDate} — use it for your most important move. Around ${worstDate}, ease off and let things settle.`;
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
