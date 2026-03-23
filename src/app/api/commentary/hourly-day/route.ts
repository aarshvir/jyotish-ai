export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import type { HoraRole, LagnaContext } from '@/lib/agents/lagnaContext';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { formatDayCommentaryAnchorBlocks } from '@/lib/commentary/planetPositionsPrompt';

function choghadiyaMeaning(chog: string): string {
  const k = chog.trim();
  const map: Record<string, string> = {
    Amrit: 'Nectar, most auspicious',
    Shubh: 'Auspicious',
    Labh: 'Gains',
    Char: 'Neutral transition',
    Chal: 'Neutral transition',
    Udveg: 'Tension and effort',
    Rog: 'Inauspicious strain',
    Kaal: 'Critical, inauspicious',
  };
  return map[k] ?? 'meaning varies';
}

function buildFallbackSlot(slot: any, lagnaSign: string, role?: HoraRole): { slot_index: number; commentary: string } {
  const slot_index = typeof slot?.slot_index === 'number' ? slot.slot_index : 0;
  const display_label = String(slot?.display_label ?? '');
  const dominant_hora = String(slot?.dominant_hora ?? 'Sun');
  const dominant_choghadiya = String(slot?.dominant_choghadiya ?? 'Shubh');
  const transit_lagna = String(slot?.transit_lagna ?? 'Aries');
  const transit_lagna_house = typeof slot?.transit_lagna_house === 'number' ? slot.transit_lagna_house : 1;
  const is_rahu_kaal = Boolean(slot?.is_rahu_kaal);

  const meaning = choghadiyaMeaning(dominant_choghadiya);
  const housesText =
    role?.houses?.length
      ? role.houses.map((h) => `H${h}`).join(' and ')
      : `H${transit_lagna_house}`;
  const quality =
    role?.quality === 'yogakaraka' ? 'YOGAKARAKA'
    : role?.quality === 'lagna_lord' ? 'LAGNA LORD'
    : role?.quality === 'badhaka' ? 'BADHAKA'
    : role?.quality === 'benefic' ? 'BENEFIC'
    : role?.quality === 'malefic' ? 'MALEFIC'
    : 'NEUTRAL';

  const chogClass =
    dominant_choghadiya === 'Amrit' || dominant_choghadiya === 'Shubh' || dominant_choghadiya === 'Labh'
      ? 'excellent/good'
      : dominant_choghadiya === 'Udveg' || dominant_choghadiya === 'Rog'
      ? 'caution'
      : dominant_choghadiya === 'Kaal'
      ? 'avoid'
      : 'neutral';

  const ra = is_rahu_kaal
    ? 'RAHU KAAL - COMPLETE EXISTING WORK ONLY. DO NOT INITIATE ANYTHING NEW. '
    : '';

  const horaAction =
    dominant_hora === 'Mercury' ? 'send the decisive message and confirm the next step'
    : dominant_hora === 'Mars' ? 'initiate the training run and complete one hard deliverable'
    : dominant_hora === 'Jupiter' ? 'request guidance and lock the next consultation'
    : dominant_hora === 'Venus' ? 'schedule the relationship conversation and finalize the venue'
    : dominant_hora === 'Saturn' ? 'finish paperwork and complete the backlog with full accuracy'
    : dominant_hora === 'Moon' ? 'deliver the update clearly and prepare the emotional support'
    : 'begin the key move with a focused commitment';

  const commentary =
    `${dominant_hora} hora rules ${housesText} for ${lagnaSign} lagna. ` +
    `It is classified as ${quality} and it acts through ${display_label}. ` +
    `Do one action: ${horaAction} inside the domain of the relevant houses only. ` +
    `Transit lagna ${transit_lagna} = H${transit_lagna_house} from ${lagnaSign} lagna, so direct the outcome toward H${transit_lagna_house} governance. ` +
    `When you focus on H${transit_lagna_house} tasks, the ${dominant_hora} hora becomes usable and reduces rework in the next step. ` +
    `${dominant_choghadiya} choghadiya (${meaning}) ${dominant_choghadiya === 'Kaal' ? 'suppresses ambition' : 'amplifies workable progress'}, and net quality is ${chogClass}. ` +
    `If a decision appears between two paths, choose the path that completes the ${dominant_hora} action within ${display_label} and keeps H${transit_lagna_house} progress visible. ` +
    `${ra}Use this slot to finish one measurable step, then write the follow-up in one line so it can be executed immediately. ` +
    `END: ${is_rahu_kaal ? 'COMPLETE ONLY DURING RAHU KAAL.' : 'EXECUTE THE ONE MOST IMPORTANT TASK.'}`;

  return { slot_index, commentary };
}

