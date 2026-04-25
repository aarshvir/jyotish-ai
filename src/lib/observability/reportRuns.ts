import { createServiceClient } from '@/lib/supabase/admin';

export type ReportRunStatus = 'running' | 'complete' | 'error' | 'timeout';
export type AgentRunStatus = 'success' | 'error' | 'timeout' | 'fallback' | 'skipped';

export interface CreateReportRunInput {
  reportId: string;
  userId: string;
  inngestRunId?: string;
  correlationId: string;
  attempt: number;
  phase?: string;
}

export interface AgentRunInput {
  reportRunId?: string | null;
  reportId?: string | null;
  agentName: string;
  provider?: string;
  model?: string;
  status: AgentRunStatus;
  latencyMs?: number;
  errorClass?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsdMicro?: number;
  startedAt?: string;
}

export async function createReportRun(input: CreateReportRunInput): Promise<string | null> {
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from('report_runs')
      .insert({
        report_id: input.reportId,
        user_id: input.userId,
        inngest_run_id: input.inngestRunId ?? null,
        correlation_id: input.correlationId,
        attempt: input.attempt,
        phase: input.phase ?? null,
        status: 'running',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.warn('[observability] createReportRun failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function updateReportRun(
  id: string | null | undefined,
  patch: {
    status?: ReportRunStatus;
    phase?: string;
    errorClass?: string;
    errorMessage?: string;
    startedAt?: string;
  },
): Promise<void> {
  if (!id) return;
  try {
    const finished = patch.status && patch.status !== 'running';
    const update: Record<string, unknown> = {
      ...(patch.phase ? { phase: patch.phase } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.errorClass ? { error_class: patch.errorClass } : {}),
      ...(patch.errorMessage ? { error_message: patch.errorMessage.slice(0, 1000) } : {}),
      ...(finished ? { finished_at: new Date().toISOString() } : {}),
    };

    if (finished && patch.startedAt) {
      update.duration_ms = Math.max(0, Date.now() - new Date(patch.startedAt).getTime());
    }

    const db = createServiceClient();
    const { error } = await db.from('report_runs').update(update).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('[observability] updateReportRun failed:', err instanceof Error ? err.message : String(err));
  }
}

export async function insertAgentRun(input: AgentRunInput): Promise<void> {
  try {
    const db = createServiceClient();
    const { error } = await db.from('agent_runs').insert({
      report_run_id: input.reportRunId ?? null,
      report_id: input.reportId ?? null,
      agent_name: input.agentName,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      cost_usd_micro: input.costUsdMicro ?? null,
      error_class: input.errorClass ?? null,
      error_message: input.errorMessage?.slice(0, 1000) ?? null,
      started_at: input.startedAt ?? new Date().toISOString(),
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[observability] insertAgentRun failed:', err instanceof Error ? err.message : String(err));
  }
}
