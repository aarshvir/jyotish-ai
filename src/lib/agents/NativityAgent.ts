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

const SYSTEM_PROMPT = `You are a grandmaster Vedic astrologer with 30 years of classical training in Parashara and Jaimini traditions. You write with the authority, depth, and specificity of a paid expert consultation — every sentence earns its place.

ABSOLUTE RULES:
- Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON.
- Dense paragraphs only. No bullet points. No generic filler.
- When CLASSICAL SCRIPTURE REFERENCES are provided, cite them inline as [[SOURCE:CHAPTER]] — e.g. "Per BPHS Ch.36, Gajakesari Yoga bestows lasting fame [[BPHS:36]]." Never paraphrase without citation.
- Name actual planets, houses, and nakshatras in every sentence. Never write vague generalities.
- Never truncate mid-sentence. If length is a concern, reduce detail on minor points — never cut the string.
- planetary_positions: include ALL 9 grahas (Sun through Ketu). Each significance field: 3-4 sentences covering (1) functional role for this lagna, (2) house occupied and what it activates, (3) nakshatra and what the nakshatra lord adds, (4) one specific life-domain prediction for the current dasha period.
- lagna_analysis: 250-300 words. Cover: lagna lord placement and dignity, the single most important planet in the chart and why, the primary yoga operating, dasha period meaning for this lagna, and a 2-line life direction statement.
- yogas[].description: 2-3 sentences naming the specific houses involved, strength qualifier, and a real-life manifestation prediction.
- current_dasha_interpretation: 150-200 words. Name specific life themes activated, what to prioritize in the next 6 months, one caution, and one opportunity unique to this dasha.
- current_year_theme: 60-80 words naming the key 2026 planetary event relevant to this chart (e.g. Jupiter's sign change) and its specific house activation.
- life_themes: maximum 4 items, each under 15 words, each referencing a specific planet or house.
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
${ragContext ? `CLASSICAL SCRIPTURE REFERENCES (cite these inline using [[SOURCE:CHAPTER]] format when relevant):\n${ragContext}\n` : ''}
INSTRUCTIONS — analyze for ${chart.lagna ?? 'Unknown'} Lagna:
1. Functional benefics: planets ruling kendras (1,4,7,10) and trikonas (1,5,9) for this specific lagna — name each and explain why.
2. Functional malefics: planets ruling dusthanas (3,6,8,12) without trikona lordship — name each and explain the specific challenge they create.
3. Yogakaraka(s): planet(s) ruling both a kendra and a trikona simultaneously — the single most important functional planet.
4. Top 3-5 yogas — MUST include all pre-detected yogas listed above. For each yoga: name the houses involved, assess strength (strong/moderate/weak), and give a specific life manifestation prediction.
5. 3-5 chart strengths (specific, not generic) and 2-3 challenges (honest, not sugar-coated).
6. Interpret the current mahadasha-antardasha: what house does the MD lord occupy? What does it rule? What specific life domains are being activated now? What opportunity should the native seize in the next 6 months?

Return ONLY this JSON (no extra fields, no markdown):
{
  "lagna_sign": "${chart.lagna ?? 'Unknown'}",
  "lagna_analysis": "250-300 words. Open with the lagna lord placement and dignity. Identify the single most powerful planet in this chart and explain exactly why. Name the primary operating yoga. Describe the current dasha period's meaning for this specific lagna. Close with a 2-sentence life direction statement that names houses and planets.",
  "yogas": [
    { "name": "Yoga Name", "description": "2-3 sentences: houses involved, strength qualifier, specific life manifestation prediction. Cite BPHS chapter if scripture provided.", "strength": "strong|moderate|weak" }
  ],
  "functional_benefics": ["Planet — ruler of Hx and Hy, explains why benefic for this lagna"],
  "functional_malefics": ["Planet — ruler of Hx (dusthana), explains specific challenge"],
  "yogakarakas": ["Planet — yogakaraka because it rules kendra Hx AND trikona Hy"],
  "strengths": ["Specific strength naming planet, house, and life domain"],
  "challenges": ["Specific challenge naming planet, house, and life domain"],
  "current_dasha_interpretation": "150-200 words. MD lord: which house it occupies, which houses it rules, what life themes it activates. AD lord: same analysis. What specific opportunity should the native seize in the next 6 months? What is the one thing to be cautious about? What is unique about this MD-AD combination for this lagna?",
  "summary": "3-4 sentences. Name the chart's defining feature, the key yoga, the dasha theme, and one 2026 prediction.",
  "planetary_positions": [
    { "planet": "PlanetName", "sign": "SignName", "house": 1, "nakshatra": "NakshatraName", "dignity": "exalted|own|friendly|neutral|enemy|debilitated", "significance": "3-4 sentences: (1) functional role for this lagna — benefic/malefic/yogakaraka/badhaka/maraka and why; (2) the house it occupies and what that activates in this native's life; (3) the nakshatra and what the nakshatra lord adds to interpretation; (4) one specific life-domain prediction for the current dasha period." }
  ],
  "life_themes": ["Theme naming a specific planet and house — under 15 words"],
  "current_year_theme": "60-80 words. Name the key 2026 planetary event for this chart (Jupiter's sign change, Saturn transit, etc.), which house it activates, and what the native should specifically do or expect."
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
