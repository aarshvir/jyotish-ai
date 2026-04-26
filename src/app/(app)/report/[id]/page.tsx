'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { subscribeToReport, type ReportRealtimeSnapshot } from '@/lib/supabase/realtime';
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
import { reportDataToMarkdown } from '@/lib/pdf/reportDataToMarkdown';
import { PrintAllDays } from '@/components/report/PrintAllDays';
import { GeneratingScreen } from '@/components/report/GeneratingScreen';
import type { NatalChartData, NativityProfile, ReportData } from '@/lib/agents/types';
import { formatDayOutcomeLabel } from '@/lib/guidance/labels';
import { buildFunctionalLordGroups } from '@/lib/engine/functionalNature';
import { lagnaSignToIndex } from '@/lib/engine/horaBase';
import type { ReportGenerationLogEntry } from '@/lib/observability/generationLog';
import { generationErrorCtaKind } from '@/lib/reports/reportErrors';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRouteUuid(id: string) {
  return UUID_RE.test(id);
}

/** Surfaces `report_data.error` from the server so users see a hint (not only “please retry”). */
function formatGenerationErrorMessage(detail: string | null | undefined): string {
  if (!detail?.trim()) return 'Generation failed — please retry';
  const t = detail.trim();
  const short = t.length > 600 ? `${t.slice(0, 600)}…` : t;
  return `Generation failed — ${short}`;
}

/** True when stored report looks like an all-default / failed generation (stale 50s). */
function isPlaceholderReportData(rd: Record<string, unknown> | null | undefined): boolean {
  const days = rd?.days as Array<{ day_score?: number }> | undefined;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.every((d) => (d.day_score ?? 50) === 50);
}

type BirthRow = {
  native_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_city?: string | null;
};

/**
 * If the DB row still has /api/reports/start defaults (2000-01-01, Unknown) but
 * the URL has real birth data, prefer URL for PDF/print so the document matches
 * what the user entered.
 */
function birthDisplayForUi(
  row: BirthRow | null | undefined,
  url: { name: string; date: string; time: string; city: string },
) {
  const bd = String(row?.birth_date ?? '').slice(0, 10);
  const city = String(row?.birth_city ?? '').trim();
  const dbIsPlaceholder =
    !bd || bd === '2000-01-01' || !city || city === 'Unknown';
  if (dbIsPlaceholder && (url.date || url.city)) {
    const t = url.time?.trim() || '12:00';
    return {
      name: (url.name || String(row?.native_name ?? 'Seeker')).trim() || 'Seeker',
      date: (url.date || bd).slice(0, 10),
      time: t.length >= 4 ? t.slice(0, 5) : '12:00',
      city: url.city || city || 'Unknown',
    };
  }
  const rt = String(row?.birth_time ?? '');
  return {
    name: String(row?.native_name ?? url.name ?? 'Seeker'),
    date: (bd || url.date).slice(0, 10),
    time: rt.length >= 4 ? rt.slice(0, 5) : (url.time || '12:00').slice(0, 5),
    city: city || url.city || 'Unknown',
  };
}

/** Stop polling after this if status is still `generating` (server likely dead or orphaned row). */
const CLIENT_GENERATING_TIMEOUT_MS = 15 * 60 * 1000;

/** Tier B: no successful HTTP `/status` for this long while Realtime is disconnected → terminal. */
const STATUS_SIGNAL_STALE_MS = 90_000;
/** Log once when consecutive transient /status failures reach this count (tolerance band vs legacy ~5). */
const POLL_TRANSIENT_FAILURE_WARN_THRESHOLD = 10;

/** Baseline HTTP status poll when Realtime is not healthy (± jitter). */
const STATUS_POLL_BASE_MS = 3_000;
/** Half-width jitter around baseline (3s ± 500ms). */
const STATUS_POLL_BASE_JITTER_MS = 500;
/** When Realtime is joined, poll is a sparse safety net (8–10s jitter). */
const STATUS_POLL_REALTIME_MIN_MS = 8_000;
const STATUS_POLL_REALTIME_JITTER_MS = 2_000;

function realtimeStatusPollDelayMs(): number {
  return STATUS_POLL_REALTIME_MIN_MS + Math.floor(Math.random() * STATUS_POLL_REALTIME_JITTER_MS);
}

