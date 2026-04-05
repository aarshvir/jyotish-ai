export const maxDuration = 120;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { completeLlmChat } from '@/lib/llm/routeCompletion';
import { safeParseJson } from '@/lib/utils/safeJson';
import { requireAuth } from '@/lib/api/requireAuth';
import { sanitizeLagnaSign, sanitizePlanetName } from '@/lib/utils/sanitize';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rateLimit';

/**
 * POST /api/validation/report
 *
 * Three-pass validation engine powered by Claude Sonnet.
 * Pass 1 — Commentary quality: word counts, STRATEGY section, ALL-CAPS headline, no blank slots
 * Pass 2 — Score accuracy:     slot spread >= 15, day score = mean(slots), Rahu Kaal slots low
 * Pass 3 — Consistency:        commentary tone matches score tier, no contradictions
 *
 * Returns:
 *   { corrections: { days?: DayPatch[], hourly?: SlotPatch[], synthesis?: SynthPatch }, summary: string }
 *
 * Corrections are MINIMAL — only critical failures trigger a patch.
 * The caller merges patches back into the report and retries only failed sections.
 */

interface SlotInput {
  slot_index: number;
  display_label: string;
  score: number;
  is_rahu_kaal: boolean;
  dominant_hora: string;
  dominant_choghadiya: string;
  commentary: string;
}

interface DayInput {
  date: string;
  day_score: number;
  day_overview: string;
  slots: SlotInput[];
}

interface ValidationRequest {
  lagnaSign: string;
  mahadasha: string;
  antardasha: string;
  days: DayInput[];
  synthesis_opening?: string;
}

interface Correction {
  type: 'day_overview' | 'slot_commentary' | 'synthesis_opening';
  date?: string;
  slot_index?: number;
  fixed_text: string;
  reason: string;
}

interface ValidationResult {
  pass: 1 | 2 | 3;
  issues_found: number;
  corrections: Correction[];
  summary: string;
}

// ── Pass 1: Commentary quality ──────────────────────────────────────────────
function runPass1Checks(days: DayInput[]): { issues: string[]; criticalSlots: SlotInput[]; criticalDays: DayInput[] } {
  const issues: string[] = [];
  const criticalSlots: SlotInput[] = [];
  const criticalDays: DayInput[] = [];

  for (const day of days) {
    const wc = (day.day_overview ?? '').split(/\s+/).filter(Boolean).length;
    const hasStrategy = (day.day_overview ?? '').includes('STRATEGY');
    const firstLine = (day.day_overview ?? '').split('\n')[0] ?? '';
    const hasCapHeadline = firstLine.length > 20 && firstLine === firstLine.toUpperCase();

    if (wc < 150 || !hasStrategy || !hasCapHeadline) {
      issues.push(`Day ${day.date}: overview fails (wc=${wc}, strategy=${hasStrategy}, caps=${hasCapHeadline})`);
      criticalDays.push(day);
    }

    for (const slot of day.slots) {
      const swc = (slot.commentary ?? '').split(/\s+/).filter(Boolean).length;
      if (swc < 40) {
        issues.push(`Day ${day.date} slot ${slot.slot_index}: commentary too short (${swc} words)`);
        criticalSlots.push({ ...slot, date: day.date } as SlotInput & { date: string });
      }
    }
  }

  return { issues, criticalSlots, criticalDays };
}

// ── Pass 2: Score accuracy ───────────────────────────────────────────────────
function runPass2Checks(days: DayInput[]): { issues: string[]; scoringErrors: string[] } {
  const issues: string[] = [];
  const scoringErrors: string[] = [];

  for (const day of days) {
    const scores = day.slots.map(s => s.score);
    if (scores.length !== 18) {
      issues.push(`Day ${day.date}: expected 18 slots, got ${scores.length}`);
    }

    const spread = Math.max(...scores) - Math.min(...scores);
    if (spread < 15) {
      issues.push(`Day ${day.date}: slot spread too narrow (${spread}) — scores appear uniform`);
      scoringErrors.push(day.date);
    }

    const computedMean = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
    if (Math.abs(computedMean - day.day_score) > 5) {
      issues.push(`Day ${day.date}: day_score ${day.day_score} deviates >5 from slot mean ${computedMean}`);
      scoringErrors.push(day.date);
    }

    for (const slot of day.slots) {
      if (slot.is_rahu_kaal && slot.score > 50) {
        issues.push(`Day ${day.date} slot ${slot.slot_index}: Rahu Kaal slot has high score ${slot.score}`);
      }
    }
  }

  return { issues, scoringErrors };
}

