/**
 * Server-side report generation orchestrator.
 * Runs the full pipeline (ephemeris → nativity/grids → commentary → synthesis → validation → assembly)
 * and emits SSE-style events via `onStep`. Saves progress to Supabase incrementally.
 */

import { createServiceClient } from '@/lib/supabase/admin';
import { appendReportGenerationLog } from '@/lib/observability/generationLog';
import { inferReportGenerationErrorCode, markReportAsFailed } from '@/lib/reports/reportErrors';
import { validateReportData } from '@/lib/validation/reportValidation';
import type { JyotishRagMode } from '@/lib/rag/ragMode';
import { PHASE } from '@/lib/reports/phases/slugs';
import {
  loadPipelineState,
  savePipelineCheckpoint,
  clearPipelineCheckpoint,
  phaseAtOrAfter,
  type PipelineState,
} from './checkpoint';
import type {
  NatalChartData,
  NativityProfile,
  NativityData,
  MonthSummary,
  ReportData,
  PanchangData,
} from '@/lib/agents/types';
import { getCanonicalScoreLabel, getDayOutcomeTier } from '@/lib/guidance/labels';
import { buildSlotGuidance, buildDayBriefing } from '@/lib/guidance/builder';
import { isV2GuidanceEnabled } from '@/lib/guidance/featureFlag';
import { insertAgentRun } from '@/lib/observability/reportRuns';

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
  /** BPHS / scripture RAG: propagates to nativity + nativity-text routes. */
  jyotishRagMode?: JyotishRagMode | string;
}

/**
 * Pillar 1: Sentinel error thrown by the orchestrator when it has intentionally
 * stopped after the requested `stopAfterPhase` checkpoint. Inngest treats this
 * as a successful step completion (the step body returns normally via try/catch
 * at call sites), so the next `step.run` can continue the DAG.
 */
export class PipelinePhaseStopSignal extends Error {
  constructor(public readonly phase: string) {
    super(`pipeline_stop_after_${phase}`);
    this.name = 'PipelinePhaseStopSignal';
  }
}

/**
 * Pillar 1: Options for the per-phase Inngest DAG.
 * When `stopAfterPhase` is provided, the orchestrator runs only up to and
 * including that phase and throws a PipelinePhaseStopSignal so the caller
 * (Inngest step.run) can return cleanly and invoke the next step.
 *
 * Inngest semantics: each step.run call wraps one phase. Because the orchestrator
 * is already idempotent via pipeline_checkpoint, any step that re-runs short-circuits
 * through the completed checkpoints, ensuring at-most-once-effective execution per phase.
 */
export type PipelinePhaseName =
  | 'ephemeris'
  | 'nativity_grids'
  | 'commentary'
  | 'finalize';

export interface PipelineOptions {
  /** If set, stop after this phase's checkpoint is saved and throw PipelinePhaseStopSignal. */
  stopAfterPhase?: PipelinePhaseName;
  /** Durable report_runs.id for observability. */
  reportRunId?: string | null;
  /** Correlation id passed through internal route calls and logs. */
  correlationId?: string | null;
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
  timeoutMs = 30_000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // Fresh AbortSignal per attempt — timeout signals cannot be reused across retries.
      return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err: unknown) {
      const isNetwork =
        err instanceof Error &&
        (err.name === 'TypeError' ||
          err.name === 'AbortError' ||
          err.name === 'TimeoutError' ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('SUSPENDED') ||
          err.message?.includes('aborted') ||
          err.message?.includes('timed out'));
      if (isNetwork && i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

function createConcurrencyLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };

  return async function limitTask<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      runNext();
    }
  };
}

/** free/preview may use 206 + template from LLM routes. Paid: refuse placeholder reports. */
function allowPartialLlmFallbackForPlan(input: PipelineInput): boolean {
  const p = String(input.planType ?? input.type ?? '7day').toLowerCase();
  return p === 'free' || p === 'preview';
}

function assertNoPartialLlmForPaid(
  res: Response,
  routeLabel: string,
  input: PipelineInput,
): void {
  if (allowPartialLlmFallbackForPlan(input)) return;
  if (res.status === 206) {
    throw new Error(
      `${routeLabel}: HTTP 206 (LLM unavailable, key missing, or model error). ` +
        'Check ANTHROPIC_API_KEY and Vercel logs. Paid reports cannot be completed with template text.',
    );
  }
}

/** Stubs from monthlyFallback() — if most months still say this, the LLM never wrote real copy. */
const MONTHLY_GENERATING_STUB = 'Commentary is generating — refresh in 30 seconds';

/**
 * True when a row is the all-65 padding shape (orchestrator uses 65 as neutral when fields are missing).
 * Many such rows in one report usually means the months API returned sparse/empty data.
 */
function isUniform65PlaceholderRow(m: MonthSummary): boolean {
  const ws = m.weekly_scores;
  return (
    m.score === 65 &&
    m.overall_score === 65 &&
    !String(m.theme ?? '').trim() &&
    Array.isArray(ws) &&
    ws.length === 4 &&
    ws.every((x) => x === 65) &&
    m.domain_scores.career === 65 &&
    m.domain_scores.money === 65 &&
    m.domain_scores.health === 65 &&
    m.domain_scores.relationships === 65
  );
}

/** Paid: refuse to complete if monthly block is still stubbed (uniform 65s, padding, or "generating" text). */
function assertPaidMonthlySectionNotPlaceholder(months: MonthSummary[], input: PipelineInput): void {
  if (allowPartialLlmFallbackForPlan(input)) return;
  if (months.length < 12) {
    throw new Error('Monthly section: expected 12 months; got incomplete data. Check months-first/second API responses.');
  }
  const stubText = months.filter((m) => (m.commentary ?? '').includes(MONTHLY_GENERATING_STUB));
  if (stubText.length >= 6) {
    throw new Error(
      'Monthly section still contains "generating" placeholder copy. Paid report cannot be marked complete. Regenerate the report.',
    );
  }
  const uniform = months.filter(isUniform65PlaceholderRow);
  if (uniform.length >= 12) {
    throw new Error(
      'All 12 months look like padding (65/65, no themes). Paid report cannot be completed — check months-first/second LLM output.',
    );
  }
}

type WeeksPayloadEntry = {
  week_index: number;
  week_label: string;
  start_date: string;
  end_date: string;
  daily_scores: number[];
};

/**
 * The LLM often returns <6 week objects (truncated JSON). Pad from deterministic
 * `weeksPayload` so the report still completes; prefer real model rows when present.
 */
