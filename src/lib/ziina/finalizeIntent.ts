/**
 * Shared completion path for Ziina payment intents (GET /api/ziina/verify + optional Business webhook).
 * Idempotent: safe to call twice for the same completed intent.
 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import type { PipelineInput } from '@/lib/reports/orchestrator';
import { extendReportToMonthly } from '@/lib/reports/extendMonthly';
import { getPaymentIntent, type ZiinaPaymentIntent } from '@/lib/ziina/server';
import { redeemPromoCode } from '@/lib/promo/server';
import { createJobToken, getPipelineJobTokenTtlSeconds } from '@/lib/api/jobToken';

const YOUNG_GENERATING_MS = 90 * 60 * 1000;

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

type ZiinaPaymentRow = {
  report_id: string | null;
  plan_type: string | null;
  status: string | null;
  user_id: string | null;
};

type ReportRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  native_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  timezone_offset: number | null;
  plan_type: string | null;
  report_start_date: string | null;
  status: string | null;
  generation_started_at: string | null;
  report_data: unknown;
};

function buildAuthHeaders(reportId: string, userId: string, correlationId: string): Record<string, string> {
  const authHeaders: Record<string, string> = {};
  authHeaders['x-job-token'] = createJobToken({
    reportId,
    userId,
    purpose: 'pipeline',
    correlationId,
    ttlSeconds: getPipelineJobTokenTtlSeconds(),
  });
  authHeaders['x-report-id'] = reportId;
  authHeaders['x-correlation-id'] = correlationId;
  // NB: deliberately NOT attaching the global x-bypass-token here. These headers are
  // persisted into the Inngest event store, so a global admin secret would leak into
  // Inngest's dashboard/logs. The scoped 6h-TTL x-job-token above authenticates every
  // internal pipeline callback (all internal routes accept it via requireAuth).
  return authHeaders;
}

/** After a legacy URL-only payment confirmation, start generation if appropriate. */
export async function dispatchReportGenerateForPaidReport(
  db: SupabaseClient,
  reportId: string,
  baseUrl: string,
): Promise<void> {
  await maybeDispatchReportGenerate(db, reportId, baseUrl);
}

