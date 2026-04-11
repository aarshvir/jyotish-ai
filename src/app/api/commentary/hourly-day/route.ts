export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson, parseJsonDefensively } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import type { HoraRole, LagnaContext } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rateLimit';
import { formatDayCommentaryAnchorBlocks } from '@/lib/commentary/planetPositionsPrompt';
import { buildSlotGuidance } from '@/lib/guidance/builder';

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

/**
 * V2 fallback: short, honest, grounded in score + actual slot data.
 * Never sounds like a grandmaster recital. Always gives actionable guidance.
 */
function buildFallbackSlot(slot: SlotShape): { slot_index: number; commentary: string } {
  const slot_index = typeof slot?.slot_index === 'number' ? slot.slot_index : 0;
  const display_label = String(slot?.display_label ?? '');
  const dominant_hora = String(slot?.dominant_hora ?? 'Sun');
  const dominant_choghadiya = String(slot?.dominant_choghadiya ?? 'Shubh');
  const transit_lagna_house = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
  const is_rahu_kaal = Boolean(slot?.is_rahu_kaal);
  const score = typeof slot?.score === 'number' ? slot.score : 50;

  const guidance = buildSlotGuidance({
    score,
    hora_planet: dominant_hora,
    choghadiya: dominant_choghadiya,
    transit_lagna_house,
    is_rahu_kaal,
    display_label,
  });

  const commentary = guidance.summary_plain;
  return { slot_index, commentary };
}

const parseClaudeJsonDefensively = (text: string) => parseJsonDefensively(text, 'slots');

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.commentary.limit, RATE_LIMITS.commentary.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.', slots: [] },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    // Required defensiveness: parse request body from raw text so malformed payloads
    // do not crash the route before fallback logic can run.
    const rawBody = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      // Try recovering object payload from noisy wrappers / markdown / extra chars.
      const recovered = parseClaudeJsonDefensively(rawBody || '');
      body = (recovered && typeof recovered === 'object' ? recovered : {}) as Record<string, unknown>;
    }
    const modelOverride = typeof body?.model_override === 'string' ? body.model_override : undefined;
    if (!hasLlmCredentials(modelOverride)) {
      return NextResponse.json({ slots: [] }, { status: 200 });
    }

    const lagnaSign = sanitizeLagnaSign(body?.lagnaSign);
    const mahadasha = sanitizePlanetName(body?.mahadasha);
    const antardasha = sanitizePlanetName(body?.antardasha);
    const date = String(body?.date ?? '');
    const planetPositions = body?.planet_positions;
    const panchang = body?.panchang as { yoga?: string; nakshatra?: string } | undefined;
    const rahuKaalDay = body?.rahu_kaal as { start?: string; end?: string } | undefined;
    const rawSlots = body?.slots;

    const slots = Array.isArray(rawSlots) ? rawSlots : [];
    if (slots.length === 0) {
      return NextResponse.json({ slots: [] }, { status: 200 });
    }
    if (!lagnaSign || !date) {
      return NextResponse.json({ error: 'lagnaSign and date required', slots: [] }, { status: 200 });
    }

    const ctx: LagnaContext = buildLagnaContext(lagnaSign);
    const horaBlock = buildHoraReferenceBlock(ctx);

    type SlotInput = {
      slot_index?: number;
      display_label?: string;
      dominant_hora?: string;
      dominant_choghadiya?: string;
      transit_lagna?: string;
      transit_lagna_house?: number;
      is_rahu_kaal?: boolean;
      score?: number;
    };

    const normalizedSlots = slots.slice(0, 18).map((s: SlotInput, i: number) => ({
      slot_index: typeof s.slot_index === 'number' ? s.slot_index : i,
      display_label: String(s.display_label ?? `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`),
      dominant_hora: String(s.dominant_hora ?? 'Sun'),
      dominant_choghadiya: String(s.dominant_choghadiya ?? 'Shubh'),
      transit_lagna: String(s.transit_lagna ?? 'Aries'),
      transit_lagna_house: typeof s.transit_lagna_house === 'number' ? s.transit_lagna_house : 1,
      is_rahu_kaal: Boolean(s.is_rahu_kaal),
      score: typeof s.score === 'number' ? s.score : 55,
    }));

    // Ensure exactly 18 slots in output.
    while (normalizedSlots.length < 18) {
      const idx = normalizedSlots.length;
      normalizedSlots.push({
        slot_index: idx,
        display_label: `${String(idx).padStart(2, '0')}:00-${String(idx + 1).padStart(2, '0')}:00`,
        dominant_hora: 'Sun',
        dominant_choghadiya: 'Shubh',
        transit_lagna: 'Aries',
        transit_lagna_house: 1,
        is_rahu_kaal: false,
        score: 55,
      });
    }

    const anchorBlocks = formatDayCommentaryAnchorBlocks({
      planet_positions: planetPositions as any,
      dateLabel: date,
      yogaName: panchang?.yoga,
      panchang: panchang,
      slots: normalizedSlots,
      rahu_kaal: rahuKaalDay,
    });

    const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only. Every sentence names a planet, house, or nakshatra.

