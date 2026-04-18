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
import { buildScriptureContext } from '@/lib/rag/scriptures';

const SYSTEM_PROMPT = `You are a grandmaster Vedic astrologer with 30 years of classical training. Analyze the natal chart with depth matching Parashara and Jaimini traditions.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON.
- Dense paragraphs only. No bullet points.
- Mention actual planets, houses, nakshatra. Never invent scores.
- Never truncate. If content is too long, summarize — never cut mid-string.
- planetary_positions: include all 9 grahas (Sun through Ketu).
- life_themes: maximum 4 items, each under 15 words.
- lagna_analysis: 150-200 words with specific house/nakshatra references.
- All string values must be complete sentences, never cut off.`;

function buildUserPrompt(chart: NatalChartData, ragContext: string): string {
  const planets = Object.entries(chart.planets ?? {})
    .map(([name, p]) =>
      `  ${name}: ${p?.sign ?? '?'} ${(p?.degree ?? 0).toFixed(2)}° | house ${p?.house ?? '?'} | ${p?.nakshatra ?? '?'} pada ${p?.nakshatra_pada ?? '?'}${p?.is_retrograde ? ' (R)' : ''}`
    )
    .join('\n');

  const engineFn =
    chart.functional_lord_groups &&
    `\nAUTHORITATIVE ENGINE GROUPS (whole-sign; do not contradict in functional lists or prose):\n${JSON.stringify(chart.functional_lord_groups)}\n`;

  return `Analyze this natal chart and return a JSON NativityProfile.
${ragContext}
NATAL CHART
Lagna: ${chart.lagna ?? 'Unknown'} ${(chart.lagna_degree ?? 0).toFixed(2)}°
Planets:
${planets}
Moon nakshatra: ${chart.moon_nakshatra ?? 'Unknown'}
Current dasha: ${chart.current_dasha?.mahadasha ?? 'unknown'} MD / ${chart.current_dasha?.antardasha ?? 'unknown'} AD
  (${chart.current_dasha?.start_date ?? '?'} → ${chart.current_dasha?.end_date ?? '?'})
${engineFn ?? ''}
INSTRUCTIONS — analyze for ${chart.lagna ?? 'Unknown'} Lagna:
1. Functional benefics: planets ruling kendras (1,4,7,10) and trikonas (1,5,9).
2. Functional malefics: planets ruling dusthanas (3,6,8,12) without trikona lordship.
3. Yogakaraka(s): planet(s) ruling both a kendra and a trikona.
4. Top 3-5 yogas (Gajakesari, Budha-Aditya, Raja Yoga, Dhana Yoga, Viparita Raja, etc.).
5. 3-5 chart strengths and 2-3 challenges.
6. Interpret the current mahadasha-antardasha activation.

Return ONLY this JSON:
{
  "lagna_sign": "${chart.lagna ?? 'Unknown'}",
  "lagna_analysis": "150-200 words. Cover lagna lord placement, key planet dignities, overall chart tone. Reference specific nakshatras and house positions.",
  "yogas": [
    { "name": "Yoga Name", "description": "One sentence with houses involved", "strength": "strong|moderate|weak" }
  ],
  "functional_benefics": ["Planet (role)"],
  "functional_malefics": ["Planet (role)"],
  "yogakarakas": ["Planet"],
  "strengths": ["Specific strength"],
  "challenges": ["Specific challenge"],
  "current_dasha_interpretation": "100-150 words. Cover MD lord house position and functional nature, AD lord house position, what themes are activated, practical guidance.",
  "summary": "2-3 sentence holistic summary",
  "planetary_positions": [
    { "planet": "Mars", "sign": "Taurus", "house": 10, "nakshatra": "Krittika", "dignity": "neutral", "significance": "Yogakaraka in 10th..." }
  ],
  "life_themes": ["Theme in under 15 words"],
  "current_year_theme": "2026 theme in 40-50 words"
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

export class NativityAgent {
  private client: Anthropic | null;

  constructor() {
    const key = anthropicKeyOk();
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client && !hasAnyChatFallbackKey()) {
      throw new Error(
        'No LLM configured: set ANTHROPIC_API_KEY and/or OPENAI_API_KEY / GEMINI_API_KEY (and optional DeepSeek fallback)'
      );
    }
  }

  async analyze(natalChart: NatalChartData): Promise<NativityProfile> {
    const delays = [3000, 6000, 12000];
    let lastError: unknown;

    const ragContext = buildScriptureContext([], natalChart.lagna);

    if (this.client) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`NativityAgent attempt ${attempt + 1}/3 with extended thinking + RAG`);
          const response = await this.client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: `${SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(natalChart, ragContext)}`,
              },
            ],
          });

          const text = extractTextContent(response);
          console.log(`NativityAgent response: ${text.length} chars`);
          return safeParseJson<NativityProfile>(text);
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
          userPrompt: buildUserPrompt(natalChart, ragContext),
          maxTokens: 16000,
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
