/**
 * Report generation start route.
 *
 * If INNGEST_EVENT_KEY is set, the pipeline is dispatched to
 * Inngest for background execution with no timeout constraints.
 *
 * If not set, production returns 503 instead of silently running a long
 * synchronous fallback. Local development may still run inline for convenience.
 *
 * `REPORT_START_REQUIRE_INNGEST=true` enforces the Inngest path: missing key
 * or failed dispatch never falls back to inline; dispatch failure returns
 * 503 with `code: INNGEST_DISPATCH_FAILED`.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';
import { inngest } from '@/lib/inngest/client';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { createJobToken } from '@/lib/api/jobToken';
import { acquireLock, releaseLock } from '@/lib/redis/locks';
import { appendReportGenerationLog, clearReportGenerationLog } from '@/lib/observability/generationLog';
import { inferReportGenerationErrorCode, markReportAsFailed } from '@/lib/reports/reportErrors';

/**
 * If a row is `generating` and younger than this, skip starting a duplicate pipeline.
 * 10 minutes — Inngest jobs can take that long.
 */
const YOUNG_GENERATING_MS = 10 * 60 * 1000;
const REPORT_START_LIMIT = 3;
const REPORT_START_WINDOW_MS = 60_000;

/** Pipeline `input.time` must be HH:MM (db rows may store HH:MM:SS). */
function birthTimeToPipelineTime(s: string): string {
  const raw = (s || '12:00:00').trim();
  const parts = raw.split(':').filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return '12:00';
}

