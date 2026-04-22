export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import { formatDayCommentaryAnchorBlocks } from '@/lib/commentary/planetPositionsPrompt';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rateLimit';

function buildFallbackMonths(body: { months?: unknown[]; lagnaSign?: string; mahadasha?: string; antardasha?: string }): { month_index: number; month_label: string; overall_score: number; career_score: number; money_score: number; health_score: number; love_score: number; theme: string; key_transits: string[]; analysis: string }[] {
  const fallbackScores = [70, 73, 68, 62, 58, 52];
  const inputMonths = Array.isArray(body?.months) ? body.months : [];
  const lagnaSign = body?.lagnaSign ?? 'the native\'s lagna';
  const mahadasha = body?.mahadasha ?? 'current mahadasha';
  const antardasha = body?.antardasha ?? 'current antardasha';

  return (inputMonths as Array<Record<string, unknown>>).slice(0, 6).map((m, i: number) => {
    const overall_score = fallbackScores[i % fallbackScores.length];
    const month_label = String(m?.month_label ?? `Month ${i + 7}`);
    const analysis =
      `PHASE LINE — ${month_label} for ${lagnaSign} lagna. ` +
      `${mahadasha}-${antardasha} dasha continues activating key house themes through planetary transit patterns. ` +
      `Jupiter emphasis shapes wisdom and expansion in relevant houses while Saturn demands disciplined structure. ` +
      `Mars and Mercury interplay strengthens communication and service delivery through focused steps. ` +
      `Moon majority supports gains while dasha lord influence demands risk control. ` +
      `Choose career actions aligned with H10 deliverables and prioritize health routines via H6. ` +
      `Best days arrive when hora timing aligns with supportive choghadiya and stable house activation. ` +
      `Worst days arrive when inauspicious choghadiya overlaps with dasha pressure, so postpone signatures and protect momentum.`;

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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.commentary.limit, RATE_LIMITS.commentary.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.', months: [] },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: {
    model_override?: string;
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    startMonth: string;
    months: Array<{ month_label: string; month_index: number; key_transits_hint?: string }>;
    reference_planet_positions?: unknown;
    reference_planet_positions_date?: string;
    reference_panchang?: { yoga?: string; nakshatra?: string };
    reference_slots?: Array<{ display_label?: string; score?: number; dominant_choghadiya?: string }>;
    reference_rahu_kaal?: { start?: string; end?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lagnaSign = sanitizeLagnaSign(body.lagnaSign);
  const mahadasha = sanitizePlanetName(body.mahadasha);
  const antardasha = sanitizePlanetName(body.antardasha);
  const {
    months,
    reference_planet_positions,
    reference_planet_positions_date,
    reference_panchang,
    reference_slots,
    reference_rahu_kaal,
  } = body;
  const modelOverride = typeof body.model_override === 'string' ? body.model_override.trim() : undefined;
  if (!hasLlmCredentials(modelOverride)) {
    return NextResponse.json({ months: buildFallbackMonths(body), partial: true }, { status: 206 });
  }
  if (!lagnaSign || !Array.isArray(months) || months.length === 0) {
    return NextResponse.json({ error: 'lagnaSign and months required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const anchorBlocks = formatDayCommentaryAnchorBlocks({
    planet_positions: reference_planet_positions as import('@/lib/commentary/planetPositionsPrompt').PlanetPositionsPayload,
    dateLabel: reference_planet_positions_date ?? 'forecast anchor date',
    yogaName: reference_panchang?.yoga,
    panchang: reference_panchang,
    slots: reference_slots,
    rahu_kaal: reference_rahu_kaal,
  });

  const systemPrompt = `You are a Vedic astrologer writing a 6-month personal forecast for months 7-12. Your job is to give this person a clear, practical picture of what each month holds — what to push forward, what to protect, what to watch out for. Write in plain, direct English, not astrological jargon.

${anchorBlocks}

ANCHOR RULE: The planetary positions above are verified for the anchor date. For later months, describe the planetary themes qualitatively — do not invent exact positions that contradict this snapshot.

LANGUAGE RULES:
- Never write H-notation in the output. Say "your career zone", "your relationship area", "your money sector", "your health area" instead.
- Translate combinations into outcomes: "Jupiter moving through your career zone" not "Jupiter in H10 kendra."
- "Yogakaraka" → "your most powerful planet", "badhaka" → "a planet that creates friction", "dusthana" → "a challenging sector."
- Key transit ingress hints (if provided) are real planetary movements — reference them as plain-English events.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate monthly summaries for months 7-12. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Months to analyse:
${JSON.stringify(months, null, 2)}

MANDATORY RULES FOR analysis FIELD (a user is paying $100 — write with depth and specificity):
1. Write 300-350 words. This is a full monthly briefing, not a summary.
2. STRUCTURE — write in this order:
   OPENING (60-80 words): Set the overarching feel of the month in plain English — is it a month to push hard, consolidate, rest, or rebuild? Name the dominant planetary energy and what area of life it affects for this person.
   KEY PLANETARY MOVEMENTS (100-120 words): Expand on each transit in key_transits_hint (if provided) — name the planet, the date it moves, what area of life it affects in plain English, and what the person should do. If no hint provided, describe the 2-3 most important planetary themes for the month based on the dasha period.
   WEEK-BY-WEEK RHYTHM (80-100 words): Paint the energy arc across the 4 weeks. Name the strongest week and explain why in plain terms. Name the most challenging stretch and give one practical tip for navigating it.
   CLOSING (30-40 words): One concrete action recommendation — a mantra, a protective step, or a strategic move — written as a direct personal instruction.
3. Every sentence gives the reader something they can feel, decide, or do — not just a planetary fact.
4. End with EXACTLY: "BEST: [specific week or date window and why in plain terms]. WORST: [specific stretch and why]. Rating: [number]/100."
5. Never use: H-notation, yogakaraka, dusthana, badhaka, trikona, kendra, generally, may, could, might, perhaps, various.

overall_score: Scores MUST range 42-75 across 6 months. Do NOT cluster all at 52-65.

Return exactly 6 month objects:
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
      "theme": "one plain-English sentence describing the month's dominant theme for this person",
      "key_transits": ["Planet moves on [date] → affects [plain-English life area] → person should [action]"],
      "analysis": "300-350 words structured as above, ending with BEST: WORST: Rating: lines"
    }
  ]
}

Start with { and end with }.`;

  try {
    const text = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: 9000,
    });
    const parsed = safeParseJson<{ months: unknown[] }>(text);
    return NextResponse.json({ months: parsed?.months ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[months-second]', msg);
    return NextResponse.json({ months: buildFallbackMonths(body), partial: true }, { status: 206 });
  }
}

