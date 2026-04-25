import { createServiceClient } from '@/lib/supabase/admin';

export type GenerationLogLevel = 'info' | 'warn' | 'error';

/** One line in `reports.generation_log` (JSON array). */
export interface ReportGenerationLogEntry {
  ts: string;
  elapsed_ms: number;
  level: GenerationLogLevel;
  /** Short machine slug, e.g. ephemeris_done, months_paid_assert */
  step: string;
  /** Human-readable one-liner */
  message: string;
  /** Optional structured context (HTTP status, route name, etc.) */
  detail?: Record<string, unknown>;
}

/**
 * Append a single line to the report's generation log (best-effort, does not throw).
 * Server-only; uses service role + RPC scoped to report owner.
 */
export async function appendReportGenerationLog(params: {
  reportId: string;
  userId: string;
  entry: ReportGenerationLogEntry;
}): Promise<void> {
  try {
    const db = createServiceClient();
    const { error } = await db.rpc('append_report_generation_log', {
      p_report_id: params.reportId,
      p_user_id: params.userId,
      p_entry: params.entry as unknown as Record<string, unknown>,
    });
    if (error) throw error;
  } catch (err) {
    console.warn(
      '[generation_log] append failed:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Overwrite the log when starting a fresh run (new correlation_id / user clicked generate).
 */
export async function clearReportGenerationLog(reportId: string, userId: string): Promise<void> {
  try {
    const db = createServiceClient();
    const { error } = await db
      .from('reports')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ generation_log: [] as any, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) throw error;
  } catch (err) {
    console.warn(
      '[generation_log] clear failed:',
      err instanceof Error ? err.message : String(err),
    );
  }
}