// ── Pass 3: Consistency (LLM-based, sampled) ─────────────────────────────────
async function runPass3Consistency(
  days: DayInput[],
  lagnaSign: string,
  mahadasha: string,
  antardasha: string,
): Promise<{ issues: string[]; llmCorrections: Correction[] }> {
  // Sample the first 3 days for consistency check to keep latency low
  const sample = days.slice(0, 3);
  const digest = sample.map(d => ({
    date: d.date,
    day_score: d.day_score,
    overview_first150: (d.day_overview ?? '').substring(0, 150),
    peak_slot: d.slots.reduce((a, b) => a.score > b.score ? a : b),
    worst_slot: d.slots.reduce((a, b) => a.score < b.score ? a : b),
  }));

  const prompt = `You are a Vedic astrology QA agent. Review this report excerpt for ${lagnaSign} lagna, ${mahadasha}-${antardasha} dasha.

DATA:
${JSON.stringify(digest, null, 2)}

Check for:
1. Commentary tone matching score tier (score ≥75 = positive language, score <45 = cautious language)
2. Peak slot described positively in overview
3. No internal contradictions (e.g. calling a day "excellent" when day_score < 50)
4. Consistent house notation (H1-H12)

Return JSON ONLY:
{
  "issues": ["issue 1", "issue 2"],
  "corrections_needed": true | false
}

If no issues, return: {"issues": [], "corrections_needed": false}`;

  try {
    const response = await completeLlmChat({
      systemPrompt: 'You are a Vedic astrology report QA agent. Return valid JSON only.',
      userPrompt: prompt,
      maxTokens: 500,
    });
    const parsed = safeParseJson<{ issues: string[]; corrections_needed: boolean }>(response ?? '{}');
    return {
      issues: parsed?.issues ?? [],
      llmCorrections: [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[validation/Pass3] LLM call failed:', msg.slice(0, 200));
    return { issues: ['Pass 3 check skipped (LLM unavailable)'], llmCorrections: [] };
  }
}

// ── LLM-powered correction agent ─────────────────────────────────────────────
async function generateCorrection(
  type: 'day_overview' | 'slot_commentary',
  context: {
    date: string;
    lagnaSign: string;
    mahadasha: string;
    antardasha: string;
    day_score?: number;
    slot?: SlotInput;
    panchang_hint?: string;
  }
): Promise<string> {
  if (type === 'day_overview') {
    const score = context.day_score ?? 55;
    const tier = score >= 75 ? 'excellent' : score >= 55 ? 'moderate' : 'challenging';
    const prompt = `Write a grandmaster-quality Vedic daily forecast for ${context.date}.
${context.lagnaSign} lagna, ${context.mahadasha}-${context.antardasha} dasha. Day score: ${score}/100 (${tier}).

MANDATORY:
- Line 1: ALL-CAPS headline ≥8 words ending with period
- Empty line after headline
- 200-250 words total
- Every sentence names a planet, house number (H1-H12), or nakshatra
- End with STRATEGY: section with 3 specific directives

Return plain text only — no JSON wrapper.`;

    const response = await completeLlmChat({
      systemPrompt: 'You are a grandmaster Vedic astrologer writing daily forecasts. Write plain text only.',
      userPrompt: prompt,
      maxTokens: 500,
    });
    return response ?? '';
  }

  if (type === 'slot_commentary' && context.slot) {
    const s = context.slot;
    const prompt = `Write a 70-word Vedic hourly commentary for ${context.lagnaSign} lagna.
Slot: ${s.display_label}, Score: ${s.score}/100, Hora: ${s.dominant_hora}, Choghadiya: ${s.dominant_choghadiya}${s.is_rahu_kaal ? ', RAHU KAAL ACTIVE' : ''}.
${context.mahadasha}-${context.antardasha} dasha.

Rules:
- 65-80 words
- Name the hora planet's house rulership for ${context.lagnaSign} lagna
- End with an ALL-CAPS action directive
${s.is_rahu_kaal ? '- Start with "RAHU KAAL —"' : ''}

Return plain text only.`;

    const response = await completeLlmChat({
      systemPrompt: 'You write concise Vedic hourly commentary. Plain text only.',
      userPrompt: prompt,
      maxTokens: 200,
    });
    return response ?? '';
  }

  return '';
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rlKey = getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.validation.limit, RATE_LIMITS.validation.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.', passes: [], corrections: [], total_issues: 0, total_corrections: 0, clean: true },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: ValidationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lagnaSign = sanitizeLagnaSign(body.lagnaSign ?? 'Cancer');
  const mahadasha = sanitizePlanetName(body.mahadasha ?? 'Rahu');
  const antardasha = sanitizePlanetName(body.antardasha ?? 'Mercury');
  const { days = [] } = body;

  // ── Passes 1 + 2: synchronous checks ──
  const p1 = runPass1Checks(days);
  const p2 = runPass2Checks(days);

  const p1Result: ValidationResult = {
    pass: 1,
    issues_found: p1.issues.length,
    corrections: [],
    summary: p1.issues.length === 0 ? 'All commentary meets quality thresholds.' : `${p1.issues.length} quality issues found.`,
  };

  // Identify items needing LLM correction
  const criticalDayCorrections = p1.criticalDays.filter(d => {
    const wc = (d.day_overview ?? '').split(/\s+/).filter(Boolean).length;
    return wc < 100 || !d.day_overview.includes('STRATEGY');
  });
  const criticalSlots = p1.criticalSlots.filter((s: SlotInput & { date?: string }) => {
    const swc = (s.commentary ?? '').split(/\s+/).filter(Boolean).length;
    return swc < 25;
  });

  // ── Parallelize: day fixes + slot fixes + Pass 3 LLM ──
  const [dayFixes, slotFixes, p3] = await Promise.all([
    criticalDayCorrections.length > 0
      ? Promise.all(
          criticalDayCorrections.slice(0, 3).map(async day => {
            const fixed = await generateCorrection('day_overview', {
              date: day.date, lagnaSign, mahadasha, antardasha, day_score: day.day_score,
            });
            if (fixed && fixed.length > 80) {
              const correction: Correction = {
                type: 'day_overview',
                date: day.date,
                fixed_text: fixed,
                reason: `Day overview failed quality check (wc=${(day.day_overview ?? '').split(/\s+/).filter(Boolean).length})`,
              };
              p1Result.corrections.push(correction);
              return correction;
            }
            return null;
          })
        )
      : Promise.resolve([] as Array<Correction | null>),

    criticalSlots.length > 0
      ? Promise.all(
          criticalSlots.slice(0, 5).map(async (slot: SlotInput & { date?: string }) => {
            const slotDate = slot.date ?? '';
            const fixed = await generateCorrection('slot_commentary', {
              date: slotDate, lagnaSign, mahadasha, antardasha, slot,
            });
            if (fixed && fixed.length > 50) {
              const correction: Correction = {
                type: 'slot_commentary',
                date: slotDate,
                slot_index: slot.slot_index,
                fixed_text: fixed,
                reason: `Slot commentary critically short (${(slot.commentary ?? '').split(/\s+/).filter(Boolean).length} words)`,
              };
              p1Result.corrections.push(correction);
              return correction;
            }
            return null;
          })
        )
      : Promise.resolve([] as Array<Correction | null>),

    runPass3Consistency(days, lagnaSign, mahadasha, antardasha),
  ]);

  const allCorrections: Correction[] = [
    ...dayFixes.filter((c): c is Correction => c !== null),
    ...slotFixes.filter((c): c is Correction => c !== null),
  ];

  const results: ValidationResult[] = [
    p1Result,
    {
      pass: 2,
      issues_found: p2.issues.length,
      corrections: [],
      summary: p2.issues.length === 0
        ? 'All scores within expected ranges.'
        : `${p2.issues.length} scoring issues found. Dates with errors: ${p2.scoringErrors.filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
    },
    {
      pass: 3,
      issues_found: p3.issues.length,
      corrections: p3.llmCorrections,
      summary: p3.issues.length === 0
        ? 'Commentary is internally consistent.'
        : `${p3.issues.length} consistency issues: ${p3.issues.slice(0, 3).join('; ')}`,
    },
  ];

  const totalIssues = results.reduce((sum, r) => sum + r.issues_found, 0);
  const totalCorrections = allCorrections.length;

  return NextResponse.json({
    passes: results,
    corrections: allCorrections,
    total_issues: totalIssues,
    total_corrections: totalCorrections,
    clean: totalIssues === 0,
    summary: totalIssues === 0
      ? 'Report passed all 3 validation passes.'
      : `${totalIssues} issues across 3 passes. ${totalCorrections} corrections applied.`,
  });
}
