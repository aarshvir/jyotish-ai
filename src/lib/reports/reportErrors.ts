import type { SupabaseClient } from '@supabase/supabase-js';

/** Stored in `reports.generation_error_code` and returned by `/status`. */
export const REPORT_GENERATION_ERROR_CODES = [
  'STATUS_POLL_TIMEOUT',
  'LLM_PROVIDER_UNAVAILABLE',
  'BUDGET_EXCEEDED',
  'EPHEMERIS_DOWN',
  'INNGEST_FAILURE',
  'LLM_TIMEOUT',
  'RATE_LIMIT',
  'AUTH_ERROR',
  'SERVICE_UNAVAILABLE',
  'LLM_PARTIAL',
  'STALE',
  'DB_SAVE_FAILED',
  'HARD_KILL_TIMEOUT',
  'PIPELINE_ERROR',
  'UNKNOWN',
] as const;

export type ReportGenerationErrorCode = (typeof REPORT_GENERATION_ERROR_CODES)[number];

export type ReportFailureMeta = {
  message: string;
  errorStep?: string;
  /** Legacy: merged into `report_data.error_code`. */
  errorCode?: string;
  /** Column `reports.generation_error_code`. */
  generationErrorCode?: ReportGenerationErrorCode | string | null;
  /** Column `reports.generation_error_at_phase` (e.g. phase slug). */
  generationErrorAtPhase?: string | null;
};

/**
 * Best-effort classification from thrown message / durable error_step.
 * Used for UI display and programmatic retry logic.
 */
export function inferReportGenerationErrorCode(
  message: string,
  step?: string,
): ReportGenerationErrorCode {
  const m = (message ?? '').toLowerCase();
  const s = (step ?? '').toLowerCase();

  if (s === 'hard_kill_timeout' || s === 'budget_exceeded') return 'BUDGET_EXCEEDED';
  if (s === 'ephemeris' || m.includes('ephemeris') || m.includes('birth chart calculation failed') || m.includes('swiss'))
    return 'EPHEMERIS_DOWN';
  if (s === 'stale_generating') return 'STATUS_POLL_TIMEOUT';
  if (m.includes('budget exceeded') || m.includes('budget_exceeded') || m.includes('server budget') || m.includes('timed out after'))
    return 'BUDGET_EXCEEDED';
  if (m.includes('hard-kill') || m.includes('hard_kill')) return 'HARD_KILL_TIMEOUT';
  if (m.includes('429') || m.includes('rate limit') || m.includes('too many')) return 'RATE_LIMIT';
  if (m.includes('401') || m.includes('unauthorized') || m.includes('api key')) return 'AUTH_ERROR';
  if (
    m.includes('206') ||
    m.includes('llm unavailable') ||
    m.includes('anthropic') ||
    m.includes('openai') ||
    m.includes('model error') ||
    m.includes('partial: true')
  )
    return 'LLM_PROVIDER_UNAVAILABLE';
  if (m.includes('timed out') || m.includes('timeout') || m.includes('aborted')) return 'LLM_TIMEOUT';
  if (m.includes('503') || m.includes('unavailable')) return 'SERVICE_UNAVAILABLE';
  if (m.includes('inngest') || s.includes('inngest')) return 'INNGEST_FAILURE';
  if (m.includes('stale')) return 'STALE';
  if (m.includes('dbsavefinal') || s.includes('finalize')) return 'DB_SAVE_FAILED';
  return 'UNKNOWN';
}

// ── CTA classification for the error UI ──────────────────────────────────────

export type GenerationErrorCtaKind = 'retry_now' | 'retry_later' | 'contact_support';

/**
 * Maps error codes to one of three user-facing CTA kinds so the UI can choose
 * the right copy ("Try again", "Try again after waiting", "Contact support").
 */
