/** Vercel / long-running LLM — increase on Pro; hobby plan caps lower. */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { formatDayCommentaryAnchorBlocks } from '@/lib/commentary/planetPositionsPrompt';
import { requireAuth } from '@/lib/api/requireAuth';

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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
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

  const modelOverride =
    typeof body.model_override === 'string' ? body.model_override.trim() : undefined;
  if (!hasLlmCredentials(modelOverride)) {
    return NextResponse.json({ months: buildFallbackMonths(body) });
  }

  const {
    lagnaSign,
    mahadasha,
    antardasha,
    months,
    reference_planet_positions,
    reference_planet_positions_date,
    reference_panchang,
    reference_slots,
    reference_rahu_kaal,
  } = body;
  if (!lagnaSign || !Array.isArray(months) || months.length === 0) {
    return NextResponse.json({ error: 'lagnaSign and months required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const anchorBlocks = formatDayCommentaryAnchorBlocks({
    planet_positions: reference_planet_positions as any,
    dateLabel: reference_planet_positions_date ?? 'forecast anchor date',
    yogaName: reference_panchang?.yoga,
    panchang: reference_panchang,
    slots: reference_slots,
    rahu_kaal: reference_rahu_kaal,
  });

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

${anchorBlocks}

ANCHOR RULE: The blocks above are the verified snapshot for the forecast anchor date only. For later calendar months, describe transit themes qualitatively (dasha, house lords, Moon rhythm) without inventing precise graha longitudes or houses that contradict this anchor. Never place the same graha in a different sign/house than the anchor table for statements about that anchor date. When discussing the anchor date, use the fixed yoga meaning and BEST ACTION WINDOW above.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate monthly summaries for months 1-6. Lagna: ${lagnaSign}. Dasha: ${mahadasha}/${antardasha}.

Months to analyse:
${JSON.stringify(months, null, 2)}

MANDATORY RULES FOR analysis FIELD (enforce all):
1. Write exactly 150-180 words. Count carefully.
2. EVERY sentence must name at least one: planet (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu), house number written as "H1" through "H12" or "1st house" through "12th house", or nakshatra name. Do NOT omit house numbers.
3. End the analysis with EXACTLY this format on its own line: "BEST: [specific 2-3 day window or event]. WORST: [specific 2-3 day window or event]."
4. Include a rating line: "Rating: [number]/100."
5. Use "H" notation for houses (e.g. H3, H6, H10, H12). Do not write "the third house" without also writing "H3".
6. Never use: generally, may, could, might, perhaps.

overall_score RULE (enforce strictly): The first month MUST score 42-48. Later months can be 50-75. Jupiter enters Cancer mid-2026: June=70, July=73, August=75. The spread between max and min MUST be at least 30. Do NOT start at 55 — start at 42-48.

Return exactly 6 month objects:
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
      maxTokens: 8000,
    });
    const parsed = safeParseJson<{ months: any[] }>(text);

    return NextResponse.json({ months: parsed.months ?? [] });
  } catch (err: any) {
    console.error('[months-first]', err?.message || err);
    return NextResponse.json({ months: buildFallbackMonths(body) });
  }
}

