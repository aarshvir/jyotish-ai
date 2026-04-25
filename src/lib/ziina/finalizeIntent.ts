/**
 * Shared completion path for Ziina payment intents (GET /api/ziina/verify + optional Business webhook).
 * Idempotent: safe to call twice for the same completed intent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import type { PipelineInput } from '@/lib/reports/orchestrator';
import { extendReportToMonthly } from '@/lib/reports/extendMonthly';
import { getPaymentIntent, type ZiinaPaymentIntent } from '@/lib/ziina/server';
import { BYPASS_SECRET } from '@/lib/api/requireAuth';
import { createJobToken } from '@/lib/api/jobToken';

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
    ttlSeconds: 60 * 60,
  });
  authHeaders['x-report-id'] = reportId;
  authHeaders['x-correlation-id'] = correlationId;
  if (BYPASS_SECRET) authHeaders['x-bypass-token'] = BYPASS_SECRET;
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
      'id, user_id, user_email, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset, plan_type, status, generation_started_at, report_data',
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
    paymentStatus: 'paid',
  };

  if (!process.env.INNGEST_EVENT_KEY?.trim()) {
    console.warn('[ziina/finalize] INNGEST_EVENT_KEY missing — cannot auto-start report/generate in background');
    return;
  }

  try {
    const correlationId = `${reportId}-ziina-${Date.now()}`;
    await inngest.send({
      id: `report-generate:${reportId}`,
      name: 'report/generate',
      data: {
        reportId,
        userId: r.user_id,
        userEmail: r.user_email ?? '',
        input,
        base: baseUrl,
        authHeaders: buildAuthHeaders(reportId, r.user_id, correlationId),
        correlationId,
      },
    });
    console.log(`[ziina/finalize] dispatched report/generate for ${reportId}`);
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
    .select('report_id, plan_type, status, user_id')
    .eq('ziina_intent_id', intentId)
    .maybeSingle();

  if (payErr) {
    console.warn('[ziina/finalize] ziina_payments lookup:', payErr.message);
  }

  const row = payRow as ZiinaPaymentRow | null;
  if (!row) {
    return { ok: true, action: 'no_binding' };
  }

  if (row.status === 'completed') {
    return { ok: true, action: 'already_done' };
  }

  const planType = row.plan_type ?? '';
  const reportId = row.report_id;

  const synStandalone =
    planType === 'synastry' && !reportId && row.user_id;

  if (synStandalone) {
    await db
      .from('ziina_payments')
      .update({
        status: 'completed',
        amount: intent.amount,
        currency: intent.currency_code,
      })
      .eq('ziina_intent_id', intentId);

    const { error: upErr } = await db.from('user_synastry_unlock').upsert(
      {
        user_id: row.user_id,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (upErr) {
      console.error('[ziina/finalize] user_synastry_unlock upsert:', upErr);
      return { ok: false, error: upErr.message };
    }
    return { ok: true, action: 'processed' };
  }

  if (!reportId) {
    return { ok: true, action: 'no_binding' };
  }

  await db
    .from('ziina_payments')
    .update({
      status: 'completed',
      amount: intent.amount,
      currency: intent.currency_code,
    })
    .eq('ziina_intent_id', intentId);

  if (planType === 'monthly_upgrade') {
    await db
      .from('reports')
      .update({
        payment_status: 'paid',
        payment_provider: 'ziina',
        plan_type: 'monthly',
        upsell_converted_at: new Date().toISOString(),
      })
      .eq('id', reportId);

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

  await db
    .from('reports')
    .update({ payment_status: 'paid', payment_provider: 'ziina' })
    .eq('id', reportId);

  const forecastPlans = new Set(['7day', 'monthly', 'annual']);
  if (forecastPlans.has(planType)) {
    await maybeDispatchReportGenerate(db, reportId, baseUrl);
  }

  return { ok: true, action: 'processed' };
}
