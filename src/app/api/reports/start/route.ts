/**
 * Report generation start route.
 *
 * If INNGEST_EVENT_KEY is set, the pipeline is dispatched to
 * Inngest for background execution with no timeout constraints.
 *
 * If not set, production returns 503 instead of silently running a long
 * synchronous fallback. Local development may still run inline for convenience.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';
import { inngest } from '@/lib/inngest/client';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';

/**
 * If a row is `generating` and younger than this, skip starting a duplicate pipeline.
 * 10 minutes — Inngest jobs can take that long.
 */
const YOUNG_GENERATING_MS = 10 * 60 * 1000;
const REPORT_START_LIMIT = 3;
const REPORT_START_WINDOW_MS = 60_000;

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
 * 1. Creates/updates the `reports` row with status='generating'
 * 2. If INNGEST_EVENT_KEY is configured → sends event to Inngest, returns 202 immediately
 *    Client then polls /api/reports/[id]/status until complete.
 * 3. If not configured in production → returns 503 rather than tying up a
 *    serverless request for the full pipeline duration.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rl = checkRateLimit(
    `report-start:${getRateLimitKey(request, auth.user.id)}`,
    REPORT_START_LIMIT,
    REPORT_START_WINDOW_MS,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Too many report generation requests. Please wait before starting another report.',
        resetAt: rl.resetAt,
      },
      { status: 429 },
    );
  }

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

  const testDisableRag = body.testOptions?.disableRag;
  const ragRaw =
    testDisableRag === true
      ? 'off'
      : testDisableRag === false
        ? 'hybrid'
        : typeof body.jyotishRagMode === 'string'
          ? body.jyotishRagMode
          : typeof body.jyotish_rag_mode === 'string'
            ? body.jyotish_rag_mode
            : undefined;

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
    ...(ragRaw != null && String(ragRaw).trim() !== ''
      ? { jyotishRagMode: String(ragRaw).trim() }
      : {}),
  };

  const base = request.nextUrl.origin;
  const authHeaders: Record<string, string> = {};
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (serviceKey) {
    // Prefer service-key auth for internal pipeline → agent route calls.
    // This works even when BYPASS_SECRET is not set in the deployment environment.
    authHeaders['x-service-key'] = serviceKey;
  }
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else if (!serviceKey) {
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

  // ── Inngest background execution (production) ─────────────────────────────
  // If INNGEST_EVENT_KEY is set, hand off to Inngest and return 202 immediately.
  // The client polls /api/reports/[id]/status every 3s.
  const useInngest = !!process.env.INNGEST_EVENT_KEY;
  const allowInlineFallback = process.env.NODE_ENV !== 'production';

  if (useInngest) {
    try {
      await inngest.send({
        name: 'report/generate',
        data: {
          reportId,
          userId: auth.user.id,
          userEmail: auth.user.email ?? '',
          input,
          base,
          authHeaders,
        },
      });
      console.log(`[reports/start] dispatched to Inngest: ${reportId}`);
      return NextResponse.json(
        { reportId, ok: true, status: 'generating', engine: 'inngest' },
        { status: 202 },
      );
    } catch (err) {
      console.error(`[reports/start] Inngest dispatch failed:`, err);
      if (!allowInlineFallback) {
        return NextResponse.json(
          { error: 'Background job queue is temporarily unavailable. Please retry shortly.' },
          { status: 503 },
        );
      }
      console.warn(`[reports/start] local/dev fallback running inline for ${reportId}`);
    }
  } else if (!allowInlineFallback) {
    return NextResponse.json(
      { error: 'Background job queue is not configured. Set INNGEST_EVENT_KEY for production.' },
      { status: 503 },
    );
  }

  // ── Inline synchronous fallback (dev / no Inngest key) ───────────────────
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
    console.error(
      `[reports/start] pipeline returned but DB status is '${finalRow?.status}' for ${reportId}`,
    );
    return NextResponse.json(
      { error: 'Report pipeline did not complete — please retry.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ reportId, ok: true, status: 'complete' });
}
