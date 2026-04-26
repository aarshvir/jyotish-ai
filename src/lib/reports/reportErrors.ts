import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportFailureMeta = {
  message: string;
  errorStep?: string;
  errorCode?: string;
  /** Structured error code surfaced to the UI (e.g. EPHEMERIS_DOWN, LLM_TIMEOUT). */
  generationErrorCode?: string;
  /** Pipeline phase slug where the error occurred. */
  generationErrorAtPhase?: string;
};

/**
 * Infer a structured error code from a raw error message + step label.
 * Used for UI display and programmatic retry logic.
 */
export function inferReportGenerationErrorCode(
  message: string,
  step?: string,
): string {
  const m = (message ?? '').toLowerCase();
  const s = (step ?? '').toLowerCase();

  if (m.includes('ephemeris') || s.includes('ephemeris')) return 'EPHEMERIS_DOWN';
  if (m.includes('budget exceeded') || m.includes('budget_exceeded')) return 'BUDGET_EXCEEDED';
  if (m.includes('hard-kill') || m.includes('hard_kill')) return 'HARD_KILL_TIMEOUT';
  if (m.includes('timed out') || m.includes('timeout') || m.includes('aborted')) return 'LLM_TIMEOUT';
  if (m.includes('429') || m.includes('rate limit') || m.includes('too many')) return 'RATE_LIMIT';
  if (m.includes('401') || m.includes('unauthorized') || m.includes('api key')) return 'AUTH_ERROR';
  if (m.includes('503') || m.includes('unavailable')) return 'SERVICE_UNAVAILABLE';
  if (m.includes('inngest') || s.includes('inngest')) return 'INNGEST_FAILURE';
  if (m.includes('206') || m.includes('llm unavailable')) return 'LLM_PARTIAL';
  if (m.includes('stale')) return 'STALE';
  if (m.includes('dbsavefinal') || s.includes('finalize')) return 'DB_SAVE_FAILED';
  return 'PIPELINE_ERROR';
}

/**
 * Merges `error`, `error_at`, and optional `error_step` / `error_code` into `report_data`
 * and sets `status: 'error'`. Never downgrades rows that are already `complete`.
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
  if (meta.generationErrorCode) nextPayload.generation_error_code = meta.generationErrorCode;
  if (meta.generationErrorAtPhase) nextPayload.generation_error_at_phase = meta.generationErrorAtPhase;

  const { error: upErr } = await db
    .from('reports')
    .update({
      status: 'error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report_data: nextPayload as any,
      updated_at: now,
    })
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
