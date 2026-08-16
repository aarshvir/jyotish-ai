import { serve } from 'inngest/next';
import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { isProductionRuntime } from '@/lib/env';
import {
  generateReportJob,
  extendReportToMonthlyJob,
  refreshEmbeddingsCron,
  cleanupOrphanedReports,
} from '@/lib/inngest/functions';

/**
 * Inngest webhook endpoint.
 * Inngest's executor calls this route to run background functions.
 *
 * In development: run `npx inngest-cli@latest dev` and it auto-discovers this.
 * In production: register this URL in the Inngest dashboard.
 *
 * Without INNGEST_SIGNING_KEY there is no way to verify that a caller is really
 * Inngest, so on production every request is REJECTED rather than executed —
 * anyone who knows the URL could otherwise invoke report generation at will.
 */
const handlers = serve({
  client: inngest,
  functions: [
    generateReportJob,
    extendReportToMonthlyJob,
    refreshEmbeddingsCron,
    cleanupOrphanedReports,
  ],
});

type InngestRouteHandler = typeof handlers.GET;

const signingKeyMissing = isProductionRuntime() && !process.env.INNGEST_SIGNING_KEY?.trim();

if (signingKeyMissing) {
  console.error(
    '[inngest/route] CRITICAL: INNGEST_SIGNING_KEY is not set on a production deployment. ' +
    'Webhook signatures cannot be verified — all Inngest requests are being REJECTED (503).',
  );
}

const rejectUnsigned: InngestRouteHandler = async () =>
  NextResponse.json(
    { error: 'Inngest webhook rejected: INNGEST_SIGNING_KEY is not configured.' },
    { status: 503 },
  );

export const GET = signingKeyMissing ? rejectUnsigned : handlers.GET;
export const POST = signingKeyMissing ? rejectUnsigned : handlers.POST;
export const PUT = signingKeyMissing ? rejectUnsigned : handlers.PUT;
