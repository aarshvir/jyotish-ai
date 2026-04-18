/**
 * Pillar 1: Resumable pipeline checkpoints.
 *
 * When Inngest retries a failed report generation, we do NOT want to restart
 * the 5-minute pipeline from ephemeris. Instead, each major phase checkpoints
 * its intermediate result to the `pipeline_state` JSONB column on `reports`.
 *
 * On retry, the pipeline checks if a phase's result is already saved and
 * skips the expensive LLM / ephemeris work.
 *
 * Checkpoint phases (in order):
 *   1. ephemeris        — NatalChartData + mahadasha/antardasha
 *   2. nativity_grids   — NativityProfile + raw day grids / forecastDays skeleton
 *   3. commentary       — fully-populated forecastDays + months + weeks-synth + nativity text
 *   4. assembled        — final ReportData saved to `reports.report_data`
 *
 * Validation (phase between commentary and assembled) is always safe to
 * re-run and does not need its own checkpoint.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type PipelinePhase =
  | 'ephemeris'
  | 'nativity_grids'
  | 'commentary'
  | 'assembled';

export const PHASE_ORDER: PipelinePhase[] = [
  'ephemeris',
  'nativity_grids',
  'commentary',
  'assembled',
];

// We store arbitrary JSON-serializable blobs keyed by phase. Typed loosely
// here to avoid importing orchestrator-internal types (circular).
export interface PipelineState {
  ephemeris?: {
    data: unknown; // NatalChartData
    mahadasha: string;
    antardasha: string;
  };
  nativity_grids?: {
    nativityProfile: unknown; // NativityProfile | null
    forecastDays: unknown; // ForecastDayIntermediate[]
  };
  commentary?: {
    forecastDays: unknown; // ForecastDayIntermediate[] with commentary populated
    allMonthsData: unknown; // MonthSummary[]
    weeksSynthData: unknown; // WeeksSynthApiResult
    nativityData: unknown; // NativityData
  };
}

/**
 * Returns true if phaseA is at or after phaseB in pipeline order.
 * Use this to decide "can we skip X because we already passed it?"
 */
export function phaseAtOrAfter(
  phaseA: PipelinePhase | null | undefined,
  phaseB: PipelinePhase,
): boolean {
  if (!phaseA) return false;
  return PHASE_ORDER.indexOf(phaseA) >= PHASE_ORDER.indexOf(phaseB);
}

export async function loadPipelineState(
  db: SupabaseClient,
  reportId: string,
): Promise<{ checkpoint: PipelinePhase | null; state: PipelineState }> {
  const { data, error } = await db
    .from('reports')
    .select('pipeline_checkpoint, pipeline_state, status')
    .eq('id', reportId)
    .maybeSingle();

  if (error || !data) {
    return { checkpoint: null, state: {} };
  }

  // If the report is already complete, return a signal so the caller can exit early.
  const cp = (data.pipeline_checkpoint ?? null) as PipelinePhase | null;
  const st = (data.pipeline_state ?? {}) as PipelineState;
  return { checkpoint: cp, state: st };
}

/**
 * Persist a phase completion + patch the pipeline_state blob.
 * Uses row-level merge: the JSONB concatenation keeps previously-saved phases intact.
 */
export async function savePipelineCheckpoint(
  db: SupabaseClient,
  reportId: string,
  userId: string,
  phase: PipelinePhase,
  patch: Partial<PipelineState>,
  existingState: PipelineState,
): Promise<void> {
  const merged: PipelineState = { ...existingState, ...patch };
  try {
    const { error } = await db
      .from('reports')
      .update({
        pipeline_checkpoint: phase,
        pipeline_state: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) {
      console.error('[checkpoint] save failed:', phase, error.message);
    }
  } catch (e) {
    console.error('[checkpoint] save threw:', phase, e);
  }
}

/**
 * Clear the checkpoint and state after successful completion, to keep the row small.
 * Safe to call with no checkpoint — it's a no-op update on missing columns.
 */
export async function clearPipelineCheckpoint(
  db: SupabaseClient,
  reportId: string,
  userId: string,
): Promise<void> {
  try {
    await db
      .from('reports')
      .update({ pipeline_checkpoint: null, pipeline_state: null })
      .eq('id', reportId)
      .eq('user_id', userId);
  } catch {
    // Best-effort cleanup — never fail the pipeline on this.
  }
}
