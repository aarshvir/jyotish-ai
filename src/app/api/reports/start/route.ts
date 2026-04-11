export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';

/** Pipeline `input.time` must be HH:MM (db rows may store HH:MM:SS). */
function birthTimeToPipelineTime(s: string): string {
  const raw = (s || '12:00:00').trim();
  const parts = raw.split(':').filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return '12:00';
}

/**
 * Creates a `reports` row in `generating` state and starts background computation.
 * Client polls `/api/reports/[id]/status` — safe to close the browser after this returns.
 * `waitUntil` keeps the serverless invocation alive until the pipeline finishes (Vercel).
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

  const { data: existing } = await supabase
    .from('reports')
    .select('status, report_data')
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const rd = existing?.report_data as { days?: unknown[] } | null | undefined;
  const alreadyDone =
    existing?.status === 'complete' &&
    Array.isArray(rd?.days) &&
    (rd!.days as unknown[]).length > 0;

  if (alreadyDone) {
    return NextResponse.json({ reportId, ok: true, status: 'complete', skipped: true });
  }

  const tzBody = body.timezone_offset;
  const timezoneOffset =
    typeof tzBody === 'number' && Number.isFinite(tzBody)
      ? tzBody
      : typeof tzBody === 'string' && tzBody.trim() !== ''
        ? parseInt(tzBody, 10) || 0
        : 0;

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
    timezone_offset: timezoneOffset || null,
    plan_type: body.plan_type ?? '7day',
    status: 'generating',
    payment_status: body.payment_status ?? 'free',
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pipelineTime = birthTimeToPipelineTime(String(body.birth_time ?? '12:00:00'));

  const input: PipelineInput = {
    name: body.name ?? 'Seeker',
    date: body.birth_date ?? '',
    time: pipelineTime,
    city: body.birth_city ?? '',
    lat: parseFloat(body.birth_lat ?? '0') || 0,
    lng: parseFloat(body.birth_lng ?? '0') || 0,
    currentLat: parseFloat(body.current_lat ?? body.birth_lat ?? '0') || 0,
    currentLng: parseFloat(body.current_lng ?? body.birth_lng ?? '0') || 0,
    currentCity: body.current_city ?? body.birth_city ?? '',
    timezoneOffset,
    type: body.plan_type ?? '7day',
    forecastStart: body.forecast_start ?? undefined,
    planType: body.plan_type ?? '7day',
    paymentStatus: body.payment_status ?? 'bypass',
  };

  const base = request.nextUrl.origin;

  // Use bypass secret for server-to-server calls inside the pipeline.
  // Browser session cookies cannot be used here because waitUntil runs after
  // the response is sent and the session may no longer be valid.
  const authHeaders: Record<string, string> = {};
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
    // Fallback: pass cookies (only reliable when session is still live)
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

  const pipeline = generateReportPipeline(
    reportId,
    auth.user.id,
    auth.user.email ?? '',
    input,
    () => {},
    base,
    authHeaders,
  ).catch((err) => console.error(`[reports/start] background pipeline failed for ${reportId}:`, err));

  waitUntil(pipeline);

  return NextResponse.json({ reportId, ok: true, status: 'generating' });
}
