export const maxDuration = 75;
export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { extractUserVisibleReportError } from '@/lib/reports/reportErrors';
import {
  finalizeReportStatusResponse,
  nextPollAfterMsForPayload,
  peekReportStatusCache,
  rememberReportStatusCache,
  runReportStatusSingleflight,
  takeReportStatusRateLimit,
  type ReportStatusCachePayload,
} from '@/lib/reports/reportStatusPoll';

/** Per-attempt PostgREST read timeouts (ms). Total worst-case fits within `maxDuration`. */
const READ_TIMEOUTS_MS = [12_000, 20_000, 30_000] as const;

/** Delays after attempt 0 and 1 before retrying (ms). */
const RETRY_BACKOFF_MS = [300, 800] as const;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type FetchReportRowFailure = {
  error: 'DB fetch failed';
  cause: string;
  attemptCount: number;
  httpStatus?: number;
  detail?: string;
};

type FetchReportRowSuccess = {
  row: Record<string, unknown> | null;
  attemptCount: number;
};

type FetchReportRowResult =
  | { ok: true; value: FetchReportRowSuccess }
  | { ok: false; value: FetchReportRowFailure; diagnostics: FetchFailureDiagnostics };

type FetchFailureDiagnostics = {
  elapsedMs: number;
  timeout: boolean;
  http: boolean;
  nonJson: boolean;
};

