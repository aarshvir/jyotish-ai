export const maxDuration = 10;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('id, status, report_data, lagna_sign, dasha_mahadasha, dasha_antardasha, day_scores')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const status = data?.status ?? 'unknown';
  const isComplete = status === 'complete';
  const reportData = data?.report_data as any;

  return NextResponse.json({
    id: reportId,
    status,
    isComplete,
    progress: isComplete ? 100 : 50, // Could track progress in DB if needed
    report: isComplete ? reportData : null,
    lagna_sign: data?.lagna_sign,
    dasha_mahadasha: data?.dasha_mahadasha,
    dasha_antardasha: data?.dasha_antardasha,
  });
}
