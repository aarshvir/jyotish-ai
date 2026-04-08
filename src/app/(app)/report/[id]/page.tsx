'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import './print.css';
import { MandalaRing } from '@/components/ui/MandalaRing';
import { StarField } from '@/components/ui/StarField';
import { ReportSidebar } from '@/components/report/ReportSidebar';
import { NativityCard } from '@/components/report/NativityCard';
import { MonthlyAnalysis } from '@/components/report/MonthlyAnalysis';
import { WeeklyAnalysis } from '@/components/report/WeeklyAnalysis';
import { DailyAnalysis } from '@/components/report/DailyAnalysis';
import { PeriodSynthesis } from '@/components/report/PeriodSynthesis';
import { ReportErrorBoundary } from '@/components/ErrorBoundary';
import { validateReportData } from '@/lib/validation/reportValidation';
import { generateReportPDF } from '@/lib/pdf/generateReportPDF';
import { PrintAllDays } from '@/components/report/PrintAllDays';
import { batchedPromiseAll } from '@/lib/async/batchedPromiseAll';
import type {
  NatalChartData,
  NativityProfile,
  NativityData,
  MonthSummary,
  ReportData,
  PanchangData,
} from '@/lib/agents/types';

// ── Pipeline-internal types (not exported — used only in generateReport) ──

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

/** When true, skips the 3-pass Sonnet validation to shorten generation time (set on Vercel). */
const SKIP_VALIDATION = process.env.NEXT_PUBLIC_SKIP_VALIDATION === 'true';

const STEPS = [
  'Calculating planetary positions',
  'Analysing birth chart',
  'Scoring 126 hourly windows',
  'Writing daily forecasts & natal analysis',
  'Writing all hourly commentary (7 days in parallel)',
  'Generating full monthly forecast',
  'Writing period synthesis',
  'Validating commentary quality',
  'Validating score accuracy',
  'Validating consistency',
  'Finalising report',
];

/** Clamp a step index to the valid STEPS range so UI never shows undefined. */
const clampStep = (n: number) => Math.max(0, Math.min(n, STEPS.length - 1));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRouteUuid(id: string) {
  return UUID_RE.test(id);
}

function monthlyFallbackCommentary(monthLabel: string, overallScore: number) {
  return `${monthLabel} — Overall score: ${overallScore}/100. Commentary is generating — refresh in 30 seconds.`;
}

function weeklyFallbackCommentary(weekLabel: string, score: number) {
  return `${weekLabel || 'This week'} — Week score: ${score}/100. Weekly narrative is generating — refresh in 30 seconds.`;
}

/** True when stored report looks like an all-default / failed generation (stale 50s). */
function isPlaceholderReportData(rd: Record<string, unknown> | null | undefined): boolean {
  const days = rd?.days as Array<{ day_score?: number }> | undefined;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.every((d) => (d.day_score ?? 50) === 50);
}

