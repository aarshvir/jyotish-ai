/**
 * Structured stdout for grepping during report runs (no external vendor).
 * Example: grep '"type":"llm_audit"' server.log
 */
import { getReportRunContext } from '@/lib/observability/context';
import { insertAgentRun } from '@/lib/observability/reportRuns';

export function logLlmAudit(stage: string, provider: string, model?: string): void {
  const ts = new Date().toISOString();
  console.log(
    JSON.stringify({
      type: 'llm_audit',
      stage,
      provider,
      model: model ?? '',
      ts,
    }),
  );

  const context = getReportRunContext();
  if (context?.reportRunId || context?.reportId) {
    void insertAgentRun({
      reportRunId: context.reportRunId,
      reportId: context.reportId,
      agentName: stage,
      provider,
      model,
      status: 'success',
      startedAt: ts,
    });
  }
}
