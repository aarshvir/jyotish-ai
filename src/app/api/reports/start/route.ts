/**
 * Report generation start route.
 *
 * If INNGEST_EVENT_KEY is set, the pipeline is dispatched to
 * Inngest for background execution with no timeout constraints.
 *
 * If not set, production returns 503 instead of silently running a long
 * synchronous fallback. Local development may still run inline for convenience.
 *
 * `REPORT_START_REQUIRE_INNGEST=true` enforces the Inngest path: missing key
 * or failed dispatch never falls back to inline; dispatch failure returns
 * 503 with `code: INNGEST_DISPATCH_FAILED`.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createServiceClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin/isAdmin';
import { generateReportPipeline, type PipelineInput } from '@/lib/reports/orchestrator';
import { inngest } from '@/lib/inngest/client';
import { checkRateLimit, getRateLimitKey } from '@/lib/api/rateLimit';
import { createJobToken, getPipelineJobTokenTtlSeconds } from '@/lib/api/jobToken';
import { getCanonicalDispatchOrigin } from '@/lib/url/canonicalDispatchOrigin';
import { acquireLock, releaseLock } from '@/lib/redis/locks';
import { appendReportGenerationLog, clearReportGenerationLog } from '@/lib/observability/generationLog';
import { inferReportGenerationErrorCode, markReportAsFailed } from '@/lib/reports/reportErrors';
import { getPromoDiscount, hasUserRedeemed, redeemPromoCode } from '@/lib/promo/server';
import { resolveReportTimezoneOffset } from '@/lib/utils/timezoneOffset';

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

type ReportStartEngine = 'inngest' | 'node' | 'none';
type ReportStartDispatchMode = 'inngest' | 'inline_fallback' | 'blocked';

function parseReportStartEnv() {
  const inngestConfigured = !!process.env.INNGEST_EVENT_KEY;
  const allowInlineOverride =
    process.env.REPORT_PIPELINE_INLINE === '1' || process.env.REPORT_PIPELINE_INLINE === 'true';
  // Production report generation must be durable. Inline fallback is for local
  // development or an explicit emergency override only.
  const isProductionRuntime =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    (process.env.VERCEL === '1' && process.env.NODE_ENV !== 'development');
  const requireStrictInngest =
    process.env.REPORT_START_REQUIRE_INNGEST === '1' ||
    process.env.REPORT_START_REQUIRE_INNGEST === 'true' ||
    (isProductionRuntime && !allowInlineOverride);
  const allowInlineFallback = allowInlineOverride || (!isProductionRuntime && !requireStrictInngest);
  return {
    useInngest: inngestConfigured,
    allowInlineOverride,
    allowInlineFallback,
    requireStrictInngest,
    isProductionRuntime,
  };
}

/** When actual dispatch path differs from what config implies, log once per request. */
function warnReportStartDispatchModeMismatch(
  reportId: string,
  generationTraceId: string,
  context: {
    expected: ReportStartDispatchMode;
    actual: ReportStartDispatchMode;
    reason: string;
    detail?: Record<string, unknown>;
  },
) {
  console.warn(
    `[trace:${generationTraceId}]`,
    JSON.stringify({
      event: 'report_start_dispatch_mode_mismatch',
      reportId,
      generation_trace_id: generationTraceId,
      expected: context.expected,
      actual: context.actual,
      reason: context.reason,
      ...context.detail,
    }),
  );
}

