export const maxDuration = 120;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { buildLagnaContext, buildHoraReferenceBlock } from '@/lib/agents/lagnaContext';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export async function POST(req: NextRequest) {
  if (!anthropic) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 });
  }

  let body: {
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    days: Array<{
      date: string;
      panchang: { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; moon_sign?: string };
      day_score: number;
      rahu_kaal: { start: string; end: string };
      peak_slots: Array<{ display_label: string; dominant_hora: string; dominant_choghadiya: string; score: number }>;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lagnaSign, mahadasha, antardasha, days } = body;
  if (!lagnaSign || !days?.length) {
    return NextResponse.json({ error: 'lagnaSign and days required' }, { status: 400 });
  }

  const ctx = buildLagnaContext(lagnaSign);
  const horaBlock = buildHoraReferenceBlock(ctx);

  const systemPrompt = `You are a grandmaster Vedic astrologer. Dense paragraphs only; no bullets. Every sentence names a planet, house, or nakshatra.

HORA ROLES FOR ${lagnaSign.toUpperCase()} LAGNA:
${horaBlock}

Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `Generate day_theme and day_overview for each of the following days. Current dasha: ${mahadasha}/${antardasha}.

Days data:
${JSON.stringify(days, null, 2)}

Return this exact JSON structure (no extra fields):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_theme": "One italic sentence of 15-20 words that names the dominant planetary combination of the day and its effect. Example: 'Jupiter hora meets Amrit choghadiya as Moon crests the 11th — ride this wave before noon.'",
      "day_overview": "Write 250-300 words in two parts separated by a blank line. PART 1 — SITUATION (150-180 words): Open with a HEADLINE in ALL CAPS that captures the day's dominant energy (examples: 'EXALTED MOON IN 11TH HOUSE — MAXIMUM GAINS WINDOW' or 'SATURN KAAL PRESSURE — STRUCTURE BEFORE ACTION' or 'JUPITER HORA PEAK — STRATEGIC EXPANSION DAY'). Then 4 sentences: (1) Name the nakshatra and its ruling planet; explain what that deity/planetary energy means for Cancer lagna natively — which houses does the nakshatra lord rule for Cancer lagna and what does that activate today? (2) Name the house the Moon is transiting today from Cancer lagna (e.g. 'Moon in Libra occupies the 4th house'); state what that house governs in this chart and whether any natal planets occupy that house. (3) Name the yoga of the day and whether it is auspicious or inauspicious — quote its traditional meaning in 10 words. (4) State whether today's day ruler is the mahadasha lord (Rahu), antardasha lord (Mercury), or neither — and what that means for intellectual and career output today. PART 2 — STRATEGY (100-120 words): Start with 'STRATEGY:' on its own line. Give exactly 4 directives: — Best hora window: name the hora planet, its display_label time, and say exactly what activity to perform in it (be specific: 'Send the proposal', 'Make the sales call', not 'pursue career matters'). — What to STRICTLY AVOID today — use direct language ('Do NOT sign contracts today', 'Avoid financial commitments', not 'be cautious'). — Rahu Kaal directive: state the exact HH:MM–HH:MM window and one sharp instruction for it. — One sentence of spiritual or wellness guidance specific to Cancer lagna and today's energy. Never write a generic sentence. Every sentence must name a specific planet, house number, nakshatra, or yoga."
    }
  ]
}

One object per day in the same order. Start with { and end with }.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = extractText(response);
    const parsed = safeParseJson<{ days: Array<{ date: string; day_theme: string; day_overview: string }> }>(text);
    return NextResponse.json({ days: parsed.days ?? [] });
  } catch (err: any) {
    console.error('[daily-overviews]', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Commentary failed' }, { status: 500 });
  }
}
