/**
 * ForecastAgent
 * Orchestrates the full day-by-day forecast pipeline with resilient error handling.
 * Uses claude-sonnet-4-6 for all AI calls.
 */

import Anthropic from '@anthropic-ai/sdk';
import { safeParseJson } from '@/lib/utils/safeJson';
import { hasAnyChatFallbackKey, runChatFallbackChain } from '@/lib/llm/fallbackChain';
import { EphemerisAgent } from './EphemerisAgent';
import { RatingAgent } from './RatingAgent';
import { buildScriptureContextHybrid } from '@/lib/rag/vectorSearch';
import { buildTransitQueryTerms } from '@/lib/rag/yogaDetector';
import type {
  ForecastInput,
  ForecastOutput,
  AgentDayForecast,
  DayRating,
  FullDayData,
  DayNarrative,
  PanchangData,
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
  ratings: DayRating[],
  ragContext = '',
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
${ragContext}
NATIVE
  Lagna: ${natalChart?.lagna ?? '?'}
  Moon nakshatra: ${natalChart?.moon_nakshatra ?? '?'}
  Current dasha: ${natalChart?.current_dasha?.mahadasha ?? '?'} MD / ${natalChart?.current_dasha?.antardasha ?? '?'} AD (ends ${natalChart?.current_dasha?.end_date ?? '?'})

DAILY DATA (${dates[0]} to ${dates[dates.length - 1]})
${dayBlocks}

TASK
Return ONLY valid JSON (no prose, no code fences) with this exact structure.
CRITICAL: Dense paragraphs only. No bullet points. Mention actual planets, houses, nakshatra. Never invent scores — all scores in text must match the provided numeric inputs exactly. Do not truncate strings.
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
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: 'You are a Vedic astrologer. Return only valid JSON. No prose, no markdown. Dense paragraphs only. Never invent scores — match provided numeric inputs exactly.',
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content.find((b) => b.type === 'text')?.text ?? '';
      return text;
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { status?: number })?.status;

      if (status === 401) throw new Error('Invalid Anthropic API key. Check .env.local ANTHROPIC_API_KEY');
      if (status === 400) {
        console.error('Anthropic 400 bad request:', (error as Error)?.message);
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

const FORECAST_SYSTEM =
  'You are a Vedic astrologer. Return only valid JSON. No prose, no markdown. Dense paragraphs only. Never invent scores — match provided numeric inputs exactly.';

export class ForecastAgent {
  private ephemeris: EphemerisAgent;
  private rating: RatingAgent;
  private claude: Anthropic | null;

  constructor() {
    this.ephemeris = new EphemerisAgent();
    this.rating = new RatingAgent();

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (apiKey && apiKey !== 'your_anthropic_api_key') {
      this.claude = new Anthropic({ apiKey, timeout: 55_000, maxRetries: 0 });
    } else {
      this.claude = null;
    }
    if (!this.claude && !hasAnyChatFallbackKey()) {
      throw new Error(
        'No LLM configured: set ANTHROPIC_API_KEY and/or OPENAI_API_KEY / GEMINI_API_KEY for forecast narratives'
      );
    }
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

    // Step 4: Assemble (with deterministic narrative fallback)
    const dayFallbackNarrative = (date: string, dayScore: number, panchang: PanchangData | undefined) => {
      const tithi = panchang?.tithi || 'today';
      const nakshatra = panchang?.nakshatra || 'the lunar mansion';
      const quality = dayScore >= 70 ? 'strong' : dayScore >= 50 ? 'moderate' : 'challenging';
      return `Day score ${dayScore} reflects ${quality} energy. Tithi ${tithi} and nakshatra ${nakshatra} influence the day. Use peak hora windows for important activities.`;
    };

    const days: AgentDayForecast[] = dates.map((date, i) => {
      const narr = narratives.days.find((n) => n.date === date) ?? {
        date,
        narrative: '',
        best_times: [],
        avoid_times: [],
      };
      const fd = dayData[i];
      const rk = fd?.rahu_kaal;
      const dayScore = ratings[i]?.day_score ?? 50;
      const narrative = (narr.narrative || '').trim() || dayFallbackNarrative(date, dayScore, fd?.panchang);
      return {
        date,
        panchang: fd?.panchang ?? { tithi: '', nakshatra: '', yoga: '', karana: '', sunrise: '', sunset: '', moon_sign: '', day_ruler: '' },
        rating: ratings[i] ?? { date: date, day_score: 50, peak_windows: [], avoid_windows: [], all_slots: [] },
        narrative,
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
      days: dates.map((date) => ({ date, narrative: `Day forecast for ${date}. Use hora and choghadiya for timing.`, best_times: [] as string[], avoid_times: [] as string[] })),
      weekly_summary: 'Forecast period overview. Prioritise high-score windows for important activities.',
    };

    // Pillar 2: inject transit-based RAG context so narratives reference classical texts
    const md = input.natalChart?.current_dasha?.mahadasha ?? '';
    const ad = input.natalChart?.current_dasha?.antardasha ?? '';
    const transitTerms = input.natalChart
      ? buildTransitQueryTerms(input.natalChart, md, ad)
      : ['Hora System', 'Choghadiya System', 'Rahu Kaal and Inauspicious Timing'];
    const ragContext = await buildScriptureContextHybrid(transitTerms, input.natalChart?.lagna);

    const prompt = buildForecastPrompt(input, dates, dayData, ratings, ragContext);
    let rawText: string | null = null;

    try {
      if (this.claude) {
        try {
          rawText = await callClaudeWithBackoff(this.claude, prompt, 16000);
        } catch (claudeErr: unknown) {
          console.warn('ForecastAgent - Claude failed, trying fallback chain:', (claudeErr as Error)?.message);
        }
      }
      if ((rawText == null || rawText === '') && hasAnyChatFallbackKey()) {
        rawText = await runChatFallbackChain({
          systemPrompt: FORECAST_SYSTEM,
          userPrompt: prompt,
          maxTokens: 16000,
        });
      }
      if (rawText == null || rawText === '') {
        return emptyResult;
      }
      try {
        return safeParseJson<{ days: DayNarrative[]; weekly_summary: string }>(rawText);
      } catch {
        console.error('ForecastAgent - JSON parse error. Raw:', rawText.slice(0, 400));
        return emptyResult;
      }
    } catch (error: unknown) {
      console.error('ForecastAgent - Narrative generation failed:', (error as Error)?.message);
      return emptyResult;
    }
  }
}
