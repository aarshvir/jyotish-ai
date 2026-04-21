/**
 * @deprecated as of Pillar 1 (Grandmaster Blueprint).
 *
 * This route used to run `generateReportPipeline` inline. It is replaced by
 * /api/reports/start which dispatches to Inngest for durable background
 * execution, and optionally by the Ziina Business webhook (API-only plans use
 * /api/ziina/verify only) which can auto-trigger generation on
 * payment completion.
 *
 * Any call to this endpoint now returns 410 Gone with a pointer to the
 * successor. Keep the file so external crawlers / cached clients see a clean
 * 410 rather than 404 + a soft redirect loop.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

function gone() {
  return NextResponse.json(
    {
      error: 'gone',
      message:
        'POST /api/reports/run is deprecated. Use POST /api/reports/start instead. ' +
        'See docs/plans/pillar-1.md for migration details.',
      successor: '/api/reports/start',
    },
    { status: 410 },
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}
