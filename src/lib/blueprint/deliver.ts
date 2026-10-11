/**
 * Karmic Blueprint delivery: reading the paid report row, running the generator, saving the
 * document back, and asking Inngest to do it.
 *
 * A Blueprint lives in the same `reports` row the checkout created: plan_type "blueprint" or
 * "blueprint_plus30", the finished document in `report_data` ({ kind: 'blueprint', … }).
 * Nothing here is reachable until BLUEPRINT_SALES_ENABLED=1 lets a payment exist.
 *
 * Guards, all fail-closed: no generation for an unpaid row, none for another plan, none for a
 * row that already holds a finished Blueprint (so a retried webhook costs nothing).
 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest/client';
import { isEntitledPaymentStatus } from '@/lib/reports/entitlement';
import { BLUEPRINT_PLANS } from '@/lib/funnel/offer';
import type { GenerateInput } from './generate';
import type { PlanKind } from './personalize';
import type { BlueprintDoc } from './types';

const YOUNG_GENERATING_MS = 30 * 60 * 1000;

export function isBlueprintPlan(planType: string | null | undefined): planType is PlanKind {
  return Boolean(planType && BLUEPRINT_PLANS.has(planType));
}

export function isBlueprintDoc(x: unknown): x is BlueprintDoc {
  return Boolean(x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'blueprint' && Array.isArray((x as { sections?: unknown }).sections));
}

/** YYYY-MM-DD for "now" at a minutes-east-of-UTC offset. */
export function todayAt(offsetMinutes: number | null | undefined, now: number = Date.now()): string {
  return new Date(now + (offsetMinutes ?? 0) * 60_000).toISOString().slice(0, 10);
}

type Row = {
  id: string;
  user_id: string;
  native_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  timezone_offset: number | null;
  plan_type: string | null;
  payment_status: string | null;
  status: string | null;
  generation_started_at: string | null;
  report_data: unknown;
};

export type LoadResult = { ok: true; userId: string; input: GenerateInput } | { ok: false; skip: string };

export async function loadBlueprintJob(db: SupabaseClient, reportId: string, now: number = Date.now()): Promise<LoadResult> {
  const { data, error } = await db
    .from('reports')
    .select('id, user_id, native_name, birth_date, birth_time, birth_city, birth_lat, birth_lng, timezone_offset, plan_type, payment_status, status, generation_started_at, report_data')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw new Error(`blueprint: could not read report ${reportId}: ${error.message}`);
  const row = data as Row | null;
  if (!row) return { ok: false, skip: 'no such report' };
  if (!isBlueprintPlan(row.plan_type)) return { ok: false, skip: 'not a blueprint plan' };
  if (!isEntitledPaymentStatus(row.payment_status)) return { ok: false, skip: 'not paid' };
  if (row.status === 'complete' && isBlueprintDoc(row.report_data)) return { ok: false, skip: 'already complete' };
  if (!row.birth_date || row.birth_lat == null || row.birth_lng == null) throw new Error(`blueprint: report ${reportId} has no birth details`);

  // personal_context sits behind a migration; read it on its own so a missing column never blocks delivery.
  let personalContext = '';
  const pc = await db.from('reports').select('personal_context').eq('id', reportId).maybeSingle();
  if (!pc.error) personalContext = String((pc.data as { personal_context?: string | null } | null)?.personal_context ?? '');

  const hhmm = String(row.birth_time ?? '').slice(0, 5);
  return {
    ok: true,
    userId: row.user_id,
    input: {
      name: row.native_name ?? 'Seeker',
      birthDate: String(row.birth_date).slice(0, 10),
      birthTime: /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : null,
      city: row.birth_city ?? 'Unknown',
      lat: Number(row.birth_lat),
      lng: Number(row.birth_lng),
      personalContext,
      plan: row.plan_type,
      today: todayAt(row.timezone_offset, now),
    },
  };
}

export async function markBlueprintGenerating(db: SupabaseClient, reportId: string, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await db
    .from('reports')
    .update({ status: 'generating', generation_started_at: nowIso, updated_at: nowIso })
    .eq('id', reportId)
    .eq('user_id', userId)
    .neq('status', 'complete');
  if (error) console.warn('[blueprint] could not mark generating:', error.message);
}

export async function saveBlueprint(db: SupabaseClient, reportId: string, userId: string, doc: BlueprintDoc): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await db
    .from('reports')
    .update({
      report_data: doc as unknown as Record<string, unknown>,
      status: 'complete',
      generation_completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', reportId)
    .eq('user_id', userId);
  if (error) throw new Error(`blueprint: could not save report ${reportId}: ${error.message}`);
}

export async function failBlueprint(db: SupabaseClient, reportId: string, userId: string, message: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data } = await db.from('reports').select('status, report_data').eq('id', reportId).eq('user_id', userId).maybeSingle();
  if (!data || (data as { status?: string }).status === 'complete') return;
  const prior = (data as { report_data?: unknown }).report_data;
  const base = prior && typeof prior === 'object' && !Array.isArray(prior) ? (prior as Record<string, unknown>) : {};
  await db
    .from('reports')
    .update({ status: 'error', report_data: { ...base, error: message.slice(0, 1000), error_at: nowIso }, updated_at: nowIso })
    .eq('id', reportId)
    .eq('user_id', userId)
    .neq('status', 'complete');
}

/**
 * Ask Inngest to build the Blueprint for a paid row. Safe to call twice: a finished or
 * recently started row is left alone, and the event id dedupes a double click for 24 hours
 * (a row in "error" gets a fresh id so "try again" works).
 */
export async function dispatchBlueprintGenerate(db: SupabaseClient, reportId: string, now: number = Date.now()): Promise<'sent' | 'skipped' | 'unavailable'> {
  const { data } = await db
    .from('reports')
    .select('user_id, plan_type, payment_status, status, generation_started_at, report_data')
    .eq('id', reportId)
    .maybeSingle();
  const r = data as Pick<Row, 'user_id' | 'plan_type' | 'payment_status' | 'status' | 'generation_started_at' | 'report_data'> | null;
  if (!r || !isBlueprintPlan(r.plan_type) || !isEntitledPaymentStatus(r.payment_status)) return 'skipped';
  if (r.status === 'complete' && isBlueprintDoc(r.report_data)) return 'skipped';
  if (r.status === 'generating' && r.generation_started_at && now - new Date(r.generation_started_at).getTime() < YOUNG_GENERATING_MS) return 'skipped';
  if (!process.env.INNGEST_EVENT_KEY?.trim()) {
    console.warn('[blueprint] INNGEST_EVENT_KEY missing — cannot start Blueprint generation in the background');
    return 'unavailable';
  }
  try {
    await inngest.send({
      id: r.status === 'error' || r.status === 'generating' ? `blueprint-generate:${reportId}:${randomUUID()}` : `blueprint-generate:${reportId}`,
      name: 'blueprint/generate',
      data: { reportId },
    });
    return 'sent';
  } catch (e) {
    console.error('[blueprint] inngest send failed:', e);
    return 'unavailable';
  }
}
