'use client';

import { useEffect, useState, useRef, useCallback, Suspense, type MutableRefObject } from 'react';
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
import { generateReportPDF } from '@/lib/pdf/generateReportPDF';
import { PrintAllDays } from '@/components/report/PrintAllDays';
import type { NatalChartData, NativityProfile, ReportData } from '@/lib/agents/types';
import { formatDayOutcomeLabel } from '@/lib/guidance/labels';
import { buildFunctionalLordGroups } from '@/lib/engine/functionalNature';
import { lagnaSignToIndex } from '@/lib/engine/horaBase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRouteUuid(id: string) {
  return UUID_RE.test(id);
}

/** True when stored report looks like an all-default / failed generation (stale 50s). */
function isPlaceholderReportData(rd: Record<string, unknown> | null | undefined): boolean {
  const days = rd?.days as Array<{ day_score?: number }> | undefined;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.every((d) => (d.day_score ?? 50) === 50);
}

const GENERATION_MESSAGES = [
  'Computing ephemeris and natal positions…',
  'Scoring hourly windows for each forecast day…',
  'Running nativity and commentary models (this is the slowest part)…',
  'Writing daily overviews and slot-by-slot text…',
  'Building the 12-month layer and weekly synthesis…',
  'Validating and assembling the final report…',
];

/** Stop polling after this if status is still `generating` (server likely dead or orphaned row). */
const CLIENT_GENERATING_TIMEOUT_MS = 15 * 60 * 1000;