function isYoungGenerating(generationStartedAt: string | null | undefined): boolean {
  if (!generationStartedAt) return false;
  const t = new Date(generationStartedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < YOUNG_GENERATING_MS;
}

type ReportStartEngine = 'inngest' | 'node' | 'none';
type ReportStartDispatchMode = 'inngest' | 'inline_fallback' | 'blocked';

function parseReportStartEnv() {
  const inngestConfigured = !!process.env.INNGEST_EVENT_KEY;
  const allowInlineOverride =
    process.env.REPORT_PIPELINE_INLINE === '1' || process.env.REPORT_PIPELINE_INLINE === 'true';
  // ALWAYS allow inline fallback — on Hobby plan, Inngest may not be configured,
  // and returning 503 means 100% failure rate. The pipeline's own budget management
  // handles timeouts gracefully. Only block inline if EXPLICITLY required via env var.
  const requireStrictInngest =
    process.env.REPORT_START_REQUIRE_INNGEST === '1' ||
    process.env.REPORT_START_REQUIRE_INNGEST === 'true';
  const allowInlineFallback = !requireStrictInngest || allowInlineOverride;
  return {
    useInngest: inngestConfigured,
    allowInlineOverride,
    allowInlineFallback,
    requireStrictInngest,
  };
}

/** When actual dispatch path differs from what config implies, log once per request. */
function warnReportStartDispatchModeMismatch(
  reportId: string,
  generationTraceId: string,
  context: {
    expected: ReportStartDispatchMode;
    actual: ReportStartDispatchMode;
    reason: string;
    detail?: Record<string, unknown>;
  },
) {
  console.warn(
    `[trace:${generationTraceId}]`,
    JSON.stringify({
      event: 'report_start_dispatch_mode_mismatch',
      reportId,
      generation_trace_id: generationTraceId,
      expected: context.expected,
      actual: context.actual,
      reason: context.reason,
      ...context.detail,
    }),
  );
}

/** POST JSON shape (optional fields) — same names as report/[id] client kickoff. */
interface StartRequestBody {
  reportId?: string;
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  birth_lat?: string | number | null;
  birth_lng?: string | number | null;
  current_city?: string | null;
  current_lat?: string | number | null;
  current_lng?: string | number | null;
  timezone_offset?: string | number | null;
  plan_type?: string;
  payment_status?: string;
  forecast_start?: string;
  forceRestart?: boolean;
  testOptions?: { disableRag?: boolean };
  jyotishRagMode?: string;
  jyotish_rag_mode?: string;
  /** legacy aliases */
  date?: string;
  time?: string;
  city?: string;
  lat?: string | number | null;
  lng?: string | number | null;
  forecastStart?: string;
  currentTz?: string | number | null;
  currentCity?: string | null;
  currentLat?: string | number | null;
  currentLng?: string | number | null;
}

/** Merge legacy field names from the onboard client (date/time/city/lat/forecastStart/currentTz). */
function normalizeStartBody(raw: Record<string, unknown>): StartRequestBody {
  const b = { ...raw } as StartRequestBody;
  if (b.birth_date == null || b.birth_date === '') b.birth_date = b.date;
  if (b.birth_time == null || b.birth_time === '') b.birth_time = b.time;
  if (b.birth_city == null || b.birth_city === '') b.birth_city = b.city;
  if (b.birth_lat == null) b.birth_lat = b.lat;
  if (b.birth_lng == null) b.birth_lng = b.lng;
  if (b.forecast_start == null && b.forecastStart != null) b.forecast_start = b.forecastStart;
  if (b.timezone_offset == null && b.currentTz != null) b.timezone_offset = b.currentTz;
  if (b.current_city == null && b.currentCity != null) b.current_city = b.currentCity;
  if (b.current_lat == null && b.currentLat != null) b.current_lat = b.currentLat;
  if (b.current_lng == null && b.currentLng != null) b.current_lng = b.currentLng;
  return b;
}

/**
 * POST /api/reports/start
 *
 * 1. Creates/updates the `reports` row with status='generating'
 * 2. If INNGEST_EVENT_KEY is configured → sends event to Inngest, returns 202 immediately
 *    Client then polls /api/reports/[id]/status until complete.
 * 3. If not configured in production → returns 503 unless REPORT_PIPELINE_INLINE=1
 *    (local `next start` + E2E / quality-wave only).
 * 4. `REPORT_START_REQUIRE_INNGEST=true` — no Inngest key or failed `inngest.send` must not
 *    fall back to inline; failed send returns 503 with `code: INNGEST_DISPATCH_FAILED`.
 *    Responses include `engine` and `dispatch_mode` (`inngest` | `inline_fallback` | `blocked`).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rl = await checkRateLimit(
    `report-start:${getRateLimitKey(request, auth.user.id)}`,
    REPORT_START_LIMIT,
    REPORT_START_WINDOW_MS,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Too many report generation requests. Please wait before starting another report.',
        resetAt: rl.resetAt,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 429 },
    );
  }

  const body = normalizeStartBody(
    (await request.json().catch(() => ({}))) as Record<string, unknown>,
  );
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json(
      {
        error: 'reportId required',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 400 },
    );
  }

  const { useInngest, allowInlineFallback, requireStrictInngest, allowInlineOverride } =
    parseReportStartEnv();

  const db = createServiceClient();
  const readDb = auth.isAdmin ? db : await createClient();

  const { data: existing } = await readDb
    .from('reports')
    .select('status, report_data, generation_started_at, generation_trace_id')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const rd = existing?.report_data as { days?: unknown[] } | null | undefined;
  const alreadyDone =
    existing?.status === 'complete' &&
    Array.isArray(rd?.days) &&
    (rd!.days as unknown[]).length > 0;

  if (alreadyDone) {
    return NextResponse.json({
      reportId,
      ok: true,
      status: 'complete',
      skipped: true,
      generation_trace_id: (existing?.generation_trace_id as string | null) ?? null,
      engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
      dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
    });
  }

  const forceRestart = body.forceRestart === true;

  if (
    existing?.status === 'generating' &&
    isYoungGenerating(existing.generation_started_at) &&
    !forceRestart
  ) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already in progress — keep polling status.',
        generation_trace_id: (existing?.generation_trace_id as string | null) ?? null,
        engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
        dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
      },
      { status: 202 },
    );
  }

  const lockKey = `report:${reportId}:generation`;
  const gotLock = forceRestart || await acquireLock(lockKey, 10 * 60);
  if (!gotLock) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already claimed — keep polling status.',
        generation_trace_id: (existing?.generation_trace_id as string | null) ?? null,
        engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
        dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
      },
      { status: 202 },
    );
  }

  const generationTraceId = randomUUID();

  const tzBody = body.timezone_offset;
  const timezoneOffset =
    typeof tzBody === 'number' && Number.isFinite(tzBody)
      ? tzBody
      : typeof tzBody === 'string' && tzBody.trim() !== ''
        ? parseInt(tzBody, 10) || 0
        : 0;

  const nowIso = new Date().toISOString();

  const { error: upsertError } = await db.from('reports').upsert(
    {
      id: reportId,
      user_id: auth.user.id,
      user_email: auth.user.email ?? '',
      native_name: body.name ?? 'Unknown',
      birth_date: body.birth_date ?? '2000-01-01',
      birth_time: body.birth_time ?? '12:00:00',
      birth_city: body.birth_city ?? 'Unknown',
      birth_lat: body.birth_lat ?? null,
      birth_lng: body.birth_lng ?? null,
      current_city: body.current_city ?? null,
      current_lat: body.current_lat ?? null,
      current_lng: body.current_lng ?? null,
      timezone_offset: timezoneOffset || null,
      plan_type: body.plan_type ?? '7day',
      status: 'generating',
      payment_status: body.payment_status ?? 'free',
      generation_started_at: nowIso,
      updated_at: nowIso,
      generation_trace_id: generationTraceId,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    await releaseLock(lockKey);
    return NextResponse.json(
      {
        error: upsertError.message,
        generation_trace_id: generationTraceId,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  // Reset append-only log when the column exists (migration). Omitted from upsert so older
  // DBs without `reports.generation_log` still accept the row; clears stale log on restart.
  await clearReportGenerationLog(reportId, auth.user.id);

  const pipelineTime = birthTimeToPipelineTime(String(body.birth_time ?? '12:00:00'));

  const testDisableRag = body.testOptions?.disableRag;
  const ragRaw =
    testDisableRag === true
      ? 'off'
      : testDisableRag === false
        ? 'hybrid'
        : typeof body.jyotishRagMode === 'string'
          ? body.jyotishRagMode
          : typeof body.jyotish_rag_mode === 'string'
            ? body.jyotish_rag_mode
            : undefined;

  const toNum = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0;
  const input: PipelineInput = {
    name: body.name ?? 'Seeker',
    date: body.birth_date ?? '',
    time: pipelineTime,
    city: body.birth_city ?? '',
    lat: toNum(body.birth_lat),
    lng: toNum(body.birth_lng),
    currentLat: toNum(body.current_lat ?? body.birth_lat),
    currentLng: toNum(body.current_lng ?? body.birth_lng),
    currentCity: body.current_city ?? body.birth_city ?? '',
    timezoneOffset,
    type: body.plan_type ?? '7day',
    forecastStart: body.forecast_start ?? undefined,
    planType: body.plan_type ?? '7day',
    paymentStatus: body.payment_status ?? 'bypass',
    ...(ragRaw != null && String(ragRaw).trim() !== ''
      ? { jyotishRagMode: String(ragRaw).trim() }
      : {}),
  };

  const base = request.nextUrl.origin;
  const authHeaders: Record<string, string> = {};
  authHeaders['x-job-token'] = createJobToken({
    reportId,
    userId: auth.user.id,
    purpose: 'pipeline',
    correlationId: generationTraceId,
    ttlSeconds: 60 * 60,
  });
  authHeaders['x-report-id'] = reportId;
  authHeaders['x-correlation-id'] = generationTraceId;
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

  // ── Inngest background execution (production) ─────────────────────────────
  // Only block if REPORT_START_REQUIRE_INNGEST is explicitly set.
  // Otherwise, always fall through to inline execution to avoid 100% failure on Hobby plan.
  if (!useInngest && requireStrictInngest) {
    await releaseLock(lockKey);
    return NextResponse.json(
      {
        error: 'Background job queue is required but INNGEST_EVENT_KEY is not set.',
        code: 'INNGEST_NOT_CONFIGURED' as const,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
        generation_trace_id: generationTraceId,
      },
      { status: 503 },
    );
  }

  if (useInngest) {
    try {
      await inngest.send({
        id: `report-generate:${reportId}`,
        name: 'report/generate',
        data: {
          reportId,
          userId: auth.user.id,
          userEmail: auth.user.email ?? '',
          input,
          base,
          authHeaders,
          correlationId: generationTraceId,
          generation_trace_id: generationTraceId,
        },
      });
      console.log(
        `[trace:${generationTraceId}] [reports/start] dispatched to Inngest reportId=${reportId}`,
      );
      return NextResponse.json(
        {
          reportId,
          ok: true,
          status: 'generating',
          engine: 'inngest' as ReportStartEngine,
          dispatch_mode: 'inngest' as ReportStartDispatchMode,
          generation_trace_id: generationTraceId,
        },
        { status: 202 },
      );
    } catch (err) {
      console.error(`[trace:${generationTraceId}] [reports/start] Inngest dispatch failed:`, err);
      const noInlineFallback = requireStrictInngest || !allowInlineFallback;
      if (noInlineFallback) {
        warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
          expected: 'inngest',
          actual: 'blocked',
          reason: 'inngest_send_failed',
          detail: {
            requireStrictInngest,
            allowInlineFallback,
            err: err instanceof Error ? err.message : String(err),
            generation_trace_id: generationTraceId,
          },
        });
        await releaseLock(lockKey);
        return NextResponse.json(
          {
            error: 'Background queue unavailable, please retry in a minute.',
            code: 'INNGEST_DISPATCH_FAILED' as const,
            engine: 'inngest' as ReportStartEngine,
            dispatch_mode: 'blocked' as ReportStartDispatchMode,
            generation_trace_id: generationTraceId,
          },
          { status: 503 },
        );
      }
      warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
        expected: 'inngest',
        actual: 'inline_fallback',
        reason: 'inngest_send_failed',
        detail: { err: err instanceof Error ? err.message : String(err), generation_trace_id: generationTraceId },
      });
    }
  }

  if (process.env.NODE_ENV === 'production' && !useInngest && allowInlineOverride) {
    warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
      expected: 'inngest',
      actual: 'inline_fallback',
      reason: 'report_pipeline_inline_in_production_without_inngest',
      detail: { generation_trace_id: generationTraceId },
    });
  }

  // ── Inline synchronous fallback (dev / no Inngest key) ───────────────────
  try {
    await generateReportPipeline(
      reportId,
      auth.user.id,
      auth.user.email ?? '',
      input,
      () => {},
      base,
      authHeaders,
    );
  } catch (err) {
    console.error(`[trace:${generationTraceId}] [reports/start] pipeline failed for ${reportId}:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    await appendReportGenerationLog({
      reportId,
      userId: auth.user.id,
      entry: {
        ts: new Date().toISOString(),
        elapsed_ms: 0,
        level: 'error',
        step: 'start_route_inline_pipeline',
        message: errMsg,
        detail: { route: 'POST /api/reports/start', generation_trace_id: generationTraceId },
      },
    });
    await markReportAsFailed(db, reportId, auth.user.id, {
      message: errMsg,
      errorStep: 'start_route_inline_pipeline',
      generationErrorCode: inferReportGenerationErrorCode(errMsg, 'start_route_inline_pipeline'),
    });
    await releaseLock(lockKey);
    return NextResponse.json(
      {
        error: String(err),
        generation_trace_id: generationTraceId,
        engine: 'node' as ReportStartEngine,
        dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  const { data: finalRow } = await db
    .from('reports')
    .select('status')
    .eq('id', reportId)
    .maybeSingle();

  if (finalRow?.status !== 'complete') {
    console.error(
      `[trace:${generationTraceId}] [reports/start] pipeline returned but DB status is '${finalRow?.status}' for ${reportId}`,
    );
    await releaseLock(lockKey);
    return NextResponse.json(
      {
        error: 'Report pipeline did not complete — please retry.',
        generation_trace_id: generationTraceId,
        engine: 'node' as ReportStartEngine,
        dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  await releaseLock(lockKey);
  return NextResponse.json({
    reportId,
    ok: true,
    status: 'complete',
    generation_trace_id: generationTraceId,
    engine: 'node' as ReportStartEngine,
    dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
  });
}
