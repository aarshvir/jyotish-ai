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
 * Pillar 4 pre-work:
 *   Webhook-driven generation — the `payment.completed` event emitted from the
 *   Ziina webhook triggers `report/generate` so a user who closes their tab
 *   mid-checkout still gets a paid report.
 */

import { inngest } from './client';
import {
  generateReportPipeline,
  PipelinePhaseStopSignal,
  type PipelineInput,
  type PipelinePhaseName,
} from '@/lib/reports/orchestrator';

type ReportGenerateEvent = {
  name: 'report/generate';
  data: {
    reportId: string;
    userId: string;
    userEmail: string;
    input: PipelineInput;
    base: string;
    authHeaders: Record<string, string>;
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
  try {
    await generateReportPipeline(
      reportId,
      userId,
      userEmail,
      input,
      // onStep is a no-op here — observability comes from DB progress + Inngest UI.
      () => {},
      base,
      authHeaders,
      { stopAfterPhase: phase },
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
  },
  { event: 'report/generate' },
  async ({ event, step, attempt }) => {
    const data = (event as unknown as ReportGenerateEvent).data;
    const { reportId } = data;

    console.log(
      `[inngest] pipeline start reportId=${reportId} attempt=${attempt}`,
    );

    // Phase 1: Ephemeris (Swiss Ephemeris / Railway service)
    await step.run('phase:ephemeris', async () => {
      return runPhase(data, 'ephemeris');
    });

    // Phase 2: Nativity analysis + hourly grids (parallel inside orchestrator)
    await step.run('phase:nativity_grids', async () => {
      return runPhase(data, 'nativity_grids');
    });

    // Phase 3: Commentary — the expensive LLM work. Retried independently.
    await step.run('phase:commentary', async () => {
      return runPhase(data, 'commentary');
    });

    // Phase 4: Finalize — validation + assembly + dbSaveFinal. The
    // orchestrator will not throw PipelinePhaseStopSignal here; it saves
    // the report and returns.
    await step.run('phase:finalize', async () => {
      return runPhase(data, 'finalize');
    });

    console.log(`[inngest] pipeline complete reportId=${reportId}`);
    return { success: true, reportId };
  },
);
