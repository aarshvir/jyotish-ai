/**
 * ForecastAgent
 * Orchestrates the full day-by-day forecast pipeline:
 *   1. EphemerisAgent  → fetch panchang + hora + choghadiya + rahu kaal for each date
 *   2. RatingAgent     → score every hora slot deterministically
 *   3. Claude claude-sonnet-4-6 → single batched call for narratives + best/avoid windows
 *
 * Usage:
 *   const agent = new ForecastAgent();
 *   const forecast = await agent.generateForecast({ natalChart, ...locationData, dateFrom, dateTo });
 */

import Anthropic from '@anthropic-ai/sdk';
import { EphemerisAgent } from './EphemerisAgent';
import { RatingAgent } from './RatingAgent';
import type {
  ForecastInput,
  ForecastOutput,
  DayForecast,
  DayRating,
  FullDayData,
  DayNarrative,
} from './types';

// ── Date helpers ─────────────────────────────────────────────────────────────

function getDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildForecastPrompt(
  input: ForecastInput,
  dates: string[],
  dayData: FullDayData[],
  ratings: DayRating[]
): string {
  const { natalChart } = input;

  const dayBlocks = dates.map((date, i) => {
    const d  = dayData[i];
    const r  = ratings[i];
    const peak = r.peak_windows
      .map((s) => `${s.start_time}–${s.end_time} (${s.hora_ruler} hora, ${s.choghadiya}, rating ${s.rating})`)
      .join(' | ');
    const avoid = r.avoid_windows
      .map((s) => `${s.start_time}–${s.end_time} (${s.hora_ruler} hora, ${s.choghadiya}${s.is_rahu_kaal ? ', RAHU KAAL' : ''})`)
      .join(' | ');

    return `DATE: ${date}
  Day score: ${r.day_score}/100
  Tithi: ${d.panchang.tithi} | Nakshatra: ${d.panchang.nakshatra} | Yoga: ${d.panchang.yoga}
  Moon sign: ${d.panchang.moon_sign} | Day ruler: ${d.panchang.day_ruler}
  Rahu Kaal: ${d.rahu_kaal.start_time}–${d.rahu_kaal.end_time}
  Peak windows:  ${peak}
  Avoid windows: ${avoid}`;
  }).join('\n\n');

  return `You are a Vedic astrologer writing a personalised daily forecast.

NATIVE
  Lagna: ${natalChart.lagna}
  Moon nakshatra: ${natalChart.moon_nakshatra}
  Current dasha: ${natalChart.current_dasha?.mahadasha ?? '?'} MD / ${natalChart.current_dasha?.antardasha ?? '?'} AD (ends ${natalChart.current_dasha?.end_date ?? '?'})

DAILY DATA (${dates[0]} to ${dates[dates.length - 1]})
${dayBlocks}

TASK
Return ONLY valid JSON (no prose, no code fences) with this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "narrative": "2–3 sentence personalised forecast for the day",
      "best_times": ["HH:MM–HH:MM description", ...],
      "avoid_times": ["HH:MM–HH:MM reason", ...]
    }
  ],
  "weekly_summary": "3–4 sentence overview of the entire forecast period"
}`;
}

// ── Agent ────────────────────────────────────────────────────────────────────

export class ForecastAgent {
  private ephemeris: EphemerisAgent;
  private rating: RatingAgent;
  private claude: Anthropic;

  constructor() {
    this.ephemeris = new EphemerisAgent();
    this.rating    = new RatingAgent();
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key') {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.claude = new Anthropic({ apiKey });
  }

