/**
 * Report generation start route.
 * Runs the pipeline synchronously within Vercel's maxDuration window.
 * The orchestrator has its own internal budget (255s soft / 285s hard-kill)
 * so it saves progress and marks the report as 'error' cleanly if time runs out.
 *
 * The client polls /api/reports/[id]/status every 3s and shows a live
 * progress bar while waiting.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';

/**
 * If a row is `generating` and younger than this, skip starting a duplicate pipeline.
 * 5 minutes — gives the active pipeline time to finish before allowing a retry.
 */
const YOUNG_GENERATING_MS = 5 * 60 * 1000;

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

function isYoungGenerating(generationStartedAt: string | null | undefined): boolean {
  if (!generationStartedAt) return false;
  const t = new Date(generationStartedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < YOUNG_GENERATING_MS;
}

/**
 * POST /api/reports/start
 *
 * Creates or updates a `reports` row, then runs the pipeline synchronously
 * within Vercel's 300s window. The orchestrator's internal checkpoints mean
 * a retry picks up from the last completed phase rather than restarting.
 *
 * Returns:
 *   202 { status: 'generating' }  — pipeline is still running (client should poll)
 *   200 { status: 'complete' }    — pipeline completed within this request
 *   500 { error }                 — pipeline failed; report row marked 'error'
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 });
  }

  const db = createServiceClient();
  const readDb = auth.isAdmin ? db : await createClient();

  const { data: existing } = await readDb
    .from('reports')
    .select('status, report_data, generation_started_at')
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

  const forceRestart = body.forceRestart === true;

  if (
    existing?.status === 'generating' &&
    isYoungGenerating(existing.generation_started_at) &&
    !forceRestart
  ) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already in progress — keep polling status.',
      },
      { status: 202 },
    );
  }

  const tzBody = body.timezone_offset;
  const timezoneOffset =
    typeof tzBody === 'number' && Number.isFinite(tzBody)
      ? tzBody
      : typeof tzBody === 'string' && tzBody.trim() !== ''
        ? parseInt(tzBody, 10) || 0
        : 0;

  const nowIso = new Date().toISOString();

  const { error: upsertError } = await db.from('reports').upsert(
    {
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
      generation_started_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
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
  const authHeaders: Record<string, string> = {};
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

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
    console.error(`[reports/start] pipeline failed for ${reportId}:`, err);
    await db
      .from('reports')
      .update({
        status: 'error',
        report_data: { error: String(err) },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .neq('status', 'complete');
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const { data: finalRow } = await db
    .from('reports')
    .select('status')
    .eq('id', reportId)
    .maybeSingle();

  if (finalRow?.status !== 'complete') {
    console.error(`[reports/start] pipeline returned but DB status is '${finalRow?.status}' for ${reportId}`);
    return NextResponse.json({ error: 'Report pipeline did not complete — please retry.' }, { status: 500 });
  }

  return NextResponse.json({ reportId, ok: true, status: 'complete' });
}
