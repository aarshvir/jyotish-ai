import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  generateReportJob,
  extendReportToMonthlyJob,
  refreshEmbeddingsCron,
} from '@/lib/inngest/functions';

/**
 * Inngest webhook endpoint.
 * Inngest's executor calls this route to run background functions.
 * 
 * In development: run `npx inngest-cli@latest dev` and it auto-discovers this.
 * In production: register this URL in the Inngest dashboard.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateReportJob, extendReportToMonthlyJob, refreshEmbeddingsCron],
});
