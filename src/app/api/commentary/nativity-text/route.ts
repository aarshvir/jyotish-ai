export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { safeParseJson } from '@/lib/utils/safeJson';
import { completeLlmChat, hasLlmCredentials } from '@/lib/llm/routeCompletion';
import { requireAuth } from '@/lib/api/requireAuth';
import { checkRateLimit, getRateLimitKey, shouldRateLimitLlmForUser } from '@/lib/api/rateLimit';
import { sanitizeLagnaSign, sanitizePlanetName, buildPersonalContextBlock } from '@/lib/utils/sanitize';
import { buildScriptureContextHybrid } from '@/lib/rag/vectorSearch';
import { resolveJyotishRagMode } from '@/lib/rag/ragMode';
import { detectYogas, buildTransitQueryTerms } from '@/lib/rag/yogaDetector';
import { assertRequiredScriptureGrounding } from '@/lib/rag/sourceValidation';
import type { NatalChartData } from '@/lib/agents/types';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (shouldRateLimitLlmForUser(auth)) {
    const { allowed } = await checkRateLimit(
      `nativity-text:${getRateLimitKey(req, 'user' in auth ? auth.user.id : undefined)}`,
      10,
      60_000,
    );
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  let body: {
    lagnaSign: string;
    lagnaDegreee?: number; // typo preserved: orchestrator sends `lagnaDegreee` (3 e's) — do not rename without updating orchestrator
    moonSign: string;
    moonNakshatra: string;
    mahadasha: string;
    antardasha: string;
    md_end?: string;
    ad_end?: string;
    planets: Record<string, unknown>;
    model_override?: string;
    jyotishRagMode?: string;
    jyotish_rag_mode?: string;
    require_scripture_grounding?: boolean;
    personal_context?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    lagnaDegreee,
    moonSign,
    moonNakshatra,
    md_end,
    ad_end,
    planets,
  } = body;
  const lagnaSign = sanitizeLagnaSign(body.lagnaSign);
  const mahadasha = sanitizePlanetName(body.mahadasha);
  const antardasha = sanitizePlanetName(body.antardasha);
  // Pre-sanitized seeker context block, built once in the orchestrator ('' if none).
  const personalContextBlock = buildPersonalContextBlock(body.personal_context);
  if (!lagnaSign) {
    return NextResponse.json({ error: 'lagnaSign required' }, { status: 400 });
  }

  const modelOverride =
    typeof body.model_override === 'string' ? body.model_override.trim() : undefined;

  if (!hasLlmCredentials(modelOverride)) {
    return NextResponse.json(
      { error: 'API key missing for selected or default LLM provider' },
      { status: 503 },
    );
  }

  // Pillar 2: RAG — build a minimal NatalChartData proxy so yogaDetector can run
  const chartProxy = { lagna: lagnaSign, planets: planets as NatalChartData['planets'], current_dasha: { mahadasha, antardasha, start_date: '', end_date: md_end ?? '' } } as NatalChartData;
  const detectedYogas = detectYogas(chartProxy);
  const transitTerms = buildTransitQueryTerms(chartProxy, mahadasha, antardasha);
  const allQueryTerms = Array.from(new Set([...detectedYogas, ...transitTerms]));
  const ragMode = resolveJyotishRagMode(body.jyotishRagMode ?? body.jyotish_rag_mode);
  const ragContext = await buildScriptureContextHybrid(allQueryTerms, lagnaSign, ragMode);
  if (body.require_scripture_grounding) {
    try {
      assertRequiredScriptureGrounding(ragContext, 'nativity-text');
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 503 },
      );
    }
  }

  const systemPrompt = `You are an experienced Vedic astrologer who explains things in warm, plain English to someone with NO astrology background. Write in flowing paragraphs (no bullets). You may mention a planet, sign, or house when it genuinely adds meaning — but in the SAME sentence, translate what it means for the person's real life in everyday words. Never leave a Sanskrit or technical term unexplained. Prioritise what the chart says about their personality, strengths, challenges, and the current chapter of their life over technical detail.${personalContextBlock}

Return ONLY valid JSON with two keys: lagna_analysis, dasha_interpretation. No markdown, no backticks.`;

  const planetLines = Object.entries(planets ?? {})
    .map(([p, d]) => {
      const row = d as { sign?: string; house?: number };
      return `${p} in ${row.sign ?? '?'} (house ${row.house ?? '?'})`;
    })
    .join('\n');

  const planetBlock = [
    `ACTUAL NATAL PLANETARY POSITIONS — sidereal Lahiri, whole-sign houses from ${lagnaSign} lagna:`,
    planetLines,
    ``,
    `STRICT RULE: Use ONLY these positions.`,
    `Do NOT invent any planetary placement.`,
    `Do NOT place planets in houses not listed above.`,
    ``,
  ].join('\n');

  const userPrompt = `Generate lagna analysis and dasha interpretation for this native.
${ragContext}
${planetBlock}

Lagna: ${lagnaSign} ${(lagnaDegreee ?? 0).toFixed(2)}°
Moon: ${moonSign} / ${moonNakshatra}
Current dasha: ${mahadasha} MD (until ${md_end ?? '?'}) / ${antardasha} AD (until ${ad_end ?? '?'})

Return this exact JSON:
{
  "lagna_analysis": "150-200 words, plain English a beginner can follow. Describe what ${lagnaSign} rising means for this person as a personality — how they come across, their natural strengths, their blind spots — and where their life is broadly heading. You may reference a placement once or twice, but always immediately say what it means in everyday life, and explain any technical term in the same breath. Warm and specific, never a wall of jargon.",
  "dasha_interpretation": "100-150 words, plain English. Explain the chapter of life this person is in right now (the ${mahadasha}/${antardasha} period) — which themes are emphasised (work, relationships, money, learning, rest), what to lean into, and what to be patient with. Translate any technical term into plain words. Practical and encouraging."
}

Start with { and end with }. No markdown.`;

  try {
    const rawText = await completeLlmChat({
      modelOverride,
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
    });

    const parsed = safeParseJson<{ lagna_analysis?: string; dasha_interpretation?: string }>(rawText);
    return NextResponse.json({
      lagna_analysis: parsed?.lagna_analysis ?? '',
      dasha_interpretation: parsed?.dasha_interpretation ?? '',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[nativity-text]', msg);
    return NextResponse.json({ error: msg || 'Commentary failed' }, { status: 500 });
  }
}
