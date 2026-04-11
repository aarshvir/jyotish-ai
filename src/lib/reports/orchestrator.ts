/**
 * Server-side report generation orchestrator.
 * Runs the full pipeline (ephemeris → nativity/grids → commentary → synthesis → validation → assembly)
 * and emits SSE-style events via `onStep`. Saves progress to Supabase incrementally.
 */

import { batchedPromiseAll } from '@/lib/async/batchedPromiseAll';
import { createServiceClient } from '@/lib/supabase/admin';
import { validateReportData } from '@/lib/validation/reportValidation';
import type {
  NatalChartData,
  NativityProfile,
  NativityData,
  MonthSummary,
  ReportData,
  PanchangData,
} from '@/lib/agents/types';
import { getCanonicalScoreLabel } from '@/lib/guidance/labels';
import { buildSlotGuidance, buildDayBriefing } from '@/lib/guidance/builder';
import { isV2GuidanceEnabled } from '@/lib/guidance/featureFlag';

// ── Pipeline-internal types ──────────────────────────────────────────────────

interface DayGridSlotRaw {
  slot_index?: number;
  display_label?: string;
  dominant_hora?: string;
  hora_ruler?: string;
  dominant_choghadiya?: string;
  choghadiya?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  is_rahu_kaal?: boolean;
  score?: number;
  start_iso?: string;
  end_iso?: string;
  midpoint_iso?: string;
}

interface DayGridApiResult {
  date?: string;
  panchang?: Partial<PanchangData>;
  rahu_kaal?: { start?: string; end?: string };
  day_score?: number;
  planet_positions?: unknown;
  slots?: DayGridSlotRaw[];
}

interface ForecastSlotIntermediate {
  slot_index: number;
  display_label: string;
  dominant_hora: string;
  dominant_choghadiya: string;
  transit_lagna: string;
  transit_lagna_house: number;
  is_rahu_kaal: boolean;
  score: number;
  start_iso?: string;
  end_iso?: string;
  midpoint_iso?: string;
  commentary?: string;
  commentary_short?: string;
}

interface ForecastDayIntermediate {
  date: string;
  panchang: Partial<PanchangData>;
  rahu_kaal: { start: string; end: string };
  day_score: number;
  planet_positions?: unknown;
  slots: ForecastSlotIntermediate[];
  day_theme?: string;
  day_overview?: string;
}

interface MonthApiResult {
  month_label?: string;
  month?: string;
  overall_score?: number;
  score?: number;
  career_score?: number;
  money_score?: number;
  health_score?: number;
  love_score?: number;
  theme?: string;
  key_transits?: string[];
  analysis?: string;
  commentary?: string;
  weekly_scores?: number[];
}

interface WeekApiResult {
  week_label?: string;
  overall_score?: number;
  score?: number;
  theme?: string;
  analysis?: string;
  commentary?: string;
  moon_signs?: string[];
}

interface WeeksSynthApiResult {
  weeks?: WeekApiResult[];
  period_synthesis?: {
    opening_paragraph?: string;
    strategic_windows?: unknown[];
    caution_dates?: unknown[];
    domain_priorities?: Record<string, string>;
    closing_paragraph?: string;
  } | null;
}

interface DayOverviewApiResult {
  date: string;
  day_theme?: string;
  day_overview?: string;
}

interface ValidationCorrection {
  type: 'day_overview' | 'slot_commentary';
  date?: string;
  slot_index?: number;
  fixed_text?: string;
}

// ── Public types ─────────────────────────────────────────────────────────────

export type StepEvent =
  | { type: 'step_started'; step: number; message: string; detail: string }
  | { type: 'step_completed'; step: number }
  | { type: 'partial_report_updated'; field: string }
  | { type: 'report_completed'; reportData: ReportData }
  | { type: 'error'; message: string };

export interface PipelineInput {
  name: string;
  date: string;
  time: string;
  city: string;
  lat: number;
  lng: number;
  currentLat: number;
  currentLng: number;
  currentCity: string;
  timezoneOffset: number;
  type: string;
  forecastStart?: string;
  planType?: string;
  paymentStatus?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIGNS_FOR_LAGNA = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

/**
 * Uses the canonical score-to-label function to eliminate threshold drift.
 * Previously this had Neutral at ≥55 instead of ≥50 — now uses single source of truth.
 */
function toLabel(
  score: number,
  isRk: boolean,
): 'Peak' | 'Excellent' | 'Good' | 'Neutral' | 'Caution' | 'Difficult' | 'Avoid' {
  return getCanonicalScoreLabel(score, isRk);
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[d.getUTCDay()]} · ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  } catch {
    return dateStr;
  }
}

