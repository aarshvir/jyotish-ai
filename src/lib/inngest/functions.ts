/**
 * Inngest background functions for VedicHour.
 *
 * Pillar 1 — Per-phase DAG:
 *   Each pipeline phase (ephemeris, nativity_grids, commentary, finalize)
 *   is its own `step.run` call. If commentary fails at attempt 2, Inngest
 *   re-invokes that step only; ephemeris + nativity_grids are restored from
 *   the Supabase `pipeline_checkpoint` without redoing their API calls.
 *
 *   The orchestrator is already idempotent via `pipeline_checkpoint` + the
 *   `stopAfterPhase` option. Each step.run invokes the orchestrator with a
 *   `stopAfterPhase` parameter, so the work done per step is bounded.
 *
 * Pillar 5 — Resilience:
 *   A nightly/hourly cleanup sweeps for reports stuck in 'generating'
 *   due to rare platform timeouts/crashes, marking them as 'error'
 *   to preserve UX flow and prevent user deadlocks.
 *
 * Pillar 4 pre-work:
 *   Optional Ziina **Business** webhook can emit `report/generate` if the user
 *   closes the tab before the redirect. **Individual / API-only Ziina** has no
 *   webhook — generation still starts when `/api/ziina/verify` runs (same finalizer).
 */

import { inngest } from './client';
import {
  generateReportPipeline,
  PipelinePhaseStopSignal,
  type PipelineInput,
  type PipelinePhaseName,
} from '@/lib/reports/orchestrator';
import { extendReportToMonthly } from '@/lib/reports/extendMonthly';
import { runScriptureEmbedRefresh } from '@/lib/rag/embedChunksJob';
import { createReportRun, updateReportRun } from '@/lib/observability/reportRuns';
import { withReportRunContext } from '@/lib/observability/context';
import { createServiceClient } from '@/lib/supabase/admin';
import { inferReportGenerationErrorCode, markReportAsFailed } from '@/lib/reports/reportErrors';

type ReportExtendEvent = {
  name: 'report/extend';
  data: { reportId: string; baseUrl: string };
};

type ReportGenerateEvent = {
  name: 'report/generate';
  data: {
    reportId: string;
    userId: string;
    userEmail: string;
    input: PipelineInput;
    base: string;
    authHeaders: Record<string, string>;
    /** Same value as `generation_trace_id` on the reports row — log / Inngest correlation. */
    correlationId?: string;
    generation_trace_id?: string;
  };
};

/**
 * Invoke the orchestrator for a single phase. The orchestrator short-circuits
 * completed phases via `pipeline_checkpoint`, then runs the requested phase,
 * then throws PipelinePhaseStopSignal which we swallow as a clean return.
 * Any other error propagates so Inngest retries that step only.
 */
async function runPhase(
  args: ReportGenerateEvent['data'],
  phase: PipelinePhaseName,
): Promise<{ phase: PipelinePhaseName; stopped: boolean }> {
  const { reportId, userId, userEmail, input, base, authHeaders } = args;
  const reportRunId = authHeaders['x-report-run-id'];
  const correlationId = authHeaders['x-correlation-id'];
  try {
    await withReportRunContext(
      { reportId, reportRunId, correlationId },
      () => generateReportPipeline(
        reportId,
        userId,
        userEmail,
        input,
        // onStep is a no-op here — observability comes from DB progress + Inngest UI.
        () => {},
        base,
        authHeaders,
        { stopAfterPhase: phase, reportRunId, correlationId },
      ),
    );
    // Orchestrator returned normally — the pipeline ran through all phases in
    // one call (this happens when the stop phase is `finalize`, or when
    // everything was already checkpointed and the orchestrator ran finalize).
    return { phase, stopped: false };
  } catch (err) {
    if (err instanceof PipelinePhaseStopSignal) {
      return { phase, stopped: true };
    }
    throw err;
  }
}

