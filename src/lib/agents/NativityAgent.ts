/**
 * NativityAgent
 * Sends the natal chart JSON to Claude claude-sonnet-4-6 with extended thinking
 * and returns a structured NativityProfile.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NatalChartData, NativityProfile } from './types';
import { safeParseJson } from '@/lib/utils/safeJson';

const SYSTEM_PROMPT = `You are a grandmaster Vedic astrologer with 30 years of classical training. Analyze the natal chart with depth matching Parashara and Jaimini traditions.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON.
- Dense paragraphs only. No bullet points.
- Mention actual planets, houses, nakshatra. Never invent scores.
- Never truncate. If content is too long, summarize — never cut mid-string.
- planetary_positions: include all 9 grahas (Sun through Ketu).
- life_themes: maximum 4 items, each under 15 words.
- lagna_analysis: 150-200 words with specific house/nakshatra references.
- current_dasha_interpretation: 100-150 words with lordship analysis.
- All string values must be complete sentences, never cut off.`;

function buildUserPrompt(chart: NatalChartData): string {
  const planets = Object.entries(chart.planets ?? {})
    .map(([name, p]) =>
      `  ${name}: ${p?.sign ?? '?'} ${(p?.degree ?? 0).toFixed(2)}° | house ${p?.house ?? '?'} | ${p?.nakshatra ?? '?'} pada ${p?.nakshatra_pada ?? '?'}${p?.is_retrograde ? ' (R)' : ''}`
    )
    .join('\n');

  return `Analyze this natal chart and return a JSON NativityProfile.

NATAL CHART
Lagna: ${chart.lagna ?? 'Unknown'} ${(chart.lagna_degree ?? 0).toFixed(2)}°
Planets:
${planets}
Moon nakshatra: ${chart.moon_nakshatra ?? 'Unknown'}
Current dasha: ${chart.current_dasha?.mahadasha ?? 'unknown'} MD / ${chart.current_dasha?.antardasha ?? 'unknown'} AD
  (${chart.current_dasha?.start_date ?? '?'} → ${chart.current_dasha?.end_date ?? '?'})

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

export class NativityAgent {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key') {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.client = new Anthropic({ apiKey });
  }

  async analyze(natalChart: NatalChartData): Promise<NativityProfile> {
    const delays = [3000, 6000, 12000];
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`NativityAgent attempt ${attempt + 1}/3 with extended thinking`);
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          thinking: {
            type: 'enabled',
            budget_tokens: 8000,
          },
          temperature: 1,
          messages: [{
            role: 'user',
            content: `${SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(natalChart)}`,
          }],
        });

        const text = extractTextContent(response);
        console.log(`NativityAgent response: ${text.length} chars`);
        return safeParseJson<NativityProfile>(text);
      } catch (error: any) {
        lastError = error;
        const status = error?.status;

        if (status === 401) throw new Error('Invalid Anthropic API key');
        if (status === 400) { console.error('NativityAgent 400:', error?.message); throw error; }

        if ((status === 429 || status === 529) && attempt < 2) {
          const delay = delays[attempt];
          console.warn(`NativityAgent: Anthropic ${status}, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (attempt < 2) {
          console.error(`NativityAgent attempt ${attempt + 1} failed:`, error?.message);
          await new Promise((r) => setTimeout(r, delays[attempt]));
          continue;
        }
      }
    }

    console.error('NativityAgent: all retries failed, returning fallback:', lastError?.message);
    return buildFallbackNativity(natalChart);
  }
}