${anchorBlocks}

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks. Start response with { and end with }.`;

    const slotLines = normalizedSlots
      .map((s) => {
        const role: HoraRole | undefined = ctx.horaRoles[s.dominant_hora];
        const quality = role?.quality ?? 'neutral';
        return `Slot ${s.slot_index} ${s.display_label}: ${s.dominant_hora} hora (${quality}); ${s.dominant_choghadiya} choghadiya; transit lagna ${s.transit_lagna} H${s.transit_lagna_house}; RAHU_KAAL=${s.is_rahu_kaal}`;
      })
      .join('\n');

    const userPrompt = `Generate hourly commentary for ${date}. Current dasha: ${mahadasha}/${antardasha}.

MANDATORY RULES for each slot commentary (enforce without exception):
1. Length: 60–90 words per slot. Count carefully. Do not write shorter.
2. EVERY sentence must name at least one: planet, house number (e.g. H3, H10, "3rd house"), or nakshatra.
3. State the choghadiya name and its quality in parentheses on first use — e.g. "Amrit (nectar, most auspicious)".
4. End each commentary with one sentence in ALL CAPS that gives a directive — e.g. "SEND THE CONTRACT NOW AND CONFIRM RECEIPT."
5. Never use these words: generally, may, could, might, perhaps, various, often.
6. Rahu Kaal slots: begin with "RAHU KAAL —" and instruct completion only.
7. The slot with the highest score is the BEST ACTION WINDOW — describe it as the primary opportunity of the day.

Slots:
${slotLines}

Return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "slots": [
    { "slot_index": 0, "commentary": "..." }
  ]
}
Respond with ONLY a JSON object. No preamble. No markdown. Start with { directly.`;

    try {
      const rawText = await completeLlmChat({
        modelOverride,
        systemPrompt,
        userPrompt,
        maxTokens: 6000,
      });
      console.log('[HOURLY] Raw response length:', rawText.length);
      console.log('[HOURLY] Raw first 100 chars:', rawText.slice(0, 100));
      let parsed: { date?: string; slots?: Array<{ slot_index: number; commentary: string }> } | null = null;
      try {
        parsed = safeParseJson<{ date?: string; slots?: Array<{ slot_index: number; commentary: string }> }>(rawText);
      } catch {
        parsed = parseClaudeJsonDefensively(rawText) as typeof parsed;
      }

      if (!parsed) {
        console.error('[HOURLY] All JSON parse attempts failed, using fallback');
        console.error('[HOURLY] Raw text sample:', rawText.slice(0, 200));
        return NextResponse.json({
          slots: normalizedSlots.map((s, i) => ({
            slot_index: s.slot_index ?? i,
            display_label: s.display_label ?? '',
            commentary: `${s.dominant_hora} hora with ${s.dominant_choghadiya} choghadiya. Score: ${s.score}/100.`,
            score: s.score ?? 50,
          })),
          partial: true,
        });
      }

      const out = (parsed.slots ?? []).slice(0, 18).map((s, i) => {
        const slot_index = typeof s.slot_index === 'number' ? s.slot_index : normalizedSlots[i]?.slot_index ?? i;
        const commentary = String(s.commentary ?? '').trim();
        const wordCount = commentary.split(/\s+/).filter(Boolean).length;
        if (wordCount < 60) return buildFallbackSlot(normalizedSlots[i]);
        return { slot_index, commentary };
      });

      // Fill any missing slots from fallback.
      const filled = normalizedSlots.map((s, i) => {
        if (out[i]?.commentary) return out[i];
        return buildFallbackSlot(s);
      });
      return NextResponse.json({ date, slots: filled }, { status: 200 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[hourly-day] Claude/parse failure:', msg.slice(0, 200));
      return NextResponse.json(
        {
          date,
          slots: normalizedSlots.map((s) => buildFallbackSlot(s)),
          partial: true,
        },
        { status: 206 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[HOURLY] Fatal error:', msg.slice(0, 200));
    return NextResponse.json({ slots: [], partial: true, error: msg.slice(0, 100) }, { status: 206 });
  }
}