  async generateForecast(input: ForecastInput): Promise<ForecastOutput> {
    try {
      const dates = getDateRange(input.dateFrom, input.dateTo);
      if (dates.length === 0) throw new Error('ForecastAgent: empty date range');

      console.log(`📅 ForecastAgent - Generating forecast for ${dates.length} days`);

      // ── Step 1: Fetch ephemeris data for all dates in parallel ──────────────
      console.log('📡 ForecastAgent - Step 1: Fetching ephemeris data...');
      const dayData: FullDayData[] = await Promise.all(
        dates.map((date) =>
          this.ephemeris.getFullDayData({
            date,
            birthLat:        input.birthLat,
            birthLng:        input.birthLng,
            currentLat:      input.currentLat,
            currentLng:      input.currentLng,
            timezoneOffset:  input.timezoneOffset,
          })
        )
      );
      console.log(`✅ ForecastAgent - Step 1 complete: ${dayData.length} days fetched`);

      // ── Step 2: Rate all days (pure calculation) ─────────────────────────────
      console.log('🔢 ForecastAgent - Step 2: Rating days...');
      const ratings: DayRating[] = dates.map((date, i) =>
        this.rating.rateDay(date, dayData[i], input.natalChart.lagna)
      );
      console.log(`✅ ForecastAgent - Step 2 complete: ${ratings.length} days rated`);

      // ── Step 3: Single Claude call for all narratives ────────────────────────
      console.log('🔮 ForecastAgent - Step 3: Generating narratives...');
      const narratives = await this.generateNarratives(input, dates, dayData, ratings);
      console.log('✅ ForecastAgent - Step 3 complete');

      // ── Step 4: Assemble final output ────────────────────────────────────────
      console.log('📦 ForecastAgent - Step 4: Assembling forecast...');
      const days: DayForecast[] = dates.map((date, i) => {
        const narr = narratives.days.find((n) => n.date === date) ?? {
          date,
          narrative:   '',
          best_times:  [],
          avoid_times: [],
        };
        return {
          date,
          panchang:    dayData[i].panchang,
          rating:      ratings[i],
          narrative:   narr.narrative,
          best_times:  narr.best_times,
          avoid_times: narr.avoid_times,
        };
      });

      console.log('✅ ForecastAgent - Forecast generation complete');
      return {
        period:         { from: input.dateFrom, to: input.dateTo },
        lagna:          input.natalChart.lagna,
        current_dasha:  input.natalChart.current_dasha,
        days,
        weekly_summary: narratives.weekly_summary,
      };
    } catch (error: any) {
      console.error('❌ ForecastAgent - generateForecast error:', error);
      console.error('❌ ForecastAgent - Error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ── Private: Claude narrative generation ───────────────────────────────────

  private async generateNarratives(
    input: ForecastInput,
    dates: string[],
    dayData: FullDayData[],
    ratings: DayRating[]
  ): Promise<{ days: DayNarrative[]; weekly_summary: string }> {
    try {
      const prompt = buildForecastPrompt(input, dates, dayData, ratings);
      console.log('🔮 ForecastAgent - Calling Claude for narratives...');

      const response = await this.claude.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     'You are a Vedic astrologer. Return only valid JSON — no prose, no markdown.',
        messages:   [{ role: 'user', content: prompt }],
      });

      console.log('✅ ForecastAgent - Claude response received');

      const text =
        response.content.find((b) => b.type === 'text')?.text ?? '';
      const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

      try {
        const result = JSON.parse(clean) as { days: DayNarrative[]; weekly_summary: string };
        console.log('✅ ForecastAgent - Successfully parsed narratives');
        return result;
      } catch (parseError) {
        console.error('❌ ForecastAgent - JSON parse error:', parseError);
        console.error('❌ ForecastAgent - Raw response:', text.slice(0, 400));
        // Graceful degradation: return empty narratives rather than throwing
        return {
          days: dates.map((date) => ({ date, narrative: '', best_times: [], avoid_times: [] })),
          weekly_summary: '',
        };
      }
    } catch (error: any) {
      console.error('❌ ForecastAgent - Anthropic API error:', error);
      console.error('❌ ForecastAgent - Error details:', {
        message: error.message,
        status: error.status,
        type: error.type,
      });
      // Graceful degradation
      return {
        days: dates.map((date) => ({ date, narrative: '', best_times: [], avoid_times: [] })),
        weekly_summary: '',
      };
    }
  }
}
