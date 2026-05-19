import type { SupabaseClient } from '@supabase/supabase-js';

export interface PendingReportDraftInput {
  reportId: string;
  userId: string;
  userEmail?: string | null;
  planType: string;
  name?: unknown;
  birth_date?: unknown;
  birth_time?: unknown;
  birth_city?: unknown;
  birth_lat?: unknown;
  birth_lng?: unknown;
  current_city?: unknown;
  current_lat?: unknown;
  current_lng?: unknown;
  timezone_offset?: unknown;
  forecast_start?: unknown;
}

export interface PendingReportDraft {
  id: string;
  user_id: string;
  user_email: string;
  native_name: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
  current_city: string | null;
  current_lat: number | null;
  current_lng: number | null;
  timezone_offset: number;
  plan_type: string;
  report_start_date?: string;
  status: 'pending_payment';
  payment_status: 'unpaid';
  payment_provider: null;
  updated_at: string;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function requiredFiniteNumber(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(`${field} required`);
  }
  return n;
}

function optionalFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeBirthTime(value: unknown): string {
  const raw = requiredString(value, 'birth_time');
  return raw.includes(':') && raw.split(':').length === 2 ? `${raw}:00` : raw;
}

export function buildPendingReportDraft(input: PendingReportDraftInput): PendingReportDraft {
  const forecastStart = optionalString(input.forecast_start);
  return {
    id: input.reportId,
    user_id: input.userId,
    user_email: input.userEmail ?? '',
    native_name: optionalString(input.name) ?? 'Unknown',
    birth_date: requiredString(input.birth_date, 'birth_date'),
    birth_time: normalizeBirthTime(input.birth_time),
    birth_city: requiredString(input.birth_city, 'birth_city'),
    birth_lat: requiredFiniteNumber(input.birth_lat, 'birth_lat'),
    birth_lng: requiredFiniteNumber(input.birth_lng, 'birth_lng'),
    current_city: optionalString(input.current_city),
    current_lat: optionalFiniteNumber(input.current_lat),
    current_lng: optionalFiniteNumber(input.current_lng),
    timezone_offset: optionalFiniteNumber(input.timezone_offset) ?? 0,
    plan_type: input.planType,
    ...(forecastStart ? { report_start_date: forecastStart } : {}),
    status: 'pending_payment',
    payment_status: 'unpaid',
    payment_provider: null,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertPendingReportDraft(
  db: SupabaseClient,
  input: PendingReportDraftInput,
): Promise<{ error: { message: string } | null }> {
  const draft = buildPendingReportDraft(input);
  const { error } = await db.from('reports').upsert(draft, { onConflict: 'id' });
  return { error };
}
