import { NextRequest, NextResponse } from 'next/server';
import { runScriptureEmbedRefresh } from '@/lib/rag/embedChunksJob';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/refresh-embeddings
 * Optional manual trigger (Vercel Cron or curl) — same batch as Inngest nightly.
 *
 * Authorization: `Bearer ${CRON_SECRET}` when CRON_SECRET is set; otherwise only
 * allowed in non-production for local smoke tests.
 */
export async function GET(request: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  const auth = request.headers.get('authorization') ?? '';
  const okBearer = secret && auth === `Bearer ${secret}`;
  if (process.env.NODE_ENV === 'production' && !okBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.NODE_ENV !== 'production' && secret && !okBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runScriptureEmbedRefresh(400);
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
