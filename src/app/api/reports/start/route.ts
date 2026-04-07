export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';

/**
 * Creates a `reports` row in `generating` state and starts background computation.
 * Client then polls `/api/reports/[id]/status` to check status.
 * Computation starts independently via async fire-and-forget.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('reports').insert({
    id: reportId,
    user_id: auth.user.id,
    user_email: auth.user.email ?? '',
    native_name: body.name ?? 'Unknown',
    birth_date: body.birth_date ?? '2000-01-01',
    birth_time: body.birth_time ?? '12:00:00',
    birth_city: body.birth_city ?? 'Unknown',
    birth_lat: body.birth_lat ?? null,
    birth_lng: body.birth_lng ?? null,
    current_city: body.current_city ?? null,
    current_lat: body.current_lat ?? null,
    current_lng: body.current_lng ?? null,
    timezone_offset: body.timezone_offset ?? null,
    plan_type: body.plan_type ?? '7day',
    status: 'generating',
    payment_status: body.payment_status ?? 'free',
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Prepare background task
  const input: PipelineInput = {
    name: body.name ?? 'Seeker',
    date: body.birth_date ?? '',
    time: body.birth_time ?? '12:00:00',
    city: body.birth_city ?? '',
    lat: parseFloat(body.birth_lat ?? '0') || 0,
    lng: parseFloat(body.birth_lng ?? '0') || 0,
    currentLat: parseFloat(body.current_lat ?? body.birth_lat ?? '0') || 0,
    currentLng: parseFloat(body.current_lng ?? body.birth_lng ?? '0') || 0,
    currentCity: body.current_city ?? body.birth_city ?? '',
    timezoneOffset: body.timezone_offset ?? -new Date().getTimezoneOffset(),
    type: body.plan_type ?? '7day',
    forecastStart: body.forecast_start ?? undefined,
    planType: body.plan_type ?? '7day',
    paymentStatus: 'bypass',
  };

  const base = request.nextUrl.origin;
  const authHeaders: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  if (cookie) authHeaders['cookie'] = cookie;

  // Fire-and-forget: start computation in background without blocking the response
  // This task will continue running on Vercel even after the response is sent
  generateReportPipeline(reportId, auth.user.id, auth.user.email ?? '', input, () => {}, base, authHeaders)
    .catch((err) => console.error(`[reports/start] background pipeline failed for ${reportId}:`, err));

  // Return immediately so client can start polling
  return NextResponse.json({ reportId, ok: true, status: 'generating' });
}