function parseClaudeJsonDefensively(text: string): any {
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlock) {
      try { parsed = JSON.parse(codeBlock[1].trim()); } catch {}
    }
    if (!parsed) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(text.slice(start, end + 1)); } catch {}
      }
    }
    if (!parsed) {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start >= 0 && end > start) {
        try { parsed = { slots: JSON.parse(text.slice(start, end + 1)) }; } catch {}
      }
    }
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    // Required defensiveness: parse request body from raw text so malformed payloads
    // do not crash the route before fallback logic can run.
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // Try recovering object payload from noisy wrappers / markdown / extra chars.
      const recovered = parseClaudeJsonDefensively(rawBody || '');
      body = recovered && typeof recovered === 'object' ? recovered : {};
    }
    const modelOverride = typeof body?.model_override === 'string' ? body.model_override : undefined;
    if (!hasLlmCredentials(modelOverride)) {
      return NextResponse.json({ slots: [] }, { status: 200 });
    }

    const lagnaSign = String(body?.lagnaSign ?? '');
    const mahadasha = String(body?.mahadasha ?? '');
    const antardasha = String(body?.antardasha ?? '');
    const date = String(body?.date ?? '');
    const planetPositions = body?.planet_positions;
    const panchang = body?.panchang;
    const rahuKaalDay = body?.rahu_kaal;
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
      panchang: panchang as { yoga?: string; nakshatra?: string } | undefined,
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

For each of the 18 time slots write commentary of 140-170 words. Name house numbers. Explain choghadiya meaning in parentheses. End with CAPS directive. No generic language.

The slot that matches the BEST ACTION WINDOW (highest score) above should be described as the primary favorable window when you discuss timing; do not treat a lower-scoring slot as the main recommendation.

Never use: generally, may, could, might, perhaps.

Slots:
${slotLines}

Return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "slots": [
    { "slot_index": 0, "commentary": "..." }
  ]
}
Respond with ONLY a JSON object. No preamble.
No explanation. No markdown. Start with { directly.
Format: {"slots": [{"slot_index": 0, "commentary": "..."}]}
Start response with { and end with }. No markdown.`;

    try {
      const rawText = await completeLlmChat({
        modelOverride,
        systemPrompt,
        userPrompt,
        maxTokens: 6000,
      });
      console.log('[HOURLY] Raw response length:', rawText.length);
      console.log('[HOURLY] Raw first 100 chars:', rawText.slice(0, 100));
      let parsed: any = null;
      try {
        parsed = safeParseJson<{ date?: string; slots?: Array<{ slot_index: number; commentary: string }> }>(rawText);
      } catch {
        parsed = parseClaudeJsonDefensively(rawText);
      }

      if (!parsed) {
        console.error('[HOURLY] All JSON parse attempts failed, using fallback');
        console.error('[HOURLY] Raw text sample:', rawText.slice(0, 200));
        return NextResponse.json({
          slots: normalizedSlots.map((s: any, i: number) => ({
            slot_index: s.slot_index ?? i,
            display_label: s.display_label ?? '',
            commentary: `${s.dominant_hora} hora with ${s.dominant_choghadiya} choghadiya. Score: ${s.score}/100.`,
            score: s.score ?? 50,
          })),
          partial: true,
        });
      }

      const out = (parsed.slots ?? []).slice(0, 18).map((s: any, i: number) => {
        const slot_index = typeof s.slot_index === 'number' ? s.slot_index : normalizedSlots[i]?.slot_index ?? i;
        const commentary = String(s.commentary ?? '').trim();
        const role = ctx.horaRoles[normalizedSlots[i]?.dominant_hora];
        if (commentary.length < 40) return buildFallbackSlot(normalizedSlots[i], lagnaSign, role);
        return { slot_index, commentary };
      });

      // Fill any missing slots from fallback.
      const filled = normalizedSlots.map((s, i) => {
        if (out[i]?.commentary) return out[i];
        const role = ctx.horaRoles[s.dominant_hora];
        return buildFallbackSlot(s, lagnaSign, role);
      });
      return NextResponse.json({ date, slots: filled }, { status: 200 });
    } catch (err: any) {
      console.error('[hourly-day] Claude/parse failure:', err?.message || err);
      return NextResponse.json(
        {
          date,
          slots: normalizedSlots.map((s: any) => buildFallbackSlot(s, lagnaSign, ctx.horaRoles[s.dominant_hora])),
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error('[HOURLY] Fatal error:', err?.message || err);
    return NextResponse.json({ slots: [], partial: true, error: String(err) }, { status: 200 });
  }
}

