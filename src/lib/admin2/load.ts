import { createServiceClient } from '@/lib/supabase/admin';
import { fetchAllAuthUsers } from '@/lib/admin/analytics';
import { isInternalEmail } from './internal';
import { normalizeEvent, type NormEvent, type PaymentIntentRow, type PeriodRow, type RawEvent, type SubRow } from './metrics';

/**
 * Data loaders for /admin2. Supabase/PostgREST returns at most 1000 rows per
 * request no matter what `.limit()` says, so every list is read page by page with
 * `.range()` (ordered by a stable key) until a short page comes back.
 */

type DB = ReturnType<typeof createServiceClient>;
type PageResult<T> = { data: T[] | null; error: { message: string } | null };

const PAGE = 1000;

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts: { max?: number; parallel?: number } = {},
): Promise<{ rows: T[]; error: string | null; truncated: boolean }> {
  const max = opts.max ?? 200_000;
  const parallel = opts.parallel ?? 4;
  const rows: T[] = [];
  for (let base = 0; base < max; base += PAGE * parallel) {
    const batch = await Promise.all(
      Array.from({ length: parallel }, (_, i) => base + i * PAGE).map((from) => page(from, from + PAGE - 1)),
    );
    for (const res of batch) {
      if (res.error) return { rows, error: res.error.message, truncated: false };
      const data = res.data ?? [];
      rows.push(...data);
      if (data.length < PAGE) return { rows, error: null, truncated: false };
    }
  }
  return { rows, error: null, truncated: true };
}

export type Range = {
  days: number;
  now: number;
  start: number;
  prevStart: number;
  slug: string | null;
  source: string | null;
  includeInternal: boolean;
};

export function parseRange(sp: Record<string, string | string[] | undefined>): Range {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? '';
  const d = parseInt(one('days'), 10);
  const days = [1, 7, 14, 30, 90].includes(d) ? d : 30;
  const now = Date.now();
  const start = now - days * 86_400_000;
  return {
    days,
    now,
    start,
    prevStart: start - days * 86_400_000,
    slug: one('slug').slice(0, 48) || null,
    source: one('source').slice(0, 64) || null,
    includeInternal: one('internal') === '1',
  };
}

export type Ctx = {
  db: DB;
  internalUsers: Set<string>;
  users: { id: string; email?: string; created_at?: string }[];
  adminEmails: Set<string>;
};

export async function loadCtx(): Promise<Ctx> {
  const db = createServiceClient();
  const [users, admins] = await Promise.all([
    fetchAllAuthUsers(db),
    db.from('admin_users').select('email').range(0, 999),
  ]);
  const adminEmails = new Set<string>(
    ((admins.data ?? []) as { email: string | null }[]).map((a) => (a.email ?? '').toLowerCase()).filter(Boolean),
  );
  const internalUsers = new Set<string>();
  for (const u of users) if (isInternalEmail(u.email, adminEmails)) internalUsers.add(u.id);
  return { db, internalUsers, users, adminEmails };
}

/** Funnel-relevant names, canonical + the legacy names they replace. */
export const FUNNEL_EVENT_NAMES = [
  'page_view',
  'quiz_view',
  'quiz_step',
  'quiz_answer',
  'quiz_back',
  'calc_complete',
  'contact_submit',
  'reveal_view',
  'offer_view',
  'paywall_view',
  'checkout_start',
  'checkout_started',
  'purchase',
  'bump_taken',
  'upsell_view',
  'upsell_accept',
  'upsell_decline',
  'downsell_accept',
  'refund',
  'dropoff_prompt_view',
  'dropoff_reason',
  'dropoff_prompt_dismiss',
];

export async function loadEvents(
  ctx: Ctx,
  sinceMs: number,
  names: string[] = FUNNEL_EVENT_NAMES,
): Promise<{ events: NormEvent[]; error: string | null; truncated: boolean }> {
  const since = new Date(sinceMs).toISOString();
  const res = await fetchAll<RawEvent>((from, to) =>
    ctx.db
      .from('analytics_events')
      .select('id, event_name, user_id, created_at, properties')
      .in('event_name', names)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return { events: res.rows.map(normalizeEvent), error: res.error, truncated: res.truncated };
}

export async function loadPayments(ctx: Ctx, sinceMs: number): Promise<{ rows: PaymentIntentRow[]; error: string | null }> {
  const since = new Date(sinceMs).toISOString();
  const res = await fetchAll<PaymentIntentRow>((from, to) =>
    ctx.db
      .from('ziina_payments')
      .select('id, user_id, status, amount, currency, plan_type, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return { rows: res.rows, error: res.error };
}

/** userId → first completed payment time, across all time (for "paid" stage + cohorts). */
export async function loadPaidMap(ctx: Ctx): Promise<Map<string, number>> {
  const res = await fetchAll<{ user_id: string | null; created_at: string }>((from, to) =>
    ctx.db
      .from('ziina_payments')
      .select('user_id, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  const out = new Map<string, number>();
  for (const r of res.rows) {
    if (!r.user_id) continue;
    const t = Date.parse(r.created_at);
    if (!out.has(r.user_id) || t < out.get(r.user_id)!) out.set(r.user_id, t);
  }
  return out;
}

export async function loadSubscriptions(ctx: Ctx): Promise<{ subs: SubRow[]; periods: PeriodRow[]; error: string | null }> {
  const [s, p] = await Promise.all([
    fetchAll<SubRow>((from, to) =>
      ctx.db
        .from('subscriptions')
        .select('user_id, plan, current_period_start, current_period_end, canceled_at, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAll<PeriodRow>((from, to) =>
      ctx.db
        .from('subscription_periods')
        .select('user_id, plan, amount, currency, period_start, created_at')
        .order('created_at', { ascending: true })
        .order('payment_intent_id', { ascending: true })
        .range(from, to),
    ),
  ]);
  return { subs: s.rows, periods: p.rows, error: s.error ?? p.error };
}

/** Exact row count without fetching rows (head request). */
export async function countRows(
  q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  try {
    const { count, error } = await q;
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}
