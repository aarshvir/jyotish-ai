export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { fetchAllAuthUsers } from '@/lib/admin/analytics';

const DAY = 86_400_000;

/** UTC Monday 00:00 of the week containing `d`. */
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Mon=0
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}
const wkLabel = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const db = createServiceClient();
  // Window analytics to the cohort span (~8 weeks + buffer) so it scales past 50k
  // events and stays newest-first (same fix as acquisition/funnel/journeys).
  const nowMs = Date.now();
  const analyticsSince = new Date(nowMs - 64 * DAY).toISOString();
  const [users, reportsRes, paymentsRes, analyticsRes] = await Promise.all([
    fetchAllAuthUsers(db),
    db.from('reports').select('user_id, created_at, status').limit(50000),
    db.from('ziina_payments').select('user_id, created_at, status').eq('status', 'completed').limit(50000),
    db
      .from('analytics_events')
      .select('user_id, created_at')
      .not('user_id', 'is', null)
      .in('event_name', ['page_view', 'session_start'])
      .gte('created_at', analyticsSince)
      .order('created_at', { ascending: false })
      .limit(50000),
  ]);

  // Activity timestamps per user — the "return" signal. Counts genuine engagement
  // (a returning page_view / session_start), not only transactions: users rarely
  // buy twice, so a transactions-only signal made every cohort read ~0% past week 0.
  const activity: Record<string, number[]> = {};
  for (const r of reportsRes.data ?? []) {
    const row = r as { user_id?: string; created_at?: string; status?: string };
    if (row.user_id && row.created_at && row.status === 'complete') (activity[row.user_id] ??= []).push(new Date(row.created_at).getTime());
  }
  for (const p of paymentsRes.data ?? []) {
    const row = p as { user_id?: string; created_at?: string };
    if (row.user_id && row.created_at) (activity[row.user_id] ??= []).push(new Date(row.created_at).getTime());
  }
  for (const e of analyticsRes.data ?? []) {
    const row = e as { user_id?: string; created_at?: string };
    if (row.user_id && row.created_at) (activity[row.user_id] ??= []).push(new Date(row.created_at).getTime());
  }

  // Headline rates.
  const totalUsers = users.length;
  const activatedUsers = users.filter((u) => (activity[u.id]?.length ?? 0) > 0).length;
  const paymentsByUser: Record<string, number> = {};
  for (const p of paymentsRes.data ?? []) { const u = (p as { user_id?: string }).user_id; if (u) paymentsByUser[u] = (paymentsByUser[u] ?? 0) + 1; }
  const payingUsers = Object.keys(paymentsByUser).length;
  const repeatBuyers = Object.values(paymentsByUser).filter((n) => n >= 2).length;

  // Weekly signup cohorts (last 8 weeks).
  const now = nowMs;
  const thisWeek = weekStart(new Date(now));
  const WEEKS = 8;
  const cohortStarts: number[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) { const d = new Date(thisWeek); d.setUTCDate(d.getUTCDate() - i * 7); cohortStarts.push(d.getTime()); }

  const cohorts = cohortStarts.map((start) => {
    const end = start + 7 * DAY;
    const members = users.filter((u) => u.created_at && new Date(u.created_at).getTime() >= start && new Date(u.created_at).getTime() < end);
    const maxOffset = Math.max(0, Math.floor((now - start) / (7 * DAY)));
    const retention: (number | null)[] = [];
    for (let k = 0; k <= Math.min(maxOffset, WEEKS - 1); k++) {
      const wStart = start + k * 7 * DAY, wEnd = wStart + 7 * DAY;
      const active = members.filter((m) => (activity[m.id] ?? []).some((t) => t >= wStart && t < wEnd)).length;
      retention.push(members.length ? Math.round((active / members.length) * 100) : null);
    }
    return { week: wkLabel(new Date(start)), size: members.length, retention };
  });

  return NextResponse.json({
    headline: {
      totalUsers,
      activationRate: totalUsers ? Math.round((activatedUsers / totalUsers) * 100) : 0,
      payingUsers,
      repeatPurchaseRate: payingUsers ? Math.round((repeatBuyers / payingUsers) * 100) : 0,
    },
    cohorts,
    weeks: WEEKS,
  });
}
