/**
 * ForecastAgent
 * Orchestrates the full day-by-day forecast pipeline with resilient error handling.
 * Uses claude-sonnet-4-6 for all AI calls.
 */

import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
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

function buildForecastPrompt(
  input: ForecastInput,
  dates: string[],
  dayData: FullDayData[],
  ratings: DayRating[]
): string {
  const { natalChart } = input;

  const dayBlocks = dates.map((date, i) => {
    const d = dayData[i];
    const r = ratings[i];
    if (!d || !r) return `DATE: ${date}\n  Data unavailable`;
    const peak = r.peak_windows
      .map((s) => `${s.start_time}–${s.end_time} (${s.hora_ruler} hora, ${s.choghadiya}, rating ${s.rating})`)
      .join(' | ');
    const avoid = r.avoid_windows
      .map((s) => `${s.start_time}–${s.end_time} (${s.hora_ruler} hora, ${s.choghadiya}${s.is_rahu_kaal ? ', RAHU KAAL' : ''})`)
      .join(' | ');

    return `DATE: ${date}
  Day score: ${r.day_score}/100
  Tithi: ${d.panchang?.tithi ?? '?'} | Nakshatra: ${d.panchang?.nakshatra ?? '?'} | Yoga: ${d.panchang?.yoga ?? '?'}
  Moon sign: ${d.panchang?.moon_sign ?? '?'} | Day ruler: ${d.panchang?.day_ruler ?? '?'}
  Rahu Kaal: ${d.rahu_kaal?.start_time ?? '?'}–${d.rahu_kaal?.end_time ?? '?'}
  Peak windows:  ${peak || 'none'}
  Avoid windows: ${avoid || 'none'}`;
  }).join('\n\n');

  return `You are a Vedic astrologer writing a personalised daily forecast.

NATIVE
  Lagna: ${natalChart?.lagna ?? '?'}
  Moon nakshatra: ${natalChart?.moon_nakshatra ?? '?'}
  Current dasha: ${natalChart?.current_dasha?.mahadasha ?? '?'} MD / ${natalChart?.current_dasha?.antardasha ?? '?'} AD (ends ${natalChart?.current_dasha?.end_date ?? '?'})

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

async function callClaudeWithBackoff(
  claude: Anthropic,
  prompt: string,
  maxTokens: number,
  retries = 3
): Promise<string> {
  const delays = [2000, 4000, 8000];
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: 'You are a Vedic astrologer. Return only valid JSON — no prose, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content.find((b) => b.type === 'text')?.text ?? '';
      return text;
    } catch (error: any) {
      lastError = error;
      const status = error?.status;

      if (status === 401) throw new Error('Invalid Anthropic API key. Check .env.local ANTHROPIC_API_KEY');
      if (status === 400) {
        console.error('Anthropic 400 bad request:', error?.message);
        throw error;
      }

      // 429 rate limit or 529 overloaded — retry with backoff
      if (status === 429 || status === 529) {
        const delay = delays[Math.min(i, delays.length - 1)];
        console.warn(`Anthropic ${status}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Claude call failed after retries');
}

export class ForecastAgent {
  private ephemeris: EphemerisAgent;
  private rating: RatingAgent;
  private claude: Anthropic;

  constructor() {
    this.ephemeris = new EphemerisAgent();
    this.rating = new RatingAgent();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key') {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.claude = new Anthropic({ apiKey });
  }