function monthlyFallback(label: string, score: number): string {
  return `${label} — Overall score: ${score}/100. Commentary is generating — refresh in 30 seconds.`;
}

function weeklyFallback(label: string, score: number): string {
  return `${label || 'This week'} — Week score: ${score}/100. Weekly narrative is generating — refresh in 30 seconds.`;
}

/** Ephemeris expects HH:MM:SS; `input.time` may be HH:MM or HH:MM:SS. */
function formatEphemerisBirthTime(t: string): string {
  const raw = (t || '12:00').trim();
  const parts = raw.split(':').filter((p) => p.length > 0);
  if (parts.length >= 3) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const s = (parts[2] ?? '00').replace(/\D/g, '').slice(0, 2).padStart(2, '0') || '00';
    return `${h}:${m}:${s}`;
  }
  if (parts.length === 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}:00`;
  }
  return '12:00:00';
}

async function resilientFetch(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 2000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: unknown) {
      const isNetwork =
        err instanceof Error &&
        (err.name === 'TypeError' ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('SUSPENDED') ||
          err.message?.includes('aborted'));
      if (isNetwork && i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// ── Main orchestrator ────────────────────────────────────────────────────────

export async function generateReportPipeline(
  reportId: string,
  userId: string,
  userEmail: string,
  input: PipelineInput,
  onStep: (event: StepEvent) => void,
  base: string,
  authHeaders: Record<string, string>,
): Promise<void> {
  const h = { ...authHeaders, 'Content-Type': 'application/json' };
  const skipValidation = process.env.NEXT_PUBLIC_SKIP_VALIDATION === 'true';

  const db = createServiceClient();

  // Helper: upsert report row
  async function dbInsertGenerating() {
    const planRaw = input.planType ?? input.type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const birthTimeNorm =
      input.time && input.time.includes(':') && input.time.split(':').length === 2
        ? `${input.time}:00`
        : input.time || '12:00:00';

    const { error } = await db.from('reports').upsert(
      {
        id: reportId,
        user_id: userId,
        user_email: userEmail,
        native_name: input.name || 'Unknown',
        birth_date: input.date || '2000-01-01',
        birth_time: birthTimeNorm,
        birth_city: input.city || 'Unknown',
        birth_lat: input.lat || null,
        birth_lng: input.lng || null,
        current_city: input.currentCity || null,
        current_lat: input.currentLat || null,
        current_lng: input.currentLng || null,
        timezone_offset: input.timezoneOffset,
        plan_type: planType,
        status: 'generating',
        payment_status: input.paymentStatus ?? 'bypass',
      },
      { onConflict: 'id', ignoreDuplicates: false },
    );
    if (error && error.code !== '23505') {
      console.error('[orchestrator] dbInsertGenerating:', error.message);
    }
  }

  async function dbSaveEphemeris(
    lagna: string,
    mahadasha: string,
    antardasha: string,
  ) {
    const { error } = await db
      .from('reports')
      .update({ lagna_sign: lagna, dasha_mahadasha: mahadasha, dasha_antardasha: antardasha })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) console.error('[orchestrator] dbSaveEphemeris:', error.message);
  }

  async function dbSaveDayScores(forecastDays: ForecastDayIntermediate[]) {
    const dayScores: Record<string, number> = {};
    forecastDays.forEach((d) => {
      if (d.date && typeof d.day_score === 'number') dayScores[d.date] = d.day_score;
    });
    const { error } = await db
      .from('reports')
      .update({ day_scores: dayScores })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) console.error('[orchestrator] dbSaveDayScores:', error.message);
  }

  async function dbSaveFinal(reportPayload: Record<string, unknown>) {
    const days = reportPayload.days as Array<{ date?: string; day_score?: number }> | undefined;
    const dayScores: Record<string, number> = {};
    days?.forEach((d) => {
      if (d.date && typeof d.day_score === 'number') dayScores[d.date] = d.day_score;
    });

    const natal = (reportPayload.nativity as { natal_chart?: Record<string, unknown> })?.natal_chart;
    const nc = natal as Record<string, unknown> | undefined;
    const cd = nc?.current_dasha as Record<string, string> | undefined;
    const startD = days?.[0]?.date;
    const endD = days?.length ? days[days.length - 1]?.date : undefined;
    const moonPlanets = (nc?.planets as Record<string, { sign?: string }> | undefined)?.Moon;

    const { error } = await db
      .from('reports')
      .update({
        native_name: input.name,
        user_email: userEmail,
        report_start_date: startD ?? null,
        report_end_date: endD ?? null,
        lagna_sign: (nc?.lagna as string) ?? null,
        moon_sign: (moonPlanets?.sign as string) ?? null,
        moon_nakshatra: (nc?.moon_nakshatra as string) ?? null,
        dasha_mahadasha: cd?.mahadasha ?? null,
        dasha_antardasha: cd?.antardasha ?? null,
        day_scores: dayScores,
        report_data: reportPayload,
        status: 'complete',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) console.error('[orchestrator] dbSaveFinal:', error.message);
  }

  try {
    await dbInsertGenerating();

    const dayCount = input.type === 'monthly' || input.type === 'annual' ? 30 : 7;
    const cLat = input.currentLat || input.lat;
    const cLng = input.currentLng || input.lng;

    const today =
      input.forecastStart && /^\d{4}-\d{2}-\d{2}$/.test(input.forecastStart)
        ? new Date(input.forecastStart + 'T12:00:00')
        : new Date();

    const dateRange: string[] = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      return d.toISOString().split('T')[0];
    });

    // ── STEP 1: Ephemeris ─────────────────────────────────────────────────
    onStep({ type: 'step_started', step: 0, message: 'Reading the stars...', detail: 'Calculating planetary positions' });

    let ephemerisData: NatalChartData;

    try {
      const ephRes = await resilientFetch(`${base}/api/agents/ephemeris`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          type: 'natal-chart',
          birth_date: input.date,
          birth_time: formatEphemerisBirthTime(input.time),
          birth_city: input.city,
          birth_lat: input.lat,
          birth_lng: input.lng,
        }),
      });
      if (!ephRes.ok) {
        const e = await ephRes.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? 'Ephemeris failed');
      }
      const ephResult = await ephRes.json();
      ephemerisData = ephResult.data ?? ephResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[orchestrator][STEP-1] failed:', msg);
      onStep({ type: 'error', message: `Birth chart calculation failed: ${msg}. Please try again.` });
      return;
    }

    onStep({ type: 'step_completed', step: 0 });

    // Save ephemeris data immediately
    const dasha = ephemerisData?.current_dasha ?? {};
    const mahadasha = dasha.mahadasha || 'Unknown';
    const antardasha = dasha.antardasha || 'Unknown';
    void dbSaveEphemeris(ephemerisData.lagna, mahadasha, antardasha);

    // ── STEP 2+3: Nativity + Daily grids (parallel) ──────────────────────
    onStep({ type: 'step_started', step: 1, message: 'Analysing birth chart & calculating hourly scores...', detail: 'Nativity analysis and daily grid calculation in parallel' });

    const natal_lagna_sign_index = Math.max(0, SIGNS_FOR_LAGNA.indexOf(ephemerisData?.lagna ?? ''));

    let nativityProfile: NativityProfile | null = null;
    let dailyGridResults: (DayGridApiResult | null)[] = [];

    await Promise.all([
      // Step 2: Nativity
      (async () => {
        try {
          const natRes = await resilientFetch(`${base}/api/agents/nativity`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({ natalChart: ephemerisData }),
          }, 2, 3000);
          if (natRes.ok) {
            const raw = await natRes.json();
            nativityProfile = raw.data ?? raw;
          }
        } catch (err) {
          console.error('[orchestrator][STEP-2] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),
      // Step 3: Daily grids
      (async () => {
        try {
          onStep({ type: 'step_started', step: 2, message: 'Scoring hourly windows...', detail: `Computing ${dayCount * 18} hourly slots` });
          dailyGridResults = await Promise.all(
            dateRange.map(async (d) => {
              try {
                const res = await resilientFetch(`${base}/api/agents/daily-grid`, {
                  method: 'POST',
                  headers: h,
                  body: JSON.stringify({
                    date: d,
                    currentLat: cLat,
                    currentLng: cLng,
                    timezoneOffset: input.timezoneOffset,
                    natal_lagna_sign_index,
                  }),
                }, 2, 2000);
                if (!res.ok) return null;
                return await res.json();
              } catch {
                return null;
              }
            }),
          );
          onStep({ type: 'step_completed', step: 2 });
        } catch (err) {
          console.error('[orchestrator][STEP-3] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),
    ]);

    onStep({ type: 'step_completed', step: 1 });

    const forecastDays: ForecastDayIntermediate[] = dailyGridResults.map((r, i) => {
      if (!r) {
        return {
          date: dateRange[i],
          panchang: {},
          rahu_kaal: { start: '', end: '' },
          day_score: 50,
          slots: Array.from({ length: 18 }, (_, si) => ({
            slot_index: si,
            display_label: `${String(6 + si).padStart(2, '0')}:00–${String(7 + si).padStart(2, '0')}:00`,
            dominant_hora: 'Moon',
            dominant_choghadiya: 'Chal',
            transit_lagna: '',
            transit_lagna_house: 1,
            is_rahu_kaal: false,
            score: 50,
          })),
        };
      }
      const rahu = r.rahu_kaal ?? {};
      return {
        date: r.date ?? dateRange[i],
        panchang: r.panchang ?? {},
        rahu_kaal: { start: rahu.start ?? '', end: rahu.end ?? '' },
        day_score: r.day_score ?? 50,
        planet_positions: r.planet_positions ?? undefined,
        slots: (r.slots ?? []).map((s, si) => ({
          slot_index: s.slot_index ?? si,
          display_label: s.display_label ?? '06:00–07:00',
          dominant_hora: s.dominant_hora ?? s.hora_ruler ?? '',
          dominant_choghadiya: s.dominant_choghadiya ?? s.choghadiya ?? '',
          transit_lagna: s.transit_lagna ?? '',
          transit_lagna_house: s.transit_lagna_house ?? 1,
          is_rahu_kaal: s.is_rahu_kaal ?? false,
          score: s.score ?? 50,
          start_iso: s.start_iso,
          end_iso: s.end_iso,
          midpoint_iso: s.midpoint_iso,
        })),
      };
    });

    // Save day scores after grids
    void dbSaveDayScores(forecastDays);
    onStep({ type: 'partial_report_updated', field: 'day_scores' });

    const np = nativityProfile as NativityProfile | null;
    const nativityData: NativityData = {
      natal_chart: ephemerisData,
      lagna_analysis: np?.lagna_analysis ?? '',
      current_dasha_interpretation: np?.current_dasha_interpretation ?? '',
      key_yogas: np?.yogas ?? [],
      functional_benefics: np?.functional_benefics ?? [],
      functional_malefics: np?.functional_malefics ?? [],
      profile: np ?? undefined,
    };

    // ── STEP 4+5+6+7: Commentary (parallel) ──────────────────────────────
    onStep({ type: 'step_started', step: 3, message: 'Writing daily commentary...', detail: 'Analyzing each day with your birth chart' });

    let allMonthsData: MonthSummary[] = [];

    await Promise.all([
      // Steps 4+5: Daily overviews + Nativity text
      (async () => {
        try {
          const overviewBody = JSON.stringify({
            lagnaSign: ephemerisData.lagna,
            mahadasha,
            antardasha,
            days: forecastDays.map((d) => ({
              date: d.date,
              panchang: d.panchang,
              planet_positions: d.planet_positions,
              slots: d.slots.map((s) => ({
                display_label: s.display_label,
                score: s.score,
                dominant_choghadiya: s.dominant_choghadiya,
              })),
              day_score: d.day_score,
              rahu_kaal: d.rahu_kaal,
              peak_slots: d.slots.filter((s) => s.score >= 75).slice(0, 3).map((s) => ({
                display_label: s.display_label,
                dominant_hora: s.dominant_hora,
                dominant_choghadiya: s.dominant_choghadiya,
                score: s.score,
              })),
            })),
          });

          const natTextBody = JSON.stringify({
            lagnaSign: ephemerisData.lagna,
            lagnaDegreee: ephemerisData.lagna_degree,
            moonSign: ephemerisData.planets?.Moon?.sign,
            moonNakshatra: ephemerisData.planets?.Moon?.nakshatra ?? ephemerisData.moon_nakshatra,
            mahadasha,
            antardasha,
            md_end: dasha.end_date,
            ad_end: dasha.end_date,
            planets: ephemerisData.planets ?? {},
          });

          const [overviewRes, natTextRes] = await Promise.all([
            fetch(`${base}/api/commentary/daily-overviews`, { method: 'POST', headers: h, body: overviewBody }),
            fetch(`${base}/api/commentary/nativity-text`, { method: 'POST', headers: h, body: natTextBody }),
          ]);

          const fallbackOverview =
            'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';

          if (overviewRes.ok) {
            const overviewData = await overviewRes.json();
            (overviewData.days ?? [] as DayOverviewApiResult[]).forEach((od: DayOverviewApiResult) => {
              const day = forecastDays.find((d) => d.date === od.date);
              if (day) { day.day_theme = od.day_theme ?? ''; day.day_overview = od.day_overview ?? ''; }
            });
          }
          forecastDays.forEach((day) => {
            if (!day.day_overview || day.day_overview.length < 80 || !day.day_overview.includes('STRATEGY')) {
              day.day_overview = fallbackOverview;
              if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
            }
          });

          if (natTextRes.ok) {
            const natTextData = await natTextRes.json();
            if (natTextData.lagna_analysis) nativityData.lagna_analysis = natTextData.lagna_analysis;
            if (natTextData.dasha_interpretation) nativityData.current_dasha_interpretation = natTextData.dasha_interpretation;
          } else {
            // Inject a deterministic fallback so lagna_analysis is never blank
            const lagna = ephemerisData.lagna ?? 'Unknown';
            const md = ephemerisData.current_dasha?.mahadasha ?? 'Unknown';
            const ad = ephemerisData.current_dasha?.antardasha ?? 'Unknown';
            if (!nativityData.lagna_analysis) {
              nativityData.lagna_analysis = `${lagna} lagna shapes the native's fundamental disposition. The ${md}-${ad} period is currently active. Refer to the daily and hourly scores for timing guidance.`;
            }
            if (!nativityData.current_dasha_interpretation) {
              nativityData.current_dasha_interpretation = `${md} Mahadasha with ${ad} Antardasha is active. Use high-score days and benefic horas for important actions.`;
            }
          }
          onStep({ type: 'partial_report_updated', field: 'daily_overviews' });
        } catch (e) {
          console.error('[orchestrator][STEP-4+5] failed:', e instanceof Error ? e.message : String(e));
          const fallback =
            'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
          forecastDays.forEach((day) => {
            day.day_overview = day.day_overview || fallback;
            if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
          });
        }
      })(),

      // Step 6: Hourly commentary (batched, concurrency=7 — all days in one round)
      (async () => {
        onStep({ type: 'step_started', step: 4, message: 'Writing hourly commentary...', detail: 'Analysing 18 slots per day in parallel' });
        try {
          const hourlyResults = await batchedPromiseAll(
            forecastDays.map((day, i) => async () => {
              try {
                const res = await fetch(`${base}/api/commentary/hourly-day`, {
                  method: 'POST',
                  headers: h,
                  body: JSON.stringify({
                    lagnaSign: ephemerisData.lagna,
                    mahadasha,
                    antardasha,
                    dayIndex: i,
                    date: day.date,
                    planet_positions: day.planet_positions,
                    panchang: day.panchang,
                    rahu_kaal: day.rahu_kaal,
                    slots: day.slots.map((s) => ({
                      slot_index: s.slot_index,
                      display_label: s.display_label,
                      dominant_hora: s.dominant_hora,
                      dominant_choghadiya: s.dominant_choghadiya,
                      transit_lagna: s.transit_lagna,
                      transit_lagna_house: s.transit_lagna_house,
                      is_rahu_kaal: s.is_rahu_kaal,
                      score: s.score,
                    })),
                  }),
                });
                if (!res.ok) return { dayIndex: i, slots: [] };
                return { dayIndex: i, ...(await res.json()) };
              } catch (err) {
                console.error(`[orchestrator][HOURLY] day ${i + 1} failed:`, err);
                return { dayIndex: i, slots: [] };
              }
            }),
            7,
          );

          hourlyResults.forEach(({ dayIndex, slots }: { dayIndex: number; slots?: Array<{ slot_index: number; commentary?: string; commentary_short?: string }> }) => {
            const day = forecastDays[dayIndex];
            if (!day) return;
            (slots ?? []).forEach((hs) => {
              const slot = day.slots.find((s) => s.slot_index === hs.slot_index);
              if (slot) {
                slot.commentary = hs.commentary ?? '';
                const firstSent = hs.commentary?.split('.')[0]?.trim();
                slot.commentary_short = hs.commentary_short?.trim()
                  ? hs.commentary_short
                  : firstSent
                  ? firstSent + '.'
                  : '';
              }
            });
            day.slots.forEach((slot) => {
              if (!slot.commentary) {
                slot.commentary =
                  `${slot.dominant_hora} hora, ${slot.dominant_choghadiya} choghadiya. Score: ${slot.score}/100.` +
                  (slot.is_rahu_kaal ? ' Rahu Kaal — avoid new initiations.' : '');
                slot.commentary_short = slot.commentary.split('.')[0] + '.';
              }
            });
          });
          onStep({ type: 'partial_report_updated', field: 'hourly_commentary' });
        } catch (err) {
          console.error('[orchestrator][STEP-6] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),

      // Step 7: Monthly
      (async () => {
        onStep({ type: 'step_started', step: 5, message: 'Building monthly forecast...', detail: 'Generating 12-month oracle' });
        try {
          const startDate = new Date(forecastDays[0].date);
          const allMonths = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(startDate);
            d.setMonth(d.getMonth() + i);
            return {
              month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
              month_index: i,
              key_transits_hint: '',
            };
          });

          const refPayload = {
            lagnaSign: ephemerisData.lagna,
            mahadasha,
            antardasha,
            startMonth: forecastDays[0].date.substring(0, 7),
            reference_planet_positions: forecastDays[0]?.planet_positions,
            reference_planet_positions_date: forecastDays[0]?.date,
            reference_panchang: forecastDays[0]?.panchang,
            reference_rahu_kaal: forecastDays[0]?.rahu_kaal,
            reference_slots: forecastDays[0]?.slots?.map((s) => ({
              display_label: s.display_label,
              score: s.score,
              dominant_choghadiya: s.dominant_choghadiya,
            })),
          };

          const [m1Res, m2Res] = await Promise.all([
            fetch(`${base}/api/commentary/months-first`, {
              method: 'POST', headers: h,
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(0, 6) }),
            }),
            fetch(`${base}/api/commentary/months-second`, {
              method: 'POST', headers: h,
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(6, 12) }),
            }),
          ]);

          const months1: MonthApiResult[] = m1Res.ok ? ((await m1Res.json()).months ?? []) : [];
          const months2: MonthApiResult[] = m2Res.ok ? ((await m2Res.json()).months ?? []) : [];

          allMonthsData = [...months1, ...months2].map((m) => {
            const label = m.month_label ?? m.month ?? '';
            const overall = m.overall_score ?? m.score ?? 65;
            const rawComment = (m.analysis ?? m.commentary ?? '').trim();
            return {
              month: label,
              score: overall,
              overall_score: overall,
              theme: (m.theme ?? '').trim() || '',
              key_transits: m.key_transits ?? [],
              commentary: rawComment || monthlyFallback(label || 'This month', overall),
              weekly_scores: m.weekly_scores ?? [65, 65, 65, 65],
              domain_scores: {
                career: m.career_score ?? 65,
                money: m.money_score ?? 65,
                health: m.health_score ?? 65,
                relationships: m.love_score ?? 65,
              },
            } satisfies MonthSummary;
          });

          // Pad to 12 months
          while (allMonthsData.length < 12) {
            const m = new Date(startDate.getFullYear(), startDate.getMonth() + allMonthsData.length, 1);
            const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
            allMonthsData.push({
              month: ml, score: 65, overall_score: 65, theme: '',
              key_transits: [], commentary: monthlyFallback(ml, 65),
              weekly_scores: [65, 65, 65, 65],
              domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
            });
          }
          onStep({ type: 'partial_report_updated', field: 'months' });
        } catch (e) {
          console.error('[orchestrator][STEP-7] failed:', e instanceof Error ? e.message : String(e));
          const startDate = new Date(forecastDays?.[0]?.date ?? Date.now());
          allMonthsData = Array.from({ length: 12 }, (_, i) => {
            const m = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
            return {
              month: ml, score: 65, overall_score: 65, theme: '',
              key_transits: [], commentary: monthlyFallback(ml, 65),
              weekly_scores: [65, 65, 65, 65],
              domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
            };
          });
        }
      })(),
    ]);

    onStep({ type: 'step_completed', step: 3 });

    // ── STEP 8: Weeks + Synthesis ─────────────────────────────────────────
    onStep({ type: 'step_started', step: 6, message: 'Writing period synthesis...', detail: '6 weekly summaries + strategic windows' });

    const reportStart = new Date(forecastDays[0].date);
    const weeksPayload = Array.from({ length: 6 }, (_, i) => {
      const wStart = new Date(reportStart);
      wStart.setDate(wStart.getDate() + i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const weekDays = forecastDays.slice(i * 7, (i + 1) * 7);
      return {
        week_index: i,
        week_label: `${fmt(wStart)} – ${fmt(wEnd)}`,
        start_date: wStart.toISOString().split('T')[0],
        end_date: wEnd.toISOString().split('T')[0],
        daily_scores: weekDays.map((d) => d.day_score ?? 55),
      };
    });

    const allScores = forecastDays.map((d) => d.day_score ?? 55);
    const bestDay = forecastDays.reduce((a, b) => ((a.day_score ?? 0) > (b.day_score ?? 0) ? a : b));
    const worstDay = forecastDays.reduce((a, b) => ((a.day_score ?? 100) < (b.day_score ?? 100) ? a : b));

    let weeksSynthData: WeeksSynthApiResult = { weeks: [], period_synthesis: null };
    try {
      const synthRes = await fetch(`${base}/api/commentary/weeks-synthesis`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          lagnaSign: ephemerisData.lagna ?? 'Cancer',
          mahadasha: mahadasha ?? 'Rahu',
          antardasha: antardasha ?? 'Mercury',
          reportStartDate: forecastDays[0].date,
          weeks: weeksPayload,
          planet_positions_by_date: forecastDays.map((d) => ({
            date: d.date,
            planet_positions: d.planet_positions,
            panchang: d.panchang,
            rahu_kaal: d.rahu_kaal,
            slots: d.slots?.map((s) => ({
              display_label: s.display_label,
              score: s.score,
              dominant_choghadiya: s.dominant_choghadiya,
            })),
          })),
          synthesis_context: {
            total_days: forecastDays.length,
            best_date: bestDay.date,
            best_score: bestDay.day_score ?? 0,
            worst_date: worstDay.date,
            worst_score: worstDay.day_score ?? 0,
            avg_score: Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / (allScores.length || 1)),
          },
        }),
      });
      if (synthRes.ok) {
        weeksSynthData = await synthRes.json();
      } else {
        console.error('[orchestrator][STEP-8] weeks-synthesis failed:', synthRes.status);
      }
    } catch (err) {
      console.error('[orchestrator][STEP-8] failed:', err instanceof Error ? err.message : String(err));
    }

    const weekList = (weeksSynthData.weeks ?? []).map((w, i: number) => {
      const wl = w.week_label ?? `Week ${i + 1}`;
      const sc = w.overall_score ?? w.score ?? 65;
      const wc = (w.analysis ?? w.commentary ?? '').trim();
      return {
        week_label: wl,
        week_start: weeksPayload[i]?.start_date ?? '',
        score: sc,
        theme: (w.theme ?? '').trim() || '',
        commentary: wc || weeklyFallback(wl, sc),
        daily_scores: weeksPayload[i]?.daily_scores ?? [65, 65, 65, 65, 65, 65, 65],
        moon_journey: w.moon_signs ?? [],
        peak_days_count: 2,
        caution_days_count: 1,
      };
    });
    while (weekList.length < 6) {
      const wk = `Week ${weekList.length + 1}`;
      weekList.push({
        week_label: wk, week_start: '', score: 65, theme: '',
        commentary: weeklyFallback(wk, 65),
        daily_scores: [65, 65, 65, 65, 65, 65, 65],
        moon_journey: [], peak_days_count: 2, caution_days_count: 1,
      });
    }

    onStep({ type: 'step_completed', step: 6 });

    // ── STEP 9: Validation ────────────────────────────────────────────────
    if (!skipValidation) {
      onStep({ type: 'step_started', step: 7, message: 'Validating commentary quality...', detail: 'Pass 1: checking word counts, STRATEGY sections, headlines' });

      try {
        onStep({ type: 'step_started', step: 8, message: 'Validating commentary quality...', detail: 'Pass 2: checking score ranges and slot spreads' });
        onStep({ type: 'step_started', step: 9, message: 'Validating commentary quality...', detail: 'Pass 3: checking tone consistency' });

        const validationBody = {
          lagnaSign: ephemerisData.lagna ?? 'Cancer',
          mahadasha,
          antardasha,
          days: forecastDays.map((d) => ({
            date: d.date,
            day_score: d.day_score,
            day_overview: d.day_overview ?? '',
            slots: (d.slots ?? []).map((s) => ({
              slot_index: s.slot_index,
              display_label: s.display_label,
              score: s.score,
              is_rahu_kaal: s.is_rahu_kaal,
              dominant_hora: s.dominant_hora,
              dominant_choghadiya: s.dominant_choghadiya,
              commentary: s.commentary ?? '',
            })),
          })),
          synthesis_opening: weeksSynthData?.period_synthesis?.opening_paragraph ?? '',
        };

        const valRes = await fetch(`${base}/api/validation/report`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify(validationBody),
        });

        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.corrections?.length > 0) {
            (valData.corrections as ValidationCorrection[]).forEach((correction) => {
              if (correction.type === 'day_overview' && correction.date) {
                const day = forecastDays.find((d) => d.date === correction.date);
                if (day && correction.fixed_text) day.day_overview = correction.fixed_text;
              } else if (
                correction.type === 'slot_commentary' &&
                correction.date !== undefined &&
                correction.slot_index !== undefined
              ) {
                const day = forecastDays.find((d) => d.date === correction.date);
                if (day) {
                  const slot = day.slots.find((s) => s.slot_index === correction.slot_index);
                  if (slot && correction.fixed_text) slot.commentary = correction.fixed_text;
                }
              }
            });
          }
        }
        onStep({ type: 'step_completed', step: 9 });
      } catch (err) {
        console.error('[orchestrator][STEP-9] validation error:', err);
      }
    }

    // ── STEP 10: Assemble final report ────────────────────────────────────
    onStep({ type: 'step_started', step: 10, message: 'Finalising your report...', detail: 'Assembling all sections' });

    const v2Enabled = isV2GuidanceEnabled();

    const daysForReport = forecastDays.map((d) => {
      const mappedSlots = (d.slots ?? []).map((s) => {
        const slotScore = s.score ?? 50;
        const isRk = s.is_rahu_kaal ?? false;
        const horaPlanet = s.dominant_hora ?? 'Moon';
        const chog = s.dominant_choghadiya ?? 'Chal';

        const guidanceV2 = v2Enabled
          ? buildSlotGuidance({
              score: slotScore,
              hora_planet: horaPlanet,
              choghadiya: chog,
              transit_lagna_house: s.transit_lagna_house ?? 1,
              is_rahu_kaal: isRk,
              display_label: s.display_label,
            })
          : undefined;

        const fallbackCommentary = guidanceV2?.summary_plain ?? `${horaPlanet} hora. Score ${slotScore}.`;

        return {
          ...s,
          hora_planet: horaPlanet,
          hora_planet_symbol: PLANET_SYMBOLS[horaPlanet] ?? '☽',
          choghadiya: chog,
          choghadiya_quality: 'Neutral',
          commentary: (s.commentary ?? '').trim() || fallbackCommentary,
          commentary_short:
            (s.commentary_short ?? '').trim() ||
            ((s.commentary ?? '').split('.')[0] + '.') ||
            '—',
          score: slotScore,
          label: toLabel(slotScore, isRk),
          ...(guidanceV2 ? { guidance_v2: guidanceV2 } : {}),
        };
      });

      const briefingV2 = v2Enabled
        ? buildDayBriefing({
            date: d.date,
            day_score: d.day_score,
            panchang: d.panchang ?? {},
            slots: mappedSlots.map((s) => ({
              slot_index: s.slot_index,
              score: s.score,
              is_rahu_kaal: s.is_rahu_kaal,
              hora_planet: s.hora_planet ?? s.dominant_hora,
              choghadiya: s.choghadiya ?? s.dominant_choghadiya,
              display_label: s.display_label,
              guidance: s.guidance_v2,
            })),
          })
        : undefined;

      return {
        date: d.date,
        day_label: formatDayLabel(d.date),
        day_score: d.day_score,
        day_label_tier: toLabel(d.day_score, false),
        day_theme: (d.day_theme ?? '').trim() || `Day score ${d.day_score}.`,
        overview:
          (d.day_overview ?? '').trim() ||
          `Day score ${d.day_score}. Use hora and choghadiya to time activities.`,
        panchang: d.panchang ?? {},
        rahu_kaal: d.rahu_kaal?.start
          ? { start: d.rahu_kaal.start.slice(0, 5), end: d.rahu_kaal.end.slice(0, 5) }
          : null,
        slots: mappedSlots,
        peak_count: mappedSlots.filter((s) => s.score >= 75 && !s.is_rahu_kaal).length,
        caution_count: mappedSlots.filter((s) => s.score < 45 || s.is_rahu_kaal).length,
        ...(briefingV2 ? { briefing_v2: briefingV2 } : {}),
      };
    });

    const finalReport = {
      report_id: `gen-${Date.now()}`,
      report_type: input.type || '7day',
      generated_at: new Date().toISOString().slice(0, 10),
      nativity: nativityData,
      months: allMonthsData,
      weeks: weekList,
      days: daysForReport,
      synthesis: weeksSynthData.period_synthesis ?? {
        opening_paragraph:
          'This forecast period combines transits, dasha activations, and hora patterns. Use high-score windows for important work and avoid Rahu Kaal for new beginnings.',
        strategic_windows: [],
        caution_dates: [],
        domain_priorities: {
          career: 'Focus on career themes.',
          money: 'Money themes.',
          health: 'Health.',
          relationships: 'Relationships.',
        },
        closing_paragraph: 'Use hora and choghadiya to align actions with cosmic rhythms.',
      },
    };

    const finalReportTyped = finalReport as unknown as ReportData;
    const errors = validateReportData(finalReportTyped);
    if (errors.length > 0) console.warn('[orchestrator] validation issues:', errors);

    // Save to DB
    await dbSaveFinal(finalReport as unknown as Record<string, unknown>);
    onStep({ type: 'step_completed', step: 10 });

    // Emit completion
    onStep({ type: 'report_completed', reportData: finalReportTyped });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate report';
    console.error('[orchestrator] fatal error:', message);
    onStep({ type: 'error', message });
    try {
      await db
        .from('reports')
        .update({ status: 'error' })
        .eq('id', reportId)
        .eq('user_id', userId);
    } catch (markErr) {
      console.error('[orchestrator] failed to mark report as error:', markErr);
    }
  }
}
