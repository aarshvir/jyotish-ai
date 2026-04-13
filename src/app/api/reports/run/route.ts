/** Vercel cap for non-Enterprise plans is 300s; keep in sync with `vercel.json`. */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
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
 * Awaits the full report pipeline for one `reports` row. Intended to be called from the
 * browser right after `/api/reports/start` so this route’s invocation stays alive for
 * the whole generation (avoids `waitUntil` gaps on Next 14 App Router).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const readDb = auth.isAdmin ? createServiceClient() : await createClient();

  const { data: row, error: selErr } = await readDb
    .from('reports')
    .select(
      'status, report_data, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset, plan_type, payment_status',
    )
    .eq('id', reportId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.json({ error: selErr?.message ?? 'Not found' }, { status: 404 });
  }

  const rd = row.report_data as { days?: unknown[] } | null | undefined;
  const alreadyDone =
    row.status === 'complete' &&
    Array.isArray(rd?.days) &&
    (rd!.days as unknown[]).length > 0;

  if (alreadyDone) {
    return NextResponse.json({ reportId, ok: true, status: 'complete', skipped: true });
  }

  if (row.status !== 'generating') {
    return NextResponse.json(
      { error: 'Report is not in generating state', status: row.status },
      { status: 409 },
    );
  }

  const tz =
    typeof row.timezone_offset === 'number' && Number.isFinite(row.timezone_offset)
      ? row.timezone_offset
      : parseInt(String(row.timezone_offset ?? '0'), 10) || 0;

  const input: PipelineInput = {
    name: String(row.native_name ?? 'Seeker'),
    date: String(row.birth_date ?? ''),
    time: birthTimeToPipelineTime(String(row.birth_time ?? '12:00:00')),
    city: String(row.birth_city ?? ''),
    lat: parseFloat(String(row.birth_lat ?? '0')) || 0,
    lng: parseFloat(String(row.birth_lng ?? '0')) || 0,
    currentLat: parseFloat(String(row.current_lat ?? row.birth_lat ?? '0')) || 0,
    currentLng: parseFloat(String(row.current_lng ?? row.birth_lng ?? '0')) || 0,
    currentCity: String(row.current_city ?? row.birth_city ?? ''),
    timezoneOffset: tz,
    type: String(row.plan_type ?? '7day'),
    forecastStart: typeof body.forecast_start === 'string' ? body.forecast_start : undefined,
    planType: String(row.plan_type ?? '7day'),
    paymentStatus: String(row.payment_status ?? 'bypass'),
  };

  const base = request.nextUrl.origin;
  const authHeaders: Record<string, string> = {};
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

  const svc = createServiceClient();

  try {
    await generateReportPipeline(
      reportId,
      auth.user.id,
      auth.user.email ?? '',
      input,
      () => {},
      base,
      authHeaders,
    );
  } catch (err) {
    console.error(`[reports/run] pipeline failed for ${reportId}:`, err);
    await svc
      .from('reports')
      .update({
        status: 'error',
        report_data: { error: String(err) },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ reportId, ok: true, status: 'done' });
}
