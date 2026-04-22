export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson, parseJsonDefensively } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { formatDayCommentaryAnchorBlocks } from '@/lib/commentary/planetPositionsPrompt';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rateLimit';

interface DayInputShape {
  date?: string;
  panchang?: { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; moon_sign?: string; sunrise?: string; sunset?: string; day_ruler?: string };
  rahu_kaal?: { start?: string; end?: string };
  day_score?: number;
}

/**
 * V2 fallback: concise daily briefing grounded in panchang data.
 * No dense astrology recital. Answers: what are the top windows, what to avoid, why.
 */
function buildFallbackDay(d: DayInputShape, lagnaSign: string): { date: string; day_theme: string; day_overview: string } {
  const date = String(d?.date ?? '');
  const p = d?.panchang ?? {};
  const nakshatra = String(p?.nakshatra ?? 'Pushya');
  const yoga = String(p?.yoga ?? 'Shubha');
  const moonSign = String(p?.moon_sign ?? 'Aries');
  const dayRuler = String(p?.day_ruler ?? 'Sun');
  const dayScore = d?.day_score ?? 50;

  const rahuStart = String(d?.rahu_kaal?.start ?? '');
  const rahuEnd = String(d?.rahu_kaal?.end ?? '');
  const fmtTime = (t: string) => {
    if (!t) return '';
    const s = t.includes('T') ? t.split('T')[1] : t;
    return s.slice(0, 5);
  };
  const rahuWindow = rahuStart ? `${fmtTime(rahuStart)}–${fmtTime(rahuEnd)}` : '';

  const strengthWord = dayScore >= 65 ? 'productive' : dayScore >= 50 ? 'moderate' : 'careful';

  const day_theme =
    `${dayRuler} day with ${nakshatra} nakshatra and ${yoga} yoga — a ${strengthWord} day for ${lagnaSign} lagna. Moon in ${moonSign}.`;

  const day_overview =
    `Day score: ${dayScore}/100. This is a ${strengthWord} day overall.\n\n` +
    `${nakshatra} nakshatra with ${yoga} yoga sets the tone. ` +
    `Check the hourly table for your best action windows — focus important work there. ` +
    `${dayScore >= 65 ? 'Multiple strong windows support decisive action today.' : dayScore >= 50 ? 'A few decent windows exist — use them for your priorities.' : 'Limited strong windows today — be selective about timing.'}\n\n` +
    (rahuWindow
      ? `Rahu Kaal (${rahuWindow}): do not start new projects or sign commitments during this window. Complete existing work only.\n\n`
      : '') +
    `Strategy:\n` +
    `- Use your highest-scoring hourly windows for important decisions and actions.\n` +
    `- Avoid new commitments during weak or Rahu Kaal windows.\n` +
    `- ${dayScore >= 50 ? `${dayRuler} day energy supports structured execution — lead with your top priority.` : `${dayRuler} day calls for patience — focus on review, preparation, and completing existing work.`}`;

  return { date, day_theme, day_overview };
}

function normalizeDayOverview(day_overview: string): string {
  if (!day_overview) return day_overview;
  const lines = day_overview.split('\n');
  if (!lines.length) return day_overview;

  const first = (lines[0] || '').trim();
  if (!first) return day_overview;

  // If the first line is fully uppercase (or already mostly structured),
  // ensure it ends with '.' so it becomes a standalone uppercase "sentence".
  const looksUppercase = first === first.toUpperCase() && first.split(/\s+/).length >= 5;
  if (looksUppercase && !/[.!?]$/.test(first)) {
    lines[0] = first + '.';
  }
  return lines.join('\n');
}

