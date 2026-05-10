import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { isNextProductionBuildPhase } from '@/lib/next/buildPhase';
import {
  generateReportJob,
  extendReportToMonthlyJob,
  refreshEmbeddingsCron,
  cleanupOrphanedReports,
} from '@/lib/inngest/functions';

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.INNGEST_SIGNING_KEY?.trim() &&
  !isNextProductionBuildPhase()
) {
  console.error(
    '[inngest/route] CRITICAL: INNGEST_SIGNING_KEY is not set. Webhook signature verification DISABLED.',
  );
}

/**
 * Inngest webhook endpoint.
 * Inngest's executor calls this route to run background functions.
 * 
 * In development: run `npx inngest-cli@latest dev` and it auto-discovers this.
 * In production: register this URL in the Inngest dashboard.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateReportJob,
    extendReportToMonthlyJob,
    refreshEmbeddingsCron,
    cleanupOrphanedReports,
  ],
});