function basePollIntervalWithJitterMs(): number {
  const delta = Math.floor(Math.random() * (STATUS_POLL_BASE_JITTER_MS * 2 + 1)) - STATUS_POLL_BASE_JITTER_MS;
  return STATUS_POLL_BASE_MS + delta;
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
  const paymentStatusParam = params.get('payment_status') ?? '';

  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** From DB when status=error; drives targeted retry / support copy. */
  const [generationErrorMeta, setGenerationErrorMeta] = useState<{
    code: string | null;
    phase: string | null;
  } | null>(null);
  const [generationLogEntries, setGenerationLogEntries] = useState<ReportGenerationLogEntry[] | null>(null);
  const [copyDiagnosticsHint, setCopyDiagnosticsHint] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState('Download PDF');
  /** True when the current user does not own this report (RLS denied the DB fetch). */
  const [notOwnerOrNotFound, setNotOwnerOrNotFound] = useState(false);
  const hasFetched = useRef(false);
  /** Cached Supabase user — set once in init(), reused to avoid repeated getUser() roundtrips. */
  const userRef = useRef<{ id: string; email?: string } | null>(null);
  /** Cached birth data from the DB row so retries don't fall back to URL/placeholder values. */
  const dbBirthRef = useRef<{
    name: string;
    birth_date: string;
    birth_time: string;
    birth_city: string;
    birth_lat: number | null;
    birth_lng: number | null;
    current_city: string | null;
    current_lat: number | null;
    current_lng: number | null;
    timezone_offset: number | null;
    plan_type: string | null;
    payment_status: string | null;
  } | null>(null);
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
  const [statusReconnecting, setStatusReconnecting] = useState(false);
  /** Tier A: non-terminal copy while HTTP polls fail (spinner stays). */
  const [pollConnectionHint, setPollConnectionHint] = useState<string | null>(null);
  const [generationTraceForUi, setGenerationTraceForUi] = useState<string | null>(null);
  const [statusApiTraceForUi, setStatusApiTraceForUi] = useState<string | null>(null);
  const generationTraceIdRef = useRef<string | null>(null);

  useEffect(() => {
    generationTraceIdRef.current = generationTraceForUi;
  }, [generationTraceForUi]);

  useEffect(() => {
    if (!error) return;
    console.error('[report] generation or status failure', {
      reportId: reportIdFromRoute,
      generation_trace_id: generationTraceIdRef.current,
      status_api_trace: statusApiTraceForUi,
      message: error,
    });
  }, [error, reportIdFromRoute, statusApiTraceForUi]);

  // Show payment confirmation toast only when arriving from a real Ziina checkout
  // (ziina_report_id in sessionStorage proves the user went through the payment flow)
  useEffect(() => {
    if (paymentStatusParam === 'paid') {
      try {
        const hadSession = sessionStorage.getItem('ziina_report_id');
        sessionStorage.removeItem('ziina_report_url');
        sessionStorage.removeItem('ziina_report_id');
        if (hadSession) {
          setPaymentConfirmed(true);
          const t = setTimeout(() => setPaymentConfirmed(false), 6000);
          return () => clearTimeout(t);
        }
      } catch { /* sessionStorage may be unavailable */ }
    }
  }, [paymentStatusParam]);

  const authJsonHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const b = params.get('bypass');
    if (b) h['x-bypass-token'] = b;
    return h;
  }, [params]);

  /** When generation fails, load the durable pipeline log (where each step is recorded on the report row). */
  useEffect(() => {
    if (!error) {
      setGenerationLogEntries(null);
      return;
    }
    if (!isRouteUuid(reportIdFromRoute)) return;

    let cancelled = false;
    void fetch(`/api/reports/${encodeURIComponent(reportIdFromRoute)}/generation-log`, {
      credentials: 'include',
      headers: authJsonHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entries?: ReportGenerationLogEntry[] } | null) => {
        if (cancelled || !d) return;
        setGenerationLogEntries(Array.isArray(d.entries) ? d.entries : []);
      })
      .catch(() => {
        if (!cancelled) setGenerationLogEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [error, reportIdFromRoute, authJsonHeaders]);

  const copyPipelineDiagnostics = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const logText =
      generationLogEntries && generationLogEntries.length > 0
        ? generationLogEntries
            .map(
              (e, i) =>
                `${i + 1}. [+${e.elapsed_ms}ms] [${e.level}] ${e.step} — ${e.message}${
                  e.detail && Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : ''
                }`,
            )
            .join('\n')
        : '';
    const codeLine =
      generationErrorMeta?.code || generationErrorMeta?.phase
        ? `generation_error_code: ${generationErrorMeta?.code ?? ''}
generation_error_at_phase: ${generationErrorMeta?.phase ?? ''}`
        : '';
    const text = `reportId: ${reportIdFromRoute}
generation_trace_id: ${generationTraceForUi ?? ''}
status_api_trace: ${statusApiTraceForUi ?? ''}
message: ${error ?? ''}
${codeLine ? `${codeLine}\n` : ''}${logText ? `\n--- pipeline log ---\n${logText}` : ''}`.trim();
    void navigator.clipboard.writeText(text).then(() => {
      setCopyDiagnosticsHint('Copied to clipboard');
      window.setTimeout(() => setCopyDiagnosticsHint(null), 2500);
    });
  }, [reportIdFromRoute, error, generationLogEntries, generationErrorMeta, generationTraceForUi, statusApiTraceForUi]);

  /** Clears status polling (safe to call from unmount). */
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCancelRef = useRef(false);
  /** Last successful HTTP `/status` (2xx body or 429). Tier B uses this, not Realtime pings. */
  const lastSuccessfulHttpPollAtRef = useRef<number | null>(null);
  const lastStatusSuccessAtRef = useRef<number | null>(null);
  const pollConsecutiveTransientRef = useRef(0);
  /** Pillar 1: Supabase Realtime subscription cleanup fn. */
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  /** True when the Realtime channel has joined — HTTP polling downshifts to an 8–10s safety net. */
  const realtimeJoinedRef = useRef(false);
  /** Last `next_poll_after_ms` from `/status` (server-driven pacing). */
  const serverNextPollRef = useRef<number | null>(null);

  const stopReportPolling = useCallback(() => {
    pollCancelRef.current = true;
    if (pollIntervalRef.current !== null) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (realtimeCleanupRef.current) {
      realtimeCleanupRef.current();
      realtimeCleanupRef.current = null;
    }
    realtimeJoinedRef.current = false;
    serverNextPollRef.current = null;
    lastSuccessfulHttpPollAtRef.current = null;
    pollConsecutiveTransientRef.current = 0;
  }, []);

  const createReportRecord = useCallback(async () => {
    if (!isRouteUuid(reportIdFromRoute)) return;
    const user = userRef.current;
    if (!user) return;
    const supabase = createClient();

    // Prefer DB-cached values over URL params so retries never fall back to placeholders
    const cached = dbBirthRef.current;
    const planRaw = cached?.plan_type || params.get('plan_type') || type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const rawTime = cached?.birth_time || params.get('time') || time;
    const birthTimeNorm =
      rawTime && rawTime.includes(':') && rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime || '12:00:00';

    const { error } = await supabase.from('reports').insert({
      id: reportIdFromRoute,
      user_id: user.id,
      user_email: user.email ?? '',
      native_name: cached?.name || params.get('name') || name || 'Unknown',
      birth_date: cached?.birth_date || params.get('date') || date || '2000-01-01',
      birth_time: birthTimeNorm,
      birth_city: cached?.birth_city || params.get('city') || city || 'Unknown',
      birth_lat: (cached?.birth_lat ?? parseFloat(params.get('lat') || lat || '0')) || null,
      birth_lng: (cached?.birth_lng ?? parseFloat(params.get('lng') || lng || '0')) || null,
      current_city: (cached?.current_city ?? params.get('currentCity')) || currentCity || null,
      current_lat: (cached?.current_lat ?? parseFloat(params.get('currentLat') || currentLat || '0')) || null,
      current_lng: (cached?.current_lng ?? parseFloat(params.get('currentLng') || currentLng || '0')) || null,
      timezone_offset: cached?.timezone_offset ?? currentTzOffset,
      plan_type: planType,
      status: 'generating',
      payment_status: cached?.payment_status ?? (paymentStatusParam === 'paid' ? 'paid' : 'bypass'),
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
    paymentStatusParam,
  ]);

  /** Polls until the server marks the report complete (works after tab close). */
  const startPollingForReport = useCallback(() => {
    if (typeof window === 'undefined') return;
    stopReportPolling();
    pollCancelRef.current = false;

    setIsInitializing(false);
    setIsGenerating(true);
    setError(null);
    setGenerationErrorMeta(null);
    setServerPoll(null);
    generationStartRef.current = Date.now();
    setElapsedSeconds(0);
    lastStatusSuccessAtRef.current = null;
    lastSuccessfulHttpPollAtRef.current = null;
    pollConsecutiveTransientRef.current = 0;
    serverNextPollRef.current = null;
    setStatusReconnecting(false);
    setPollConnectionHint(null);
    setStatusApiTraceForUi(null);

    // Pillar 1: subscribe to Supabase Realtime so the UI reflects phase changes
    // within ~100ms instead of up to 3s. Polling stays as a safety-net fallback.
    realtimeCleanupRef.current = subscribeToReport(
      reportIdFromRoute,
      (row: ReportRealtimeSnapshot) => {
        lastStatusSuccessAtRef.current = Date.now();
        setStatusReconnecting(false);
        if (typeof row.generation_trace_id === 'string' && row.generation_trace_id.trim() !== '') {
          setGenerationTraceForUi(row.generation_trace_id);
        }
        setServerPoll({
          status: String(row.status ?? 'generating'),
          progress: typeof row.generation_progress === 'number' ? row.generation_progress : 0,
          generation_step: row.generation_step ?? null,
        });
        const rd = row.report_data as { days?: unknown[] } | null | undefined;
        const hasData = Array.isArray(rd?.days) && (rd!.days as unknown[]).length > 0;
        if (row.status === 'complete' && hasData) {
          stopReportPolling();
          setReportData(rd as unknown as ReportData);
          setIsGenerating(false);
        } else if (row.status === 'error') {
          stopReportPolling();
          const rd = row.report_data;
          const err =
            rd && typeof rd === 'object' && rd != null && 'error' in rd
              ? String((rd as { error: unknown }).error)
              : '';
          setError(formatGenerationErrorMessage(err || null));
          setGenerationErrorMeta({
            code: row.generation_error_code ?? null,
            phase: row.generation_error_at_phase ?? null,
          });
          setIsGenerating(false);
        }
      },
      (state) => {
        realtimeJoinedRef.current = state === 'joined';
      },
    );

    const pollLoopStartedAt = Date.now();

    /** No successful HTTP poll (200 body or 429) within the stale window. */
    const httpPollStale = () => {
      const base = lastSuccessfulHttpPollAtRef.current ?? pollLoopStartedAt;
      return Date.now() - base > STATUS_SIGNAL_STALE_MS;
    };

    /** Tier B: HTTP poll stale + Realtime off (5xx/network never terminal alone). */
    const maybeTierBTerminalFromPollFailure = (causeHint?: string) => {
      if (!httpPollStale() || realtimeJoinedRef.current) return false;
      stopReportPolling();
      setStatusReconnecting(false);
      setPollConnectionHint(null);
      const hint = causeHint ? ` (${causeHint})` : '';
      setError(
        `Lost contact with status updates for over 90s while live updates were unavailable.${hint} Check your network or refresh. If it keeps happening, contact support with the trace IDs below.`,
      );
      setGenerationErrorMeta({ code: 'STATUS_POLL_TIMEOUT', phase: null });
      setIsGenerating(false);
      return true;
    };

    const tick = async () => {
      if (pollCancelRef.current) return;
      try {
        if (Date.now() - pollLoopStartedAt > CLIENT_GENERATING_TIMEOUT_MS) {
          stopReportPolling();
          setError(
            'Generation is taking unusually long or was interrupted on the server. Try again. If it keeps happening, check Vercel logs for timeouts or contact support.',
          );
          setGenerationErrorMeta({ code: 'STATUS_POLL_TIMEOUT', phase: null });
          setIsGenerating(false);
          return;
        }

        const response = await fetch(`/api/reports/${reportIdFromRoute}/status`, {
          method: 'GET',
          headers: authJsonHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            stopReportPolling();
            setStatusReconnecting(false);
            setError('Session expired — please log in again');
            setGenerationErrorMeta(null);
            setIsGenerating(false);
            return;
          }
          if (response.status === 404) {
            stopReportPolling();
            setStatusReconnecting(false);
            setError('Report not found');
            setGenerationErrorMeta(null);
            setIsGenerating(false);
            return;
          }
          if (response.status === 429) {
            const j = (await response.json().catch(() => ({}))) as {
              retry_after_ms?: number;
              next_poll_after_ms?: number;
            };
            const backoff =
              typeof j.next_poll_after_ms === 'number' && Number.isFinite(j.next_poll_after_ms)
                ? j.next_poll_after_ms
                : typeof j.retry_after_ms === 'number' && Number.isFinite(j.retry_after_ms)
                  ? j.retry_after_ms
                  : 5_000;
            serverNextPollRef.current = Math.max(500, backoff);
            lastSuccessfulHttpPollAtRef.current = Date.now();
            lastStatusSuccessAtRef.current = Date.now();
            pollConsecutiveTransientRef.current = 0;
            setStatusReconnecting(false);
            setPollConnectionHint(null);
            return;
          }
          let errBody: { traceId?: string; cause?: string } = {};
          try {
            errBody = (await response.json()) as { traceId?: string; cause?: string };
          } catch {
            /* non-JSON */
          }
          pollConsecutiveTransientRef.current += 1;
          if (pollConsecutiveTransientRef.current === POLL_TRANSIENT_FAILURE_WARN_THRESHOLD) {
            console.warn('[report poll] transient /status failures', {
              reportId: reportIdFromRoute,
              consecutive: pollConsecutiveTransientRef.current,
            });
          }
          setStatusReconnecting(true);
          setPollConnectionHint('Connection issue, retrying…');
          if (typeof errBody.traceId === 'string' && errBody.traceId) {
            setStatusApiTraceForUi(errBody.traceId);
          }
          if (maybeTierBTerminalFromPollFailure(errBody.cause)) return;
          return;
        }

        const data = (await response.json()) as {
          status: string;
          isComplete: boolean;
          progress?: number;
          generation_step?: string | null;
          report: ReportData | null;
          generation_started_at?: string | null;
          generation_error?: string | null;
          generation_error_code?: string | null;
          generation_error_at_phase?: string | null;
          next_poll_after_ms?: number;
          generation_trace_id?: string | null;
        };

        lastSuccessfulHttpPollAtRef.current = Date.now();
        lastStatusSuccessAtRef.current = Date.now();
        pollConsecutiveTransientRef.current = 0;
        setStatusReconnecting(false);
        setPollConnectionHint(null);
        setStatusApiTraceForUi(null);
        if (typeof data.generation_trace_id === 'string' && data.generation_trace_id.trim() !== '') {
          setGenerationTraceForUi(data.generation_trace_id);
        }

        if (typeof data.next_poll_after_ms === 'number' && Number.isFinite(data.next_poll_after_ms)) {
          serverNextPollRef.current = data.next_poll_after_ms;
        }

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
          if (!Number.isNaN(startedMs) && Date.now() - startedMs > 900_000) {
            stopReportPolling();
            setError(
              'The server did not finish in time (likely a timeout). Use Try again to restart.',
            );
            setGenerationErrorMeta({ code: 'STATUS_POLL_TIMEOUT', phase: data.generation_step ?? null });
            setIsGenerating(false);
            return;
          }
        }

        if (data.isComplete && data.report) {
          stopReportPolling();
          setReportData(data.report);
          setIsGenerating(false);

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
              setBirthDisplay(birthDisplayForUi(row, { name, date, time, city }));
            }
          }
        } else if (data.status === 'error') {
          stopReportPolling();
          setStatusReconnecting(false);
          setError(formatGenerationErrorMessage(data.generation_error));
          setGenerationErrorMeta({
            code: data.generation_error_code ?? null,
            phase: data.generation_error_at_phase ?? null,
          });
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('[Polling] network error:', err);
        pollConsecutiveTransientRef.current += 1;
        if (pollConsecutiveTransientRef.current === POLL_TRANSIENT_FAILURE_WARN_THRESHOLD) {
          console.warn('[report poll] transient /status failures', {
            reportId: reportIdFromRoute,
            consecutive: pollConsecutiveTransientRef.current,
          });
        }
        setStatusReconnecting(true);
        setPollConnectionHint('Connection issue, retrying…');
        if (maybeTierBTerminalFromPollFailure()) return;
      }
    };

    void tick();
    // Adaptive polling: honor `next_poll_after_ms` from `/status`, with a floor of 3s or
    // 8–10s (jitter) when Realtime is healthy so HTTP stays a sparse safety net.
    const scheduleNext = () => {
      if (pollCancelRef.current) return;
      const floorMs = realtimeJoinedRef.current ? realtimeStatusPollDelayMs() : basePollIntervalWithJitterMs();
      const hint = serverNextPollRef.current;
      const nextDelay =
        hint != null && Number.isFinite(hint) ? Math.max(floorMs, hint) : floorMs;
      pollIntervalRef.current = setTimeout(async () => {
        await tick();
        scheduleNext();
      }, nextDelay);
    };
    scheduleNext();
  }, [reportIdFromRoute, authJsonHeaders, stopReportPolling, name, date, time, city]);

  /** Inserts row (if needed), POSTs /api/reports/start, then polls until complete. */
  const kickOffBackgroundGeneration = useCallback(async (opts?: { forceRestart?: boolean }) => {
    if (!isRouteUuid(reportIdFromRoute)) return;
    setIsInitializing(false);
    setIsGenerating(true);
    setError(null);
    setGenerationErrorMeta(null);
    setPollConnectionHint(null);
    generationStartRef.current = Date.now();
    setElapsedSeconds(0);

    await createReportRecord();

    // Prefer DB-cached birth data (populated during init()) over URL params.
    // This is what fixes "Try Again" sending placeholder "Seeker / 2000-01-01" data.
    const cached = dbBirthRef.current;
    const planRaw = cached?.plan_type || params.get('plan_type') || type;
    const planType = planRaw === 'free' ? 'preview' : planRaw;
    const rawTime = cached?.birth_time || params.get('time') || time;
    const birthTimeNorm =
      rawTime && rawTime.includes(':') && rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime || '12:00:00';
    const tz =
      cached?.timezone_offset ??
      currentTzOffset ??
      (typeof window !== 'undefined' ? -new Date().getTimezoneOffset() : 0);

    const startBody = {
      reportId: reportIdFromRoute,
      name: cached?.name || params.get('name') || name || 'Seeker',
      birth_date: cached?.birth_date || params.get('date') || date || '2000-01-01',
      birth_time: birthTimeNorm,
      birth_city: cached?.birth_city || params.get('city') || city || 'Unknown',
      birth_lat: cached?.birth_lat ?? (parseFloat(params.get('lat') || lat || '0') || 0),
      birth_lng: cached?.birth_lng ?? (parseFloat(params.get('lng') || lng || '0') || 0),
      current_city: cached?.current_city ?? params.get('currentCity') ?? currentCity ?? null,
      current_lat: cached?.current_lat ?? (parseFloat(params.get('currentLat') || currentLat || '0') || 0),
      current_lng: cached?.current_lng ?? (parseFloat(params.get('currentLng') || currentLng || '0') || 0),
      timezone_offset: tz,
      plan_type: planType,
      forecast_start: forecastStartParam || undefined,
      // Use DB-cached payment_status if present, otherwise fall back to URL param.
      payment_status: cached?.payment_status ?? (paymentStatusParam === 'paid' ? 'paid' : 'bypass'),
      ...(opts?.forceRestart ? { forceRestart: true } : {}),
    };

    const res = await fetch('/api/reports/start', {
      method: 'POST',
      headers: authJsonHeaders(),
      body: JSON.stringify(startBody),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const ej = errJson as {
        error?: string;
        code?: string;
        generation_trace_id?: string | null;
      };
      if (typeof ej.generation_trace_id === 'string' && ej.generation_trace_id.trim() !== '') {
        setGenerationTraceForUi(ej.generation_trace_id);
      }
      setGenerationErrorMeta(null);
      if (ej.code === 'INNGEST_DISPATCH_FAILED') {
        setError('Background queue unavailable, please retry in a minute');
      } else {
        const msg = ej.error ?? res.statusText;
        setError(`Could not start generation: ${msg}`);
      }
      setIsGenerating(false);
      return;
    }

    const started = (await res.json()) as {
      status?: string;
      skipped?: boolean;
      skippedPipeline?: boolean;
      generation_trace_id?: string | null;
    };
    if (typeof started.generation_trace_id === 'string' && started.generation_trace_id.trim() !== '') {
      setGenerationTraceForUi(started.generation_trace_id);
    }
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
          setBirthDisplay(birthDisplayForUi(row ?? undefined, { name, date, time, city }));
          setIsGenerating(false);
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
    paymentStatusParam,
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

  const handleDownloadMarkdown = useCallback(() => {
    if (!reportData) return;
    const md = reportDataToMarkdown(reportData, displayName, displayDate, displayCity);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = displayName.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const safeDate = (reportData.generated_at ?? '').slice(0, 10); // just YYYY-MM-DD, no colons
    a.download = `vedichour-${safeName}-${safeDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportData, displayName, displayDate, displayCity]);

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

        // Cache the authoritative birth data from the DB so retries can use it
        // (rather than relying on potentially missing/stale URL params).
        if (row) {
          dbBirthRef.current = {
            name: String(row.native_name ?? ''),
            birth_date: String(row.birth_date ?? '').slice(0, 10),
            birth_time: String(row.birth_time ?? '').slice(0, 8),
            birth_city: String(row.birth_city ?? ''),
            birth_lat: typeof row.birth_lat === 'number' ? row.birth_lat : null,
            birth_lng: typeof row.birth_lng === 'number' ? row.birth_lng : null,
            current_city: (row.current_city as string | null) ?? null,
            current_lat: typeof row.current_lat === 'number' ? row.current_lat : null,
            current_lng: typeof row.current_lng === 'number' ? row.current_lng : null,
            timezone_offset: typeof row.timezone_offset === 'number' ? row.timezone_offset : null,
            plan_type: (row.plan_type as string | null) ?? null,
            payment_status: (row.payment_status as string | null) ?? null,
          };
        }

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
          setBirthDisplay(birthDisplayForUi(row, { name, date, time, city }));
          setReportData(rd as unknown as ReportData);
          setIsGenerating(false);
          setIsInitializing(false);
          return;
        }

        const isRowGenerating = row?.status === 'generating';
        if (!cancelled && isRowGenerating) {
          hasFetched.current = true;
          setBirthDisplay(birthDisplayForUi(row ?? undefined, { name, date, time, city }));
          // Check if the previous run is stale (older than 360s = past Vercel maxDuration+buffer).
          // If so, force-restart so we don't immediately hit the timeout error UI.
          const startedMs = row?.generation_started_at
            ? new Date(row.generation_started_at as string).getTime()
            : 0;
          const isStale = !Number.isNaN(startedMs) && startedMs > 0 && Date.now() - startedMs > 360_000;
          if (isStale) {
            void kickOffBackgroundGeneration({ forceRestart: true });
          } else {
            startPollingForReport();
          }
          return;
        }

        // No row at all — or row exists with status=error.
        // If we have URL params we can still kick off a fresh generation.
        // Otherwise show a "not found / not owner" state.
        if (!row && !params.get('date')) {
          if (!cancelled) {
            setNotOwnerOrNotFound(true);
            setIsGenerating(false);
            setIsInitializing(false);
          }
          hasFetched.current = true;
          return;
        }

        if (row?.status === 'error' && !params.get('date')) {
          if (!cancelled) {
            setError('Report generation failed previously. Click Try again to restart.');
            setGenerationErrorMeta({
              code: (row as { generation_error_code?: string | null }).generation_error_code ?? null,
              phase: (row as { generation_error_at_phase?: string | null }).generation_error_at_phase ?? null,
            });
            setIsGenerating(false);
            setIsInitializing(false);
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

  // Initializing: quick look-up against the DB (no "generating" flash for completed reports)
  if (isInitializing) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center gap-4 px-6">
        <StarField />
        <div className="w-12 h-12 text-amber animate-spin-slow relative z-10">
          <MandalaRing className="w-full h-full" />
        </div>
        <p className="font-mono text-xs text-dust/60 relative z-10">Loading your report…</p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <GeneratingScreen
        reportId={reportIdFromRoute}
        elapsedSeconds={elapsedSeconds}
        onElapsed={setElapsedSeconds}
        generationStartRef={generationStartRef}
        serverPoll={serverPoll}
        reconnecting={statusReconnecting}
        connectionHint={pollConnectionHint}
        extraHeaders={authJsonHeaders()}
      />
    );
  }

  if (notOwnerOrNotFound) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center px-6 py-20">
        <StarField />
        <div className="max-w-md text-center relative z-10">
          <div className="text-amber/70 text-6xl mb-6">✦</div>
          <h1 className="font-body font-semibold text-star text-headline-lg mb-4">
            This report isn&apos;t available to you
          </h1>
          <p className="font-body text-dust text-base mb-2">
            Reports are private to the account that generated them.
          </p>
          <p className="font-body text-dust/70 text-sm mb-8">
            If you created this report, sign in with the same account. Otherwise, generate your own.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-secondary px-6 py-2">My Reports</Link>
            <Link href="/onboard" className="btn-primary px-6 py-2">Generate a Report</Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center px-6 py-20">
        <StarField />
        <div className="max-w-md text-center relative z-10">
          <div className="text-caution text-6xl mb-6">⚠</div>
          <h1 className="font-body font-semibold text-star text-headline-lg mb-4">
            Generation Failed
          </h1>
          <p className="font-body text-dust text-base mb-6">{error}</p>
          {(() => {
            const kind = generationErrorCtaKind(generationErrorMeta?.code ?? null);
            const hint =
              kind === 'retry_now'
                ? 'You can try again now — this is usually a short-lived issue.'
                : kind === 'retry_later'
                  ? 'Wait several minutes before retrying so server time limits can reset.'
                  : 'If this keeps happening, contact support and include the trace IDs below.';
            return (
              <p className="font-body text-dust/75 text-sm mb-4 max-w-lg mx-auto leading-relaxed">
                {hint}
              </p>
            );
          })()}
          {generationErrorCtaKind(generationErrorMeta?.code ?? null) === 'contact_support' &&
          isRouteUuid(reportIdFromRoute) ? (
            <p className="font-mono text-[11px] text-dust/60 mb-4 break-all">
              Report ID: {reportIdFromRoute}
            </p>
          ) : null}
          {generationErrorMeta?.phase || generationErrorMeta?.code ? (
            <p className="font-mono text-[11px] text-dust/55 mb-6 break-words">
              {generationErrorMeta.phase ? (
                <>
                  Step: {generationErrorMeta.phase}
                  {generationErrorMeta.code ? ` · ${generationErrorMeta.code}` : ''}
                </>
              ) : (
                generationErrorMeta.code
              )}
            </p>
          ) : null}
          {(generationTraceForUi || statusApiTraceForUi) && (
            <div className="mb-6 text-left w-full max-w-lg mx-auto rounded-card border border-horizon/25 bg-horizon/5 px-4 py-3 font-mono text-[11px] text-dust/80 space-y-1.5">
              <p className="text-dust/50 text-[10px] uppercase tracking-wider">Support</p>
              {generationTraceForUi ? (
                <p>
                  <span className="text-dust/55">Run trace: </span>
                  {generationTraceForUi}
                </p>
              ) : null}
              {statusApiTraceForUi ? (
                <p>
                  <span className="text-dust/55">Status request trace: </span>
                  {statusApiTraceForUi}
                </p>
              ) : null}
            </div>
          )}
          {generationLogEntries && generationLogEntries.length > 0 && (
            <details className="mt-2 mb-6 text-left max-w-2xl mx-auto w-full">
              <summary className="font-body text-dust/80 text-sm cursor-pointer select-none">
                Pipeline log ({generationLogEntries.length} steps) — for support
              </summary>
              <pre
                className="mt-3 text-left text-[10px] leading-relaxed text-dust/80 overflow-auto max-h-72 p-3 bg-cosmos rounded border border-horizon/30 font-mono whitespace-pre-wrap"
                tabIndex={0}
              >
                {generationLogEntries
                  .map(
                    (e, i) =>
                      `${i + 1}. [+${e.elapsed_ms}ms] [${e.level}] ${e.step} — ${e.message}${e.detail && Object.keys(e.detail).length ? ` ${JSON.stringify(e.detail)}` : ''}`,
                  )
                  .join('\n')}
              </pre>
            </details>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={copyPipelineDiagnostics}
              className="btn-secondary px-6 py-2.5 text-sm w-full sm:w-auto"
            >
              Copy diagnostics
            </button>
            <button
              onClick={() => {
                hasFetched.current = false;
                void kickOffBackgroundGeneration({ forceRestart: true });
              }}
              className="btn-primary px-8 py-3 w-full sm:w-auto"
            >
              {generationErrorCtaKind(generationErrorMeta?.code ?? null) === 'retry_later'
                ? 'Try again after waiting'
                : 'Try Again'}
            </button>
          </div>
          {copyDiagnosticsHint ? (
            <p className="mt-2 font-body text-dust/60 text-sm">{copyDiagnosticsHint}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-[calc(100vh-var(--nav-height))] bg-space flex flex-col items-center justify-center px-6 py-20">
        <StarField />
        <div className="max-w-md text-center relative z-10">
          <p className="font-body text-dust text-base">Report data unavailable — please try refreshing.</p>
          <Link href="/dashboard" className="mt-6 inline-block btn-secondary px-6 py-2">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

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
        {/* Payment confirmation toast */}
        {paymentConfirmed && (
          <div
            role="status"
            aria-live="polite"
            className="pdf-exclude mb-4 px-4 py-3 rounded-card border border-success/30 bg-success/10 text-success font-body text-sm flex items-center gap-3 animate-fade-in"
          >
            <span>✓</span>
            <span>Payment confirmed — your report is being generated.</span>
          </div>
        )}

        {/* Semantic h1 — visually hidden but present for screen readers and SEO */}
        <h1 className="sr-only">
          VedicHour report for {displayName}
          {dbBirthRef.current?.plan_type ? ` · ${dbBirthRef.current.plan_type} plan` : ''}
        </h1>

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
              <span className="text-success">Link copied!</span>
            ) : (
              <>
                <span>Copy Share Link</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </>
            )}
          </button>
          <div className="flex flex-col items-end gap-2 pdf-exclude" data-print-hide>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadMarkdown()}
                className="pdf-exclude btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                aria-label="Download as Markdown"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <span>Markdown</span>
              </button>
              <button
                id="pdf-download-btn"
                onClick={() => void handleDownloadPDF()}
                disabled={pdfLoading}
                className="pdf-exclude btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                aria-label="Download as PDF"
              >
                {pdfLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>{pdfStatus}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>PDF</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[10px] text-dust/40 pdf-exclude">
              PDF uses your browser&apos;s print dialog — choose &quot;Save as PDF&quot;.
            </p>
          </div>
          </div>
        </div>
        {copyLinkError && (
          <div className="mb-4 px-4 py-3 border border-caution/40 bg-caution/10 rounded-card flex items-center gap-3">
            <span className="text-caution text-body-sm">⚠</span>
            <p className="font-mono text-mono-sm text-caution">{copyLinkError}</p>
          </div>
        )}
        {pdfError && (
          <div className="mb-4 px-4 py-3 border border-caution/40 bg-caution/10 rounded-card flex items-center gap-3">
            <span className="text-caution text-body-sm">⚠</span>
            <p className="font-mono text-mono-sm text-caution">{pdfError}</p>
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

        {/* Methodology & AI disclosure — shown in PDF as well, so users and recipients understand how the report was produced */}
        <section className="mt-10 rounded-card border border-white/5 bg-white/[0.02] p-5 sm:p-6">
          <h2 className="font-body text-title-md text-star mb-2">How this report was made</h2>
          <p className="font-body text-body-sm text-dust leading-relaxed">
            Planetary positions are computed using the Swiss Ephemeris with the Lahiri Ayanamsa and
            Vimshottari Dasha. Hourly scores combine hora rulership, choghadiya, Rahu Kaal, transit
            lagna, and your natal chart&apos;s functional benefics and malefics — all derived from
            math, not opinion.
          </p>
          <p className="font-body text-body-sm text-dust leading-relaxed mt-3">
            Written commentary is generated by AI (Anthropic Claude and OpenAI) from that
            astrological data. It is designed to inform — not replace — your own judgment. For
            medical, legal, or financial decisions, consult a qualified professional.
          </p>
        </section>

        {/* In-report upsell — preview plan only; excluded from PDF */}
        {dbBirthRef.current?.plan_type === 'free' && (
          <div className="pdf-exclude mt-10" data-print-hide>
            <div className="rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-amber/[0.03] to-transparent p-6 sm:p-8">
              <p className="section-eyebrow mb-2">Ready for more precision?</p>
              <h2 className="font-body text-headline-md text-star mb-2">
                Unlock hour-by-hour forecasts
              </h2>
              <p className="font-body text-body-md text-dust mb-5 max-w-2xl leading-relaxed">
                This preview shows your natal chart and sample timing. Upgrade to the 7-Day, Monthly, or
                Annual Oracle for 18 hourly windows per day with full commentary, weekly synthesis, and
                priority dates for career, health, and wealth.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/onboard?plan=7day"
                  className="btn-primary px-5 py-2.5 text-sm"
                >
                  Generate my full report →
                </Link>
                <Link
                  href="/pricing"
                  className="btn-secondary px-5 py-2.5 text-sm"
                >
                  Compare plans
                </Link>
                <span className="font-mono text-mono-sm text-dust/60">
                  30% off all plans · 24-hour refund
                </span>
              </div>
            </div>
          </div>
        )}
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
