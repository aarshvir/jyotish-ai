/**
 * NativityAgent
 * Sends the natal chart JSON to Claude claude-sonnet-4-6 and returns a
 * structured NativityProfile with retry and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NatalChartData, NativityProfile } from './types';
import { safeParseJson } from '@/lib/utils/safeJson';

const SYSTEM_PROMPT = `You are a classically trained Vedic astrologer with deep expertise in Parashari and Jaimini traditions. You will analyze a natal chart and return a single JSON object — no prose, no markdown, no code fences. Only valid JSON.

CRITICAL: Your entire response must be valid, complete JSON. Do not truncate. If content is too long, summarize — never cut mid-string.
planetary_positions: include only the 9 main planets (skip minor points).
life_themes: maximum 4 items, 10 words each.
Keep all string values under 200 characters.`;

function buildUserPrompt(chart: NatalChartData): string {
  const planets = Object.entries(chart.planets ?? {})
    .map(([name, p]) =>
      `  ${name}: ${p?.sign ?? '?'} ${(p?.degree ?? 0).toFixed(2)}° | house ${p?.house ?? '?'} | ${p?.nakshatra ?? '?'} pada ${p?.nakshatra_pada ?? '?'}${p?.is_retrograde ? ' (R)' : ''}`
    )
    .join('\n');

  return `Analyze this natal chart for ${chart.lagna ?? 'Unknown'} lagna and return a JSON NativityProfile.

NATAL CHART
Lagna: ${chart.lagna ?? 'Unknown'} ${(chart.lagna_degree ?? 0).toFixed(2)}°
Planets:
${planets}
Moon nakshatra: ${chart.moon_nakshatra ?? 'Unknown'}
Current dasha: ${chart.current_dasha?.mahadasha ?? 'unknown'} MD / ${chart.current_dasha?.antardasha ?? 'unknown'} AD
  (${chart.current_dasha?.start_date ?? '?'} → ${chart.current_dasha?.end_date ?? '?'})

INSTRUCTIONS
1. Determine functional benefics: planets ruling kendras (1,4,7,10) and trikonas (1,5,9) for this lagna.
2. Determine functional malefics: planets ruling dusthana houses (3,6,8,12) with no trikona lordship.
3. Identify the yogakaraka(s): planet(s) ruling both a kendra and a trikona simultaneously.
4. Spot the top 3-5 yogas present (e.g. Gajakesari, Budha-Aditya, Raja Yoga, Dhana Yoga, Viparita Raja, Neecha Bhanga, etc.).
5. List 3-5 chart strengths and 2-3 challenges.
6. Briefly interpret what the current mahadasha–antardasha period activates for this person.

Return ONLY this JSON (no other text):
{
  "lagna_sign": "string",
  "lagna_analysis": "2–3 sentence analysis of the ascendant sign, its lord placement, and overall chart tone",
  "yogas": [
    { "name": "string", "description": "string (1 sentence)", "strength": "strong|moderate|weak" }
  ],
  "functional_benefics": ["planet", ...],
  "functional_malefics": ["planet", ...],
  "yogakarakas": ["planet", ...],
  "strengths": ["string", ...],
  "challenges": ["string", ...],
  "current_dasha_interpretation": "2–3 sentence interpretation of the current dasha period",
  "summary": "2–3 sentence holistic summary of the chart",
  "planetary_positions": [
    { "planet": "Mars", "sign": "Taurus", "house": 10, "nakshatra": "Krittika", "dignity": "exalted", "significance": "Yogakaraka in 10th house..." }
  ],
  "life_themes": ["Professional authority through disciplined action", "Emotional intelligence as foundation for success"],
  "current_year_theme": "2026 brings..."
}`;
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
    const delays = [2000, 4000, 8000];
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(natalChart) }],
        });

        const text = response.content.find((b) => b.type === 'text')?.text ?? '';
        return safeParseJson(text) as NativityProfile;
      } catch (error: any) {
        lastError = error;
        const status = error?.status;

        if (status === 401) throw new Error('Invalid Anthropic API key. Check .env.local ANTHROPIC_API_KEY');
        if (status === 400) {
          console.error('NativityAgent 400:', error?.message);
          throw error;
        }

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

    throw lastError ?? new Error('NativityAgent failed after retries');
  }
}
