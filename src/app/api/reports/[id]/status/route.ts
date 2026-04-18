export const maxDuration = 30;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';

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
  const userId = auth.user.id;

  // Bypass the supabase-js client entirely for this read — use raw PostgREST
  // so we can attach the `Prefer: no-cache` header which tells Supabase to
  // route this read to the PRIMARY database rather than a read replica.
  // This eliminates the 30–90s replica lag that caused stale "generating" reads
  // even after the pipeline had saved status=complete to the primary.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  // Use raw PostgREST fetch with `Prefer: no-cache` to bypass Supabase read-replica
  // routing — the supabase-js client doesn't expose this and always routes to replica.
  // Service-role key skips RLS, so we filter user_id in the query for security.
  const restUrl = `${supabaseUrl}/rest/v1/reports?id=eq.${reportId}&user_id=eq.${userId}&limit=1`;
  let data: Record<string, unknown> | null = null;

  try {
    const res = await fetch(restUrl, {
      method: 'GET',
      headers: {
        apikey:          serviceKey,
        Authorization:   `Bearer ${serviceKey}`,
        Accept:          'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma:          'no-cache',
        // PostgREST-specific header: force read from primary, not read-replica.
        // Supabase PostgREST 12+ respects this to bypass replica routing.
        Prefer:          'no-cache',
      },
      cache: 'no-store' as RequestCache,
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const rows = await res.json() as Record<string, unknown>[];
    data = rows[0] ?? null;
  } catch {
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 });
  }

  if (!data) {
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
