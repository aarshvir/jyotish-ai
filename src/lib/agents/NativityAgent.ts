/**
 * NativityAgent
 * Sends the natal chart JSON to Claude claude-sonnet-4-6 with extended thinking
 * and returns a structured NativityProfile. Falls back to OpenAI → Gemini → DeepSeek
 * via runChatFallbackChain when Anthropic is unavailable or exhausted.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NatalChartData, NativityProfile } from './types';
import { safeParseJson } from '@/lib/utils/safeJson';
import { hasAnyChatFallbackKey, runChatFallbackChain } from '@/lib/llm/fallbackChain';
import { logLlmAudit } from '@/lib/llm/audit';
import { buildScriptureContextHybrid } from '@/lib/rag/vectorSearch';
import { detectYogas } from '@/lib/rag/yogaDetector';
import { parseJyotishRagMode, resolveJyotishRagMode, type JyotishRagMode } from '@/lib/rag/ragMode';

const SYSTEM_PROMPT = `You are a Vedic astrologer writing a premium personal report. Your job is to translate astrological data into practical, output-focused guidance a busy professional can act on today. You write like a trusted advisor — warm, specific, direct — not like a textbook.

ABSOLUTE RULES:
- Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON.
- Dense paragraphs only. No bullet points. No generic filler.
- LANGUAGE: Write for someone who does NOT know astrology. Translate every technical term into plain English on first use. Instead of "yogakaraka activates H10 kendra", write "your strongest planet this period is energising your career zone — this is your best window in years to make a bold professional move." Instead of "badhaka lord in dusthana", write "one planet in your chart is quietly draining energy — here's how to work around it."
- When CLASSICAL SCRIPTURE REFERENCES are provided, weave them in as supporting evidence, not jargon: "Ancient Vedic texts single this combination out as a mark of lasting professional recognition."
- Cite scriptures inline as [[SOURCE:CHAPTER:VERSE]] only within quotations or supporting clauses — never lead with the citation. Valid SOURCE codes: BPHS, PHAL, JAIMINI, UPADESHA. Example: [[BPHS:34:12]]. Never use abbreviated codes like PH or BH.
- Every sentence must give the reader something they can feel, decide, or do — not just a planetary fact.
- Never truncate mid-sentence. Reduce detail on minor points rather than cutting a string.
- planetary_positions: include ALL 9 grahas (Sun through Ketu). Each significance field: 3-4 sentences — start with the plain-English life impact, then explain the astrological reason behind it.
- lagna_analysis: 250-300 words. Lead with what this chart says about WHO this person is and what they're here to do. Weave in the key yoga and dasha theme as supporting evidence, not as the headline.
- yogas[].description: 2-3 sentences. Open with the real-world outcome ("This combination historically brings…"), then briefly name the houses behind it.
- current_dasha_interpretation: 150-200 words. Answer: what is being unlocked in your life right now, what should you prioritise, what should you guard against?
- current_year_theme: 60-80 words answering: what is the single biggest planetary shift of 2026 for this person, and what does it mean for their day-to-day life?
- life_themes: maximum 4 items, each under 15 words, written as outcomes not astrological facts.
- All string values must be grammatically complete sentences.`;

function buildUserPrompt(chart: NatalChartData, ragContext: string, detectedYogas?: string[]): string {
  const planets = Object.entries(chart.planets ?? {})
    .map(([name, p]) =>
      `  ${name}: ${p?.sign ?? '?'} ${(p?.degree ?? 0).toFixed(2)}° | house ${p?.house ?? '?'} | ${p?.nakshatra ?? '?'} pada ${p?.nakshatra_pada ?? '?'}${p?.is_retrograde ? ' (R)' : ''}`
    )
    .join('\n');

  const engineFn =
    chart.functional_lord_groups &&
    `\nAUTHORITATIVE ENGINE GROUPS (whole-sign; do not contradict in functional lists or prose):\n${JSON.stringify(chart.functional_lord_groups)}\n`;

  const yogaHint = detectedYogas && detectedYogas.length > 0
    ? `\nPRE-DETECTED YOGAS (you MUST include ALL of these in the yogas array with descriptions): ${detectedYogas.join(', ')}\n`
    : '';

  return `Analyze this natal chart and return a JSON NativityProfile. Write with the depth and specificity of a paid expert — every sentence must name a planet, house, or nakshatra and provide actionable insight.

NATAL CHART
Lagna: ${chart.lagna ?? 'Unknown'} ${(chart.lagna_degree ?? 0).toFixed(2)}°
Planets:
${planets}
Moon nakshatra: ${chart.moon_nakshatra ?? 'Unknown'}
Current dasha: ${chart.current_dasha?.mahadasha ?? 'unknown'} MD / ${chart.current_dasha?.antardasha ?? 'unknown'} AD
  (${chart.current_dasha?.start_date ?? '?'} → ${chart.current_dasha?.end_date ?? '?'})
${engineFn ?? ''}${yogaHint}
${ragContext ? `CLASSICAL SCRIPTURE REFERENCES (cite these inline using [[SOURCE:CHAPTER:VERSE]] format when relevant, e.g. [[BPHS:34:12]]):\n${ragContext}\n` : ''}
INSTRUCTIONS — analyze for ${chart.lagna ?? 'Unknown'} Lagna:
1. Supportive planets: which planets in this chart act as allies — name them and explain what areas of life they open up (career, money, relationships, health, creativity).
2. Challenging planets: which planets create friction or delays — name them and explain the specific life domain affected and how to navigate it.
3. Power planet: the single most important functional planet for this lagna — explain what it empowers.
4. Top 3-5 yogas — MUST include all pre-detected yogas listed above. For each: open with the real-world outcome, then briefly note the astrological basis. Cite BPHS if scripture provided.
5. 3-5 genuine chart strengths and 2-3 honest challenges — written as life outcomes, not astrological labels.
6. Current dasha period: what chapter of life has begun? What is opening up? What is being tested? What is the single most important thing to do in the next 6 months?

Return ONLY this JSON (no extra fields, no markdown):
{
  "lagna_sign": "${chart.lagna ?? 'Unknown'}",
  "lagna_analysis": "250-300 words. Open with: who is this person at their best — what drives them, what they're here to build. Then explain the current planetary period's theme in plain terms. Name the single most powerful combination in this chart and what it promises. Close with two sentences of direct life direction the person can act on.",
  "yogas": [
    { "name": "Yoga Name", "description": "2-3 sentences: open with the real-world outcome this combination delivers, then briefly name the astrological basis. Cite BPHS verse as supporting evidence if scripture provided, e.g. [[BPHS:34:12]].", "strength": "strong|moderate|weak" }
  ],
  "functional_benefics": ["PlanetName — supports [specific life area] for this ascendant because [plain-English reason]"],
  "functional_malefics": ["PlanetName — creates friction in [specific life area] — navigate by [plain-English tip]"],
  "yogakarakas": ["PlanetName — your single most powerful planet: it governs both [life area 1] and [life area 2]"],
  "strengths": ["Plain-English strength — specific outcome the person can count on"],
  "challenges": ["Plain-English challenge — specific area of life that needs conscious navigation"],
  "current_dasha_interpretation": "150-200 words. Answer these questions in flowing paragraphs: What chapter of life has the current planetary period opened? What is specifically being activated — career, relationships, inner work, money? What is the one opportunity the person must not miss in the next 6 months? What is the one risk to guard against? End with a direct instruction.",
  "summary": "3-4 sentences written as a personal letter opening: 'Your chart shows…' Name the defining strength, the current life theme, and one concrete prediction for 2026.",
  "planetary_positions": [
    { "planet": "PlanetName", "sign": "SignName", "house": 1, "nakshatra": "NakshatraName", "dignity": "exalted|own|friendly|neutral|enemy|debilitated", "significance": "3-4 sentences: (1) what this planet does for this person in plain terms — which life domain it governs; (2) where it sits in the chart and what that means practically; (3) the nakshatra's flavor and how it colours this planet's expression; (4) one specific thing this planet is activating right now in the current dasha period." }
  ],
  "life_themes": ["Plain-English life theme — written as an outcome, not an astrological label, under 15 words"],
  "current_year_theme": "60-80 words answering: what is the most important planetary shift of 2026 for this person specifically, what area of life does it affect, and what should they do about it — written as a direct personal message."
}`;
}

function buildFallbackNativity(chart: NatalChartData): NativityProfile {
  const lagna = chart.lagna ?? 'Unknown';
  const moonSign = chart.planets?.Moon?.sign ?? 'Unknown';
  const moonNakshatra = chart.moon_nakshatra ?? 'Unknown';
  const md = chart.current_dasha?.mahadasha ?? '?';
  const ad = chart.current_dasha?.antardasha ?? '?';
  const dasha = `${md}/${ad}`;
  const lagnaAnalysis = `${lagna} lagna native with Moon in ${moonSign} (${moonNakshatra}). The lagna lord governs identity and vitality. Current ${dasha} dasha period shapes dominant themes. Functional benefics and malefics for this lagna influence daily outcomes.`;
  return {
    lagna_sign: lagna,
    lagna_analysis: lagnaAnalysis,
    yogas: [],
    functional_benefics: [],
    functional_malefics: [],
    yogakarakas: [],
    strengths: [],
    challenges: [],
    current_dasha_interpretation: `Currently running ${dasha} dasha period. ${lagnaAnalysis}`,
    summary: `${lagna} lagna with Moon in ${moonSign}. ${dasha} dasha active.`,
    planetary_positions: [],
    life_themes: [],
    current_year_theme: '',
  };
}

function extractTextContent(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function anthropicKeyOk(): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_anthropic_api_key') return null;
  return apiKey;
}

// Hard per-attempt timeout for Anthropic calls. Default SDK timeout is 600s —
// way too long for a synchronous agent. 55s gives Claude ample time while
// staying within the orchestrator's 90s per-agent budget.
const ANTHROPIC_TIMEOUT_MS = 55_000;

export class NativityAgent {
  private client: Anthropic | null;

  constructor() {
    const key = anthropicKeyOk();
    this.client = key
      ? new Anthropic({ apiKey: key, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 0 })
      : null;
    if (!this.client && !hasAnyChatFallbackKey()) {
      throw new Error(
        'No LLM configured: set ANTHROPIC_API_KEY and/or OPENAI_API_KEY / GEMINI_API_KEY (and optional DeepSeek fallback)'
      );
    }
  }

  /**
   * @param rag - `disableRag` forces off unless `jyotishRagMode` is set explicitly.
   */
  async analyze(
    natalChart: NatalChartData,
    rag: boolean | { disableRag?: boolean; jyotishRagMode?: string | null } = false,
  ): Promise<NativityProfile> {
    const delays = [3000, 6000, 12000];
    let lastError: unknown;

    const opts = typeof rag === 'object' && rag !== null ? rag : { disableRag: !!rag };
    const explicit = parseJyotishRagMode(
      opts.jyotishRagMode != null && opts.jyotishRagMode !== ''
        ? String(opts.jyotishRagMode)
        : null,
    );
    const mode: JyotishRagMode =
      explicit ?? (opts.disableRag ? 'off' : resolveJyotishRagMode());

    // Detect yogas present in the chart so the RAG retriever pulls yoga-specific texts.
    const detectedYogas = detectYogas(natalChart);
    console.log(`NativityAgent detected yogas for RAG: ${detectedYogas.join(', ') || '(none)'} (mode=${mode})`);

    const ragContext = mode === 'off' ? '' : await buildScriptureContextHybrid(detectedYogas, natalChart.lagna, mode);

    if (this.client) {
      // Only 1 attempt on Anthropic. If it fails/times out fall immediately to the
      // OpenAI/Gemini fallback chain. Retrying claude in-process wastes ~50s per
      // attempt and blows the 80s route budget before fallback can be tried.
      for (let attempt = 0; attempt < 1; attempt++) {
        try {
          console.log(`NativityAgent attempt ${attempt + 1}/1 (RAG mode=${mode})`);
          // 45s AbortSignal leaves 35s margin for the fallback chain within the
          // 80s route budget.
          const ctrl = new AbortController();
          const abortTimer = setTimeout(() => ctrl.abort(), 45_000);
          const response = await this.client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 4000,
              messages: [
                {
                  role: 'user',
                  content: `${SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(natalChart, ragContext, detectedYogas)}`,
                },
              ],
            },
            { signal: ctrl.signal },
          );
          clearTimeout(abortTimer);

          const text = extractTextContent(response);
          console.log(`NativityAgent response: ${text.length} chars`);
          
          // Robust JSON extraction: look for the first '{' and last '}'
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const cleanJson = jsonMatch ? jsonMatch[0] : text;
          
          logLlmAudit('nativity', 'anthropic', 'claude-sonnet-4-6');
          return safeParseJson<NativityProfile>(cleanJson);
        } catch (error: unknown) {
          lastError = error;
          const status = (error as { status?: number })?.status;

          if (status === 401) {
            console.warn('NativityAgent: Anthropic 401 — will try fallback chain');
            break;
          }
          if (status === 400) {
            console.error('NativityAgent 400:', (error as Error)?.message);
            throw error;
          }

          if ((status === 429 || status === 529) && attempt < 2) {
            const delay = delays[attempt];
            console.warn(`NativityAgent: Anthropic ${status}, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          if (attempt < 2) {
            console.error(`NativityAgent attempt ${attempt + 1} failed:`, (error as Error)?.message);
            await new Promise((r) => setTimeout(r, delays[attempt]));
            continue;
          }
        }
      }
    }

    if (hasAnyChatFallbackKey()) {
      try {
        console.warn('NativityAgent: using backup LLM chain (no extended thinking) + RAG');
        const text = await runChatFallbackChain({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildUserPrompt(natalChart, ragContext, detectedYogas),
          maxTokens: 16000,
          auditStage: 'nativity',
        });
        return safeParseJson<NativityProfile>(text);
      } catch (fallbackErr) {
        console.error('NativityAgent: fallback chain failed:', (fallbackErr as Error)?.message);
        lastError = fallbackErr;
      }
    }

    console.error('NativityAgent: all paths failed, returning minimal fallback:', lastError);
    return buildFallbackNativity(natalChart);
  }
}