  async generateForecast(input: ForecastInput): Promise<ForecastOutput> {
    const dates = getDateRange(input.dateFrom, input.dateTo);
    if (dates.length === 0) throw new Error('ForecastAgent: empty date range');

    console.log(`ForecastAgent - Generating forecast for ${dates.length} days`);

    // Step 1: Fetch ephemeris data — skip failed days instead of failing all
    console.log('ForecastAgent - Step 1: Fetching ephemeris data...');
    const dayDataResults = await Promise.allSettled(
      dates.map((date) =>
        this.ephemeris.getFullDayData({
          date,
          birthLat: input.birthLat,
          birthLng: input.birthLng,
          currentLat: input.currentLat,
          currentLng: input.currentLng,
          timezoneOffset: input.timezoneOffset,
        })
      )
    );

    const dayData: (FullDayData | null)[] = dayDataResults.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(`ForecastAgent - Day ${dates[i]} fetch failed:`, (r as PromiseRejectedResult).reason?.message);
      return null;
    });

    const successCount = dayData.filter(Boolean).length;
    if (successCount === 0) {
      const firstErr = dayDataResults.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      throw new Error(firstErr?.reason?.message ?? 'All ephemeris fetches failed');
    }
    console.log(`ForecastAgent - Step 1 complete: ${successCount}/${dates.length} days fetched`);

    // Step 2: Rate days (pure calculation, skip nulls)
    console.log('ForecastAgent - Step 2: Rating days...');
    const ratings: (DayRating | null)[] = dates.map((date, i) => {
      if (!dayData[i]) return null;
      try {
        return this.rating.rateDay(date, dayData[i]!, input.natalChart?.lagna ?? 'Aries');
      } catch {
        return null;
      }
    });
    console.log('ForecastAgent - Step 2 complete');

    // Step 3: Claude narratives
    console.log('ForecastAgent - Step 3: Generating narratives...');
    const validIndices = dates.map((_, i) => i).filter((i) => dayData[i] && ratings[i]);
    const validDates = validIndices.map((i) => dates[i]);
    const validDayData = validIndices.map((i) => dayData[i]!);
    const validRatings = validIndices.map((i) => ratings[i]!);

    const narratives = await this.generateNarratives(input, validDates, validDayData, validRatings);
    console.log('ForecastAgent - Step 3 complete');

    // Step 4: Assemble
    const days: DayForecast[] = dates.map((date, i) => {
      const narr = narratives.days.find((n) => n.date === date) ?? {
        date,
        narrative: '',
        best_times: [],
        avoid_times: [],
      };
      const fd = dayData[i];
      const rk = fd?.rahu_kaal;
      return {
        date,
        panchang: fd?.panchang ?? { tithi: '', nakshatra: '', yoga: '', karana: '', sunrise: '', sunset: '', moon_sign: '', day_ruler: '' },
        rating: ratings[i] ?? { date: date, day_score: 50, peak_windows: [], avoid_windows: [], all_slots: [] },
        narrative: narr.narrative,
        best_times: narr.best_times,
        avoid_times: narr.avoid_times,
        rahu_kaal: rk ? { start_time: rk.start_time, end_time: rk.end_time } : undefined,
      };
    });

    return {
      period: { from: input.dateFrom, to: input.dateTo },
      lagna: input.natalChart?.lagna ?? 'Unknown',
      current_dasha: input.natalChart?.current_dasha,
      days,
      weekly_summary: narratives.weekly_summary,
    };
  }

  private async generateNarratives(
    input: ForecastInput,
    dates: string[],
    dayData: FullDayData[],
    ratings: DayRating[]
  ): Promise<{ days: DayNarrative[]; weekly_summary: string }> {
    const emptyResult = {
      days: dates.map((date) => ({ date, narrative: '', best_times: [] as string[], avoid_times: [] as string[] })),
      weekly_summary: '',
    };

    try {
      const prompt = buildForecastPrompt(input, dates, dayData, ratings);
      const rawText = await callClaudeWithBackoff(this.claude, prompt, 8000);
      try {
        return safeParseJson<{ days: DayNarrative[]; weekly_summary: string }>(rawText);
      } catch {
        console.error('ForecastAgent - JSON parse error. Raw:', rawText.slice(0, 400));
        return emptyResult;
      }
    } catch (error: any) {
      console.error('ForecastAgent - Narrative generation failed:', error?.message);
      return emptyResult;
    }
  }
}
