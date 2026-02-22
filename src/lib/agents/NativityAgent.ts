/**
 * NativityAgent
 * Sends the natal chart JSON to Claude claude-sonnet-4-6 and returns a
 * structured NativityProfile: lagna analysis, yogas, functional
 * benefics/malefics, strengths, and current dasha interpretation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { NatalChartData, NativityProfile } from './types';

const SYSTEM_PROMPT = `You are a classically trained Vedic astrologer with deep expertise in Parashari and Jaimini traditions. You will analyze a natal chart and return a single JSON object — no prose, no markdown, no code fences. Only valid JSON.`;

function buildUserPrompt(chart: NatalChartData): string {
  const planets = Object.entries(chart.planets)
    .map(([name, p]) =>
      `  ${name}: ${p.sign} ${p.degree.toFixed(2)}° | house ${p.house} | ${p.nakshatra} pada ${p.nakshatra_pada}${p.is_retrograde ? ' (R)' : ''}`
    )
    .join('\n');

  return `Analyze this natal chart for ${chart.lagna} lagna and return a JSON NativityProfile.

NATAL CHART
Lagna: ${chart.lagna} ${chart.lagna_degree.toFixed(2)}°
Planets:
${planets}
Moon nakshatra: ${chart.moon_nakshatra}
Current dasha: ${chart.current_dasha?.mahadasha ?? 'unknown'} MD / ${chart.current_dasha?.antardasha ?? 'unknown'} AD
  (${chart.current_dasha?.start_date} → ${chart.current_dasha?.end_date})

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
  "summary": "2–3 sentence holistic summary of the chart"
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
    try {
      console.log('🔮 NativityAgent - Starting analysis for lagna:', natalChart.lagna);
      
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(natalChart) }],
      });

      console.log('✅ NativityAgent - Claude response received');

      const text =
        response.content.find((b) => b.type === 'text')?.text ?? '';

      // Strip any accidental markdown code fences
      const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

      try {
        const profile = JSON.parse(clean) as NativityProfile;
        console.log('✅ NativityAgent - Successfully parsed profile');
        return profile;
      } catch (parseError) {
        console.error('❌ NativityAgent - JSON parse error:', parseError);
        console.error('❌ NativityAgent - Raw response:', text.slice(0, 400));
        throw new Error(
          `NativityAgent: Claude returned non-JSON response:\n${text.slice(0, 400)}`
        );
      }
    } catch (error: any) {
      console.error('❌ NativityAgent - Anthropic API error:', error);
      console.error('❌ NativityAgent - Error details:', {
        message: error.message,
        status: error.status,
        type: error.type,
      });
      throw error;
    }
  }
}