function GeneratingScreen({
  elapsedSeconds,
  onElapsed,
  generationStartRef,
  serverPoll,
}: {
  elapsedSeconds: number;
  onElapsed: (s: number) => void;
  generationStartRef: MutableRefObject<number | null>;
  serverPoll: { status: string; progress: number; generation_step?: string | null } | null;
}) {
  useEffect(() => {
    const t = setInterval(() => {
      const start = generationStartRef.current ?? Date.now();
      onElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [generationStartRef, onElapsed]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const elapsed = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // Real progress from server; fall back to a slow crawl so the bar always moves
  const realProgress = serverPoll?.progress ?? 0;
  // If server hasn't responded yet, animate from 0→4% based on elapsed time (max 4%)
  const fallbackProgress = serverPoll ? 0 : Math.min(4, Math.floor(elapsedSeconds / 5));
  const displayProgress = Math.max(realProgress, fallbackProgress);

  // Real phase label from server; fall back to elapsed-time-based message
  const phaseLabel =
    serverPoll?.generation_step
      ? serverPoll.generation_step
      : serverPoll?.status === 'generating'
        ? GENERATION_MESSAGES[Math.min(Math.floor(elapsedSeconds / 22), GENERATION_MESSAGES.length - 1)]
        : 'Connecting to server…';

  return (
    <div className="min-h-[calc(100vh-var(--nav-height))] bg-dark flex flex-col items-center justify-center gap-8 px-6">
      <StarField />

      <div className="text-amber text-5xl animate-spin" style={{ animationDuration: '8s' }}>🪐</div>

      <div className="text-center max-w-md">
        <h1 className="text-star text-2xl font-bold mb-1">Generating your report</h1>
        <p className="text-dust text-sm">
          Running on our servers — safe to close this tab and return later.
        </p>
      </div>

      {/* Real progress bar tied to server milestones */}
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-mono text-xs text-amber">{displayProgress}% complete</span>
          <span className="font-mono text-xs text-dust">{elapsed}</span>
        </div>
        <div className="h-2 w-full bg-nebula rounded-full overflow-hidden">
          {displayProgress > 0 ? (
            <div
              className="h-full bg-gradient-to-r from-amber/60 to-amber transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${displayProgress}%` }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-amber/20 via-amber/70 to-amber/20 animate-pulse" />
          )}
        </div>
      </div>

      <div className="w-full max-w-md bg-nebula/30 border border-amber/10 rounded-lg p-4 text-center min-h-[3.5rem] flex items-center justify-center">
        <p className="font-mono text-xs text-amber leading-relaxed">{phaseLabel}</p>
      </div>

      <p className="text-dust/60 text-xs text-center max-w-sm">
        Typical time: about 3–8 minutes. This page stops waiting automatically after about 15 minutes and offers a retry.
      </p>
    </div>
  );
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
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState('Download PDF');
  const hasFetched = useRef(false);
  /** Cached Supabase user — set once in init(), reused to avoid repeated getUser() roundtrips. */
  const userRef = useRef<{ id: string; email?: string } | null>(null);
  const [birthDisplay, setBirthDisplay] = useState<{
    name: string;
    date: string;
    time: string;
    city: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const generationStartRef = useRef<number | null>(null);
  const [serverPoll, setServerPoll] = useState<{ status: string; progress: number; generation_step?: string | null } | null>(null);

  const authJsonHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const b = params.get('bypass');
    if (b) h['x-bypass-token'] = b;
    return h;
  }, [params]);

  /** Clears status polling (safe to call from unmount). */
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCancelRef = useRef(false);

  const stopReportPolling = useCallback(() => {
    pollCancelRef.current = true;
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const createReportRecord = useCallback(async () => {
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
  }, [
    reportIdFromRoute,
    params,
    name,
    date,
    time,
    city,
    lat,
    lng,
    currentCity,
    currentLat,
    currentLng,
    currentTzOffset,
    type,
  ]);

  /** Polls until the server marks the report complete (works after tab close). */
  const startPollingForReport = useCallback(() => {
    if (typeof window === 'undefined') return;
    stopReportPolling();
    pollCancelRef.current = false;

    setIsLoading(true);
    setError(null);
    setServerPoll(null);
    generationStartRef.current = Date.now();
    setElapsedSeconds(0);

    const pollIntervalMs = 3000;
    const pollLoopStartedAt = Date.now();

    const tick = async () => {
      if (pollCancelRef.current) return;
      try {
        if (Date.now() - pollLoopStartedAt > CLIENT_GENERATING_TIMEOUT_MS) {
          stopReportPolling();
          setError(
            'Generation is taking unusually long or was interrupted on the server. Try again. If it keeps happening, check Vercel logs for timeouts or contact support.',
          );
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/reports/${reportIdFromRoute}/status`, {
          method: 'GET',
          headers: authJsonHeaders(),
        });

        if (!response.ok) {
          stopReportPolling();
          setError('Report not found');
          setIsLoading(false);
          return;
        }

        const data = (await response.json()) as {
          status: string;
          isComplete: boolean;
          progress?: number;
          generation_step?: string | null;
          report: ReportData | null;
          generation_started_at?: string | null;
        };

        setServerPoll({
          status: data.status,
          progress: typeof data.progress === 'number' ? data.progress : 0,
          generation_step: data.generation_step ?? null,
        });

        // If the server says still generating but generation_started_at is older than
        // Vercel's maxDuration (300s) + buffer (60s), the serverless function is dead.
        // Stop waiting and show the retry button immediately rather than after 15 min.
        if (data.status === 'generating' && data.generation_started_at) {
          const startedMs = new Date(data.generation_started_at).getTime();
          if (!Number.isNaN(startedMs) && Date.now() - startedMs > 360_000) {
            stopReportPolling();
            setError(
              'The server did not finish in time (likely a timeout). Use Try again to restart.',
            );
            setIsLoading(false);
            return;
          }
        }

        if (data.isComplete && data.report) {
          stopReportPolling();
          setReportData(data.report);
          setIsLoading(false);

          const uid = userRef.current?.id;
          if (uid) {
            const sb = createClient();
            const { data: row } = await sb
              .from('reports')
              .select('native_name, birth_date, birth_time, birth_city')
              .eq('id', reportIdFromRoute)
              .eq('user_id', uid)
              .maybeSingle();
            if (row) {
              setBirthDisplay({
                name: String(row.native_name ?? 'Seeker'),
                date: String(row.birth_date ?? '').slice(0, 10),
                time: String(row.birth_time ?? '').slice(0, 5),
                city: String(row.birth_city ?? ''),
              });
            }
          }
        } else if (data.status === 'error') {
          stopReportPolling();
          setError('Generation failed — please retry');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Polling] error:', err);
      }
    };

    void tick();
    pollIntervalRef.current = setInterval(() => void tick(), pollIntervalMs);
  }, [reportIdFromRoute, authJsonHeaders, stopReportPolling]);

  /** Inserts row (if needed), POSTs /api/reports/start, then polls until complete. */
  const kickOffBackgroundGeneration = useCallback(async (opts?: { forceRestart?: boolean }) => {
    if (!isRouteUuid(reportIdFromRoute)) return;
    setIsLoading(true);
    setError(null);
    generationStartRef.current = Date.now();
    setElapsedSeconds(0);

    await createReportRecord();

    const planRaw = params.get('plan_type') || type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const birthTimeNorm =
      time && time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time || '12:00:00';
    const tz =
      currentTzOffset ?? (typeof window !== 'undefined' ? -new Date().getTimezoneOffset() : 0);

    const startBody = {
      reportId: reportIdFromRoute,
      name: params.get('name') || name || 'Seeker',
      birth_date: params.get('date') || date || '2000-01-01',
      birth_time: birthTimeNorm,
      birth_city: params.get('city') || city || 'Unknown',
      birth_lat: parseFloat(params.get('lat') || lat || '0') || 0,
      birth_lng: parseFloat(params.get('lng') || lng || '0') || 0,
      current_city: params.get('currentCity') || currentCity || null,
      current_lat: parseFloat(params.get('currentLat') || currentLat || '0') || 0,
      current_lng: parseFloat(params.get('currentLng') || currentLng || '0') || 0,
      timezone_offset: tz,
      plan_type: planType,
      forecast_start: forecastStartParam || undefined,
      payment_status: 'bypass',
      ...(opts?.forceRestart ? { forceRestart: true } : {}),
    };

    const res = await fetch('/api/reports/start', {
      method: 'POST',
      headers: authJsonHeaders(),
      body: JSON.stringify(startBody),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = (errJson as { error?: string }).error ?? res.statusText;
      setError(`Could not start generation: ${msg}`);
      setIsLoading(false);
      return;
    }

    const started = (await res.json()) as {
      status?: string;
      skipped?: boolean;
      skippedPipeline?: boolean;
    };
    if (started.status === 'complete' && started.skipped) {
      const sb = createClient();
      const uid = userRef.current?.id;
      if (uid) {
        const { data: row } = await sb
          .from('reports')
          .select('report_data, native_name, birth_date, birth_time, birth_city')
          .eq('id', reportIdFromRoute)
          .eq('user_id', uid)
          .maybeSingle();
        const rd = row?.report_data as ReportData | undefined;
        if (rd && Array.isArray(rd.days) && rd.days.length > 0) {
          setReportData(rd);
          setBirthDisplay({
            name: String(row?.native_name ?? 'Seeker'),
            date: String(row?.birth_date ?? '').slice(0, 10),
            time: String(row?.birth_time ?? '').slice(0, 5),
            city: String(row?.birth_city ?? ''),
          });
          setIsLoading(false);
          return;
        }
      }
    }

    startPollingForReport();
  }, [
    reportIdFromRoute,
    createReportRecord,
    authJsonHeaders,
    startPollingForReport,
    params,
    name,
    date,
    time,
    city,
    lat,
    lng,
    currentCity,
    currentLat,
    currentLng,
    currentTzOffset,
    type,
    forecastStartParam,
  ]);

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

        const isGenerating = row?.status === 'generating';
        if (!cancelled && isGenerating) {
          hasFetched.current = true;
          setBirthDisplay({
            name: String(row?.native_name ?? 'Seeker'),
            date: String(row?.birth_date ?? '').slice(0, 10),
            time: String(row?.birth_time ?? '').slice(0, 5),
            city: String(row?.birth_city ?? ''),
          });
          // If we have birth params, re-kick generation — the server will either start the
          // pipeline (if the previous invocation timed out) or return skippedPipeline if
          // a live run is already within its 350s window.
          if (params.get('date')) {
            void kickOffBackgroundGeneration();
          } else {
            startPollingForReport();
          }
          return;
        }

        if (!params.get('date')) {
          if (!cancelled) {
            setError(
              row?.status === 'error'
                ? 'Report generation failed. Use Try again or start a new report from the dashboard.'
                : 'Report not found or incomplete. Open a new report from the dashboard.',
            );
            setIsLoading(false);
          }
          hasFetched.current = true;
          return;
        }
      }

      hasFetched.current = true;
      void kickOffBackgroundGeneration();
    }

    void init();
    return () => {
      cancelled = true;
      stopReportPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per route/query
  }, [reportIdFromRoute, queryKey, kickOffBackgroundGeneration, startPollingForReport, stopReportPolling]);

  if (isLoading) {
    return (
      <GeneratingScreen
        elapsedSeconds={elapsedSeconds}
        onElapsed={setElapsedSeconds}
        generationStartRef={generationStartRef}
        serverPoll={serverPoll}
      />
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
              void kickOffBackgroundGeneration({ forceRestart: true });
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
      day_rating_label: formatDayOutcomeLabel(day.day_score ?? 50),
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
                  ? (() => {
                      const flg = natalChart?.functional_lord_groups;
                      const useEngine =
                        flg &&
                        ((flg.benefics?.length ?? 0) > 0 ||
                          (flg.malefics?.length ?? 0) > 0 ||
                          (flg.neutral?.length ?? 0) > 0 ||
                          (flg.badhaka?.length ?? 0) > 0);
                      const lagnaName = natalChart?.lagna?.trim();
                      const tsFlg =
                        !useEngine && lagnaName && lagnaName !== 'Unknown'
                          ? buildFunctionalLordGroups(lagnaSignToIndex(lagnaName))
                          : null;
                      const effective = useEngine ? flg! : tsFlg;
                      return {
                        lagna_analysis: reportData.nativity.lagna_analysis ?? '',
                        current_dasha_interpretation:
                          reportData.nativity.current_dasha_interpretation ?? '',
                        key_yogas: reportData.nativity.key_yogas ?? [],
                        functional_benefics: effective
                          ? effective.benefics
                          : (reportData.nativity.functional_benefics ?? []),
                        functional_malefics: effective
                          ? effective.malefics
                          : (reportData.nativity.functional_malefics ?? []),
                        functional_neutral: effective ? effective.neutral : undefined,
                        badhaka_lines: effective ? effective.badhaka : undefined,
                      };
                    })()
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