/** POST JSON shape (optional fields) — same names as report/[id] client kickoff. */
interface StartRequestBody {
  reportId?: string;
  name?: string;
  phone?: string;
  personal_context?: string;
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
  promoCode?: string;
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

type ExistingReportForStart = {
  user_id: string | null;
  status: string | null;
  report_data: unknown;
  generation_started_at: string | null;
  plan_type: string | null;
  payment_status: string | null;
  payment_provider: string | null;
};

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

function safeNonPaidPaymentStatus(
  requested: string | null | undefined,
  planType: string | null | undefined,
): string {
  // A client-claimed 'promo'/'bypass' no longer entitles by itself — only a real
  // completed payment ('paid') or a server-validated promo (see POST handler) does.
  if (requested === 'free') return 'free';
  const normalizedPlan = (planType ?? '').trim();
  return normalizedPlan === 'free' || normalizedPlan === 'preview' ? 'free' : 'unpaid';
}

async function hasCompletedZiinaPayment(
  db: ReturnType<typeof createServiceClient>,
  reportId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('ziina_payments')
    .select('ziina_intent_id')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (error) {
    // Throw (not return false) so the caller surfaces a retryable 503 instead of
    // silently downgrading a genuinely-paid user to 'unpaid' and showing a misleading 402.
    console.warn('[reports/start] completed payment lookup failed:', error.message);
    throw new Error('completed payment lookup failed');
  }
  return !!data;
}

async function resolveTrustedPaymentStatus(
  db: ReturnType<typeof createServiceClient>,
  reportId: string,
  userId: string,
  body: StartRequestBody,
  existing: ExistingReportForStart | null,
  isAdmin: boolean,
): Promise<string> {
  if (isAdmin && typeof body.payment_status === 'string' && body.payment_status.trim() !== '') {
    return body.payment_status.trim();
  }

  if (await hasCompletedZiinaPayment(db, reportId, userId)) {
    return 'paid';
  }

  // A report already granted 'promo' on its first attempt (server-validated, with the
  // once-per-user redemption already booked) stays entitled on a same-owner retry.
  // The retry / forceRestart path does NOT resend the promo code, and the code can't
  // be re-redeemed (hasUserRedeemed → PROMO_ALREADY_USED), so without this a transient
  // first-attempt failure would 402 the promo buyer permanently. `existing` is
  // ownership-checked at the call site, so its persisted status is trustworthy; the
  // client's body.payment_status is NOT trusted here.
  if (existing?.payment_status === 'promo') {
    return 'promo';
  }

  return safeNonPaidPaymentStatus(
    typeof body.payment_status === 'string' ? body.payment_status : existing?.payment_status,
    body.plan_type ?? existing?.plan_type,
  );
}

/**
 * POST /api/reports/start
 *
 * 1. Creates/updates the `reports` row with status='generating'
 * 2. If INNGEST_EVENT_KEY is configured → sends event to Inngest, returns 202 immediately
 *    Client then polls /api/reports/[id]/status until complete.
 * 3. If not configured in production → returns 503 unless REPORT_PIPELINE_INLINE=1
 *    (local `next start` + E2E / quality-wave only).
 * 4. `REPORT_START_REQUIRE_INNGEST=true` — no Inngest key or failed `inngest.send` must not
 *    fall back to inline; failed send returns 503 with `code: INNGEST_DISPATCH_FAILED`.
 *    Responses include `engine` and `dispatch_mode` (`inngest` | `inline_fallback` | `blocked`).
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
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 429 },
    );
  }

  const body = normalizeStartBody(
    (await request.json().catch(() => ({}))) as Record<string, unknown>,
  );
  const reportId = typeof body.reportId === 'string' ? body.reportId : null;
  if (!reportId) {
    return NextResponse.json(
      {
        error: 'reportId required',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 400 },
    );
  }

  const { useInngest, allowInlineFallback, requireStrictInngest, allowInlineOverride } =
    parseReportStartEnv();

  const db = createServiceClient();
  const { data: existingRaw, error: existingErr } = await db
    .from('reports')
    .select('user_id, status, report_data, generation_started_at, plan_type, payment_status, payment_provider')
    .eq('id', reportId)
    .maybeSingle();

  if (existingErr) {
    console.error('[reports/start] existing-row read failed:', existingErr.message);
    return NextResponse.json(
      {
        error: 'Could not start generation',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  const existing = (existingRaw as ExistingReportForStart | null) ?? null;
  if (existing && existing.user_id !== auth.user.id && !auth.isAdmin) {
    return NextResponse.json(
      {
        error: 'Report not found',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 404 },
    );
  }

  // personal_context lives behind migration 20260617. Read it tolerantly (separate
  // query) so a not-yet-applied migration can never 500 the core report-start flow —
  // mirrors the deliberately tolerant WRITE further below. null when absent.
  let existingPersonalContext: string | null = null;
  if (existing) {
    const { data: pcRow, error: pcErr } = await db
      .from('reports')
      .select('personal_context')
      .eq('id', reportId)
      .maybeSingle();
    if (pcErr) {
      const m = pcErr.message ?? '';
      if (!m.includes('personal_context') && !m.includes('schema cache')) {
        console.warn('[reports/start] personal_context read failed:', m);
      }
    } else {
      existingPersonalContext = (pcRow as { personal_context?: string | null } | null)?.personal_context ?? null;
    }
  }

  const rd = existing?.report_data as { days?: unknown[] } | null | undefined;
  const alreadyDone =
    existing?.status === 'complete' &&
    Array.isArray(rd?.days) &&
    (rd!.days as unknown[]).length > 0;

  if (alreadyDone) {
    return NextResponse.json({
      reportId,
      ok: true,
      status: 'complete',
      skipped: true,
      generation_trace_id: null,
      engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
      dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
    });
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
        generation_trace_id: null,
        engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
        dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
      },
      { status: 202 },
    );
  }

  const lockKey = `report:${reportId}:generation`;
  // Track REAL ownership: forceRestart proceeds without holding the lock, so it must
  // never release it — otherwise it would delete a concurrent normal request's lock and
  // let a third request dispatch a SECOND pipeline for the same report. Only the request
  // that actually acquired the lock may release it.
  const lockAcquired = forceRestart ? false : await acquireLock(lockKey, 10 * 60);
  const gotLock = forceRestart || lockAcquired;
  const releaseOwnedLock = async () => {
    if (lockAcquired) await releaseLock(lockKey);
  };
  if (!gotLock) {
    return NextResponse.json(
      {
        reportId,
        ok: true,
        status: 'generating',
        skippedPipeline: true,
        message: 'Generation already claimed — keep polling status.',
        generation_trace_id: null,
        engine: (useInngest ? 'inngest' : 'node') as ReportStartEngine,
        dispatch_mode: (useInngest ? 'inngest' : 'inline_fallback') as ReportStartDispatchMode,
      },
      { status: 202 },
    );
  }

  const generationTraceId = randomUUID();

  // Prefer an estimate from the timed location (current city if set, else birth)
  // over a client/browser timezone_offset. Onboard historically sent
  // -getTimezoneOffset() whenever "I live elsewhere" was unchecked, which shifted
  // every paid hourly window for travelers (e.g. Dubai browser + Delhi birth).
  const parseLng = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : null;
  };
  const timezoneOffset = resolveReportTimezoneOffset({
    clientOffset: body.timezone_offset,
    birthCity: body.birth_city,
    birthLng: parseLng(body.birth_lng),
    currentCity: body.current_city,
    currentLng: parseLng(body.current_lng),
  });

  const nowIso = new Date().toISOString();
  let trustedPaymentStatus: string;
  try {
    trustedPaymentStatus = await resolveTrustedPaymentStatus(
      db,
      reportId,
      auth.user.id,
      body,
      existing,
      auth.isAdmin === true,
    );
  } catch (e) {
    // Transient payment-verification failure (e.g. DB lookup error). Fail closed, but
    // tell the client it's retryable (503) rather than a misleading 402 "payment required".
    console.warn('[reports/start] payment verification unavailable:', e);
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error: 'Unable to verify payment status right now. Please retry in a moment.',
        code: 'PAYMENT_VERIFY_UNAVAILABLE',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 503 },
    );
  }

  // ── Entitlement gate ────────────────────────────────────────────────
  // Login is already enforced above. Policy: each user gets exactly ONE free
  // report (the free preview); every paid plan requires a verified completed
  // payment. Admins (owner) bypass. Client-claimed promo/bypass do NOT entitle
  // here — only 'paid' (a real completed Ziina payment) passes.
  const userIsAdmin = auth.isAdmin === true || (await isAdmin(auth.user.email));
  const planNorm = (body.plan_type ?? existing?.plan_type ?? '7day').trim().toLowerCase();
  const isFreePlan = planNorm === 'free' || planNorm === 'preview';

  // Server-validated 100%-off promo entitlement. A non-admin who supplies a valid
  // full-discount code (e.g. ADMIN100, opened to everyone) may generate a paid-forecast
  // report without payment. The code is validated against the DB here — a client-claimed
  // 'promo' alone never passes (safeNonPaidPaymentStatus no longer echoes it). Anything
  // less than 100% still requires real payment.
  let promoCodeIdToRedeem: string | null = null;
  let promoOncePerUser = false;
  const requestedPromo =
    typeof body.payment_status === 'string' && body.payment_status.trim() === 'promo';
  const isPaidForecastPlan = planNorm === '7day' || planNorm === 'monthly' || planNorm === 'annual';
  if (
    !isFreePlan &&
    isPaidForecastPlan &&
    requestedPromo &&
    trustedPaymentStatus !== 'paid' &&
    !userIsAdmin &&
    typeof body.promoCode === 'string' &&
    body.promoCode.trim() !== ''
  ) {
    const promo = await getPromoDiscount(body.promoCode, auth.user.email);
    if (!promo.valid) {
      await releaseOwnedLock();
      return NextResponse.json(
        { error: promo.reason ?? 'Invalid coupon code', code: 'INVALID_PROMO', engine: 'none' as ReportStartEngine, dispatch_mode: 'blocked' as ReportStartDispatchMode },
        { status: 400 },
      );
    }
    if (promo.discountPct < 100) {
      await releaseOwnedLock();
      return NextResponse.json(
        { error: 'Payment is required to generate this report.', code: 'PAYMENT_REQUIRED', engine: 'none' as ReportStartEngine, dispatch_mode: 'blocked' as ReportStartDispatchMode },
        { status: 402 },
      );
    }
    if (promo.oncePerUser && promo.codeId) {
      let alreadyRedeemed: boolean;
      try {
        alreadyRedeemed = await hasUserRedeemed(promo.codeId, auth.user.id);
      } catch {
        // Fail closed on a transient lookup error — retryable, not a silent free grant.
        await releaseOwnedLock();
        return NextResponse.json(
          { error: 'Could not verify your coupon — please try again.', code: 'PROMO_CHECK_FAILED', engine: 'none' as ReportStartEngine, dispatch_mode: 'blocked' as ReportStartDispatchMode },
          { status: 503 },
        );
      }
      if (alreadyRedeemed) {
        await releaseOwnedLock();
        return NextResponse.json(
          { error: 'You have already used this coupon.', code: 'PROMO_ALREADY_USED', engine: 'none' as ReportStartEngine, dispatch_mode: 'blocked' as ReportStartDispatchMode },
          { status: 400 },
        );
      }
    }
    trustedPaymentStatus = 'promo';
    promoCodeIdToRedeem = promo.codeId ?? null;
    promoOncePerUser = promo.oncePerUser === true;
  }

  if (!isFreePlan && trustedPaymentStatus !== 'paid' && trustedPaymentStatus !== 'promo' && !userIsAdmin) {
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error: 'Payment is required to generate this report.',
        code: 'PAYMENT_REQUIRED',
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 402 },
    );
  }

  if (isFreePlan && !userIsAdmin) {
    const { count: priorFree } = await db
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .in('plan_type', ['free', 'preview'])
      .neq('id', reportId);
    if ((priorFree ?? 0) >= 1) {
      await releaseOwnedLock();
      return NextResponse.json(
        {
          error: 'You have already used your one free report. Choose a plan to unlock more.',
          code: 'FREE_LIMIT_REACHED',
          engine: 'none' as ReportStartEngine,
          dispatch_mode: 'blocked' as ReportStartDispatchMode,
        },
        { status: 402 },
      );
    }
  }

  // Bind the report's plan to what was actually paid for — prevents paying for a
  // 7-day plan then requesting 'annual' (the completed-payment check is plan-agnostic).
  if (!isFreePlan && userIsAdmin !== true) {
    const { data: paidRow } = await db
      .from('ziina_payments')
      .select('plan_type')
      .eq('report_id', reportId)
      .eq('user_id', auth.user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const paidPlan = (paidRow as { plan_type?: string } | null)?.plan_type;
    if (paidPlan) body.plan_type = paidPlan;
  }

  // Guard: refuse to generate for unresolved birth coordinates. A geocode failure
  // that fell back to 0,0 (open ocean — no inhabited birth city resolves there)
  // would otherwise produce a confident but astronomically wrong chart presented
  // as complete. Reject BEFORE creating the 'generating' row so nothing is stranded.
  const guardLat = parseFloat(String(body.birth_lat ?? ''));
  const guardLng = parseFloat(String(body.birth_lng ?? ''));
  if (
    !Number.isFinite(guardLat) ||
    !Number.isFinite(guardLng) ||
    (Math.abs(guardLat) < 0.01 && Math.abs(guardLng) < 0.01)
  ) {
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error:
          'We could not resolve your birth location. Please re-enter your birth city so we can compute an accurate chart.',
        code: 'INVALID_BIRTH_COORDINATES' as const,
        generation_trace_id: generationTraceId,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 400 },
    );
  }

  // Book the server-validated promo redemption BEFORE creating the 'generating' row,
  // so a code that hit its max_uses cap blocks generation instead of granting a free
  // report past the cap (the read-time check in getPromoDiscount is racy at the
  // boundary; the RPC enforces the cap atomically). The RPC returns FALSE for BOTH a
  // genuine cap-reached AND an idempotent duplicate (same order_id) — disambiguate by
  // re-reading the cap, so only a full cap blocks; a duplicate (race/retry) proceeds.
  // Once-per-user codes use the stable promo:{codeId}:{userId} order_id (the unique
  // index enforces once-per-user across the free + checkout paths); unlimited codes
  // use the per-report id so legitimate repeat use is allowed.
  if (promoCodeIdToRedeem) {
    const orderId = promoOncePerUser
      ? `promo:${promoCodeIdToRedeem}:${auth.user.id}`
      : reportId;
    let booked = true;
    try {
      booked = await redeemPromoCode(promoCodeIdToRedeem, auth.user.id, orderId);
    } catch (e) {
      // Redemption bookkeeping hiccup: don't fail the report over it; the atomic cap
      // still held in the RPC. (Matches prior fail-open-on-bookkeeping behavior.)
      console.warn('[reports/start] promo redeem failed (non-fatal):', e);
      booked = true;
    }
    if (!booked) {
      const { data: capRow } = await db
        .from('promo_codes')
        .select('used_count, max_uses')
        .eq('id', promoCodeIdToRedeem)
        .maybeSingle();
      const cap = capRow as { used_count?: number; max_uses?: number | null } | null;
      const capReached = cap?.max_uses != null && (cap.used_count ?? 0) >= cap.max_uses;
      if (capReached) {
        await releaseOwnedLock();
        return NextResponse.json(
          {
            error: 'This code has reached its usage limit.',
            code: 'PROMO_LIMIT_REACHED',
            engine: 'none' as ReportStartEngine,
            dispatch_mode: 'blocked' as ReportStartDispatchMode,
          },
          { status: 409 },
        );
      }
      // else: idempotent duplicate (concurrent retry / replay) — proceed to generate.
    }
  }

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
      timezone_offset: timezoneOffset,
      plan_type: body.plan_type ?? '7day',
      status: 'generating',
      payment_status: trustedPaymentStatus,
      payment_provider:
        trustedPaymentStatus === 'paid'
          ? 'ziina'
          : existing?.payment_provider ?? null,
      generation_started_at: nowIso,
      generation_progress: 0,
      updated_at: nowIso,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    await releaseOwnedLock();
    console.error('[reports/start] report upsert failed:', upsertError.message);
    return NextResponse.json(
      {
        error: 'Could not start generation',
        generation_trace_id: generationTraceId,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  // Optional columns (see migrations 20260426 / 20260427) — omit from upsert so older DBs work.
  const { error: traceErr } = await db
    .from('reports')
    .update({ generation_trace_id: generationTraceId, updated_at: nowIso })
    .eq('id', reportId)
    .eq('user_id', auth.user.id);
  if (traceErr) {
    const m = traceErr.message ?? '';
    if (!m.includes('generation_trace_id') && !m.includes('schema cache')) {
      await releaseOwnedLock();
      console.error('[reports/start] trace-id update failed:', m);
      return NextResponse.json(
        {
          error: 'Could not start generation',
          generation_trace_id: generationTraceId,
          engine: 'none' as ReportStartEngine,
          dispatch_mode: 'blocked' as ReportStartDispatchMode,
        },
        { status: 500 },
      );
    }
  }

  // Optional column: phone (migration 20260614_user_phone). Kept out of the upsert so older
  // DBs without the column still generate; the owner uses it to call the seeker about their reading.
  if (typeof body.phone === 'string' && body.phone.trim()) {
    const { error: phoneErr } = await db
      .from('reports')
      .update({ phone: body.phone.trim(), updated_at: nowIso })
      .eq('id', reportId)
      .eq('user_id', auth.user.id);
    if (phoneErr) {
      const m = phoneErr.message ?? '';
      if (!m.includes('phone') && !m.includes('schema cache')) {
        console.warn('[reports/start] phone update failed:', m);
      }
    }
  }

  // Optional column: personal_context (migration 20260617_reports_personal_context). Kept out of
  // the upsert so older DBs still generate; personalizes the LLM commentary.
  if (typeof body.personal_context === 'string' && body.personal_context.trim()) {
    const { error: pcErr } = await db
      .from('reports')
      .update({ personal_context: body.personal_context.trim().slice(0, 1200), updated_at: nowIso })
      .eq('id', reportId)
      .eq('user_id', auth.user.id);
    if (pcErr) {
      const m = pcErr.message ?? '';
      if (!m.includes('personal_context') && !m.includes('schema cache')) {
        console.warn('[reports/start] personal_context update failed:', m);
      }
    }
  }

  // Reset append-only log when the column exists (migration). Omitted from upsert so older
  // DBs without `reports.generation_log` still accept the row; clears stale log on restart.
  await clearReportGenerationLog(reportId, auth.user.id);

  // CRITICAL: On forceRestart, wipe pipeline_state so the next run does NOT reuse stale LLM
  // checkpoints from previous failed/partial attempts. Without this, the orchestrator finds
  // months/weeks checkpoints containing fallback text and skips all real LLM calls —
  // producing a report that looks complete but contains 100% template copy.
  if (forceRestart) {
    await db
      .from('reports')
      .update({ pipeline_state: null, pipeline_checkpoint: null, generation_progress: 0, updated_at: nowIso })
      .eq('id', reportId)
      .eq('user_id', auth.user.id);
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
    paymentStatus: trustedPaymentStatus,
    // Prefer the freshly-submitted context; fall back to the persisted column so a
    // report-page retry / "Try Again" (which omits the field) stays personalized.
    ...(((body.personal_context?.trim()) || existingPersonalContext?.trim())
      ? { personalContext: ((body.personal_context?.trim() || existingPersonalContext || '').slice(0, 1200)) }
      : {}),
    ...(ragRaw != null && String(ragRaw).trim() !== ''
      ? { jyotishRagMode: String(ragRaw).trim() }
      : {}),
  };

  const base = getCanonicalDispatchOrigin(request.nextUrl.origin);
  const authHeaders: Record<string, string> = {};
  authHeaders['x-job-token'] = createJobToken({
    reportId,
    userId: auth.user.id,
    purpose: 'pipeline',
    correlationId: generationTraceId,
    ttlSeconds: getPipelineJobTokenTtlSeconds(),
  });
  authHeaders['x-report-id'] = reportId;
  authHeaders['x-correlation-id'] = generationTraceId;
  if (BYPASS_SECRET) {
    authHeaders['x-bypass-token'] = BYPASS_SECRET;
  } else {
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders['cookie'] = cookie;
  }

  // ── Inngest background execution (production) ─────────────────────────────
  // Only block if REPORT_START_REQUIRE_INNGEST is explicitly set.
  // Otherwise, always fall through to inline execution to avoid 100% failure on Hobby plan.
  if (!useInngest && requireStrictInngest) {
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error: 'Background job queue is required but INNGEST_EVENT_KEY is not set.',
        code: 'INNGEST_NOT_CONFIGURED' as const,
        engine: 'none' as ReportStartEngine,
        dispatch_mode: 'blocked' as ReportStartDispatchMode,
        generation_trace_id: generationTraceId,
      },
      { status: 503 },
    );
  }

  if (useInngest) {
    try {
      // Strip the global bypass secret AND the user's session cookie before the
      // headers are persisted into the Inngest event store (dashboard/logs). The
      // scoped 6h-TTL x-job-token authenticates every internal pipeline callback
      // (all internal routes accept it via requireAuth), so neither broad secret
      // needs to travel through — or be retained by — the third-party queue.
      const { ['x-bypass-token']: _omitBypass, ['cookie']: _omitCookie, ...dispatchAuthHeaders } =
        authHeaders;
      await inngest.send({
        // Static id deduplicates accidental double-dispatches within Inngest's 24h
        // window. But a RETRY of an already-failed/stale row must get a FRESH run —
        // a static id would be deduped against the original (failed) event and
        // silently dropped, leaving the row pinned 'generating' until the orphan
        // cron. forceRestart (Try-Again) is one such case, but a plain re-entry on
        // an 'error' row (revisiting an onboard URL that carries ?date=) hits this
        // path too. So make the id unique whenever we're restarting an 'error' row.
        // (A stale 'generating' row is recovered by the orphan cron → 'error' → retry.)
        id: forceRestart || existing?.status === 'error'
          ? `report-generate:${reportId}:${generationTraceId}`
          : `report-generate:${reportId}`,
        name: 'report/generate',
        data: {
          reportId,
          userId: auth.user.id,
          userEmail: auth.user.email ?? '',
          input,
          base,
          authHeaders: dispatchAuthHeaders,
          correlationId: generationTraceId,
          generation_trace_id: generationTraceId,
        },
      });
      console.log(
        `[trace:${generationTraceId}] [reports/start] dispatched to Inngest reportId=${reportId}`,
      );
      return NextResponse.json(
        {
          reportId,
          ok: true,
          status: 'generating',
          engine: 'inngest' as ReportStartEngine,
          dispatch_mode: 'inngest' as ReportStartDispatchMode,
          generation_trace_id: generationTraceId,
        },
        { status: 202 },
      );
    } catch (err) {
      console.error(`[trace:${generationTraceId}] [reports/start] Inngest dispatch failed:`, err);
      const noInlineFallback = requireStrictInngest || !allowInlineFallback;
      if (noInlineFallback) {
        warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
          expected: 'inngest',
          actual: 'blocked',
          reason: 'inngest_send_failed',
          detail: {
            requireStrictInngest,
            allowInlineFallback,
            err: err instanceof Error ? err.message : String(err),
            generation_trace_id: generationTraceId,
          },
        });
        await releaseOwnedLock();
        return NextResponse.json(
          {
            error: 'Background queue unavailable, please retry in a minute.',
            code: 'INNGEST_DISPATCH_FAILED' as const,
            engine: 'inngest' as ReportStartEngine,
            dispatch_mode: 'blocked' as ReportStartDispatchMode,
            generation_trace_id: generationTraceId,
          },
          { status: 503 },
        );
      }
      warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
        expected: 'inngest',
        actual: 'inline_fallback',
        reason: 'inngest_send_failed',
        detail: { err: err instanceof Error ? err.message : String(err), generation_trace_id: generationTraceId },
      });
    }
  }

  if (process.env.NODE_ENV === 'production' && !useInngest && allowInlineOverride) {
    warnReportStartDispatchModeMismatch(reportId, generationTraceId, {
      expected: 'inngest',
      actual: 'inline_fallback',
      reason: 'report_pipeline_inline_in_production_without_inngest',
      detail: { generation_trace_id: generationTraceId },
    });
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
    console.error(`[trace:${generationTraceId}] [reports/start] pipeline failed for ${reportId}:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    await appendReportGenerationLog({
      reportId,
      userId: auth.user.id,
      entry: {
        ts: new Date().toISOString(),
        elapsed_ms: 0,
        level: 'error',
        step: 'start_route_inline_pipeline',
        message: errMsg,
        detail: { route: 'POST /api/reports/start', generation_trace_id: generationTraceId },
      },
    });
    await markReportAsFailed(db, reportId, auth.user.id, {
      message: errMsg,
      errorStep: 'start_route_inline_pipeline',
      generationErrorCode: inferReportGenerationErrorCode(errMsg, 'start_route_inline_pipeline'),
    });
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error: String(err),
        generation_trace_id: generationTraceId,
        engine: 'node' as ReportStartEngine,
        dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  const { data: finalRow } = await db
    .from('reports')
    .select('status')
    .eq('id', reportId)
    .maybeSingle();

  if (finalRow?.status !== 'complete') {
    console.error(
      `[trace:${generationTraceId}] [reports/start] pipeline returned but DB status is '${finalRow?.status}' for ${reportId}`,
    );
    await releaseOwnedLock();
    return NextResponse.json(
      {
        error: 'Report pipeline did not complete — please retry.',
        generation_trace_id: generationTraceId,
        engine: 'node' as ReportStartEngine,
        dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
      },
      { status: 500 },
    );
  }

  await releaseOwnedLock();
  return NextResponse.json({
    reportId,
    ok: true,
    status: 'complete',
    generation_trace_id: generationTraceId,
    engine: 'node' as ReportStartEngine,
    dispatch_mode: 'inline_fallback' as ReportStartDispatchMode,
  });
}
