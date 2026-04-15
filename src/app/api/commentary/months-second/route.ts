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

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

${anchorBlocks}

ANCHOR RULE: The blocks above are the verified snapshot for the forecast anchor date only. For later calendar months, describe transit themes qualitatively without inventing precise graha longitudes or houses that contradict this anchor. When discussing the anchor date, use the fixed yoga meaning and BEST ACTION WINDOW above.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate monthly summaries for months 7-12. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Months to analyse:
${JSON.stringify(months, null, 2)}

MANDATORY RULES FOR analysis FIELD (enforce all):
1. Write exactly 150-180 words. Count carefully.
2. EVERY sentence must name at least one: planet (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu), house number written as "H1" through "H12" or "1st house" through "12th house", or nakshatra name.
3. End the analysis with EXACTLY this format: "BEST: [specific 2-3 day window or event]. WORST: [specific 2-3 day window or event]."
4. Include a rating line: "Rating: [number]/100."
5. Use H-notation for houses (e.g. H3, H6, H10, H12). Do not omit house numbers.
6. Never use: generally, may, could, might, perhaps.

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
      "theme": "one sentence naming a planet and house",
      "key_transits": ["4-5 strings naming planet/date range/house (H-notation)/effect"],
      "analysis": "150-180 words including BEST:/WORST: and Rating:/100"
    }
  ]
}

Start with { and end with }.`;

  try {
    const text = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: 7000,
    });
    const parsed = safeParseJson<{ months: unknown[] }>(text);
    return NextResponse.json({ months: parsed?.months ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[months-second]', msg);
    return NextResponse.json({ months: buildFallbackMonths(body), partial: true }, { status: 206 });
  }
}

