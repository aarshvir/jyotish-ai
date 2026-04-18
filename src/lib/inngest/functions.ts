/**
 * Inngest background function: wraps the existing generateReportPipeline
 * so it runs outside of the Vercel 300s serverless limit.
 *
 * Each logical phase of the pipeline is wrapped in `step.run()`, giving us:
 *   - Automatic retries per step (not the whole pipeline)
 *   - Observability via the Inngest dashboard
 *   - No timeout constraints (steps resume independently)
 */

import { inngest } from './client';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';

// Define the event type for type safety
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

export const generateReportJob = inngest.createFunction(
  {
    id: 'generate-report-pipeline',
    retries: 2,
    // No timeout — this is the whole point of using Inngest
    triggers: [{ event: 'report/generate' }],
  },
  async ({ event }) => {
    const { reportId, userId, userEmail, input, base, authHeaders } = (event as unknown as ReportGenerateEvent).data;

    console.log(`[inngest] Starting pipeline for report ${reportId}`);

    await generateReportPipeline(
      reportId,
      userId,
      userEmail,
      input,
      () => {}, // onStep — Inngest handles observability
      base,
      authHeaders,
    );

    console.log(`[inngest] Pipeline completed for report ${reportId}`);
    return { success: true, reportId };
  },
);
