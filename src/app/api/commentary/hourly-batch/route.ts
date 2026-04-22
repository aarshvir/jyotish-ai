/**
 * Batched hourly commentary for multiple forecast days in ONE LLM call.
 * Path A: keeps report generation under Vercel maxDuration vs 7× /hourly-day.
 */

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { parseJsonDefensively, safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import type { HoraRole, LagnaContext } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rateLimit';
import {
  formatDayCommentaryAnchorBlocks,
  type PlanetPositionsPayload,
} from '@/lib/commentary/planetPositionsPrompt';
import { buildSlotGuidance } from '@/lib/guidance/builder';

const DEFAULT_BATCH_MODEL = 'claude-haiku-4-5-20251001';

interface SlotShape {
  slot_index?: number;
  display_label?: string;
  dominant_hora?: string;
  dominant_choghadiya?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal?: boolean;
  score?: number;
}

function deriveDirective(slot: SlotShape): string {
  const score = typeof slot?.score === 'number' ? slot.score : 50;
  if (slot?.is_rahu_kaal) return 'RAHU KAAL — ROUTINE TASKS ONLY; AVOID NEW STARTS.';
  if (score >= 80) return 'ACT ON YOUR TOP PRIORITY IN THIS WINDOW.';
  if (score >= 65) return 'PUSH IMPORTANT WORK WHILE CONDITIONS HOLD.';
  if (score >= 50) return 'KEEP MOMENTUM; DELAY IRREVERSIBLE COMMITS IF UNSURE.';
  return 'STAY CONSERVATIVE — PREPARE, REVIEW, WAIT FOR CLEARER AIR.';
}

function finalizeHourlyCommentary(raw: string | undefined, slot: SlotShape): string {
  const directive = deriveDirective(slot);
  let body = (raw ?? '').trim();
  // Only fall back to minimal text if LLM returned nothing meaningful
  if (body.length < 25) {
    const hora = String(slot?.dominant_hora ?? 'Sun');
    const chog = String(slot?.dominant_choghadiya ?? 'Shubh');
    const th = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
    body = `${hora} hora activates H${th} matters for this lagna. ${chog} choghadiya sets the temporal quality.`;
  }
  return `${directive}\n\n${body}`;
}

function buildFallbackSlot(slot: SlotShape): { slot_index: number; commentary: string } {
  const slot_index = typeof slot?.slot_index === 'number' ? slot.slot_index : 0;
  const dominant_hora = String(slot?.dominant_hora ?? 'Sun');
  const dominant_choghadiya = String(slot?.dominant_choghadiya ?? 'Shubh');
  const transit_lagna_house = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
  const is_rahu_kaal = Boolean(slot?.is_rahu_kaal);
  const score = typeof slot?.score === 'number' ? slot.score : 50;
  const display_label = String(slot?.display_label ?? '');
  const guidance = buildSlotGuidance({
    score,
    hora_planet: dominant_hora,
    choghadiya: dominant_choghadiya,
    transit_lagna_house,
    is_rahu_kaal,
    display_label,
  });
  const commentary = finalizeHourlyCommentary(guidance.summary_plain, slot);
  return { slot_index, commentary };
}

function normalizeDaySlots(slots: unknown): SlotShape[] {
  const arr = Array.isArray(slots) ? (slots as SlotShape[]) : [];
  const mapped = arr.slice(0, 18).map((s, i: number) => ({
    slot_index: typeof s?.slot_index === 'number' ? s.slot_index : i,
    display_label: String(s?.display_label ?? ''),
    dominant_hora: String(s?.dominant_hora ?? 'Sun'),
    dominant_choghadiya: String(s?.dominant_choghadiya ?? 'Shubh'),
    transit_lagna: String(s?.transit_lagna ?? 'Aries'),
    transit_lagna_house: typeof s?.transit_lagna_house === 'number' ? s.transit_lagna_house : 1,
    is_rahu_kaal: Boolean(s?.is_rahu_kaal),
    score: typeof s?.score === 'number' ? s.score : 55,
  }));
  while (mapped.length < 18) {
    const idx = mapped.length;
    mapped.push({
      slot_index: idx,
      display_label: `${String(6 + idx).padStart(2, '0')}:00–${String(7 + idx).padStart(2, '0')}:00`,
      dominant_hora: 'Sun',
      dominant_choghadiya: 'Shubh',
      transit_lagna: 'Aries',
      transit_lagna_house: 1,
      is_rahu_kaal: false,
      score: 55,
    });
  }
  return mapped;
}

const parseBatchJson = (text: string) =>
  parseJsonDefensively(text, 'days') as { days?: Array<{ dayIndex?: number; date?: string; slots?: Array<{ slot_index?: number; commentary?: string }> }> } | null;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.commentary.limit, RATE_LIMITS.commentary.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.', days: [] },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: {
    model_override?: string;
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    days: Array<{
      dayIndex: number;
      date: string;
      planet_positions?: unknown;
      panchang?: { yoga?: string; nakshatra?: string; tithi?: string; moon_sign?: string };
      rahu_kaal?: { start?: string; end?: string };
      slots: unknown[];
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', days: [] }, { status: 400 });
  }

  const modelOverride =
    typeof body.model_override === 'string' && body.model_override.trim()
      ? body.model_override.trim()
      : process.env.REPORT_HOURLY_BATCH_MODEL?.trim() || DEFAULT_BATCH_MODEL;

  if (!hasLlmCredentials(modelOverride)) {
    return NextResponse.json({ days: [], partial: true }, { status: 206 });
  }

  const lagnaSign = sanitizeLagnaSign(body.lagnaSign);
  const mahadasha = sanitizePlanetName(body.mahadasha);
  const antardasha = sanitizePlanetName(body.antardasha);
  const daysIn = Array.isArray(body.days) ? body.days : [];
  if (!lagnaSign || daysIn.length === 0) {
    return NextResponse.json({ days: [] }, { status: 200 });
  }
  if (daysIn.length > 31) {
    return NextResponse.json({ error: 'Too many days (max 31)', days: [] }, { status: 400 });
  }

  const ctx: LagnaContext = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const dayBlocks = daysIn.map((d) => {
    const normSlots = normalizeDaySlots(d.slots);
    const anchors = formatDayCommentaryAnchorBlocks({
      planet_positions: d.planet_positions as PlanetPositionsPayload,
      dateLabel: d.date,
      yogaName: d.panchang?.yoga,
      panchang: d.panchang,
      slots: normSlots,
      rahu_kaal: d.rahu_kaal,
    });
    const slotLines = normSlots
      .map((s) => {
        const role: HoraRole | undefined = ctx.horaRoles[s.dominant_hora ?? ''];
        const quality = role?.quality ?? 'neutral';
        return `  [${s.slot_index}] ${s.display_label}: ${s.dominant_hora} (${quality}); ${s.dominant_choghadiya}; ${s.transit_lagna} H${s.transit_lagna_house}; RK=${s.is_rahu_kaal}; score=${s.score}`;
      })
      .join('\n');
    return `=== DAY_INDEX ${d.dayIndex} DATE ${d.date} ===\n${anchors}\nSLOTS:\n${slotLines}\n`;
  });

  const systemPrompt = `You are a grandmaster Vedic astrologer. Write hourly slot commentary with the depth and authority of a paid expert — each slot analysis must feel personal, specific, and actionable for THIS lagna.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA (use these — do not invent):
${horaBlock}

COMMENTARY STRUCTURE — each slot commentary must have THREE paragraphs separated by blank lines:

PARAGRAPH 1 — HORA (50-70 words): Name the hora planet. State which houses it RULES for ${lagnaSign} lagna (not where it sits — which houses it governs). Explain whether it is yogakaraka, badhaka, maraka, dusthana lord, or functional benefic. Give 3-4 specific activities best suited to this hora based on its house rulerships. If functionally malefic, name the specific risk.

PARAGRAPH 2 — TRANSIT LAGNA (35-50 words): State "Transit Lagna in [SIGN] = [ordinal number] house activation." Explain what that house governs for this lagna. Give 2-3 practical implications. For the native's own lagna sign: add "PERSONAL POWER PEAK — actions carry full astrological weight."

PARAGRAPH 3 — CHOGHADIYA (20-30 words): Name the choghadiya type in ALL CAPS with its quality in parentheses. Give one specific directive (what to do or avoid). For KAAL: use double warning symbol.

Rahu Kaal slots: open Paragraph 1 with "RAHU KAAL ACTIVE —" and state what to absolutely avoid.

Return ONLY valid JSON. No markdown. No preamble.`;

  const userPrompt = `NATIVE: ${lagnaSign} Lagna. Dasha: ${mahadasha} MD / ${antardasha} AD.

${dayBlocks.join('\n')}

OUTPUT — return ONLY this JSON shape. commentary field = the full 3-paragraph text:
{
  "days": [
    {
      "dayIndex": <number matching DAY_INDEX above>,
      "date": "YYYY-MM-DD",
      "slots": [ { "slot_index": 0, "commentary": "Paragraph1\\n\\nParagraph2\\n\\nParagraph3" }, ... 18 entries ... ]
    }
  ]
}

Include every day from the input. Each day must have exactly 18 slots. Start with {.`;

  try {
    const rawText = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(16000, 2000 + daysIn.length * 18 * 200),
    });

    type BatchDay = { dayIndex?: number; date?: string; slots?: Array<{ slot_index?: number; commentary?: string }> };
    let parsed: { days?: BatchDay[] } | null = null;
    try {
      parsed = safeParseJson<{ days?: BatchDay[] }>(rawText);
    } catch {
      parsed = parseBatchJson(rawText);
    }

    const outDays: Array<{ dayIndex: number; slots: Array<{ slot_index: number; commentary: string; commentary_short?: string }> }> = [];

    for (const d of daysIn) {
      const normSlots = normalizeDaySlots(d.slots);
      const row = parsed?.days?.find((x) => x.dayIndex === d.dayIndex) ?? parsed?.days?.find((x) => x.date === d.date);
      const slotMap = new Map<number, string>();
      (row?.slots ?? []).forEach((s) => {
        if (typeof s.slot_index === 'number' && typeof s.commentary === 'string') {
          slotMap.set(s.slot_index, s.commentary);
        }
      });

      const slotsOut = normSlots.map((slot, i) => {
        const rawC = slotMap.get(slot.slot_index ?? i) ?? '';
        const commentary = finalizeHourlyCommentary(rawC, slot);
        const firstSent = commentary.split('.')[0]?.trim();
        return {
          slot_index: slot.slot_index ?? i,
          commentary,
          commentary_short: firstSent ? `${firstSent}.` : commentary.slice(0, 80),
        };
      });

      outDays.push({ dayIndex: d.dayIndex, slots: slotsOut });
    }

    return NextResponse.json({ days: outDays }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[hourly-batch]', msg.slice(0, 300));
    const fallbackDays = daysIn.map((d) => ({
      dayIndex: d.dayIndex,
      slots: normalizeDaySlots(d.slots).map((s) => {
        const b = buildFallbackSlot(s);
        return {
          slot_index: b.slot_index,
          commentary: b.commentary,
          commentary_short: b.commentary.split('\n')[0] ?? b.commentary,
        };
      }),
    }));
    return NextResponse.json({ days: fallbackDays, partial: true, error: msg.slice(0, 200) }, { status: 206 });
  }
}