async function maybeDispatchReportGenerate(
  db: SupabaseClient,
  reportId: string,
  baseUrl: string,
): Promise<void> {
  const { data: row, error } = await db
    .from('reports')
    .select(
      'id, user_id, user_email, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset, plan_type, report_start_date, status, generation_started_at, report_data',
    )
    .eq('id', reportId)
    .maybeSingle();

  if (error || !row) {
    console.warn('[ziina/finalize] maybeDispatchReportGenerate: no report row', reportId, error?.message);
    return;
  }

  // personal_context lives behind migration 20260617. Read it tolerantly in a separate
  // query so an unapplied migration can NEVER block the post-payment auto-dispatch
  // (a batched SELECT would 400 on the unknown column and silently skip generation for
  // every paying customer). Mirrors reports/start + admin/user-detail. null when absent.
  let personalContext: string | null = null;
  {
    const { data: pcRow, error: pcErr } = await db
      .from('reports')
      .select('personal_context')
      .eq('id', reportId)
      .maybeSingle();
    if (pcErr) {
      const m = pcErr.message ?? '';
      if (!m.includes('personal_context') && !m.includes('schema cache')) {
        console.warn('[ziina/finalize] personal_context read failed:', m);
      }
    } else {
      personalContext = (pcRow as { personal_context?: string | null } | null)?.personal_context ?? null;
    }
  }

  const r = row as ReportRow;
  const rd = r.report_data as { days?: unknown[] } | null | undefined;
  if (r.status === 'complete' && Array.isArray(rd?.days) && rd!.days.length > 0) {
    return;
  }
  if (r.status === 'generating' && isYoungGenerating(r.generation_started_at)) {
    return;
  }

  const planRaw = r.plan_type ?? '7day';
  const planType = planRaw === 'free' ? 'preview' : planRaw;
  const tz = typeof r.timezone_offset === 'number' ? r.timezone_offset : 0;

  const input: PipelineInput = {
    name: r.native_name ?? 'Seeker',
    date: r.birth_date ?? '',
    time: birthTimeToPipelineTime(String(r.birth_time ?? '12:00:00')),
    city: r.birth_city ?? '',
    lat: r.birth_lat ?? 0,
    lng: r.birth_lng ?? 0,
    currentLat: r.current_lat ?? r.birth_lat ?? 0,
    currentLng: r.current_lng ?? r.birth_lng ?? 0,
    currentCity: r.current_city ?? r.birth_city ?? '',
    timezoneOffset: tz,
    type: planType,
    planType,
    // Honor the buyer's chosen forecast start date (persisted at create-intent),
    // instead of silently defaulting to today on the post-payment auto-dispatch.
    forecastStart: r.report_start_date ?? undefined,
    // Personalize commentary from the seeker's own words, persisted at create-intent.
    ...(personalContext?.trim() ? { personalContext: personalContext.trim() } : {}),
    paymentStatus: 'paid',
  };

  if (!process.env.INNGEST_EVENT_KEY?.trim()) {
    console.warn('[ziina/finalize] INNGEST_EVENT_KEY missing — cannot auto-start report/generate in background');
    return;
  }

  try {
    const generationTraceId = randomUUID();
    const nowIso = new Date().toISOString();
    const { error: upErr } = await db
      .from('reports')
      .update({
        status: 'generating',
        generation_trace_id: generationTraceId,
        generation_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', reportId)
      .eq('user_id', r.user_id);
    if (upErr) {
      console.warn(
        `[trace:${generationTraceId}] [ziina/finalize] could not persist generation_trace_id:`,
        upErr.message,
      );
    }
    await inngest.send({
      id: `report-generate:${reportId}`,
      name: 'report/generate',
      data: {
        reportId,
        userId: r.user_id,
        userEmail: r.user_email ?? '',
        input,
        base: baseUrl,
        authHeaders: buildAuthHeaders(reportId, r.user_id, generationTraceId),
        correlationId: generationTraceId,
        generation_trace_id: generationTraceId,
      },
    });
    console.log(
      `[trace:${generationTraceId}] [ziina/finalize] dispatched report/generate for ${reportId}`,
    );
  } catch (e) {
    console.error('[ziina/finalize] inngest report/generate failed:', e);
  }
}

export type FinalizeIntentResult =
  | { ok: true; action: 'already_done' | 'ignored_incomplete' | 'no_binding' | 'processed' }
  | { ok: false; error: string };

type GrantResult = { ok: true } | { ok: false; error: string };

/**
 * Persist report entitlement after Ziina confirms payment. Failures must surface —
 * ziina_payments may already be `completed`, and reconcile only scans `pending`, so
 * a silent grant miss would permanently strand a charged buyer as unpaid.
 */
async function grantReportPaidEntitlement(
  db: SupabaseClient,
  opts: { reportId: string; userId: string; planType: string },
): Promise<GrantResult> {
  const { reportId, userId, planType } = opts;

  if (planType === 'monthly_upgrade') {
    const { data, error } = await db
      .from('reports')
      .update({
        payment_status: 'paid',
        payment_provider: 'ziina',
        plan_type: 'monthly',
        upsell_converted_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[ziina/finalize] monthly_upgrade entitlement grant failed:', error.message);
      return { ok: false, error: error.message };
    }
    if (!data) {
      return { ok: false, error: 'Report entitlement grant matched no row' };
    }
    return { ok: true };
  }

  // Bind the report's plan to what was actually PAID for (the ziina_payments row),
  // not whatever plan the draft row was created with — closes the pay-7day-get-annual
  // escalation on the finalize auto-dispatch path (which reads reports.plan_type).
  const { data, error } = await db
    .from('reports')
    .update({
      payment_status: 'paid',
      payment_provider: 'ziina',
      ...(planType ? { plan_type: planType } : {}),
    })
    .eq('id', reportId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[ziina/finalize] report entitlement grant failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: 'Report entitlement grant matched no row' };
  }
  return { ok: true };
}

async function dispatchMonthlyExtend(baseUrl: string, reportId: string): Promise<void> {
  const hasInngest = !!(process.env.INNGEST_EVENT_KEY ?? '').trim();
  if (hasInngest) {
    try {
      await inngest.send({
        // Idempotency id (matches the report/generate pattern) so a webhook retry /
        // double-finalize doesn't enqueue a second extend within Inngest's dedupe window.
        id: `report-extend:${reportId}`,
        name: 'report/extend',
        data: { reportId, baseUrl },
      });
    } catch (e) {
      console.warn('[ziina/finalize] report/extend Inngest failed, inline fallback:', e);
      void extendReportToMonthly(baseUrl, reportId).catch((err) =>
        console.error('[ziina/finalize] inline extend failed:', err),
      );
    }
  } else {
    void extendReportToMonthly(baseUrl, reportId).catch((err) =>
      console.error('[ziina/finalize] inline extend failed:', err),
    );
  }
}

async function grantStandaloneUnlock(
  db: SupabaseClient,
  planType: string,
  userId: string,
): Promise<GrantResult> {
  const unlockTable = planType === 'kundali' ? 'user_kundali_unlock' : 'user_synastry_unlock';
  const { error: upErr } = await db.from(unlockTable).upsert(
    {
      user_id: userId,
      unlocked_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upErr) {
    console.error(`[ziina/finalize] ${unlockTable} upsert:`, upErr);
    return { ok: false, error: upErr.message };
  }
  return { ok: true };
}

/**
 * Re-apply entitlements for a payment already marked `completed`. Critical when the
 * first finalize claimed the payment row then lost the report/unlock write — verify
 * retries and concurrent losers used to return `already_done` without healing, and
 * reconcile never re-scans completed intents.
 */
async function healCompletedPaymentGrants(
  db: SupabaseClient,
  row: ZiinaPaymentRow & { promo_code_id?: string | null },
  baseUrl: string,
  bookPromoRedemption: () => Promise<void>,
): Promise<FinalizeIntentResult> {
  const planType = row.plan_type ?? '';
  const reportId = row.report_id;

  const standaloneUnlock =
    (planType === 'synastry' || planType === 'kundali') && !reportId && row.user_id;
  if (standaloneUnlock) {
    const grant = await grantStandaloneUnlock(db, planType, row.user_id!);
    if (!grant.ok) return { ok: false, error: grant.error };
    await bookPromoRedemption();
    return { ok: true, action: 'already_done' };
  }

  if (!reportId || !row.user_id) {
    return { ok: true, action: 'already_done' };
  }

  const { data: reportForPayment, error: reportForPaymentErr } = await db
    .from('reports')
    .select('id, user_id, payment_status')
    .eq('id', reportId)
    .maybeSingle();

  if (reportForPaymentErr) {
    console.error('[ziina/finalize] heal report lookup:', reportForPaymentErr.message);
    return { ok: false, error: reportForPaymentErr.message };
  }

  // Draft may land after payment claim (#194 class) — nothing to grant yet; keep
  // already_done so verify can redirect when the row appears on a later attempt.
  if (!reportForPayment) {
    return { ok: true, action: 'already_done' };
  }

  if (reportForPayment.user_id !== row.user_id) {
    console.error('[ziina/finalize] heal owner mismatch', {
      reportId,
      paymentUserId: row.user_id,
      reportUserId: reportForPayment.user_id,
    });
    return { ok: false, error: 'Payment is not bound to the report owner' };
  }

  const needsGrant =
    reportForPayment.payment_status !== 'paid' && reportForPayment.payment_status !== 'promo';
  if (needsGrant) {
    const grant = await grantReportPaidEntitlement(db, {
      reportId,
      userId: row.user_id,
      planType,
    });
    if (!grant.ok) return { ok: false, error: grant.error };
    await bookPromoRedemption();
  }

  if (planType === 'monthly_upgrade') {
    await dispatchMonthlyExtend(baseUrl, reportId);
    return { ok: true, action: 'already_done' };
  }

  const forecastPlans = new Set(['7day', 'monthly', 'annual']);
  if (forecastPlans.has(planType)) {
    await maybeDispatchReportGenerate(db, reportId, baseUrl);
  }

  return { ok: true, action: 'already_done' };
}

/**
 * Confirms intent with Ziina API, marks DB rows, dispatches Inngest for forecast plans
 * or extend for monthly_upgrade.
 */
export async function finalizeCompletedZiinaIntent(
  db: SupabaseClient,
  intentId: string,
  baseUrl: string,
  options?: { intent?: ZiinaPaymentIntent },
): Promise<FinalizeIntentResult> {
  let intent: ZiinaPaymentIntent;
  if (options?.intent) {
    intent = options.intent;
  } else {
    try {
      intent = await getPaymentIntent(intentId);
    } catch (e) {
      return { ok: false, error: `Ziina API: ${String(e)}` };
    }
  }

  if (intent.status !== 'completed') {
    return { ok: true, action: 'ignored_incomplete' };
  }

  const { data: payRow, error: payErr } = await db
    .from('ziina_payments')
    .select('report_id, plan_type, status, user_id, promo_code_id')
    .eq('ziina_intent_id', intentId)
    .maybeSingle();

  if (payErr) {
    console.warn('[ziina/finalize] ziina_payments lookup:', payErr.message);
  }

  const row = payRow as (ZiinaPaymentRow & { promo_code_id?: string | null }) | null;
  if (!row) {
    return { ok: true, action: 'no_binding' };
  }

  // Book the coupon redemption ONLY after this call commits the grant (owner-mismatch
  // guard + atomic claim below). Booking it before those guards burned the coupon —
  // and, for once-per-user codes, blocked the legitimate owner forever — on a payment
  // that ultimately granted nothing. Defined here (row is known); called at each grant.
  const bookPromoRedemption = async () => {
    if (!row.promo_code_id || !row.user_id) return;
    try {
      // Once-per-user codes dedup the redemption on (code, user) via a STABLE order_id,
      // so the same user can't redeem the same code across multiple reports — the
      // existing unique index on order_id makes this race-safe. Unlimited codes
      // (once_per_user = false, e.g. ADMIN100) keep the per-intent id so repeat use is
      // allowed. Default to once-per-user when the flag is missing (matches getPromoDiscount).
      const { data: codeRow } = await db
        .from('promo_codes')
        .select('once_per_user')
        .eq('id', row.promo_code_id)
        .maybeSingle();
      const oncePerUser = (codeRow as { once_per_user?: boolean } | null)?.once_per_user !== false;
      const orderId = oncePerUser ? `promo:${row.promo_code_id}:${row.user_id}` : intentId;
      await redeemPromoCode(row.promo_code_id, row.user_id, orderId);
    } catch (e) {
      console.warn('[ziina/finalize] promo redeem failed (non-fatal):', e);
    }
  };

  if (row.status === 'completed') {
    return healCompletedPaymentGrants(db, row, baseUrl, bookPromoRedemption);
  }

  const planType = row.plan_type ?? '';
  const reportId = row.report_id;

  // Standalone unlock products (no report bound): synastry (matchmaking) + kundali.
  const standaloneUnlock =
    (planType === 'synastry' || planType === 'kundali') && !reportId && row.user_id;

  if (standaloneUnlock) {
    // Grant the unlock FIRST. Only mark the payment 'completed' after it succeeds —
    // so if the unlock table is missing/errors, our payment row stays un-completed and
    // a later re-verify retries (instead of stranding a charged buyer who can't self-heal).
    const grant = await grantStandaloneUnlock(db, planType, row.user_id!);
    if (!grant.ok) return { ok: false, error: grant.error };

    await db
      .from('ziina_payments')
      .update({
        status: 'completed',
        amount: intent.amount,
        currency: intent.currency_code,
      })
      .eq('ziina_intent_id', intentId);

    // Grant committed → book the coupon.
    await bookPromoRedemption();

    return { ok: true, action: 'processed' };
  }

  if (!reportId) {
    return { ok: true, action: 'no_binding' };
  }

  const { data: reportForPayment, error: reportForPaymentErr } = await db
    .from('reports')
    .select('id, user_id')
    .eq('id', reportId)
    .maybeSingle();

  if (reportForPaymentErr) {
    console.error('[ziina/finalize] report ownership lookup:', reportForPaymentErr.message);
    return { ok: false, error: reportForPaymentErr.message };
  }

  const boundUserId = row.user_id;
  if (reportForPayment && (!boundUserId || reportForPayment.user_id !== boundUserId)) {
    console.error('[ziina/finalize] payment/report owner mismatch', {
      intentId,
      reportId,
      paymentUserId: boundUserId,
      reportUserId: reportForPayment.user_id,
    });
    return { ok: false, error: 'Payment is not bound to the report owner' };
  }

  if (planType === 'monthly_upgrade' && (!reportForPayment || !boundUserId)) {
    return { ok: false, error: 'Upgrade payment is missing a report owner binding' };
  }

  // Atomically CLAIM completion: only the caller whose UPDATE flips a still-'pending'
  // row proceeds to the one-time side effects below. The line-233 read guard is racy
  // (concurrent verify GET + webhook both see 'pending'); without this, both would
  // insert a duplicate purchase_completed analytics row (inflating revenue metrics),
  // re-grant, and re-dispatch. The conditional .eq('status','pending') makes exactly
  // one win.
  const { data: claimedRow } = await db
    .from('ziina_payments')
    .update({
      status: 'completed',
      amount: intent.amount,
      currency: intent.currency_code,
    })
    .eq('ziina_intent_id', intentId)
    // Claim any not-yet-completed row (NOT just 'pending'): create-intent supersedes
    // older intents to 'cancelled' when a buyer re-checks out, but Ziina can still
    // confirm payment on that older intent (live redirect tab / browser back). Strict
    // 'pending' would skip the grant and strand a charged buyer. .neq('completed')
    // stays atomic — exactly one caller flips it to 'completed'.
    .neq('status', 'completed')
    .select('ziina_intent_id')
    .maybeSingle();
  if (!claimedRow) {
    // Another concurrent verify/webhook already claimed this payment — still heal
    // entitlements in case the winner lost the report/unlock write after the claim.
    return healCompletedPaymentGrants(
      db,
      { ...row, status: 'completed' },
      baseUrl,
      bookPromoRedemption,
    );
  }

  // This caller won the atomic claim and passed the owner check → book the coupon now.
  await bookPromoRedemption();

  // Behavioral event: reliable revenue signal for the analytics dashboard. Never throw.
  try {
    await db.from('analytics_events').insert({
      user_id: boundUserId ?? null,
      event_name: 'purchase_completed',
      properties: {
        plan_type: planType,
        amount: intent.amount,
        currency: intent.currency_code,
        report_id: reportId ?? null,
        intent_id: intentId,
      },
    });
  } catch {
    /* analytics must never break payment finalization */
  }

  if (planType === 'monthly_upgrade') {
    const grant = await grantReportPaidEntitlement(db, {
      reportId,
      userId: boundUserId!,
      planType,
    });
    if (!grant.ok) return { ok: false, error: grant.error };

    await dispatchMonthlyExtend(baseUrl, reportId);
    return { ok: true, action: 'processed' };
  }

  if (reportForPayment && boundUserId) {
    const grant = await grantReportPaidEntitlement(db, {
      reportId,
      userId: boundUserId,
      planType,
    });
    if (!grant.ok) return { ok: false, error: grant.error };
  }

  const forecastPlans = new Set(['7day', 'monthly', 'annual']);
  if (forecastPlans.has(planType) && reportForPayment) {
    await maybeDispatchReportGenerate(db, reportId, baseUrl);
  }

  return { ok: true, action: 'processed' };
}