const parseClaudeJsonDefensively = (text: string) => parseJsonDefensively(text, 'days');

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.commentary.limit, RATE_LIMITS.commentary.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating another report.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
  let body: {
    model_override?: string;
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    days: Array<{
      date: string;
      panchang: { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; moon_sign?: string };
      planet_positions?: unknown;
      slots?: Array<{ display_label?: string; score?: number; dominant_choghadiya?: string }>;
      day_score: number;
      rahu_kaal: { start: string; end: string };
      peak_slots: Array<{ display_label: string; dominant_hora: string; dominant_choghadiya: string; score: number }>;
    }>;
  };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body', days: [] }, { status: 400 });
    }

    const modelOverride = typeof body.model_override === 'string' ? body.model_override : undefined;
    if (!hasLlmCredentials(modelOverride)) {
      return NextResponse.json({ days: [], partial: true }, { status: 206 });
    }

    const lagnaSign = sanitizeLagnaSign(body.lagnaSign);
    const mahadasha = sanitizePlanetName(body.mahadasha);
    const antardasha = sanitizePlanetName(body.antardasha);
    const { days } = body;
    if (!lagnaSign) {
      return NextResponse.json({ days: [] }, { status: 200 });
    }

  // Required by tests: return 200 with empty list when no days are provided.
    if (!days || days.length === 0) {
      return NextResponse.json({ days: [] }, { status: 200 });
    }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const systemPrompt = `You are a grandmaster Vedic astrologer. Write with the authority and specificity of a paid expert consultation — every sentence must feel personally relevant to this native's chart, not generic astrology.

Each day's user message contains ACTUAL PLANETARY POSITIONS, verified yoga meaning, best choghadiya window, and Rahu Kaal times. Treat these as authoritative facts — do not contradict them.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA (use these exactly):
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const callBatches = async (batchDays: typeof days, max_tokens: number, override?: string) => {
    const nDays = batchDays.length;
    const grahaBlocks = batchDays
      .map(
        (d: (typeof batchDays)[0]) =>
          `=== ${d.date} ===\n${formatDayCommentaryAnchorBlocks({
            planet_positions: d.planet_positions as import('@/lib/commentary/planetPositionsPrompt').PlanetPositionsPayload,
            dateLabel: d.date,
            yogaName: d.panchang?.yoga,
            panchang: d.panchang,
            slots: d.slots,
            rahu_kaal: d.rahu_kaal,
          })}`
      )
      .join('\n\n');

    const userPrompt = `${grahaBlocks}

Generate day_theme and day_overview for EACH of the following ${nDays} days. You MUST return exactly ${nDays} entr${nDays === 1 ? 'y' : 'ies'} in the "days" array — one per day in the same order. Current dasha: ${mahadasha}/${antardasha}.
For each day, graha signs and whole-sign houses MUST match the ACTUAL PLANETARY POSITIONS block for that date above. The yoga meaning and BEST ACTION WINDOW lines are authoritative for that date.

Days data:
${JSON.stringify(batchDays, null, 2)}

MANDATORY RULES for day_overview (enforce all — a user is paying $100 for this analysis):
1. First line: ALL-CAPS headline (8-12 words, ends with period). Must name the tithi, nakshatra yoga, OR the Mahadasha lord. Example: "AMAVASYA ECLIPSE DAY — PARIGHA YOGA DEMANDS MAXIMUM CAUTION TODAY."
2. Total word count: 200-250 words. This is a substantive daily briefing, not a summary.
3. STRUCTURE — write in this exact order:
   PART A (60-80 words): Set the astrological context for the day. Name the Moon's house position and what it activates emotionally and practically for ${lagnaSign} lagna. Reference the tithi and nakshatra yoga from the panchang data. Explain whether the day ruler (weekday) aligns with the active dasha lord (gives 15-20% energy boost when aligned).
   PART B — STRATEGY: section with 3 named directives:
     Directive 1 — Best timing: Name the exact hora time window from the BEST ACTION WINDOW in the anchor block. Name the hora planet and which H-notation house it rules for this lagna. State the specific activity.
     Directive 2 — Avoid: Name the afflicting planet or period. Use direct language: "Do not" or "Avoid." State why (which house it damages).
     Directive 3 — Rahu Kaal: State exact HH:MM–HH:MM time. Give one specific thing to absolutely avoid during this window.
   PART C (30-40 words): If day score < 50, recommend one ritual, mantra, or protective practice. If day score >= 65, name the single best opportunity and which house it activates.
