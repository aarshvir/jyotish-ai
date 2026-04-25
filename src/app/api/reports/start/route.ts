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
import { createJobToken } from '@/lib/api/jobToken';
import { acquireLock, releaseLock } from '@/lib/redis/locks';

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

/** POST JSON shape (optional fields) — same names as report/[id] client kickoff. */
interface StartRequestBody {
  reportId?: string;
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  birth_lat?: string | number | null;
  birth_lng?: string | number | null;
  current_city?: string | null;
  current_lat?: string | number | null;
  current_lng?: string | number | null;
  timezone_offset?: string | number | null;
  plan_type?: string;
  payment_status?: string;
  forecast_start?: string;
  forceRestart?: boolean;
  testOptions?: { disableRag?: boolean };
  jyotishRagMode?: string;
  jyotish_rag_mode?: string;
  /** legacy aliases */
  date?: string;
  time?: string;
  city?: string;
  lat?: string | number | null;
  lng?: string | number | null;
  forecastStart?: string;
  currentTz?: string | number | null;
  currentCity?: string | null;
  currentLat?: string | number | null;
  currentLng?: string | number | null;
}

/** Merge legacy field names from the onboard client (date/time/city/lat/forecastStart/currentTz). */
function normalizeStartBody(raw: Record<string, unknown>): StartRequestBody {
  const b = { ...raw } as StartRequestBody;
  if (b.birth_date == null || b.birth_date === '') b.birth_date = b.date;
  if (b.birth_time == null || b.birth_time === '') b.birth_time = b.time;
  if (b.birth_city == null || b.birth_city === '') b.birth_city = b.city;
  if (b.birth_lat == null) b.birth_lat = b.lat;
  if (b.birth_lng == null) b.birth_lng = b.lng;
  if (b.forecast_start == null && b.forecastStart != null) b.forecast_start = b.forecastStart;
  if (b.timezone_offset == null && b.currentTz != null) b.timezone_offset = b.currentTz;
  if (b.current_city == null && b.currentCity != null) b.current_city = b.currentCity;
  if (b.current_lat == null && b.currentLat != null) b.current_lat = b.currentLat;
  if (b.current_lng == null && b.currentLng != null) b.current_lng = b.currentLng;
  return b;
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

  const rl = await checkRateLimit(
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

  const body = normalizeStartBody(
    (await request.json().catch(() => ({}))) as Record<string, unknown>,
  );
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

  const lockKey = `report:${reportId}:generation`;
  const gotLock = forceRestart || await acquireLock(lockKey, 10 * 60);
  if (!gotLock) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already claimed — keep polling status.',
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
    await releaseLock(lockKey);
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

  const toNum = (v: string | number | null | undefined) => parseFloat(String(v ?? 0)) || 0;
  const input: PipelineInput = {
    name: body.name ?? 'Seeker',
    date: body.birth_date ?? '',
    time: pipelineTime,
    city: body.birth_city ?? '',
    lat: toNum(body.birth_lat),
    lng: toNum(body.birth_lng),
    currentLat: toNum(body.current_lat ?? body.birth_lat),
    currentLng: toNum(body.current_lng ?? body.birth_lng),
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
  const correlationId = `${reportId}-${Date.now()}`;
  const authHeaders: Record<string, string> = {};
  authHeaders['x-job-token'] = createJobToken({
    reportId,
    userId: auth.user.id,
    purpose: 'pipeline',
    correlationId,
    ttlSeconds: 60 * 60,
  });
  authHeaders['x-report-id'] = reportId;
  authHeaders['x-correlation-id'] = correlationId;
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
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
        id: `report-generate:${reportId}`,
        name: 'report/generate',
        data: {
          reportId,
          userId: auth.user.id,
          userEmail: auth.user.email ?? '',
          input,
          base,
          authHeaders,
          correlationId,
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
        await releaseLock(lockKey);
        return NextResponse.json(
          { error: 'Background job queue is temporarily unavailable. Please retry shortly.' },
          { status: 503 },
        );
      }
      console.warn(`[reports/start] local/dev fallback running inline for ${reportId}`);
    }
  } else if (!allowInlineFallback) {
    await releaseLock(lockKey);
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
    await releaseLock(lockKey);
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
    await releaseLock(lockKey);
    return NextResponse.json(
      { error: 'Report pipeline did not complete — please retry.' },
      { status: 500 },
    );
  }

  await releaseLock(lockKey);
  return NextResponse.json({ reportId, ok: true, status: 'complete' });
}