function padWeeksSynthesisToSix(
  data: WeeksSynthApiResult,
  weeksPayload: WeeksPayloadEntry[],
  logWarn?: (...args: unknown[]) => void,
): WeeksSynthApiResult {
  const existing = [...(data.weeks ?? [])];
  if (existing.length >= 6) {
    return { ...data, weeks: existing.slice(0, 6) };
  }
  const padText =
    'Use the per-day scores and hourly table for this week. Favour high-score days and benefic horas; avoid Rahu Kaal; delay major new starts on the weakest day.';
  for (let i = existing.length; i < 6; i += 1) {
    const p = weeksPayload[i];
    if (!p) break;
    const avg =
      p.daily_scores.length > 0
        ? Math.round(p.daily_scores.reduce((a, b) => a + b, 0) / p.daily_scores.length)
        : 55;
    existing.push({
      week_label: p.week_label,
      overall_score: avg,
      score: avg,
      theme: 'Daily-driven timing',
      analysis: `${padText} (${p.week_label}).`,
    });
  }
  if (existing.length < 6) {
    (logWarn ?? console.warn)(
      '[orchestrator] padWeeksSynthesisToSix: still <6 after pad — check weeksPayload length',
    );
  }
  return { ...data, weeks: existing };
}

/** Paid: after padding, we must have 6 week rows (weeksPayload always supplies 6 windows). */
function assertPaidWeeksSynthesisPresent(data: WeeksSynthApiResult, input: PipelineInput): void {
  if (allowPartialLlmFallbackForPlan(input)) return;
  const n = data.weeks?.length ?? 0;
  if (n < 6) {
    throw new Error(
      `Weekly section: expected 6 week rows after merge; got ${n}. This should not happen — check weeksPayload and logs.`,
    );
  }
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
  options: PipelineOptions = {},
): Promise<void> {
  const pipelineRunLabel = options.stopAfterPhase != null ? String(options.stopAfterPhase) : 'full_inline';
  const stopAfter = options.stopAfterPhase;
  function maybeStopAfter(phase: PipelinePhaseName): void {
    if (stopAfter === phase) {
      throw new PipelinePhaseStopSignal(phase);
    }
  }
  const correlationId =
    options.correlationId ?? authHeaders['x-correlation-id'] ?? `${reportId}-${Date.now()}`;
  const reportRunId = options.reportRunId ?? authHeaders['x-report-run-id'] ?? null;
  const h = {
    ...authHeaders,
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    ...(reportRunId ? { 'x-report-run-id': reportRunId } : {}),
  };
  const traceTag = `[trace:${correlationId}]`;
  const tlog = (...args: unknown[]) => console.log(traceTag, ...args);
  const twarn = (...args: unknown[]) => console.warn(traceTag, ...args);
  const terr = (...args: unknown[]) => console.error(traceTag, ...args);
  const dailyGridLimit = createConcurrencyLimiter(5);
  const commentaryLimit = createConcurrencyLimiter(3);
  // Use SKIP_REPORT_VALIDATION (server-only). NEXT_PUBLIC_SKIP_VALIDATION kept as legacy alias.
  const skipValidation =
    process.env.SKIP_REPORT_VALIDATION === 'true' ||
    process.env.NEXT_PUBLIC_SKIP_VALIDATION === 'true';
  const ragModePayload =
    input.jyotishRagMode != null && String(input.jyotishRagMode).trim() !== ''
      ? { jyotishRagMode: String(input.jyotishRagMode).trim() }
      : ({} as Record<string, string>);

  const db = createServiceClient();
  /** Latest `generation_step` written via dbSetProgress; used when persisting error metadata. */
  let lastGenerationStep: string = PHASE.EPHEMERIS_FETCHING;
  const pipelineT0 = Date.now();

  /**
   * Hobby-aware budget detection.
   * Vercel Hobby plan caps serverless functions at 60s. Pro allows up to 300s.
   * When running inside an Inngest step.run, each step is its own invocation,
   * so the budget applies per-step. For inline execution (no Inngest), the
   * entire pipeline must fit within the function timeout.
   *
   * Detection priority:
   *   1. REPORT_PIPELINE_BUDGET_MS env var (explicit override)
   *   2. Auto-detect from VERCEL_FUNCTION_MAX_DURATION (set by Vercel runtime)
   *   3. Default to 55s (safe for Hobby) if on Vercel production
   *   4. Default to 255s for local dev or Pro plan
   */
  const isVercel = !!process.env.VERCEL;
  const vercelMaxDuration = Number(process.env.VERCEL_FUNCTION_MAX_DURATION || '0');
  const explicitBudget = Number(String(process.env.REPORT_PIPELINE_BUDGET_MS ?? '').trim()) || 0;
  const isRunningInInngestStep = stopAfter != null; // Inngest phases set stopAfterPhase
  const defaultBudgetMs = (() => {
    if (explicitBudget > 0) return explicitBudget;
    // Inside Inngest step: each phase gets its own function invocation
    // Use per-step budget that fits within the function timeout
    if (isRunningInInngestStep) {
      if (vercelMaxDuration > 0) return Math.max((vercelMaxDuration - 5) * 1000, 10_000);
      // Hobby default: 55s per step (60s max - 5s buffer)
      if (isVercel && process.env.VERCEL_ENV === 'production') return 55_000;
      return 255_000;
    }
    // Inline execution: entire pipeline in one function call
    if (vercelMaxDuration > 0) return Math.max((vercelMaxDuration - 10) * 1000, 10_000);
    // Hobby default: 50s for full pipeline (aggressive but better than 503)
    if (isVercel && process.env.VERCEL_ENV === 'production') return 50_000;
    return 255_000;
  })();
  const budgetMs = defaultBudgetMs;
  const isHobbyBudget = budgetMs <= 60_000;

  if (isHobbyBudget) {
    tlog(`[orchestrator] Hobby-mode budget: ${budgetMs}ms (Inngest step: ${isRunningInInngestStep})`);
  }

  /** Hard-kill fires shortly after budget: must be > budgetMs (so assertWithinBudget runs first)
   *  and < Vercel's actual function timeout. */
  const hardKillMs = Math.min(budgetMs + (isHobbyBudget ? 8_000 : 30_000), isHobbyBudget ? 58_000 : 285_000);

  /**
   * Shared abort controller wired into every commentary fetch.
   * The hard-kill timer calls .abort() so all in-flight LLM fetch calls
   * terminate immediately, letting the pipeline unwind to assertWithinBudget
   * which does an *awaited* DB update — far more reliable than fire-and-forget.
   */
  const budgetAbortController = new AbortController();
  const budgetSignal = budgetAbortController.signal;

  /**
   * Hard-kill backstop: fires after hardKillMs even if a fetch is stuck and
   * assertWithinBudget() never gets called. Aborts all pending commentary
   * fetches so the pipeline can reach assertWithinBudget, then also does a
   * direct DB update as a safety net.
   */
  let hardKillTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    terr(`[orchestrator] hard-kill timeout (${hardKillMs}ms) for ${reportId}`);
    void appendReportGenerationLog({
      reportId,
      userId,
      entry: {
        ts: new Date().toISOString(),
        elapsed_ms: Date.now() - pipelineT0,
        level: 'error',
        step: 'hard_kill_timeout',
        message: `Pipeline exceeded ${hardKillMs}ms wall clock`,
        detail: { pipeline_run: pipelineRunLabel, hardKillMs, generation_trace_id: correlationId },
      },
    });
    onStep({ type: 'error', message: 'Report generation timed out — please try again.' });
    // Abort all in-flight commentary fetches so Promise.all unwinds immediately.
    budgetAbortController.abort(new Error('Pipeline budget exceeded'));
    // Guard with neq('status','complete') inside markReportAsFailed
    const killMsg = `Report generation timed out after ${Math.round(hardKillMs / 1000)}s (server budget). Please try again.`;
    void markReportAsFailed(db, reportId, userId, {
      message: killMsg,
      errorStep: 'hard_kill_timeout',
      generationErrorCode: 'BUDGET_EXCEEDED',
      generationErrorAtPhase: lastGenerationStep,
    }).then(() => {
      tlog('[orchestrator] hard-kill markReportAsFailed done for', reportId);
    });
  }, hardKillMs);

  function logStep(step: string, extra?: Record<string, unknown>) {
    const elapsed_ms = Date.now() - pipelineT0;
    tlog(
      JSON.stringify({
        event: 'orchestrator_step',
        reportId,
        generation_trace_id: correlationId,
        step,
        ms: elapsed_ms,
        ...extra,
      }),
    );
    void appendReportGenerationLog({
      reportId,
      userId,
      entry: {
        ts: new Date().toISOString(),
        elapsed_ms,
        level: 'info',
        step,
        message: typeof extra?.label === 'string' ? extra.label : step,
        detail: { ...extra, pipeline_run: pipelineRunLabel, generation_trace_id: correlationId },
      },
    });
  }

  async function assertWithinBudget(phase: string): Promise<void> {
    const elapsed = Date.now() - pipelineT0;
    if (elapsed > budgetMs) {
      logStep('budget_exceeded', { phase, budgetMs });
      try {
        await markReportAsFailed(db, reportId, userId, {
          message: `Pipeline time budget exceeded (${phase})`,
          errorStep: 'budget_exceeded',
          generationErrorCode: 'BUDGET_EXCEEDED',
          generationErrorAtPhase: lastGenerationStep,
        });
      } catch (e) {
        terr('[orchestrator] budget mark error failed:', e);
      }
      throw new Error(`Pipeline time budget exceeded (${phase})`);
    }
  }

  /** Parallel commentary tracks call dbSetProgress out of order; keep UI monotonic. */
  let lastProgressPct = -1;

  // Helper: write real-time progress so the poll endpoint can expose it
  async function dbSetProgress(step: string, progress: number) {
    lastGenerationStep = step;
    if (progress < lastProgressPct) {
      return;
    }
    lastProgressPct = progress;
    try {
      await db
        .from('reports')
        .update({
          generation_step: step,
          generation_progress: progress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('user_id', userId);
    } catch (e) {
      twarn('[orchestrator] dbSetProgress failed:', e instanceof Error ? e.message : String(e));
    }
  }

  async function traceAgentRun<T>(
    agentName: string,
    provider: string,
    task: () => Promise<T>,
    model?: string,
  ): Promise<T> {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    try {
      const result = await task();
      void insertAgentRun({
        reportRunId,
        reportId,
        agentName,
        provider,
        model,
        status: 'success',
        latencyMs: Date.now() - t0,
        startedAt,
      });
      return result;
    } catch (err) {
      void insertAgentRun({
        reportRunId,
        reportId,
        agentName,
        provider,
        model,
        status: err instanceof DOMException && err.name === 'TimeoutError' ? 'timeout' : 'error',
        latencyMs: Date.now() - t0,
        errorClass: err instanceof Error ? err.name : 'Error',
        errorMessage: err instanceof Error ? err.message : String(err),
        startedAt,
      });
      throw err;
    }
  }

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
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: false },
    );
    if (error && error.code !== '23505') {
      terr('[orchestrator] dbInsertGenerating:', error.message);
    }
  }

  async function dbSaveEphemeris(
    lagna: string,
    mahadasha: string,
    antardasha: string,
  ) {
    const { error } = await db
      .from('reports')
      .update({
        lagna_sign: lagna,
        dasha_mahadasha: mahadasha,
        dasha_antardasha: antardasha,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) terr('[orchestrator] dbSaveEphemeris:', error.message);
  }

  async function dbSaveDayScores(forecastDays: ForecastDayIntermediate[]) {
    const dayScores: Record<string, number> = {};
    forecastDays.forEach((d) => {
      if (d.date && typeof d.day_score === 'number') dayScores[d.date] = d.day_score;
    });
    const { error } = await db
      .from('reports')
      .update({ day_scores: dayScores, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) terr('[orchestrator] dbSaveDayScores:', error.message);
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
    const generationTimeSec = Math.round((Date.now() - pipelineT0) / 1000);

    // Retry up to 2 extra times on transient Supabase errors (network blip, 503, etc.)
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        twarn(`[orchestrator] dbSaveFinal retry ${attempt} for ${reportId}`);
      }
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
          generation_time_seconds: generationTimeSec,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .eq('user_id', userId);
      if (!error) return; // success
      lastError = new Error(`dbSaveFinal failed: ${error.message}`);
      terr('[orchestrator] dbSaveFinal attempt', attempt, ':', error.message, 'code:', error.code);
      // Don't retry on hard constraint violations (e.g. FK errors)
      if (error.code && ['23502', '23503', '23505', '42501', '42703'].includes(error.code)) break;
    }
    throw lastError ?? new Error('dbSaveFinal failed after retries');
  }

  try {
    await dbInsertGenerating();
    logStep('db_insert_generating');
    void dbSetProgress(PHASE.EPHEMERIS_FETCHING, 0);

    // ── Resume checkpoint (Pillar 1) ─────────────────────────────────────
    // Load any state persisted by a previous (failed) invocation so we can
    // skip already-completed phases on retry.
    const { checkpoint: existingCheckpoint, state: loadedState } =
      await loadPipelineState(db, reportId);
    let pipelineState: PipelineState = loadedState;
    if (existingCheckpoint) {
      tlog(`[orchestrator] resuming ${reportId} from checkpoint=${existingCheckpoint}`);
      logStep('resume_from_checkpoint', { checkpoint: existingCheckpoint });
    }

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
    await assertWithinBudget('pre_ephemeris');
    onStep({ type: 'step_started', step: 0, message: 'Reading the stars...', detail: 'Calculating planetary positions' });

    let ephemerisData: NatalChartData;
    let mahadasha = 'Unknown';
    let antardasha = 'Unknown';

    // Skip phase if already checkpointed.
    if (phaseAtOrAfter(existingCheckpoint, 'ephemeris') && pipelineState.ephemeris) {
      ephemerisData = pipelineState.ephemeris.data as NatalChartData;
      mahadasha = pipelineState.ephemeris.mahadasha;
      antardasha = pipelineState.ephemeris.antardasha;
      onStep({ type: 'step_completed', step: 0 });
      logStep('ephemeris_resumed');
    } else {
    try {
      // Outbound hop must outlive the ephemeris route (max 90s) + EphemerisAgent (60s to Swiss API).
      const EPH_OUTER_TIMEOUT_MS = 95_000;
      const ephRes = await traceAgentRun('ephemeris:natal-chart', 'ephemeris', () =>
        resilientFetch(
          `${base}/api/agents/ephemeris`,
          {
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
          },
          3,
          2000,
          EPH_OUTER_TIMEOUT_MS,
        ),
      );
      if (!ephRes.ok) {
        const text = await ephRes.text();
        let parsed: { error?: string; success?: boolean } = {};
        try {
          parsed = JSON.parse(text) as { error?: string };
        } catch {
          /* raw body */
        }
        const hint = parsed.error?.trim() || text.trim().slice(0, 500) || 'empty body';
        throw new Error(`Ephemeris HTTP ${ephRes.status}: ${hint}`);
      }
      const ephResult = await ephRes.json();
      ephemerisData = ephResult.data ?? ephResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      terr('[orchestrator][STEP-1] failed:', msg);
      const userMsg = `Birth chart calculation failed: ${msg}. Please try again.`;
      onStep({ type: 'error', message: userMsg });
      try {
        await markReportAsFailed(db, reportId, userId, {
          message: userMsg,
          errorStep: 'ephemeris',
          generationErrorCode: 'EPHEMERIS_DOWN',
          generationErrorAtPhase: PHASE.EPHEMERIS_FETCHING,
        });
      } catch (e) {
        terr('[orchestrator] mark error after ephemeris fail:', e);
      }
      // Throw so the outer catch in start/route.ts receives the error, sets status 500,
      // and the frontend polling sees the report row as 'error' rather than a false 'complete'.
      throw err;
    }

    onStep({ type: 'step_completed', step: 0 });
    logStep('ephemeris_done');
    void dbSetProgress(PHASE.EPHEMERIS_PARSING, 8);

    // Save ephemeris data immediately
    const _dasha = ephemerisData?.current_dasha ?? {};
    mahadasha = _dasha.mahadasha || 'Unknown';
    antardasha = _dasha.antardasha || 'Unknown';
    void dbSaveEphemeris(ephemerisData.lagna, mahadasha, antardasha);

    // Checkpoint: ephemeris phase complete
    await savePipelineCheckpoint(db, reportId, userId, 'ephemeris', {
      ephemeris: { data: ephemerisData, mahadasha, antardasha },
    }, pipelineState);
    pipelineState = { ...pipelineState, ephemeris: { data: ephemerisData, mahadasha, antardasha } };
    } // end ephemeris phase guard

    // Pillar 1 DAG: stop after ephemeris checkpoint if Inngest requested.
    maybeStopAfter('ephemeris');

    // `dasha` is used later for md/ad end dates in commentary payloads.
    // Derive from ephemerisData (works whether freshly computed or restored from state).
    const dasha = ephemerisData?.current_dasha ?? ({} as NatalChartData['current_dasha']);

    // ── STEP 2+3: Nativity + Daily grids (parallel) ──────────────────────
    let nativityProfile: NativityProfile | null = null;
    let forecastDays: ForecastDayIntermediate[];

    if (phaseAtOrAfter(existingCheckpoint, 'nativity_grids') && pipelineState.nativity_grids) {
      nativityProfile = pipelineState.nativity_grids.nativityProfile as NativityProfile | null;
      forecastDays = pipelineState.nativity_grids.forecastDays as ForecastDayIntermediate[];
      onStep({ type: 'step_completed', step: 1 });
      onStep({ type: 'step_completed', step: 2 });
      logStep('nativity_grids_resumed');
      void dbSetProgress(PHASE.NATIVITY_SYNTHESIS, 22);
    } else {
    await assertWithinBudget('pre_nativity_grids');
    onStep({ type: 'step_started', step: 1, message: 'Analysing birth chart & calculating hourly scores...', detail: 'Nativity analysis and daily grid calculation in parallel' });

    const natal_lagna_sign_index = Math.max(0, SIGNS_FOR_LAGNA.indexOf(ephemerisData?.lagna ?? ''));

    let dailyGridResults: (DayGridApiResult | null)[] = [];

    void dbSetProgress(PHASE.NATIVITY_LAGNA, 12);

    await Promise.all([
      // Step 2: Nativity
      (async () => {
        void dbSetProgress(PHASE.NATIVITY_YOGA, 14);
        try {
          const natRes = await traceAgentRun('nativity', 'llm', () =>
            resilientFetch(`${base}/api/agents/nativity`, {
              method: 'POST',
              headers: h,
              body: JSON.stringify({ natalChart: ephemerisData, ragTimeoutMs: 35_000, ...ragModePayload }),
            }, 2, 3000, 160_000),
          );
          if (natRes.ok) {
            const raw = await natRes.json();
            nativityProfile = raw.data ?? raw;
          }
        } catch (err) {
          terr('[orchestrator][STEP-2] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),
      // Step 3: Daily grids
      (async () => {
        try {
          onStep({ type: 'step_started', step: 2, message: 'Scoring hourly windows...', detail: `Computing ${dayCount * 18} hourly slots` });
          dailyGridResults = await Promise.all(
            dateRange.map((d) => dailyGridLimit(async () => {
              try {
                const res = await traceAgentRun('daily-grid', 'ephemeris', () =>
                  resilientFetch(`${base}/api/agents/daily-grid`, {
                    method: 'POST',
                    headers: h,
                    body: JSON.stringify({
                      date: d,
                      currentLat: cLat,
                      currentLng: cLng,
                      timezoneOffset: input.timezoneOffset,
                      natal_lagna_sign_index,
                    }),
                  }, 2, 2000),
                );
                if (!res.ok) return null;
                return await res.json();
              } catch {
                return null;
              }
            })),
          );
          onStep({ type: 'step_completed', step: 2 });
        } catch (err) {
          terr('[orchestrator][STEP-3] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),
    ]);

    onStep({ type: 'step_completed', step: 1 });
    logStep('nativity_grids_done');
    void dbSetProgress(PHASE.NATIVITY_SYNTHESIS, 22);

    forecastDays = dailyGridResults.map((r, i) => {
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
    void dbSetProgress(PHASE.DAILY_SCORES, 25);
    onStep({ type: 'partial_report_updated', field: 'day_scores' });

    // Checkpoint: nativity + grids phase complete
    await savePipelineCheckpoint(db, reportId, userId, 'nativity_grids', {
      nativity_grids: { nativityProfile, forecastDays },
    }, pipelineState);
    pipelineState = { ...pipelineState, nativity_grids: { nativityProfile, forecastDays } };
    } // end nativity_grids phase guard

    // Pillar 1 DAG: stop after nativity_grids checkpoint if Inngest requested.
    maybeStopAfter('nativity_grids');

    await assertWithinBudget('pre_commentary');

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

    // ── STEP 4+5+6+7+8: Commentary + weeks-synthesis (parallel) ─────────
    let allMonthsData: MonthSummary[] = [];
    let weeksSynthData: WeeksSynthApiResult = { weeks: [], period_synthesis: null };

    // Pre-compute weeks payload before the parallel block (depends only on forecastDays)
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

    if (phaseAtOrAfter(existingCheckpoint, 'commentary') && pipelineState.commentary) {
      // Restore commentary results from a previous successful run.
      forecastDays = pipelineState.commentary.forecastDays as ForecastDayIntermediate[];
      allMonthsData = pipelineState.commentary.allMonthsData as MonthSummary[];
      weeksSynthData = pipelineState.commentary.weeksSynthData as WeeksSynthApiResult;
      const savedNd = pipelineState.commentary.nativityData as NativityData;
      if (savedNd?.lagna_analysis) nativityData.lagna_analysis = savedNd.lagna_analysis;
      if (savedNd?.current_dasha_interpretation) {
        nativityData.current_dasha_interpretation = savedNd.current_dasha_interpretation;
      }
      onStep({ type: 'step_completed', step: 3 });
      onStep({ type: 'step_completed', step: 4 });
      onStep({ type: 'step_completed', step: 5 });
      onStep({ type: 'step_completed', step: 6 });
      logStep('commentary_resumed');
      void dbSetProgress(PHASE.WEEKS_SYNTHESIS, 88);
    } else {
    onStep({ type: 'step_started', step: 3, message: 'Writing daily commentary...', detail: 'Analyzing each day with your birth chart' });

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
            ...ragModePayload,
          });

          const nativityHasText =
            (np?.lagna_analysis?.trim().length ?? 0) >= 80 &&
            (np?.current_dasha_interpretation?.trim().length ?? 0) >= 80;

          // Node 22+ rejects `new Response('', { status: 204 })` (null-body status).
          // Use a sentinel 200 response instead to avoid the constructor error.
          const SKIP_NATIVITY_RES = new Response(JSON.stringify({ skipped: true }), { status: 200 });

          const [overviewRes, natTextRes] = await Promise.all([
            commentaryLimit(() => traceAgentRun('daily-overviews', 'llm', () => fetch(`${base}/api/commentary/daily-overviews`, { method: 'POST', headers: h, body: overviewBody, signal: AbortSignal.any([AbortSignal.timeout(140_000), budgetSignal]) }))),
            nativityHasText
              ? Promise.resolve(SKIP_NATIVITY_RES)
              : commentaryLimit(() => traceAgentRun('nativity-text', 'llm', () => fetch(`${base}/api/commentary/nativity-text`, { method: 'POST', headers: h, body: natTextBody, signal: AbortSignal.any([AbortSignal.timeout(80_000), budgetSignal]) }))),
          ]);

          assertNoPartialLlmForPaid(overviewRes, 'daily-overviews', input);
          if (!nativityHasText) {
            assertNoPartialLlmForPaid(natTextRes, 'nativity-text', input);
          }

          const fallbackOverview =
            'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';

          if (overviewRes.ok || overviewRes.status === 206) {
            const overviewData = await overviewRes.json();
            (overviewData.days ?? [] as DayOverviewApiResult[]).forEach((od: DayOverviewApiResult) => {
              const day = forecastDays.find((d) => d.date === od.date);
              if (day) { day.day_theme = od.day_theme ?? ''; day.day_overview = od.day_overview ?? ''; }
            });
          }
          forecastDays.forEach((day) => {
            // Only use fallback if the overview is truly missing/blank.
            // Removing the 'STRATEGY' check — real Claude responses don't contain that word.
            if (!day.day_overview || day.day_overview.trim().length < 40) {
              day.day_overview = fallbackOverview;
              if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
            }
          });

          if (natTextRes.ok) {
            const natTextData = await natTextRes.json();
            if (natTextData.lagna_analysis) nativityData.lagna_analysis = natTextData.lagna_analysis;
            if (natTextData.dasha_interpretation) nativityData.current_dasha_interpretation = natTextData.dasha_interpretation;
          }
          // Always inject deterministic fallback if text is still empty after any LLM attempt
          {
            const lagna = ephemerisData.lagna ?? 'Unknown';
            const md = ephemerisData.current_dasha?.mahadasha ?? 'Unknown';
            const ad = ephemerisData.current_dasha?.antardasha ?? 'Unknown';
            if (!nativityData.lagna_analysis?.trim()) {
              nativityData.lagna_analysis = `${lagna} lagna shapes the native's fundamental disposition. The ${md}-${ad} period is currently active. Refer to the daily and hourly scores for timing guidance.`;
            }
            if (!nativityData.current_dasha_interpretation?.trim()) {
              nativityData.current_dasha_interpretation = `${md} Mahadasha with ${ad} Antardasha is active. Use high-score days and benefic horas for important actions.`;
            }
          }
          void dbSetProgress(PHASE.DAILY_BATCH_3, 50);
          onStep({ type: 'partial_report_updated', field: 'daily_overviews' });
        } catch (e) {
          terr('[orchestrator][STEP-4+5] failed:', e instanceof Error ? e.message : String(e));
          const fallback =
            'FALLBACK DAY — USE HOURLY TABLE. STRATEGY: Use peak hora windows from the hourly table. Avoid Rahu Kaal. Schedule high-stakes work in slots with score ≥ 75.';
          forecastDays.forEach((day) => {
            day.day_overview = day.day_overview || fallback;
            if (!day.day_theme) day.day_theme = 'Use hourly scores and peak windows.';
          });
        } finally {
          // Guarantee nativity text is never blank regardless of LLM outcome or abort
          const lagna = ephemerisData.lagna ?? 'Unknown';
          const md = ephemerisData.current_dasha?.mahadasha ?? 'Unknown';
          const ad = ephemerisData.current_dasha?.antardasha ?? 'Unknown';
          if (!nativityData.lagna_analysis?.trim()) {
            nativityData.lagna_analysis = `${lagna} lagna shapes the native's fundamental disposition. The ${md}-${ad} period is currently active. Refer to the daily and hourly scores for timing guidance.`;
          }
          if (!nativityData.current_dasha_interpretation?.trim()) {
            nativityData.current_dasha_interpretation = `${md} Mahadasha with ${ad} Antardasha is active. Use high-score days and benefic horas for important actions.`;
          }
        }
      })(),

      // Step 6: Hourly commentary — 3 parallel batches of ~10 days each (3× faster than 1 × 30-day call)
      (async () => {
        onStep({ type: 'step_started', step: 4, message: 'Writing hourly commentary...', detail: 'Three parallel batches for all forecast days' });
        void dbSetProgress(PHASE.HOURLY_GRID, 53);
        try {
          type BatchSlot = { slot_index: number; commentary?: string; commentary_short?: string };
          type BatchDay = { dayIndex: number; slots?: BatchSlot[] };

          const CHUNK_SIZE = 10;
          const allDaysInput = forecastDays.map((day, i) => ({
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
          }));

          const chunks: typeof allDaysInput[] = [];
          for (let i = 0; i < allDaysInput.length; i += CHUNK_SIZE) {
            chunks.push(allDaysInput.slice(i, i + CHUNK_SIZE));
          }

          const HOURLY_BATCH_SLUGS = [
            PHASE.HOURLY_BATCH_1, PHASE.HOURLY_BATCH_2, PHASE.HOURLY_BATCH_3,
            PHASE.HOURLY_BATCH_4, PHASE.HOURLY_BATCH_5, PHASE.HOURLY_BATCH_6,
          ] as const;
          const HOURLY_BATCH_PCTS = [55, 58, 61, 63, 65, 65] as const;

          const chunkResults = await Promise.all(
            chunks.map((chunkDays, chunkIdx) => commentaryLimit(async () => {
              const batchSlug = HOURLY_BATCH_SLUGS[Math.min(chunkIdx, HOURLY_BATCH_SLUGS.length - 1)];
              const batchPct = HOURLY_BATCH_PCTS[Math.min(chunkIdx, HOURLY_BATCH_PCTS.length - 1)];
              void dbSetProgress(batchSlug, batchPct);
              const batchBody = JSON.stringify({
                lagnaSign: ephemerisData.lagna,
                mahadasha,
                antardasha,
                days: chunkDays,
              });
              const res = await traceAgentRun('hourly-batch', 'llm', () => fetch(`${base}/api/commentary/hourly-batch`, {
                method: 'POST',
                headers: h,
                signal: AbortSignal.any([AbortSignal.timeout(160_000), budgetSignal]),
                body: batchBody,
              }));
              assertNoPartialLlmForPaid(res, `hourly-batch#${chunkIdx + 1}`, input);
              if (res.ok || res.status === 206) {
                const json = (await res.json()) as { days?: BatchDay[] };
                return json.days ?? [];
              }
              return [] as BatchDay[];
            })),
          );

          const hourlyResults: BatchDay[] = chunkResults.flat();

          hourlyResults.forEach(({ dayIndex, slots }) => {
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
          void dbSetProgress(PHASE.HOURLY_BATCH_6, 65);
          onStep({ type: 'partial_report_updated', field: 'hourly_commentary' });
        } catch (err) {
          terr('[orchestrator][STEP-6] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),

      // Step 7: Monthly
      (async () => {
        onStep({ type: 'step_started', step: 5, message: 'Building monthly forecast...', detail: 'Generating 12-month oracle' });
        try {
          const startDate = new Date(forecastDays[0].date);

          // ── Compute key transit ingresses from available daily grid data + known 2026 dates ──
          // Known slow-planet ingress dates for 2026 (sidereal Lahiri).
          // These are the authoritative ingress dates that don't change per user.
          const KNOWN_INGRESSES_2026: Array<{ planet: string; sign: string; date: string; note: string }> = [
            { planet: 'Jupiter', sign: 'Taurus',      date: '2026-05-14', note: 'Jupiter enters Taurus (H? for lagna) — expansion of resources, 12-yr cycle' },
            { planet: 'Saturn',  sign: 'Aries',       date: '2025-03-29', note: 'Saturn in Aries — discipline, karmic pressure on action' },
            { planet: 'Saturn',  sign: 'Pisces',      date: '2025-03-29', note: 'Saturn in Pisces' },
            { planet: 'Rahu',    sign: 'Aquarius',    date: '2025-05-18', note: 'Rahu in Aquarius — ambition toward networks and technology' },
            { planet: 'Ketu',    sign: 'Leo',         date: '2025-05-18', note: 'Ketu in Leo — spiritual detachment from ego, fame' },
            { planet: 'Mars',    sign: 'Cancer',      date: '2026-02-23', note: 'Mars in Cancer — high-energy home/emotional focus' },
            { planet: 'Mars',    sign: 'Leo',         date: '2026-04-11', note: 'Mars in Leo — bold self-expression, career momentum' },
            { planet: 'Mars',    sign: 'Virgo',       date: '2026-05-27', note: 'Mars in Virgo — precision, health, service-oriented action' },
            { planet: 'Mars',    sign: 'Libra',       date: '2026-07-13', note: 'Mars in Libra — partnerships, contracts, assertive diplomacy' },
            { planet: 'Mars',    sign: 'Scorpio',     date: '2026-09-01', note: 'Mars in Scorpio — depth, investigation, hidden resources' },
            { planet: 'Mars',    sign: 'Sagittarius', date: '2026-10-18', note: 'Mars in Sagittarius — expansion, philosophy, long-distance action' },
            { planet: 'Mars',    sign: 'Capricorn',   date: '2026-12-01', note: 'Mars exalted in Capricorn — peak professional drive' },
            { planet: 'Sun',     sign: 'Aries',       date: '2026-04-14', note: 'Sun enters Aries (sidereal) — solar new year, identity surge' },
            { planet: 'Sun',     sign: 'Taurus',      date: '2026-05-15', note: 'Sun in Taurus — stabilisation, financial focus' },
            { planet: 'Sun',     sign: 'Gemini',      date: '2026-06-15', note: 'Sun in Gemini — communication, learning peaks' },
            { planet: 'Sun',     sign: 'Cancer',      date: '2026-07-16', note: 'Sun in Cancer — home, emotions, nurturing' },
            { planet: 'Sun',     sign: 'Leo',         date: '2026-08-17', note: 'Sun in Leo (own sign) — leadership, authority at peak' },
            { planet: 'Sun',     sign: 'Virgo',       date: '2026-09-17', note: 'Sun in Virgo — analysis, health, service' },
            { planet: 'Sun',     sign: 'Libra',       date: '2026-10-17', note: 'Sun debilitated in Libra — compromise, partnership focus' },
            { planet: 'Sun',     sign: 'Scorpio',     date: '2026-11-16', note: 'Sun in Scorpio — depth, hidden matters surface' },
            { planet: 'Sun',     sign: 'Sagittarius', date: '2026-12-16', note: 'Sun in Sagittarius — expansion, optimism, dharma' },
          ];

          // Build a lookup: YYYY-MM → list of ingress hints
          const lagna = ephemerisData.lagna;
          const SIGNS_WHEEL = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
          const houseFromLagna = (sign: string, lagnaSign: string): number => {
            const li = SIGNS_WHEEL.indexOf(lagnaSign);
            const si = SIGNS_WHEEL.indexOf(sign);
            if (li < 0 || si < 0) return 0;
            return ((si - li + 12) % 12) + 1;
          };

          const ingressByMonth: Record<string, string[]> = {};
          for (const ing of KNOWN_INGRESSES_2026) {
            const ym = ing.date.substring(0, 7);
            const house = houseFromLagna(ing.sign, lagna);
            const d = new Date(ing.date);
            const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
            let hint = `${ing.planet} enters ${ing.sign} ${dayStr}`;
            if (house > 0) hint += ` (H${house} for ${lagna} lagna)`;
            if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
            ingressByMonth[ym].push(hint);
          }

          // Also detect ingresses from actual daily-grid planet_positions (for the report window)
          type PlanetPos = { sign: string; house: number; degree: number };
          type PlanetPositions = { planets?: Record<string, PlanetPos> };
          for (let di = 1; di < forecastDays.length; di++) {
            const prev = forecastDays[di - 1];
            const curr = forecastDays[di];
            const pp = curr.planet_positions as PlanetPositions | undefined;
            const prevPp = prev.planet_positions as PlanetPositions | undefined;
            if (!pp?.planets || !prevPp?.planets) continue;
            for (const planet of ['Sun', 'Mars', 'Jupiter', 'Saturn']) {
              const currSign = pp.planets[planet]?.sign;
              const prevSign = prevPp.planets[planet]?.sign;
              if (currSign && prevSign && currSign !== prevSign) {
                const ym = curr.date.substring(0, 7);
                const house = houseFromLagna(currSign, lagna);
                const d = new Date(curr.date);
                const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
                let hint = `${planet} enters ${currSign} ${dayStr}`;
                if (house > 0) hint += ` (H${house} for ${lagna} lagna)`;
                if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
                // Avoid duplicating if already added from KNOWN_INGRESSES_2026
                if (!ingressByMonth[ym].some(h => h.startsWith(`${planet} enters ${currSign}`))) {
                  ingressByMonth[ym].push(hint);
                }
              }
            }
          }

          const allMonths = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(startDate);
            d.setMonth(d.getMonth() + i);
            const ym = d.toISOString().substring(0, 7);
            const hints = ingressByMonth[ym] ?? [];
            return {
              month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
              month_index: i,
              key_transits_hint: hints.join('; '),
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
            commentaryLimit(() => traceAgentRun('months-first', 'llm', () => fetch(`${base}/api/commentary/months-first`, {
              method: 'POST', headers: h, signal: AbortSignal.any([AbortSignal.timeout(200_000), budgetSignal]),
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(0, 6) }),
            }))),
            commentaryLimit(() => traceAgentRun('months-second', 'llm', () => fetch(`${base}/api/commentary/months-second`, {
              method: 'POST', headers: h, signal: AbortSignal.any([AbortSignal.timeout(200_000), budgetSignal]),
              body: JSON.stringify({ ...refPayload, months: allMonths.slice(6, 12) }),
            }))),
          ]);

          assertNoPartialLlmForPaid(m1Res, 'months-first', input);
          assertNoPartialLlmForPaid(m2Res, 'months-second', input);

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
          void dbSetProgress(PHASE.MONTHS_SYNTHESIS, 75);
          onStep({ type: 'partial_report_updated', field: 'months' });
        } catch (e) {
          terr('[orchestrator][STEP-7] failed:', e instanceof Error ? e.message : String(e));
          if (!allowPartialLlmFallbackForPlan(input)) {
            throw e instanceof Error ? e : new Error(String(e));
          }
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

      // Step 8: Weeks + Synthesis (now parallel with months/commentary)
      (async () => {
        onStep({ type: 'step_started', step: 6, message: 'Writing period synthesis...', detail: '6 weekly summaries + strategic windows' });
        try {
          const synthRes = await commentaryLimit(() => traceAgentRun('weeks-synthesis', 'llm', () => fetch(`${base}/api/commentary/weeks-synthesis`, {
            method: 'POST',
            headers: h,
            signal: AbortSignal.any([AbortSignal.timeout(240_000), budgetSignal]),
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
          })));
          assertNoPartialLlmForPaid(synthRes, 'weeks-synthesis', input);
          if (synthRes.ok) {
            const w = (await synthRes.json()) as { partial?: boolean } & WeeksSynthApiResult;
            if (!allowPartialLlmFallbackForPlan(input) && w.partial) {
              throw new Error('weeks-synthesis: `partial: true` in body — model did not return full synthesis.');
            }
            weeksSynthData = w;
          } else {
            if (!allowPartialLlmFallbackForPlan(input)) {
              throw new Error(
                `weeks-synthesis: HTTP ${synthRes.status} — paid report cannot continue without week narratives.`,
              );
            }
            terr('[orchestrator][STEP-8] weeks-synthesis failed:', synthRes.status);
          }
        } catch (err) {
          if (!allowPartialLlmFallbackForPlan(input)) {
            throw err instanceof Error ? err : new Error(String(err));
          }
          terr('[orchestrator][STEP-8] failed:', err instanceof Error ? err.message : String(err));
        }
      })(),
    ]);

    const weekCountBeforePad = (weeksSynthData.weeks ?? []).length;
    weeksSynthData = padWeeksSynthesisToSix(weeksSynthData, weeksPayload, twarn);
    if ((weeksSynthData.weeks ?? []).length > weekCountBeforePad) {
      void appendReportGenerationLog({
        reportId,
        userId,
        entry: {
          ts: new Date().toISOString(),
          elapsed_ms: Date.now() - pipelineT0,
          level: 'warn',
          step: 'weeks_synthesis_padded',
          message: `Extended weeks from ${weekCountBeforePad} to 6 using daily score payload`,
          detail: { pipeline_run: pipelineRunLabel, had: weekCountBeforePad, now: (weeksSynthData.weeks ?? []).length },
        },
      });
    }
    assertPaidMonthlySectionNotPlaceholder(allMonthsData, input);
    assertPaidWeeksSynthesisPresent(weeksSynthData, input);

    onStep({ type: 'step_completed', step: 3 });
    logStep('commentary_months_done');
    void dbSetProgress(PHASE.WEEKS_SYNTHESIS, 88);
    // No assertWithinBudget here — parallel block may legitimately run close to the budget;
    // we always proceed to assembly to save whatever was generated.

    // Checkpoint: commentary phase complete (expensive LLM work — never redo this)
    await savePipelineCheckpoint(db, reportId, userId, 'commentary', {
      commentary: {
        forecastDays,
        allMonthsData,
        weeksSynthData,
        nativityData,
      },
    }, pipelineState);
    pipelineState = {
      ...pipelineState,
      commentary: { forecastDays, allMonthsData, weeksSynthData, nativityData },
    };
    } // end commentary phase guard

    // Pillar 1 DAG: stop after commentary checkpoint if Inngest requested.
    maybeStopAfter('commentary');

    const weekList = (weeksSynthData.weeks ?? []).map((w, i: number) => {
      const wl = w.week_label ?? `Week ${i + 1}`;
      // Floor at 35 so weeks never show 0/100 for empty or short plans
      const sc = Math.max(35, w.overall_score ?? w.score ?? 65);
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
    logStep('weeks_synthesis_done');

    // ── STEP 9: Validation ────────────────────────────────────────────────
    // Skip validation if already past 85% of budget — prioritize saving the report.
    const budgetUsed = Date.now() - pipelineT0;
    const skipValidationBudget = budgetUsed > budgetMs * 0.85;
    if (skipValidationBudget) {
      twarn(`[orchestrator] skipping validation — ${Math.round(budgetUsed / 1000)}s elapsed (${Math.round((budgetUsed / budgetMs) * 100)}% of budget)`);
    }
    if (!skipValidation && !skipValidationBudget) {
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

        const valRes = await traceAgentRun('report-validation', 'llm', () => fetch(`${base}/api/validation/report`, {
          method: 'POST',
          headers: h,
          signal: AbortSignal.any([AbortSignal.timeout(90_000), budgetSignal]),
          body: JSON.stringify(validationBody),
        }));

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
        void dbSetProgress(PHASE.FINALIZE_PERSIST, 93);
        onStep({ type: 'step_completed', step: 9 });
      } catch (err) {
        terr('[orchestrator][STEP-9] validation error:', err);
      }
    }

    // ── STEP 10: Assemble final report ────────────────────────────────────
    // No budget check here — assembly is pure in-memory work (no LLM calls), always attempt it.
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
        day_label_tier: getDayOutcomeTier(d.day_score ?? 50).tier,
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
          'This forecast period holds clear patterns for your career, relationships, finances, and wellbeing. Use the highest-scoring daily windows for important decisions and avoid starting anything new during Rahu Kaal.',
        strategic_windows: [],
        caution_dates: [],
        domain_priorities: {
          career: 'Use your highest-scoring days and Mars hora windows for bold career moves and proposals. Avoid low-score days for irreversible decisions.',
          money: 'Best financial timing falls on high-score days. Avoid new financial commitments during Rahu Kaal or low-score periods.',
          health: 'Rest and recovery are most effective on low-score days. Protect your energy during the most demanding stretches.',
          relationships: 'Important conversations land best on high-score days. Avoid pressing sensitive topics during low-score periods or Rahu Kaal.',
        },
        closing_paragraph: 'Align your key moves with your highest-scoring days and best hourly windows. Small timing adjustments compound into meaningful results over the forecast period.',
      },
    };

    const finalReportTyped = finalReport as unknown as ReportData;
    const errors = validateReportData(finalReportTyped);
    if (errors.length > 0) twarn('[orchestrator] validation issues:', errors);

    // Save to DB
    const payloadBytes = JSON.stringify(finalReport).length;
    tlog(`[orchestrator] report payload size: ${(payloadBytes / 1024).toFixed(0)} KB for ${reportId}`);
    void dbSetProgress(PHASE.FINALIZE_PERSIST, 97);
    await dbSaveFinal(finalReport as unknown as Record<string, unknown>);
    onStep({ type: 'step_completed', step: 10 });
    logStep('report_saved_complete');

    // Clear checkpoint state now that the report is fully saved.
    void clearPipelineCheckpoint(db, reportId, userId);

    // Emit completion
    onStep({ type: 'report_completed', reportData: finalReportTyped });
  } catch (err) {
    // Pillar 1 DAG: intentional phase stop — surface to caller, don't mark error.
    if (err instanceof PipelinePhaseStopSignal) {
      logStep('phase_stop_signal', { phase: err.phase });
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Failed to generate report';
    terr('[orchestrator] fatal error:', message);
    void appendReportGenerationLog({
      reportId,
      userId,
      entry: {
        ts: new Date().toISOString(),
        elapsed_ms: Date.now() - pipelineT0,
        level: 'error',
        step: 'pipeline_fatal',
        message,
        detail: {
          pipeline_run: pipelineRunLabel,
          generation_trace_id: correlationId,
          name: err instanceof Error ? err.name : 'Error',
          stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
        },
      },
    });
    onStep({ type: 'error', message });
    try {
      await markReportAsFailed(db, reportId, userId, {
        message,
        errorStep: 'pipeline_fatal',
        generationErrorCode: inferReportGenerationErrorCode(message, 'pipeline_fatal'),
        generationErrorAtPhase: lastGenerationStep,
      });
    } catch (markErr) {
      terr('[orchestrator] failed to mark report as error:', markErr);
    }
    // Re-throw so callers (start/route.ts) can return HTTP 500 and the frontend
    // knows the pipeline failed rather than falsely receiving a 200 "complete".
    throw err;
  } finally {
    // Always cancel the hard-kill timer so it doesn't fire after a clean finish.
    if (hardKillTimer !== null) {
      clearTimeout(hardKillTimer);
      hardKillTimer = null;
    }
  }
}