/** Raw PostgREST read with `Prefer: no-cache` (primary) + timeout retries and backoff. */
async function fetchReportRowWithRetries(params: {
  restUrl: string;
  serviceKey: string;
  reportId: string;
  userId: string;
}): Promise<FetchReportRowResult> {
  const t0 = performance.now();
  let lastFailure: { kind: string; detail?: string; httpStatus?: number } | null = null;

  for (let attempt = 0; attempt < READ_TIMEOUTS_MS.length; attempt++) {
    const timeoutMs = READ_TIMEOUTS_MS[attempt];
    try {
      const res = await fetch(params.restUrl, {
        method: 'GET',
        headers: {
          apikey: params.serviceKey,
          Authorization: `Bearer ${params.serviceKey}`,
          Accept: 'application/json',
          ...NO_STORE_HEADERS,
          // PostgREST: force read from primary, not read-replica.
          Prefer: 'no-cache',
        },
        cache: 'no-store' as RequestCache,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const snippet = (await res.text().catch(() => '')).trim().slice(0, 300);
        lastFailure = {
          kind: 'postgrest_http_error',
          httpStatus: res.status,
          detail: snippet || `HTTP ${res.status}`,
        };
        const retryable = res.status >= 500 || res.status === 429;
        if (retryable && attempt < READ_TIMEOUTS_MS.length - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
          continue;
        }
        const elapsedMs = Math.round(performance.now() - t0);
        return {
          ok: false,
          value: {
            error: 'DB fetch failed',
            cause: lastFailure.kind,
            attemptCount: attempt + 1,
            httpStatus: res.status,
            detail: lastFailure.detail,
          },
          diagnostics: {
            elapsedMs,
            timeout: false,
            http: true,
            nonJson: false,
          },
        };
      }

      let rows: Record<string, unknown>[];
      try {
        rows = (await res.json()) as Record<string, unknown>[];
      } catch {
        lastFailure = { kind: 'invalid_json_body' };
        if (attempt < READ_TIMEOUTS_MS.length - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
          continue;
        }
        const elapsedMs = Math.round(performance.now() - t0);
        return {
          ok: false,
          value: {
            error: 'DB fetch failed',
            cause: 'invalid_json_body',
            attemptCount: attempt + 1,
          },
          diagnostics: {
            elapsedMs,
            timeout: false,
            http: false,
            nonJson: true,
          },
        };
      }

      const row = rows[0] ?? null;
      return {
        ok: true,
        value: { row, attemptCount: attempt + 1 },
      };
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      const msg = e instanceof Error ? e.message : String(e);
      const timedOut =
        name === 'TimeoutError' || name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout');
      lastFailure = {
        kind: timedOut ? 'fetch_timeout' : 'fetch_error',
        detail: msg.slice(0, 500),
      };
      if (attempt < READ_TIMEOUTS_MS.length - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
        continue;
      }
      const elapsedMs = Math.round(performance.now() - t0);
      return {
        ok: false,
        value: {
          error: 'DB fetch failed',
          cause: lastFailure.kind,
          attemptCount: READ_TIMEOUTS_MS.length,
          detail: lastFailure.detail,
        },
        diagnostics: {
          elapsedMs,
          timeout: timedOut,
          http: false,
          nonJson: false,
        },
      };
    }
  }

  const elapsedMs = Math.round(performance.now() - t0);
  return {
    ok: false,
    value: {
      error: 'DB fetch failed',
      cause: lastFailure?.kind ?? 'unknown',
      attemptCount: READ_TIMEOUTS_MS.length,
      detail: lastFailure?.detail,
    },
    diagnostics: {
      elapsedMs,
      timeout: false,
      http: false,
      nonJson: false,
    },
  };
}

function logStatusFetchFailure(
  prefix: string,
  params: { reportId: string; userId: string; attemptCount: number; diagnostics: FetchFailureDiagnostics },
) {
  const { reportId, userId, attemptCount, diagnostics } = params;
  console.error(`[${prefix}]`, {
    reportId,
    userId,
    attemptCount,
    elapsedMs: diagnostics.elapsedMs,
    timeout: diagnostics.timeout,
    http: diagnostics.http,
    nonJson: diagnostics.nonJson,
  });
}

function buildStatusPayload(reportId: string, data: Record<string, unknown>): ReportStatusCachePayload {
  const status = data?.status ?? 'unknown';
  const isComplete = status === 'complete';
  const reportData = data?.report_data as Record<string, unknown> | null;

  const serverProgress = typeof data?.generation_progress === 'number' ? data.generation_progress : null;
  const progress = isComplete
    ? 100
    : status === 'error'
      ? 0
      : (serverProgress ?? (status === 'generating' ? 5 : 0));

  const generationError =
    status === 'error' ? extractUserVisibleReportError(data as Record<string, unknown>) : null;

  const generationTraceId =
    typeof data?.generation_trace_id === 'string' && data.generation_trace_id.trim() !== ''
      ? data.generation_trace_id
      : null;

  return {
    id: reportId,
    status,
    isComplete,
    progress,
    generation_step: data?.generation_step ?? null,
    generation_error_code: data?.generation_error_code ?? null,
    generation_error_at_phase: data?.generation_error_at_phase ?? null,
    generation_error: generationError,
    report: isComplete ? reportData : null,
    lagna_sign: data?.lagna_sign,
    dasha_mahadasha: data?.dasha_mahadasha,
    dasha_antardasha: data?.dasha_antardasha,
    native_name: data?.native_name,
    birth_date: data?.birth_date,
    birth_time: data?.birth_time,
    birth_city: data?.birth_city,
    generation_started_at: data?.generation_started_at ?? null,
    updated_at: data?.updated_at ?? null,
    created_at: data?.created_at ?? null,
    generation_trace_id: generationTraceId,
  };
}

type FreshReadResult =
  | { tag: 'http'; response: NextResponse }
  | { tag: 'payload'; payload: ReportStatusCachePayload };

/**
 * Poll endpoint: client calls this every few seconds to check if report is done.
 * Short in-memory cache + singleflight cap QPS; PostgREST reads stay primary-consistent.
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id: reportId } = context.params;
  const userId = auth.user.id;
  const requestTraceId = randomUUID();

  const cached = peekReportStatusCache(reportId, userId);
  if (cached) {
    const body = finalizeReportStatusResponse(cached.payload, {
      servedFromCache: true,
      nextPollAfterMs: cached.remainingTtlMs,
    });
    return NextResponse.json(body, { headers: NO_STORE_HEADERS });
  }

  const rl = takeReportStatusRateLimit(userId);
  if (!rl.ok) {
    const retrySec = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      {
        error: 'Too many status requests — slow down polling',
        retry_after_ms: rl.retryAfterMs,
        next_poll_after_ms: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          'Retry-After': String(Math.max(1, retrySec)),
        },
      },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) {
    console.error('[reports/status] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      {
        error: 'DB fetch failed',
        cause: 'missing_supabase_config',
        attemptCount: 0,
        traceId: requestTraceId,
        next_poll_after_ms: 5_000,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  const restUrl = `${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`;

  const fresh = await runReportStatusSingleflight(reportId, userId, async (): Promise<FreshReadResult> => {
    const result = await fetchReportRowWithRetries({ restUrl, serviceKey, reportId, userId });

    if (!result.ok) {
      logStatusFetchFailure('reports/status', {
        reportId,
        userId,
        attemptCount: result.value.attemptCount,
        diagnostics: result.diagnostics,
      });
      const statusCode =
        result.value.cause === 'fetch_timeout' || result.value.cause === 'fetch_error' ? 503 : 502;
      const nextPoll = statusCode === 503 ? 3_000 : 2_000;
      return {
        tag: 'http',
        response: NextResponse.json(
          {
            ...result.value,
            traceId: requestTraceId,
            next_poll_after_ms: nextPoll,
          },
          { status: statusCode, headers: NO_STORE_HEADERS },
        ),
      };
    }

    const data = result.value.row;
    if (!data) {
      return {
        tag: 'http',
        response: NextResponse.json(
          { error: 'Report not found', next_poll_after_ms: 0 },
          { status: 404, headers: NO_STORE_HEADERS },
        ),
      };
    }

    const payload = buildStatusPayload(reportId, data);
    rememberReportStatusCache(reportId, userId, payload);
    return { tag: 'payload', payload };
  });

  if (fresh.tag === 'http') return fresh.response;

  const body = finalizeReportStatusResponse(fresh.payload, {
    servedFromCache: false,
    nextPollAfterMs: nextPollAfterMsForPayload(fresh.payload),
  });
  return NextResponse.json(body, { headers: NO_STORE_HEADERS });
}
