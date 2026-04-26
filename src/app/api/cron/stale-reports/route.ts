import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { markReportAsFailedUnscoped } from '@/lib/reports/reportErrors';
import { getStaleOrphanUpdatedAtMs } from '@/lib/reports/staleGeneratingConstants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Marks `generating` rows with no recent heartbeat as `error` (same liveness as Inngest
 * `cleanup-orphaned-reports`): `updated_at` older than getStaleOrphanUpdatedAtMs().
 * Replaces the old 25m-from-generation_start rule, which false-failed long pipelines.
 * Secured with CRON_SECRET — Vercel Cron: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  const cutoff = new Date(Date.now() - getStaleOrphanUpdatedAtMs()).toISOString();

  const { data: staleRows, error: e1 } = await db
    .from('reports')
    .select('id')
    .eq('status', 'generating')
    .lt('updated_at', cutoff);

  if (e1) {
    console.error('[cron/stale-reports] select:', e1.message);
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  const ids = (staleRows ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, marked: 0, ids: [] });
  }

  for (const id of ids) {
    await markReportAsFailedUnscoped(db, id, {
      message:
        'Report generation was interrupted (stale — no completion after extended wait). Please try again.',
      errorStep: 'stale_generating',
      errorCode: 'STALE',
      generationErrorCode: 'STATUS_POLL_TIMEOUT',
    });
  }

  console.warn(`[cron/stale-reports] marked ${ids.length} stale generating rows as error`);
  return NextResponse.json({ ok: true, marked: ids.length, ids });
}