4. EVERY sentence names at least one: planet, H-notation house, or nakshatra.
5. The Mahadasha lord (${mahadasha}) must appear at least once.
6. Never use: generally, may, could, might, perhaps, various, often, sometimes.

Return this exact JSON structure (no extra fields):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_theme": "<10-15 words naming at least 1 planet and 1 house>",
      "day_overview": "<200-250 words as specified above>"
    }
  ]
}

Exactly ${nDays} day entr${nDays === 1 ? 'y' : 'ies'} in the days array. Start with { and end with }.`;

    const text = await completeLlmChat({
      modelOverride: override,
      systemPrompt,
      userPrompt,
      maxTokens: max_tokens,
    });
    let parsed: { days: Array<{ date: string; day_theme: string; day_overview: string }> } | null = null;
    try {
      parsed = safeParseJson<{ days: Array<{ date: string; day_theme: string; day_overview: string }> }>(text);
    } catch {
      parsed = parseClaudeJsonDefensively(text) as typeof parsed;
    }
    if (!parsed) {
      console.error('[DAILY-OVERVIEWS] All JSON parse attempts failed, using fallback');
      console.error('[DAILY-OVERVIEWS] Raw text sample:', text.slice(0, 200));
      return batchDays.map((day) => ({
        date: day?.date ?? '',
        day_theme: 'Planetary energies active today.',
        day_overview: `${day?.panchang?.yoga || 'Mixed'} yoga with Moon in house ${day?.panchang?.moon_sign || 'transit'}. Day score: ${day?.day_score ?? 50}/100. Review timing carefully before major actions.`,
      }));
    }
    const normalized = parsed?.days ?? [];
    return normalized.map((d) => ({
      ...d,
      day_overview: normalizeDayOverview(d.day_overview),
    }));
  };

  try {
    // 7-day (and short) reports: one LLM round-trip to halve latency vs 4+remainder.
    // Longer horizons: keep 4+remainder to avoid output truncation.
    let out: Array<{ date: string; day_theme: string; day_overview: string }> = [];

    if (days.length > 0 && days.length <= 8) {
      const r = await callBatches(days, 10_000, modelOverride);
      out = (r.length ? r : days.map((d) => buildFallbackDay(d, lagnaSign))).map((d) => ({
        ...d,
        day_overview: normalizeDayOverview(d.day_overview),
      }));
    } else {
      const batch1 = days.slice(0, 4);
      const batch2 = days.slice(4);

      if (batch1.length) {
        const r1 = await callBatches(batch1, 6_000, modelOverride);
        out.push(...(r1.length ? r1 : batch1.map((d) => buildFallbackDay(d, lagnaSign))));
        out = out.map((d) => ({ ...d, day_overview: normalizeDayOverview(d.day_overview) }));
      }
      if (batch2.length) {
        const r2 = await callBatches(batch2, 6_000, modelOverride);
        out.push(...(r2.length ? r2 : batch2.map((d) => buildFallbackDay(d, lagnaSign))));
        out = out.map((d) => ({ ...d, day_overview: normalizeDayOverview(d.day_overview) }));
      }
    }

    // Ensure exact day count is preserved.
    if (out.length !== days.length) {
      return NextResponse.json({ days: days.map((d) => buildFallbackDay(d, lagnaSign)) });
    }

    return NextResponse.json({ days: out });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[daily-overviews] LLM batch failed:', msg.slice(0, 200));
      return NextResponse.json(
        { days: days.map((d) => buildFallbackDay(d, lagnaSign)), partial: true },
        { status: 206 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[daily-overviews] Fatal:', msg.slice(0, 200));
    return NextResponse.json({ error: 'Commentary generation failed', days: [] }, { status: 500 });
  }
}

