export const maxDuration = 30;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Poll endpoint: client calls this every few seconds to check if report is done.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id: reportId } = context.params;
  const supabase = auth.isAdmin ? createServiceClient() : await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, status, report_data, lagna_sign, dasha_mahadasha, dasha_antardasha, day_scores, native_name, birth_date, birth_time, birth_city, generation_started_at, generation_step, generation_progress, updated_at, created_at',
    )
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const status = data?.status ?? 'unknown';
  const isComplete = status === 'complete';
  const reportData = data?.report_data as Record<string, unknown> | null;

  // Use real server-side progress when available; fall back to coarse defaults.
  const serverProgress = typeof data?.generation_progress === 'number' ? data.generation_progress : null;
  const progress = isComplete
    ? 100
    : status === 'error'
      ? 0
      : (serverProgress ?? (status === 'generating' ? 5 : 0));

  return NextResponse.json({
    id: reportId,
    status,
    isComplete,
    progress,
    generation_step: data?.generation_step ?? null,
    report: isComplete ? reportData : null,
    lagna_sign: data?.lagna_sign,
    dasha_mahadasha: data?.dasha_mahadasha,
    dasha_antardasha: data?.dasha_antardasha,
    native_name: data?.native_name,
    birth_date: data?.birth_date,
    birth_time: data?.birth_time,
    birth_city: data?.birth_city,
    generation_started_at: data?.generation_started_at ?? null,
    updated_at: data?.updated_at ?? null,
    created_at: data?.created_at ?? null,
  });
}