function ReportContent() {
  const routeParams = useParams();
  const reportIdFromRoute = typeof routeParams?.id === 'string' ? routeParams.id : '';
  const params = useSearchParams();
  const router = useRouter();
  const queryKey = params.toString();
  const name = params.get('name') ?? 'Seeker';
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const city = params.get('city') ?? '';
  const lat = params.get('lat') ?? '';
  const lng = params.get('lng') ?? '';
  const type = params.get('type') ?? 'free';
  // Current location params (may differ from birth city)
  const currentLat = params.get('currentLat') ?? lat;
  const currentLng = params.get('currentLng') ?? lng;
  const currentCity = params.get('currentCity') ?? city;
  const currentTzOffset = params.get('currentTz') ? parseInt(params.get('currentTz')!) : null;
  // Optional: custom forecast start date (YYYY-MM-DD). Defaults to today.
  const forecastStartParam = params.get('forecastStart') ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [commentaryPartial, setCommentaryPartial] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState('Download PDF');
  const [stepMessage, setStepMessage] = useState('');
  const [stepDetail, setStepDetail] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const hasFetched = useRef(false);
  /** Cached Supabase user — set once in init(), reused to avoid repeated getUser() roundtrips. */
  const userRef = useRef<{ id: string; email?: string } | null>(null);
  /** Active EventSource for server-side pipeline streaming. */
  const esRef = useRef<EventSource | null>(null);
  const [birthDisplay, setBirthDisplay] = useState<{
    name: string;
    date: string;
    time: string;
    city: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const genStartRef = useRef(0);

  const authJsonHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const b = params.get('bypass');
    if (b) h['x-bypass-token'] = b;
    return h;
  }, [params]);

  /** Polls the server to check if report is complete (no need to keep browser open). */
  function startPollingForReport() {
    if (typeof window === 'undefined') return;
    esRef.current?.close();

    setIsLoading(true);
    setError(null);
    setStepMessage('Report generating in background...');
    setStepDetail('You can close this tab and check back later');
    setCurrentStepIndex(1);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/reports/${reportIdFromRoute}/status`, {
          method: 'GET',
          headers: authJsonHeaders(),
        });

        if (!response.ok) {
          clearInterval(pollInterval);
          setError('Report not found');
          setIsLoading(false);
          return;
        }

        const data = await response.json() as {
          status: string;
          isComplete: boolean;
          report: any;
          lagna_sign: string;
          dasha_mahadasha: string;
          dasha_antardasha: string;
        };

        if (data.isComplete && data.report) {
          clearInterval(pollInterval);
          setReportData(data.report);
          setIsLoading(false);
          setStepMessage('Report complete!');
          setStepDetail('');
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setError('Generation failed');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Polling] error:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }

  const displayName = birthDisplay?.name ?? name;
  const displayDate = birthDisplay?.date ?? date;
  const displayTime = birthDisplay?.time ?? time;
  const displayCity = birthDisplay?.city ?? city;

  useEffect(() => {
    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  const copyShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    setCopyLinkError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyLinkFeedback(true);
        setTimeout(() => setCopyLinkFeedback(false), 2500);
      } else {
        // Fallback: execCommand for older browsers or insecure contexts
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
          setCopyLinkFeedback(true);
          setTimeout(() => setCopyLinkFeedback(false), 2500);
        } else {
          setCopyLinkError('Clipboard unavailable. Please copy the URL from the address bar.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Copy failed';
      setCopyLinkError(msg);
    }
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    setPdfError(null);
    setPdfLoading(true);
    try {
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await generateReportPDF(
        displayName,
        reportData?.generated_at ?? new Date().toISOString().slice(0, 10),
        (msg) => {
          setPdfStatus(msg);
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Print failed';
      console.error('Print/PDF flow failed:', err);
      setPdfError(msg);
    } finally {
      setPdfStatus('Download PDF');
      setPdfLoading(false);
    }
  }, [displayName, reportData]);

  const handleDaySelectFromCalendar = useCallback((index: number) => {
    setActiveDayIndex(index);
    document.getElementById('daily')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    hasFetched.current = false;
  }, [reportIdFromRoute, queryKey]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (hasFetched.current) return;

      // Always require authentication — API routes all enforce requireAuth
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          const returnTo = window.location.pathname + window.location.search;
          router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
        }
        return;
      }
      userRef.current = { id: user.id, email: user.email ?? undefined };

      if (isRouteUuid(reportIdFromRoute)) {
        const { data: row } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportIdFromRoute)
          .eq('user_id', user.id)
          .maybeSingle();

        const rd = row?.report_data as Record<string, unknown> | null | undefined;
        const days = rd?.days;
        if (
          !cancelled &&
          row &&
          row.status === 'complete' &&
          Array.isArray(days) &&
          days.length > 0 &&
          !isPlaceholderReportData(rd)
        ) {
          hasFetched.current = true;
          setBirthDisplay({
            name: String(row.native_name ?? 'Seeker'),
            date: String(row.birth_date ?? '').slice(0, 10),
            time: String(row.birth_time ?? '').slice(0, 5),
            city: String(row.birth_city ?? ''),
          });
          setReportData(rd as unknown as ReportData);
          setIsLoading(false);
          return;
        }

        if (!params.get('date')) {
          if (!cancelled) {
            setError('Report not found, still generating, or incomplete. Open a new report from the dashboard.');
            setIsLoading(false);
          }
          hasFetched.current = true;
          return;
        }
      }

      hasFetched.current = true;
      console.log('Report page params:', { name, date, time, city, lat, lng, type });
      void generateReport();
    }

    void init();
    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per route/query; startStreamedPipeline is stable enough for this flow
  }, [reportIdFromRoute, queryKey]);

  async function createReportRecord() {
    if (!isRouteUuid(reportIdFromRoute)) return;
    const user = userRef.current;
    if (!user) return;
    const supabase = createClient();

    const planRaw = params.get('plan_type') || type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const birthTimeNorm =
      time && time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time || '12:00:00';

    const { error } = await supabase.from('reports').insert({
      id: reportIdFromRoute,
      user_id: user.id,
      user_email: user.email ?? '',
      native_name: params.get('name') || name || 'Unknown',
      birth_date: params.get('date') || date || '2000-01-01',
      birth_time: birthTimeNorm,
      birth_city: params.get('city') || city || 'Unknown',
      birth_lat: parseFloat(params.get('lat') || lat || '0') || null,
      birth_lng: parseFloat(params.get('lng') || lng || '0') || null,
      current_city: params.get('currentCity') || currentCity || null,
      current_lat: parseFloat(params.get('currentLat') || currentLat || '0') || null,
      current_lng: parseFloat(params.get('currentLng') || currentLng || '0') || null,
      timezone_offset: currentTzOffset,
      plan_type: planType,
      status: 'generating',
      payment_status: 'bypass',
    });

    if (error && error.code !== '23505') {
      console.error('createReportRecord:', error.message);
    }
  }

  async function saveReportToDatabase(reportPayload: Record<string, unknown>) {
    try {
      if (isPlaceholderReportData(reportPayload)) {
        console.warn('[saveReport] Skipping DB save: placeholder report (all day_score 50)');
        return;
      }
      if (!isRouteUuid(reportIdFromRoute)) return;
      const user = userRef.current;
      if (!user) return;
      const supabase = createClient();

      const dayScores: Record<string, number> = {};
      const days = reportPayload.days as Array<{ date?: string; day_score?: number }> | undefined;
      days?.forEach((d) => {
        if (d.date && typeof d.day_score === 'number') dayScores[d.date] = d.day_score;
      });

      const natal = (reportPayload.nativity as { natal_chart?: Record<string, unknown> })?.natal_chart;
      const nc = natal as Record<string, unknown> | undefined;
      const cd = nc?.current_dasha as Record<string, string> | undefined;

      const startD = days?.[0]?.date;
      const endD = days?.length ? days[days.length - 1]?.date : undefined;

      const { error } = await supabase
        .from('reports')
        .update({
          native_name: params.get('name') || name,
          user_id: user.id,
          user_email: user.email ?? '',
          birth_date: params.get('date') || date,
          birth_time:
            time && time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time || '12:00:00',
          birth_city: params.get('city') || city,
          birth_lat: parseFloat(params.get('lat') || lat || '0') || null,
          birth_lng: parseFloat(params.get('lng') || lng || '0') || null,
          current_city: params.get('currentCity') || currentCity || null,
          current_lat: parseFloat(params.get('currentLat') || currentLat || '0') || null,
          current_lng: parseFloat(params.get('currentLng') || currentLng || '0') || null,
          timezone_offset: currentTzOffset,
          plan_type: params.get('plan_type') || (type === 'free' ? 'preview' : type),
          report_start_date: startD ?? null,
          report_end_date: endD ?? null,
          lagna_sign: (nc?.lagna as string) ?? null,
          moon_sign: ((nc?.planets as Record<string, { sign?: string }> | undefined)?.Moon?.sign as string) ?? null,
          moon_nakshatra: (nc?.moon_nakshatra as string) ?? null,
          dasha_mahadasha: cd?.mahadasha ?? null,
          dasha_antardasha: cd?.antardasha ?? null,
          day_scores: dayScores,
          report_data: reportPayload,
          status: 'complete',
          generation_completed_at: new Date().toISOString(),
          generation_time_seconds: Math.round((Date.now() - genStartRef.current) / 1000),
        })
        .eq('id', reportIdFromRoute)
        .eq('user_id', user.id);

      if (error) console.error('saveReportToDatabase:', error.message);
    } catch (e) {
      console.error('saveReportToDatabase', e);
    }
  }

  async function resilientFetch(url: string, options: RequestInit, retries = 3, delayMs = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err: unknown) {
        const isNetworkError = err instanceof Error && (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('SUSPENDED') || err.message?.includes('aborted'));
        if (isNetworkError && i < retries - 1) {
          console.warn(`Network error on ${url}, retry ${i + 1}/${retries} in ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  }

  function formatDayLabel(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T12:00:00Z');
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[d.getUTCDay()]} · ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
    } catch {
      return dateStr;
    }
  }

  async function generateReport() {
    try {
      setIsLoading(true);
      setError(null);
      genStartRef.current = Date.now();
      await createReportRecord();
      const birthLat = parseFloat(lat) || 0;
      const birthLng = parseFloat(lng) || 0;
      const dayCount = type === 'monthly' || type === 'annual' ? 30 : 7;
      const timezoneOffset = currentTzOffset ?? -new Date().getTimezoneOffset();
      const cLat = parseFloat(currentLat) || birthLat;
      const cLng = parseFloat(currentLng) || birthLng;
      const SIGNS_FOR_LAGNA = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      // Use custom forecast start if provided, else today
      const today = forecastStartParam && /^\d{4}-\d{2}-\d{2}$/.test(forecastStartParam)
        ? new Date(forecastStartParam + 'T12:00:00')
        : new Date();
      const dateRange: string[] = Array.from({ length: dayCount }, (_, i) => {
        const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      });

      // ── STEP 1: Ephemeris ──
      let ephemerisData: NatalChartData = {
        lagna: 'Cancer',
        lagna_degree: 0,
        planets: {},
        moon_nakshatra: '',
        dasha_sequence: [],
        current_dasha: { mahadasha: '', antardasha: '', start_date: '', end_date: '' },
      };
      try {
        console.log('[STEP-1] Starting...');
        setStepMessage('Reading the stars...');
        setStepDetail('Calculating planetary positions');
        setCurrentStepIndex(0);
        const ephemerisRes = await resilientFetch('/api/agents/ephemeris', {
          method: 'POST',
          headers: authJsonHeaders(),
          body: JSON.stringify({
            type: 'natal-chart',
            birth_date: date,
            birth_time: `${time}:00`,
            birth_city: city,
            birth_lat: birthLat,
            birth_lng: birthLng,
          }),
        });
        if (!ephemerisRes.ok) {
          const ephErr = await ephemerisRes.json().catch(() => ({}));
          throw new Error(ephErr.error || 'Ephemeris calculation failed');
        }
        const ephemerisResult = await ephemerisRes.json();
        ephemerisData = ephemerisResult.data || ephemerisResult;
        console.log('[STEP-1] Complete');
      } catch (err) {
        console.error('[STEP-1] Failed:', err instanceof Error ? err.message : String(err));
      }

      // ── STEP 2+3: Nativity + Daily grids (parallel) ──
      setStepMessage('Analysing birth chart & calculating hourly scores...');
      setStepDetail('Nativity analysis and daily grid calculation in parallel');
      setCurrentStepIndex(1);
      console.log('[STEP-2+3] Starting parallel nativity + daily grids...');

      const natal_lagna_sign_index = Math.max(0, SIGNS_FOR_LAGNA.indexOf(ephemerisData?.lagna ?? ''));

      let nativityProfile: NativityProfile | null = null;
      let dailyGridResults: (DayGridApiResult | null)[] = [];

      await Promise.all([
        // Step 2: Nativity
        (async () => {
          try {
            const nativityRes = await resilientFetch('/api/agents/nativity', {
              method: 'POST',
              headers: authJsonHeaders(),
              body: JSON.stringify({ natalChart: ephemerisData }),
            }, 2, 3000);
            if (nativityRes.ok) {
              const nativityRaw = await nativityRes.json();
              nativityProfile = nativityRaw.data || nativityRaw;
            }
            console.log('[STEP-2] Nativity complete');
          } catch (natErr: unknown) {
            console.error('[STEP-2] Failed:', natErr instanceof Error ? natErr.message : String(natErr));
          }
        })(),
        // Step 3: Daily grids
        (async () => {
          try {
            setCurrentStepIndex(2);
            dailyGridResults = await Promise.all(
              dateRange.map(async (d) => {
                try {
                  const res = await resilientFetch('/api/agents/daily-grid', {
                    method: 'POST',
                    headers: authJsonHeaders(),
                    body: JSON.stringify({ date: d, currentLat: cLat, currentLng: cLng, timezoneOffset, natal_lagna_sign_index }),
                  }, 2, 2000);
                  if (!res.ok) return null;
                  return await res.json();
                } catch {
                  return null;
                }
              })
            );
            console.log('[STEP-3] Daily grids complete');
          } catch (err: unknown) {
            console.error('[STEP-3] Failed:', err instanceof Error ? err.message : String(err));
          }
        })(),
      ]);
      console.log('[STEP-2+3] Complete');

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

      const np = nativityProfile as NativityProfile | null;
      const nativityData: NativityData = {
        natal_chart: ephemerisData,
        lagna_analysis: np !== null ? np.lagna_analysis : '',
        current_dasha_interpretation: np !== null ? np.current_dasha_interpretation : '',
        key_yogas: np !== null ? np.yogas : [],
        functional_benefics: np !== null ? np.functional_benefics : [],
        functional_malefics: np !== null ? np.functional_malefics : [],
        profile: np !== null ? np : undefined,
      };
      try {
        // eslint-disable-next-line no-console
        console.log(
          '[STEP-2] nativity result:',
          JSON.stringify(nativityData)?.slice(0, 300)
        );
      } catch {
        // ignore logging failures
      }
      const dasha = ephemerisData?.current_dasha ?? {};
      const mahadasha = dasha.mahadasha ?? 'Unknown';
      const antardasha = dasha.antardasha ?? 'Unknown';

      // ── STEP 4+5+6+7: Daily overviews, Nativity text, Hourly commentary, Monthly — all parallel ──
      setStepMessage('Writing commentary, hourly analysis & monthly forecast...');
      setStepDetail('4 tasks running in parallel');
      setCurrentStepIndex(3);
      let allMonthsData: MonthSummary[] = [];
      console.log('[STEP-4+5+6+7] Starting all commentary in parallel...');
      await Promise.all([
      // ── 4+5: Daily overviews + Nativity text ──
      (async () => {
      try {
        console.log('[STEP-4+5] Starting parallel...');
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
          fetch('/api/commentary/daily-overviews', { method: 'POST', headers: authJsonHeaders(), body: overviewBody }),
          fetch('/api/commentary/nativity-text', { method: 'POST', headers: authJsonHeaders(), body: natTextBody }),
        ]);

        const fallbackOverview = 'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
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
        }
        console.log('[STEP-4+5] Complete');
      } catch (e) {
        console.error('[STEP-4+5] Failed:', e instanceof Error ? e.message : String(e));
        setCommentaryPartial(true);
        const fallbackOverview = 'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
        forecastDays.forEach((day) => {
          day.day_overview = day.day_overview || fallbackOverview;
          if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
        });
      }
      })(), // end Step 4+5 async IIFE
      // ── 6: Hourly commentary — all days (batched, concurrency=2) ──
      (async () => {
      try {
        console.log('[STEP-6] Starting batched hourly (2 concurrent)...');
        const hourlyResults = await batchedPromiseAll(
          forecastDays.map((day, i: number) => async () => {
            try {
              const res = await fetch('/api/commentary/hourly-day', {
                method: 'POST',
                headers: authJsonHeaders(),
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
              console.error(`[HOURLY] Day ${i + 1} failed:`, err);
              return { dayIndex: i, slots: [] };
            }
          }),
          2
        );

        hourlyResults.forEach(({ dayIndex, slots }: { dayIndex: number; slots?: Array<{ slot_index: number; commentary?: string; commentary_short?: string }> }) => {
          const day = forecastDays[dayIndex];
          if (!day) return;
          (slots ?? []).forEach((hs) => {
            const slot = day.slots.find((s) => s.slot_index === hs.slot_index);
            if (slot) {
              slot.commentary = hs.commentary ?? '';
              const firstSent = hs.commentary?.split('.')[0]?.trim();
              slot.commentary_short = (hs.commentary_short?.trim()) ? hs.commentary_short : (firstSent ? firstSent + '.' : '');
            }
          });
          // Fallback for any slots without commentary
          day.slots.forEach((slot) => {
            if (!slot.commentary) {
              slot.commentary = `${slot.dominant_hora} hora, ${slot.dominant_choghadiya} choghadiya. Score: ${slot.score}/100.` + (slot.is_rahu_kaal ? ' Rahu Kaal — avoid new initiations.' : '');
              slot.commentary_short = slot.commentary.split('.')[0] + '.';
            }
          });
        });
        console.log('[STEP-6] Complete');
      } catch (err) {
        console.error('[STEP-6] Failed, continuing:', err instanceof Error ? err.message : String(err));
      }
      })(), // end Step 6 async IIFE
      // ── 7: Monthly — both batches in parallel ──
      (async () => {
      try {
        console.log('[STEP-7] Starting parallel monthly...');
        const startDate = new Date(forecastDays[0].date);
        const allMonths = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + i);
          return { month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }), month_index: i, key_transits_hint: '' };
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

        const [months1Res, months2Res] = await Promise.all([
          fetch('/api/commentary/months-first', {
            method: 'POST',
            headers: authJsonHeaders(),
            body: JSON.stringify({ ...refPayload, months: allMonths.slice(0, 6) }),
          }),
          fetch('/api/commentary/months-second', {
            method: 'POST',
            headers: authJsonHeaders(),
            body: JSON.stringify({ ...refPayload, months: allMonths.slice(6, 12) }),
          }),
        ]);

        const months1Data: MonthApiResult[] = months1Res.ok ? ((await months1Res.json()).months ?? []) : [];
        const months2Data: MonthApiResult[] = months2Res.ok ? ((await months2Res.json()).months ?? []) : [];
        if (!months1Res.ok) { console.error('[STEP-7] months-first failed:', months1Res.status); setCommentaryPartial(true); }
        if (!months2Res.ok) { console.error('[STEP-7] months-second failed:', months2Res.status); setCommentaryPartial(true); }

        allMonthsData = [...months1Data, ...months2Data].map((m) => {
          const monthLabel = m.month_label ?? m.month ?? '';
          const overall = m.overall_score ?? m.score ?? 65;
          const rawCommentary = (m.analysis ?? m.commentary ?? '').trim();
          return {
            month: monthLabel,
            score: overall,
            overall_score: overall,
            theme: (m.theme ?? '').trim() || '',
            key_transits: m.key_transits ?? [],
            commentary:
              rawCommentary ||
              monthlyFallbackCommentary(monthLabel || 'This month', overall),
            weekly_scores: m.weekly_scores ?? [65, 65, 65, 65],
            domain_scores: {
              career: m.career_score ?? 65,
              money: m.money_score ?? 65,
              health: m.health_score ?? 65,
              relationships: m.love_score ?? 65,
            },
          } satisfies MonthSummary;
        });
        while (allMonthsData.length < 12) {
          const m = new Date(startDate.getFullYear(), startDate.getMonth() + allMonthsData.length, 1);
          const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
          allMonthsData.push({
            month: ml,
            score: 65,
            overall_score: 65,
            theme: '',
            key_transits: [],
            commentary: monthlyFallbackCommentary(ml, 65),
            weekly_scores: [65, 65, 65, 65],
            domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
          });
        }
        console.log('[STEP-7] Complete');
      } catch (e) {
        console.error('[STEP-7] Failed:', e instanceof Error ? e.message : String(e));
        const startDate = new Date(forecastDays?.[0]?.date ?? Date.now());
        allMonthsData = Array.from({ length: 12 }, (_, i) => {
          const m = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          const ml = m.toLocaleString('default', { month: 'long', year: 'numeric' });
          return {
            month: ml,
            score: 65,
            overall_score: 65,
            theme: '',
            key_transits: [],
            commentary: monthlyFallbackCommentary(ml, 65),
            weekly_scores: [65, 65, 65, 65],
            domain_scores: { career: 65, money: 65, health: 65, relationships: 65 },
          };
        });
      }
      })(), // end Step 7 async IIFE
      ]); // end Promise.all for Steps 4+5+6+7
      console.log('[STEP-4+5+6+7] All parallel commentary complete');

      // ── STEP 8: Weeks + Synthesis ──
      console.log('[STEP-8] Starting weeks-synthesis');
      setCurrentStepIndex(clampStep(6));
      setStepMessage('Writing period synthesis...');
      setStepDetail('6 weekly summaries + strategic windows');

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
      const bestDay = forecastDays.reduce((a, b) => (a.day_score ?? 0) > (b.day_score ?? 0) ? a : b);
      const worstDay = forecastDays.reduce((a, b) => (a.day_score ?? 100) < (b.day_score ?? 100) ? a : b);

      let weeksSynthData: WeeksSynthApiResult = { weeks: [], period_synthesis: null };
      try {
        console.log('[STEP-8] weeksPayload length:', weeksPayload?.length);
        const weeksSynthResponse = await fetch('/api/commentary/weeks-synthesis', {
          method: 'POST',
          headers: authJsonHeaders(),
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
        if (weeksSynthResponse.ok) {
          weeksSynthData = await weeksSynthResponse.json();
          console.log('[STEP-8] weeks:', weeksSynthData?.weeks?.length);
          console.log('[STEP-8] synthesis:', !!weeksSynthData?.period_synthesis);
        } else {
          const errText = await weeksSynthResponse.text();
          console.error('[PIPELINE] weeks-synthesis HTTP error:', weeksSynthResponse.status, errText.substring(0, 500));
          setCommentaryPartial(true);
        }
      } catch (err: unknown) {
        console.error('[STEP-8] Failed:', err instanceof Error ? err.message : String(err));
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
          commentary: wc || weeklyFallbackCommentary(wl, sc),
          daily_scores: weeksPayload[i]?.daily_scores ?? [65, 65, 65, 65, 65, 65, 65],
          moon_journey: w.moon_signs ?? [],
          peak_days_count: 2,
          caution_days_count: 1,
        };
      });
      while (weekList.length < 6) {
        const wk = `Week ${weekList.length + 1}`;
        weekList.push({
          week_label: wk,
          week_start: '',
          score: 65,
          theme: '',
          commentary: weeklyFallbackCommentary(wk, 65),
          daily_scores: [65, 65, 65, 65, 65, 65, 65],
          moon_journey: [],
          peak_days_count: 2,
          caution_days_count: 1,
        });
      }

      // ── STEP 9: Validation loops (optional — saves 30–45s when SKIP_VALIDATION=true) ──
      if (!SKIP_VALIDATION) {
        console.log('[STEP-9] Starting 3-pass validation...');
        try {
          setStepMessage('Validating commentary quality...');
          setStepDetail('Pass 1: checking word counts, STRATEGY sections, headlines');
          setCurrentStepIndex(7);

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

          setStepDetail('Pass 2: checking score ranges and slot spreads');
          setCurrentStepIndex(8);
          setStepDetail('Pass 3: checking tone consistency');
          setCurrentStepIndex(9);

          const validationRes = await fetch('/api/validation/report', {
            method: 'POST',
            headers: authJsonHeaders(),
            body: JSON.stringify(validationBody),
          });

          if (validationRes.ok) {
            const validationData = await validationRes.json();
            console.log('[VALIDATION]', validationData.summary);

            if (validationData.corrections?.length > 0) {
              console.log(`[VALIDATION] Applying ${validationData.corrections.length} corrections`);
              (validationData.corrections as ValidationCorrection[]).forEach((correction) => {
                if (correction.type === 'day_overview' && correction.date) {
                  const day = forecastDays.find((d) => d.date === correction.date);
                  if (day && correction.fixed_text) {
                    day.day_overview = correction.fixed_text;
                    console.log(`[VALIDATION] Fixed day overview for ${correction.date}`);
                  }
                } else if (correction.type === 'slot_commentary' && correction.date !== undefined && correction.slot_index !== undefined) {
                  const day = forecastDays.find((d) => d.date === correction.date);
                  if (day) {
                    const slot = day.slots.find((s) => s.slot_index === correction.slot_index);
                    if (slot && correction.fixed_text) {
                      slot.commentary = correction.fixed_text;
                      console.log(`[VALIDATION] Fixed slot ${correction.slot_index} on ${correction.date}`);
                    }
                  }
                }
              });
            }

            if (!validationData.clean) {
              console.warn('[VALIDATION] Issues remain after corrections:', validationData.total_issues);
            }
          } else {
            console.warn('[VALIDATION] Validation call failed, continuing with unvalidated report');
          }
        } catch (valErr) {
          console.error('[VALIDATION] Error during validation, continuing:', valErr);
        }
      } else {
        console.log('[STEP-9] Skipped (NEXT_PUBLIC_SKIP_VALIDATION=true)');
      }

      // ── STEP 10: Assemble final report ──
      console.log('[STEP-10] months:', allMonthsData?.length);
      console.log('[STEP-10] weeks:', weeksSynthData?.weeks?.length);
      console.log('[STEP-10] days:', forecastDays?.length);
      console.log('[STEP-10] synthesis:', !!weeksSynthData?.period_synthesis);
      setStepMessage('Finalising your report...');
      setStepDetail('Assembling all sections');
      setCurrentStepIndex(10);

      const PLANET_SYMBOLS: Record<string, string> = {
        Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄',
      };
      const toLabel = (score: number, isRk: boolean): 'Peak' | 'Excellent' | 'Good' | 'Neutral' | 'Caution' | 'Difficult' | 'Avoid' => {
        if (isRk) return 'Avoid';
        if (score >= 85) return 'Peak';
        if (score >= 75) return 'Excellent';
        if (score >= 65) return 'Good';
        if (score >= 55) return 'Neutral';
        if (score >= 45) return 'Caution';
        if (score >= 35) return 'Difficult';
        return 'Avoid';
      };

      const daysForReport = forecastDays.map((d) => ({
        date: d.date,
        day_label: formatDayLabel(d.date),
        day_score: d.day_score,
        day_label_tier: toLabel(d.day_score, false),
        day_theme: (d.day_theme ?? '').trim() || `Day score ${d.day_score}.`,
        overview: (d.day_overview ?? '').trim() || `Day score ${d.day_score}. Use hora and choghadiya to time activities.`,
        panchang: d.panchang ?? {},
        rahu_kaal: d.rahu_kaal?.start ? { start: d.rahu_kaal.start.slice(0, 5), end: d.rahu_kaal.end.slice(0, 5) } : null,
        slots: (d.slots ?? []).map((s) => ({
          ...s,
          hora_planet: s.dominant_hora ?? 'Moon',
          hora_planet_symbol: PLANET_SYMBOLS[s.dominant_hora] ?? '☽',
          choghadiya: s.dominant_choghadiya ?? 'Chal',
          choghadiya_quality: 'Neutral',
          commentary: (s.commentary ?? '').trim() || `${s.dominant_hora} hora. Score ${s.score}.`,
          commentary_short: (s.commentary_short ?? '').trim() || (s.commentary ?? '').split('.')[0] + '.' || '—',
          score: s.score ?? 50,
          label: toLabel(s.score ?? 50, s.is_rahu_kaal ?? false),
        })),
        peak_count: (d.slots ?? []).filter((s) => (s.score ?? 50) >= 75 && !(s.is_rahu_kaal ?? false)).length,
        caution_count: (d.slots ?? []).filter((s) => (s.score ?? 50) < 45 || (s.is_rahu_kaal ?? false)).length,
      }));

      const finalReport = {
        report_id: 'gen-' + Date.now(),
        report_type: type || '7day',
        generated_at: new Date().toISOString().slice(0, 10),
        nativity: nativityData,
        months: allMonthsData,
        weeks: weekList,
        days: daysForReport,
        synthesis: weeksSynthData.period_synthesis ?? {
          opening_paragraph: 'This forecast period combines transits, dasha activations, and hora patterns. Use high-score windows for important work and avoid Rahu Kaal for new beginnings.',
          strategic_windows: [],
          caution_dates: [],
          domain_priorities: { career: 'Focus on career themes.', money: 'Money themes.', health: 'Health.', relationships: 'Relationships.' },
          closing_paragraph: 'Use hora and choghadiya to align actions with cosmic rhythms.',
        },
      };

      const finalReportTyped = finalReport as unknown as ReportData;
      const errors = validateReportData(finalReportTyped);
      if (errors.length > 0) console.warn('[VALIDATION] Issues:', errors);

      setReportData(finalReportTyped);
      void saveReportToDatabase(finalReport as unknown as Record<string, unknown>);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-dark flex flex-col items-center justify-center gap-8 px-6">
        <StarField />
        <div className="text-amber text-4xl">🪐</div>
        <h1 className="text-star text-2xl font-bold">VedicHour</h1>
        <div className="text-center">
          <p className="text-star text-xl font-semibold">{stepMessage || 'Preparing...'}</p>
          <p className="text-dust text-sm mt-2">{stepDetail || ''}</p>
        </div>
        <div className="w-full max-w-md space-y-2">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                currentStepIndex > i ? 'opacity-50' : ''
              } ${currentStepIndex === i ? 'bg-amber/10 border border-amber/20' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStepIndex > i ? 'bg-emerald text-dark' : currentStepIndex === i ? 'bg-amber text-dark animate-pulse' : 'bg-nebula text-dust'
                }`}
              >
                {currentStepIndex > i ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${currentStepIndex === i ? 'text-star font-medium' : 'text-dust'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
        <p className="text-dust text-xs">
          Generating grandmaster-quality analysis... This takes 2–4 minutes. Keep this tab open.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center px-6 py-20">
        <StarField />
        <div className="max-w-md text-center relative z-10">
          <div className="text-crimson text-6xl mb-6">⚠</div>
          <h1 className="font-display font-semibold text-star text-3xl mb-4">
            Generation Failed
          </h1>
          <p className="font-body text-dust text-base mb-8">{error}</p>
          <button
            onClick={() => {
              hasFetched.current = false;
              startPollingForReport();
            }}
            className="px-8 py-3 bg-amber text-space font-body font-medium rounded-sm hover:bg-amber-glow transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const natalChart = reportData.nativity?.natal_chart ?? (reportData as unknown as { natalChart?: NatalChartData }).natalChart;
  const safeMonthly = Array.isArray(reportData.months) ? reportData.months : [];
  const safeWeekly = Array.isArray(reportData.weeks) ? reportData.weeks : [];
  const reportDays = reportData.days ?? [];

  const mergedDays = reportDays.map((day) => {
    const slots = day.slots ?? [];
    const peakFromGrid = slots
      .filter((s) => (s.score ?? 0) >= 75 && !(s.is_rahu_kaal ?? false))
      .slice(0, 3)
      .map((s) => ({
        time: s.display_label ?? '',
        hora: s.hora_planet ?? '',
        choghadiya: s.choghadiya ?? '',
        score: s.score ?? 0,
        reason: '',
      }));
    const rk = day.rahu_kaal;
    const rahuKaalFormatted = rk && (rk.start || rk.end) ? { start: (rk.start ?? '').slice(0, 5), end: (rk.end ?? '').slice(0, 5) } : null;
    return {
      date: day.date ?? '',
      day_score: day.day_score ?? 50,
      day_theme: day.day_theme ?? '',
      day_rating_label: (day.day_score ?? 50) >= 70 ? 'EXCELLENT' : (day.day_score ?? 50) >= 50 ? 'GOOD' : 'CHALLENGING',
      panchang: day.panchang ?? {},
      day_overview: day.overview ?? 'Overview is being generated.',
      rahu_kaal: rahuKaalFormatted,
      best_windows: peakFromGrid,
      avoid_windows: [],
      peak_count: day.peak_count ?? peakFromGrid.length,
      caution_count: day.caution_count ?? 0,
      hours: null,
      hourlySlots: slots.map((s) => ({
        slot_index: s.slot_index,
        display_label: s.display_label,
        time: s.start_iso?.slice(11, 19) ?? '',
        end_time: s.end_iso?.slice(11, 19) ?? '',
        score: s.score ?? 50,
        hora_planet: s.hora_planet ?? '',
        hora_planet_symbol: s.hora_planet_symbol ?? '',
        choghadiya: s.choghadiya ?? '',
        choghadiya_quality: s.choghadiya_quality ?? '',
        is_rahu_kaal: s.is_rahu_kaal ?? false,
        transit_lagna: s.transit_lagna ?? '',
        transit_lagna_house: s.transit_lagna_house ?? undefined,
        commentary: s.commentary ?? '',
      })),
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-space relative"
    >
      <StarField />
      <ReportSidebar reportLoaded={!!reportData} />

      <main className="lg:ml-[200px] px-6 pb-12 pt-6 lg:pt-12 max-w-4xl mx-auto relative z-10">
        {/* Commentary partial banner */}
        {commentaryPartial && (
          <div className="mb-6 px-4 py-3 border border-amber/30 bg-amber/5 rounded-sm flex items-center gap-3">
            <span className="text-amber text-sm">⚠</span>
            <p className="font-mono text-xs text-dust">
              Some AI commentary is still loading — refresh to update.
            </p>
          </div>
        )}

        {/* Report actions: dashboard + Copy Share Link + Print/PDF */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="pdf-exclude" data-print-hide>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-1.5"
              >
                ← My Reports
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-1.5"
              >
                Sign In to Save →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            onClick={copyShareLink}
            className="pdf-exclude font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-2"
          >
            {copyLinkFeedback ? (
              <span className="text-emerald">Link copied!</span>
            ) : (
              <>
                <span>Copy Share Link</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </>
            )}
          </button>
          <div className="flex flex-col items-end pdf-exclude" data-print-hide>
          <button
            id="pdf-download-btn"
            onClick={() => void handleDownloadPDF()}
            disabled={pdfLoading}
            className="pdf-exclude font-mono text-xs text-dust hover:text-amber transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {pdfLoading ? (
              <>
                <span>{pdfStatus}</span>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </>
            ) : (
              <>
                <span>{pdfStatus}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </>
            )}
          </button>
          <p className="font-mono text-[10px] text-dust/40 mt-1 pdf-exclude">
            Select &quot;Save as PDF&quot; in print dialog
          </p>
          </div>
          </div>
        </div>
        {copyLinkError && (
          <div className="mb-4 px-4 py-3 border border-crimson/50 bg-crimson/10 rounded-sm flex items-center gap-3">
            <span className="text-crimson text-sm">⚠</span>
            <p className="font-mono text-xs text-crimson">{copyLinkError}</p>
          </div>
        )}
        {pdfError && (
          <div className="mb-4 px-4 py-3 border border-crimson/50 bg-crimson/10 rounded-sm flex items-center gap-3">
            <span className="text-crimson text-sm">⚠</span>
            <p className="font-mono text-xs text-crimson">{pdfError}</p>
          </div>
        )}
        <div id="report-content">
          <ReportErrorBoundary fallbackTitle="Nativity">
            <NativityCard
              name={displayName}
              birthDate={displayDate}
              birthTime={displayTime}
              birthCity={displayCity}
              lagna={natalChart?.lagna || 'Unknown'}
              lagnaDegree={natalChart?.lagna_degree ?? 0}
              moonSign={natalChart?.planets?.Moon?.sign || 'Unknown'}
              moonNakshatra={natalChart?.moon_nakshatra || 'Unknown'}
              currentDasha={
                natalChart?.current_dasha ??
                reportData?.nativity?.natal_chart?.current_dasha ?? {
                  mahadasha: 'Unknown',
                  antardasha: 'Unknown',
                }
              }
              nativitySummary={
                reportData?.nativity
                  ? {
                      lagna_analysis: reportData.nativity.lagna_analysis ?? '',
                      current_dasha_interpretation:
                        reportData.nativity.current_dasha_interpretation ?? '',
                      key_yogas: reportData.nativity.key_yogas ?? [],
                      functional_benefics:
                        reportData.nativity.functional_benefics ?? [],
                      functional_malefics:
                        reportData.nativity.functional_malefics ?? [],
                    }
                  : undefined
              }
              nativity={
                (reportData?.nativity?.profile ??
                reportData?.nativity ?? {
                  planetary_positions: [],
                  life_themes: [],
                  current_year_theme: '',
                }) as NativityProfile | undefined
              }
            />
          </ReportErrorBoundary>

          <ReportErrorBoundary fallbackTitle="Monthly Analysis">
            <MonthlyAnalysis months={safeMonthly} />
          </ReportErrorBoundary>

          <ReportErrorBoundary fallbackTitle="Weekly Analysis">
            <WeeklyAnalysis weeks={safeWeekly} />
          </ReportErrorBoundary>

          {mergedDays.length > 0 && (
            <ReportErrorBoundary fallbackTitle="Daily Forecast">
              <DailyAnalysis
                days={mergedDays}
                activeDayIndex={activeDayIndex}
                onDayChange={setActiveDayIndex}
                lagna={natalChart?.lagna}
              />
            </ReportErrorBoundary>
          )}

          <ReportErrorBoundary fallbackTitle="Period Synthesis">
            <PeriodSynthesis
              synthesis={reportData?.synthesis ?? ''}
              dailyScores={mergedDays.map((d) => ({ date: d?.date ?? '', score: d?.day_score ?? 50 }))}
              onDayClick={handleDaySelectFromCalendar}
            />
          </ReportErrorBoundary>

          {/* Print-only full report — all 7 days × 18 slots with commentary.
              Hidden on screen, rendered during @media print to bypass tab-based DailyAnalysis. */}
          <PrintAllDays days={mergedDays} weeks={safeWeekly} />
        </div>
      </main>
    </motion.div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space flex items-center justify-center">
          <div className="w-16 h-16 text-amber animate-spin-slow">
            <MandalaRing className="w-full h-full" />
          </div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
