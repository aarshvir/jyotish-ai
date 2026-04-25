export const maxDuration = 30;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import type { ReportGenerationLogEntry } from '@/lib/observability/generationLog';

/**
 * Returns the append-only `generation_log` for this report (owner only).
 * Use after a failed run to see exactly where the pipeline stopped.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const reportId = context.params.id;
  if (!reportId) {
    return NextResponse.json({ error: 'Missing report id' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from('reports')
    .select('id, user_id, generation_log')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const raw = data.generation_log;
  const entries: ReportGenerationLogEntry[] = Array.isArray(raw) ? (raw as ReportGenerationLogEntry[]) : [];

  return NextResponse.json({
    reportId: data.id,
    count: entries.length,
    entries,
  });
}
