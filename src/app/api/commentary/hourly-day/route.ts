export const maxDuration = 120;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';
import type { LagnaContext, HoraRole } from '@/lib/agents/lagnaContext';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function buildSlotLine(
  slot: {
    slot_index: number;
    display_label: string;
    dominant_hora: string;
    dominant_choghadiya: string;
    transit_lagna: string;
    transit_lagna_house: number;
    is_rahu_kaal: boolean;
    score: number;
  },
  lagnaCtx: LagnaContext
): string {
  const role: HoraRole | undefined = lagnaCtx.horaRoles[slot.dominant_hora];
  const quality = role?.quality ?? 'neutral';
  const roleLabel = role?.label ?? 'hora';
  return (
    `Slot ${slot.slot_index} ${slot.display_label}: ` +
    `${slot.dominant_hora} hora (${quality}, rules ${roleLabel} for ${lagnaCtx.lagnaSign} lagna), ` +
    `${slot.dominant_choghadiya} choghadiya, ` +
    `transit lagna ${slot.transit_lagna} H${slot.transit_lagna_house}, ` +
    `score ${slot.score}` +
    (slot.is_rahu_kaal ? ', RAHU KAAL' : '')
  );
}

export async function POST(req: NextRequest) {
  if (!anthropic) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  let body: {
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    dayIndex: number;
    date: string;
    slots: Array<{
      slot_index: number;
      display_label: string;
      dominant_hora: string;
      dominant_choghadiya: string;
      transit_lagna: string;
      transit_lagna_house: number;
      is_rahu_kaal: boolean;
      score: number;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lagnaSign, mahadasha, antardasha, date, slots } = body;
  if (!lagnaSign || !date || !slots?.length) {
    return NextResponse.json({ error: 'lagnaSign, date, and slots required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only. Every sentence names a planet, house, or nakshatra.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks. Start response with { and end with }.`;

  const slotLines = slots.map((s) => buildSlotLine(s, ctx)).join('\n');

  const userPrompt = `Generate hourly commentary for ${date}. Current dasha: ${mahadasha}/${antardasha}.

For each of the 18 slots write a commentary of exactly 70-90 words structured as follows.

Sentence 1 (25-35w): Name the hora planet, state the specific houses it rules for ${lagnaSign} lagna (e.g. 'Mars hora rules the 5th and 10th houses for Cancer lagna'), classify it as yogakaraka/benefic/neutral/malefic/badhaka, and give ONE specific directive for what to do in this hora window.
Sentence 2 (20-25w): Transit lagna [Sign] = H[number] from ${lagnaSign} lagna. State what this house governs and how it modifies the hora's effect (amplifies, suppresses, or redirects it).
Sentence 3 (15-20w): [Choghadiya name] — state whether it amplifies or suppresses the hora and the net quality of the window (excellent/good/neutral/caution/avoid).
If is_rahu_kaal is true: Add one sentence: '⚠ RAHU KAAL — Complete existing work only. Do not initiate anything new in this window.'

Critical rules:
— First sentence MUST name specific house numbers (e.g. '5th and 10th', not 'career and creativity').
— Never use the words 'generally', 'may', 'could', 'perhaps', or 'might'.
— Every directive must be actionable: 'Send the email', 'Make the call', 'Review the contract' — not 'focus on work'.

Slots:
${slotLines}

Return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "slots": [
    { "slot_index": 0, "commentary": "70-90 words" },
    ... 17 more
  ]
}
Start response with { and end with }. No markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = extractText(response);
    const stopReason = response.stop_reason;

    if (stopReason === 'max_tokens') {
      console.error('[hourly-day] Truncated! stop=max_tokens, length:', rawText.length);
      const lastComplete = rawText.lastIndexOf('}, \n      {');
      if (lastComplete > 0) {
        const partial = rawText.substring(0, lastComplete) + '} ] }';
        try {
          const partialResult = safeParseJson<{ date?: string; slots?: Array<{ slot_index: number; commentary: string }> }>(partial);
          if (partialResult?.slots && partialResult.slots.length > 0) {
            console.log('[hourly-day] Recovered', partialResult.slots.length, 'slots from truncation');
            const slotsWithShort = partialResult.slots.map((s) => {
              const firstSentence = (s.commentary ?? '').split(/[.!?]/)[0]?.trim();
              const commentary_short = firstSentence && firstSentence.length <= 120 ? firstSentence + (firstSentence.endsWith('.') ? '' : '.') : (s.commentary ?? '').slice(0, 117) + '...';
              return { ...s, commentary_short };
            });
            return NextResponse.json({ date: body.date, slots: slotsWithShort, partial: true });
          }
        } catch {
          // ignore parse error
        }
      }
      return NextResponse.json({ error: 'truncated', date: body.date, slots: [] }, { status: 206 });
    }

    const parsed = safeParseJson<{ date: string; slots: Array<{ slot_index: number; commentary: string }> }>(rawText);

    const slotsWithShort = (parsed.slots ?? []).map((s) => {
      const firstSentence = (s.commentary ?? '').split(/[.!?]/)[0]?.trim();
      const commentary_short = firstSentence && firstSentence.length <= 120 ? firstSentence + (firstSentence.endsWith('.') ? '' : '.') : (s.commentary ?? '').slice(0, 117) + '...';
      return { ...s, commentary_short };
    });

    return NextResponse.json({ date: body.date, slots: slotsWithShort });
  } catch (err: any) {
    console.error('[hourly-day]', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Commentary failed' }, { status: 500 });
  }
}
