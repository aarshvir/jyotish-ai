/**
 * Structured stdout for grepping during report runs (no external vendor).
 * Example: grep '"type":"llm_audit"' server.log
 */
export function logLlmAudit(stage: string, provider: string, model?: string): void {
  console.log(
    JSON.stringify({
      type: 'llm_audit',
      stage,
      provider,
      model: model ?? '',
      ts: new Date().toISOString(),
    }),
  );
}
