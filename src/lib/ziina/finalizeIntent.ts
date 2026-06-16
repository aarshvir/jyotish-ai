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

const YOUNG_GENERATING_MS = 10 * 60 * 1000;

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
  personal_context: string | null;
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
      'id, user_id, user_email, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset, plan_type, report_start_date, personal_context, status, generation_started_at, report_data',
    )
    .eq('id', reportId)
    .maybeSingle();

  if (error || !row) {
    console.warn('[ziina/finalize] maybeDispatchReportGenerate: no report row', reportId, error?.message);
    return;
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
    ...(r.personal_context?.trim() ? { personalContext: r.personal_context.trim() } : {}),
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

  if (row.status === 'completed') {
    return { ok: true, action: 'already_done' };
  }

  // Book the coupon redemption on first successful finalize (once-per-user enforcement
  // reads this). Past the already-completed guard, so it records exactly once.
  if (row.promo_code_id && row.user_id) {
    try {
      await redeemPromoCode(row.promo_code_id, row.user_id, intentId);
    } catch (e) {
      console.warn('[ziina/finalize] promo redeem failed (non-fatal):', e);
    }
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
    const unlockTable = planType === 'kundali' ? 'user_kundali_unlock' : 'user_synastry_unlock';
    const { error: upErr } = await db.from(unlockTable).upsert(
      {
        user_id: row.user_id,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (upErr) {
      console.error(`[ziina/finalize] ${unlockTable} upsert:`, upErr);
      return { ok: false, error: upErr.message };
    }

    await db
      .from('ziina_payments')
      .update({
        status: 'completed',
        amount: intent.amount,
        currency: intent.currency_code,
      })
      .eq('ziina_intent_id', intentId);

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
    .eq('status', 'pending')
    .select('ziina_intent_id')
    .maybeSingle();
  if (!claimedRow) {
    // Another concurrent verify/webhook already finalized this payment.
    return { ok: true, action: 'already_done' };
  }

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
    await db
      .from('reports')
      .update({
        payment_status: 'paid',
        payment_provider: 'ziina',
        plan_type: 'monthly',
        upsell_converted_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('user_id', boundUserId);

    const hasInngest = !!(process.env.INNGEST_EVENT_KEY ?? '').trim();
    if (hasInngest) {
      try {
        await inngest.send({
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
    return { ok: true, action: 'processed' };
  }

  if (reportForPayment && boundUserId) {
    // Bind the report's plan to what was actually PAID for (the ziina_payments row),
    // not whatever plan the draft row was created with — closes the pay-7day-get-annual
    // escalation on the finalize auto-dispatch path (which reads reports.plan_type).
    await db
      .from('reports')
      .update({
        payment_status: 'paid',
        payment_provider: 'ziina',
        ...(planType ? { plan_type: planType } : {}),
      })
      .eq('id', reportId)
      .eq('user_id', boundUserId);
  }

  const forecastPlans = new Set(['7day', 'monthly', 'annual']);
  if (forecastPlans.has(planType) && reportForPayment) {
    await maybeDispatchReportGenerate(db, reportId, baseUrl);
  }

  return { ok: true, action: 'processed' };
}