export function generationErrorCtaKind(
  code: string | null | undefined,
): GenerationErrorCtaKind {
  switch (code) {
    case 'EPHEMERIS_DOWN':
    case 'LLM_PROVIDER_UNAVAILABLE':
    case 'LLM_TIMEOUT':
    case 'LLM_PARTIAL':
    case 'SERVICE_UNAVAILABLE':
    case 'INNGEST_FAILURE':
      return 'retry_now';
    case 'BUDGET_EXCEEDED':
    case 'HARD_KILL_TIMEOUT':
    case 'RATE_LIMIT':
      return 'retry_later';
    case 'STATUS_POLL_TIMEOUT':
    case 'DB_SAVE_FAILED':
    case 'AUTH_ERROR':
    case 'PIPELINE_ERROR':
    case 'STALE':
    case 'UNKNOWN':
    default:
      return 'contact_support';
  }
}

// ── markReportAsFailed ───────────────────────────────────────────────────────

/**
 * Merges `error`, `error_at`, and optional `error_step` / `error_code` into `report_data`
 * and sets `status: 'error'`. Never downgrades rows that are already `complete`.
 *
 * Also writes `generation_error_code` and `generation_error_at_phase` to their
 * dedicated DB columns so the status endpoint can return them without parsing
 * the opaque `report_data` JSON blob.
 */
export async function markReportAsFailed(
  db: SupabaseClient,
  reportId: string,
  userId: string,
  meta: ReportFailureMeta,
): Promise<void> {
  const { data: row, error: selErr } = await db
    .from('reports')
    .select('report_data, status')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (selErr) {
    console.error('[markReportAsFailed] select failed:', selErr.message);
    return;
  }
  if (!row || row.status === 'complete') return;

  const existing =
    row.report_data && typeof row.report_data === 'object' && !Array.isArray(row.report_data)
      ? (row.report_data as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  const nextPayload: Record<string, unknown> = {
    ...existing,
    error: meta.message,
    error_at: now,
  };
  if (meta.errorStep) nextPayload.error_step = meta.errorStep;
  if (meta.errorCode) nextPayload.error_code = meta.errorCode;

  const rowPatch: Record<string, unknown> = {
    status: 'error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report_data: nextPayload as any,
    updated_at: now,
  };
  // Write RCA fields to their dedicated DB columns (not just into report_data).
  if (meta.generationErrorCode !== undefined) {
    rowPatch.generation_error_code = meta.generationErrorCode;
  }
  if (meta.generationErrorAtPhase !== undefined) {
    rowPatch.generation_error_at_phase = meta.generationErrorAtPhase;
  }

  const { error: upErr } = await db
    .from('reports')
    .update(rowPatch)
    .eq('id', reportId)
    .eq('user_id', userId)
    .neq('status', 'complete');

  if (upErr) console.error('[markReportAsFailed] update failed:', upErr.message);
}

/** Same as `markReportAsFailed` but for cron / ops paths that only have report ids (uses service client + id-only filter). */
export async function markReportAsFailedUnscoped(
  db: SupabaseClient,
  reportId: string,
  meta: ReportFailureMeta,
): Promise<void> {
  const { data: row, error: selErr } = await db
    .from('reports')
    .select('report_data, status, user_id')
    .eq('id', reportId)
    .maybeSingle();

  if (selErr) {
    console.error('[markReportAsFailedUnscoped] select failed:', selErr.message);
    return;
  }
  if (!row?.user_id || row.status === 'complete') return;

  await markReportAsFailed(db, reportId, row.user_id as string, meta);
}

/**
 * Resolves a user-facing error string for `status === 'error'`: `report_data.error` (any JSON shape),
 * or the last `generation_log` line with `level === 'error'`.
 */
export function extractUserVisibleReportError(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data || data.status !== 'error') return null;
  const rd = data.report_data as Record<string, unknown> | null | undefined;
  const errRaw = rd?.error;
  if (typeof errRaw === 'string' && errRaw.trim()) return errRaw.trim();
  if (typeof errRaw === 'number' && !Number.isNaN(errRaw)) return String(errRaw);
  if (errRaw && typeof errRaw === 'object' && !Array.isArray(errRaw)) {
    return JSON.stringify(errRaw).slice(0, 2000);
  }
  const log = data.generation_log;
  if (Array.isArray(log)) {
    for (let i = log.length - 1; i >= 0; i--) {
      const entry = log[i] as { level?: string; message?: string; step?: string };
      if (entry?.level === 'error' && (entry.message || entry.step)) {
        return [entry.step, entry.message].filter(Boolean).join(' — ').slice(0, 2000);
      }
    }
  }
  return null;
}
