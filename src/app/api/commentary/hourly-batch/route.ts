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

function clipWords(text: string, max: number): string {
  const w = text.trim().split(/\s+/).filter(Boolean);
  return w.slice(0, max).join(' ');
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
  let body = (raw ?? '').trim().replace(/\s+/g, ' ');
  body = body.replace(/\s+[A-Z][A-Z0-9,\s'’\-—]{10,}\.?\s*$/, '').trim();
  body = clipWords(body, 35);
  const hora = String(slot?.dominant_hora ?? 'Sun');
  const chog = String(slot?.dominant_choghadiya ?? 'Shubh');
  const th = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
  if (body.length < 25) {
    body = `${hora} hora with ${chog} choghadiya; transit emphasis H${th}.`;
    body = clipWords(body, 30);
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

  const systemPrompt = `You are Jyotish AI. Output compressed hourly commentary for multiple days in one JSON object.

${horaBlock}

Return ONLY valid JSON. No markdown. No preamble.`;

  const userPrompt = `NATIVE: ${lagnaSign} Lagna. Dasha: ${mahadasha} MD / ${antardasha} AD.

For EACH day below, for EACH of the 18 slots (indices 0–17), produce commentary:
- Line 1: ONE ALL-CAPS directive (max 15 words). Rahu Kaal slots: start with "RAHU KAAL —".
- Then 1–2 short sentences (total body max ~40 words) naming hora, choghadiya, transit house; unique per slot.

${dayBlocks.join('\n')}

OUTPUT — return ONLY this JSON shape:
{
  "days": [
    {
      "dayIndex": <number matching DAY_INDEX above>,
      "date": "YYYY-MM-DD",
      "slots": [ { "slot_index": 0, "commentary": "ALL CAPS...\\n\\nbody..." }, ... 18 entries ... ]
    }
  ]
}

Include every day from the input. Each day must have exactly 18 slots. Start with {.`;

  try {
    const rawText = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(32000, 4000 + daysIn.length * 18 * 120),
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
