/**
 * Shared analytics helpers for the admin dashboard. Everything is computed from
 * existing tables (auth.users, reports, ziina_payments, analytics_events) so the
 * dashboard works today with no migration. Optimize into SQL RPCs later if scale
 * demands it.
 */
import type { createServiceClient } from '@/lib/supabase/admin';

type DB = ReturnType<typeof createServiceClient>;

/** Approx FX to normalize multi-currency revenue to a single USD figure (minor units → USD cents). */
const USD_PER: Record<string, number> = { USD: 1, AED: 1 / 3.6725, INR: 1 / 83 };

export function toUsdCents(amountMinor: number, currency: string): number {
  const rate = USD_PER[currency?.toUpperCase?.() ?? 'USD'] ?? 1;
  return Math.round((amountMinor || 0) * rate);
}

export function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtMoneyMinor(currency: string, minor: number): string {
  const major = minor / 100;
  if (currency === 'INR') return `₹${Math.round(major).toLocaleString('en-IN')}`;
  if (currency === 'AED') return `AED ${major.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${major.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** UTC day key, e.g. 2026-06-15. */
export function dayKey(d: string | number | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD keys for the last `days` ending today (UTC). */
export function lastNDays(days: number, end: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Percentage delta vs a previous value; null when prev is 0 (avoid divide-by-zero / fake ∞). */
export function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? null : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Page through Supabase auth admin listUsers (default cap is 1000/page). */
export async function fetchAllAuthUsers(db: DB): Promise<{ id: string; email?: string; created_at?: string; last_sign_in_at?: string }[]> {
  const all: { id: string; email?: string; created_at?: string; last_sign_in_at?: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) all.push({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at });
    if (users.length < 1000) break;
  }
  return all;
}

export const FREE_PLANS = new Set(['free', 'preview']);
export const isFreePlan = (p?: string | null) => FREE_PLANS.has((p ?? '').trim().toLowerCase());
