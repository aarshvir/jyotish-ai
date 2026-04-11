export const maxDuration = 10;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Poll endpoint: client calls this every 2 seconds to check if report is done.
 * Returns { status, progress, report_data } so UI can update.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id: reportId } = context.params;
  // Use service client for bypass (admin) to avoid RLS blocking reads on the bypass user ID.
  const supabase = auth.isAdmin ? createServiceClient() : await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('id, status, report_data, lagna_sign, dasha_mahadasha, dasha_antardasha, day_scores, native_name, birth_date, birth_time, birth_city')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const status = data?.status ?? 'unknown';
  const isComplete = status === 'complete';
  const reportData = data?.report_data as Record<string, unknown> | null;

  return NextResponse.json({
    id: reportId,
    status,
    isComplete,
    progress: isComplete ? 100 : status === 'generating' ? 50 : 0,
    report: isComplete ? reportData : null,
    lagna_sign: data?.lagna_sign,
    dasha_mahadasha: data?.dasha_mahadasha,
    dasha_antardasha: data?.dasha_antardasha,
    native_name: data?.native_name,
    birth_date: data?.birth_date,
    birth_time: data?.birth_time,
    birth_city: data?.birth_city,
  });
}