export const generateReportJob = inngest.createFunction(
  {
    id: 'generate-report-pipeline',
    // Each step retries up to 3 times independently before the whole run fails.
    // Per-step retry is the entire point of decomposing the DAG here.
    retries: 3,
    // Prevent duplicate concurrent runs for the same report (double-clicks,
    // webhook retries, etc). Checkpoints guard against re-doing work, but
    // concurrency:1 prevents wasted invocations.
    concurrency: {
      key: 'event.data.reportId',
      limit: 1,
    },
    triggers: [{ event: 'report/generate' }],
    onFailure: async ({ error, event }: { error: Error; event: { data: { event?: { data: ReportGenerateEvent['data'] } } } }) => {
      const original = event.data?.event?.data;
      if (!original?.reportId || !original.userId) {
        console.error('[inngest] onFailure: missing reportId/userId', event);
        return;
      }
      const failTrace =
        original.generation_trace_id ?? original.correlationId ?? original.authHeaders?.['x-correlation-id'];
      const tracePrefix = failTrace ? `[trace:${failTrace}] ` : '';
      console.error(`${tracePrefix}[inngest] onFailure reportId=${original.reportId}`, error);
      const db = createServiceClient();
      const { data: row } = await db
        .from('reports')
        .select('status')
        .eq('id', original.reportId)
        .eq('user_id', original.userId)
        .maybeSingle();
      if (!row) return;
      if (row.status === 'complete') return;
      if (row.status !== 'generating') return;
      const errMsg = error instanceof Error ? error.message : String(error);
      await markReportAsFailed(db, original.reportId, original.userId, {
        message: `Background job failed after retries: ${errMsg}`.slice(0, 4000),
        errorStep: 'inngest_on_failure',
        errorCode: 'INNGEST_FAILURE',
        generationErrorCode: inferReportGenerationErrorCode(errMsg, 'inngest_on_failure'),
      });
    },
  },
  async ({ event, step, attempt }: { event: unknown; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> }; attempt: number }) => {
    const data = (event as unknown as ReportGenerateEvent).data;
    const { reportId, userId } = data;
    const startedAt = new Date().toISOString();
    const correlationId =
      data.generation_trace_id ??
      data.correlationId ??
      data.authHeaders['x-correlation-id'] ??
      `${reportId}-${Date.now()}`;
    const reportRunId = await createReportRun({
      reportId,
      userId,
      correlationId,
      attempt,
      phase: 'queued',
    });
    data.authHeaders = {
      ...data.authHeaders,
      'x-report-run-id': reportRunId ?? '',
      'x-correlation-id': correlationId,
    };

    console.log(`[trace:${correlationId}] [inngest] pipeline start reportId=${reportId} attempt=${attempt}`);

    try {
      // Phase 1: Ephemeris (Swiss Ephemeris / Railway service)
      await step.run('phase:ephemeris', async () => {
        await updateReportRun(reportRunId, { phase: 'ephemeris' });
        return runPhase(data, 'ephemeris');
      });

      // Phase 2: Nativity analysis + hourly grids (parallel inside orchestrator)
      await step.run('phase:nativity_grids', async () => {
        await updateReportRun(reportRunId, { phase: 'nativity_grids' });
        return runPhase(data, 'nativity_grids');
      });

      // Phase 3: Commentary — the expensive LLM work. Retried independently.
      await step.run('phase:commentary', async () => {
        await updateReportRun(reportRunId, { phase: 'commentary' });
        return runPhase(data, 'commentary');
      });

      // Phase 4: Finalize — validation + assembly + dbSaveFinal. The
      // orchestrator will not throw PipelinePhaseStopSignal here; it saves
      // the report and returns.
      await step.run('phase:finalize', async () => {
        await updateReportRun(reportRunId, { phase: 'finalize' });
        return runPhase(data, 'finalize');
      });

      await updateReportRun(reportRunId, {
        status: 'complete',
        phase: 'complete',
        startedAt,
      });
      console.log(`[trace:${correlationId}] [inngest] pipeline complete reportId=${reportId}`);
      return { success: true, reportId, reportRunId };
    } catch (err) {
      console.error(`[trace:${correlationId}] [inngest] pipeline step error reportId=${reportId}`, err);
      await updateReportRun(reportRunId, {
        status: 'error',
        errorClass: err instanceof Error ? err.name : 'Error',
        errorMessage: err instanceof Error ? err.message : String(err),
        startedAt,
      });
      throw err;
    }
  },
);

/** After a successful Monthly upgrade payment, append days 8–30 to the stored report. */
export const extendReportToMonthlyJob = inngest.createFunction(
  {
    id: 'extend-report-to-monthly',
    retries: 2,
    concurrency: {
      key: 'event.data.reportId',
      limit: 1,
    },
    triggers: [{ event: 'report/extend' }],
  },
  async ({ event }) => {
    const { reportId, baseUrl } = (event as unknown as { data: ReportExtendEvent['data'] }).data;
    const result = await extendReportToMonthly(baseUrl, reportId);
    console.log(`[inngest] extend monthly reportId=${reportId}`, result);
    return result;
  },
);

/** Pillar 2: nightly re-embed of `data/scriptures/_chunks.json` when present (no-op if file missing). */
export const refreshEmbeddingsCron = inngest.createFunction(
  {
    id: 'refresh-scripture-embeddings',
    retries: 1,
    triggers: [{ cron: '0 3 * * *' }],
  },
  async ({ step }) => {
    const result = await step.run('embed-chunk-batch', async () => {
      return runScriptureEmbedRefresh(400);
    });
    console.log('[inngest] scripture embed refresh', result);
    return result;
  },
);

/**
 * Pillar 1/5: Self-Healing Heartbeat.
 * Detects reports stuck in 'generating' for > 15 minutes and marks them as 'error'.
 * This prevents users from seeing a permanent "Generating..." spinner if a
 * process was killed or a network deadlock occurred.
 */
export const cleanupOrphanedReports = inngest.createFunction(
  {
    id: 'cleanup-orphaned-reports',
    triggers: [{ cron: '*/30 * * * *' }], // Run every 30 minutes
  },
  async ({ step }) => {
    const result = await step.run('sweep-deadlocks', async () => {
      const { createServiceClient } = await import('@/lib/supabase/admin');
      const db = createServiceClient();
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data, error } = await db
        .from('reports')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
          generation_step: 'cleanup_auto_fail',
        })
        .eq('status', 'generating')
        .lt('updated_at', fifteenMinsAgo)
        .select('id');

      if (error) throw error;
      return { count: data?.length ?? 0, ids: data?.map((r) => r.id) ?? [] };
    });

    return result;
  },
);
