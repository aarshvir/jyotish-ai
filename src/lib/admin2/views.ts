import { STEPS } from '@/lib/quiz/questions';
import { utcWeekKey, weeklyCohortRetention, type CohortRetentionRow } from '@/lib/analytics/calcs';
import { config } from '@/lib/config';
import { loadCtx, loadEvents, loadPaidMap, loadPayments, loadSubscriptions, fetchAll, type Ctx, type Range } from './load';
import { isInternalEmail } from './internal';
import {
  breakdown,
  buildVisitors,
  computeFunnel,
  dailySeries,
  filterVisitors,
  mrr,
  paymentState,
  quizSteps,
  summarizeReasons,
  toInr,
  type BreakdownRow,
  type MrrSummary,
  type NormEvent,
  type PaymentIntentRow,
  type PaymentState,
  type ReasonSummary,
  type Stage,
  type StepRow,
  type Visitor,
} from './metrics';

/**
 * View-models for each /admin2 page: load → compute → plain serialisable object.
 * Every loader failure is captured as a `warnings` line instead of throwing, so a
 * missing table or migration shows up as a note on the page, not a crash.
 */

export type Funnel = {
  stages: Stage[];
  prevStages: Stage[];
  steps: StepRow[];
  bySlug: BreakdownRow[];
  bySource: BreakdownRow[];
  slugs: string[];
  sources: string[];
  daily: { visitors: number[]; quiz: number[]; paid: number[] };
  excludedVisitors: number;
  /** distinct visitors per offer-ladder event (bump, upsell, down-sell, refund) */
  ladder: Record<string, number>;
  warnings: string[];
};

const LADDER = ['offer_view', 'checkout_start', 'bump_taken', 'upsell_view', 'upsell_accept', 'upsell_decline', 'downsell_accept', 'refund'];

function inWindow(v: Visitor, from: number, to: number) {
  return v.firstAt >= from && v.firstAt < to;
}

export async function funnelView(range: Range, ctxIn?: Ctx): Promise<Funnel & { ctx: Ctx; events: NormEvent[]; payments: PaymentIntentRow[] }> {
  const ctx = ctxIn ?? (await loadCtx());
  const [ev, paid, pay] = await Promise.all([loadEvents(ctx, range.prevStart), loadPaidMap(ctx), loadPayments(ctx, range.prevStart)]);
  const warnings: string[] = [];
  if (ev.error) warnings.push(`Events could not be fully read: ${ev.error}`);
  if (ev.truncated) warnings.push('More than 200,000 events in range — numbers are a lower bound.');
  if (pay.error) warnings.push(`Payments could not be read: ${pay.error}`);

  const all = buildVisitors(ev.events, ctx.internalUsers);
  const everyone = Array.from(all.values());
  const cur = filterVisitors(everyone.filter((v) => inWindow(v, range.start, range.now + 1)), range);
  const prev = filterVisitors(everyone.filter((v) => inWindow(v, range.prevStart, range.start)), range);
  const excludedVisitors = range.includeInternal
    ? 0
    : everyone.filter((v) => inWindow(v, range.start, range.now + 1) && v.internal).length;

  const keepUser = (uid: string | null) => range.includeInternal || !uid || !ctx.internalUsers.has(uid);
  const curPayments = pay.rows
    .filter((p) => p.status === 'completed' && Date.parse(p.created_at) >= range.start && keepUser(p.user_id))
    .map((p) => ({ user_id: p.user_id, inr: toInr(p.amount, p.currency), created_at: p.created_at }));

  // Slug/source pickers list what exists in the window, regardless of the current filter.
  const unfiltered = filterVisitors(everyone.filter((v) => inWindow(v, range.start, range.now + 1)), { includeInternal: range.includeInternal });
  const slugs = Array.from(new Set(unfiltered.map((v) => v.slug).filter((s): s is string => Boolean(s)))).sort();
  const sources = Array.from(new Set(unfiltered.map((v) => v.source))).sort();

  const stages = computeFunnel(cur, paid);
  const paidTimes: number[] = [];
  for (const v of cur) {
    for (const u of Array.from(v.users)) {
      const t = paid.get(u);
      if (t !== undefined && t >= v.firstAt - 60_000) {
        paidTimes.push(t);
        break;
      }
    }
  }

  return {
    stages,
    prevStages: computeFunnel(prev, paid),
    steps: quizSteps(cur, STEPS.map((s) => s.id)),
    bySlug: breakdown(range.source ? cur : unfiltered.filter((v) => !range.slug || v.slug === range.slug), curPayments, 'slug'),
    bySource: breakdown(range.slug ? cur : unfiltered.filter((v) => !range.source || v.source === range.source), curPayments, 'source'),
    slugs,
    sources,
    daily: {
      visitors: dailySeries(cur.map((v) => v.firstAt), range.start, range.days),
      quiz: dailySeries(cur.map((v) => v.firstOf.get('quiz_view')).filter((t): t is number => t !== undefined), range.start, range.days),
      paid: dailySeries(paidTimes, range.start, range.days),
    },
    excludedVisitors,
    ladder: Object.fromEntries(LADDER.map((k) => [k, cur.filter((v) => v.firstOf.has(k)).length])),
    warnings,
    ctx,
    events: ev.events,
    payments: pay.rows,
  };
}

// ── reasons ─────────────────────────────────────────────────────────────────

export function reasonsFrom(events: NormEvent[], ctx: Ctx, range: Range, from: number): ReasonSummary {
  const internalVisitors = new Set(
    Array.from(buildVisitors(events, ctx.internalUsers).values())
      .filter((v) => v.internal)
      .map((v) => v.key),
  );
  return summarizeReasons(events, (e) =>
    e.t >= from &&
    (range.includeInternal || !(e.visitor && internalVisitors.has(e.visitor))) &&
    (!range.slug || e.slug === range.slug),
  );
}

// ── revenue & payments ──────────────────────────────────────────────────────

export type Revenue = {
  state: PaymentState;
  prevState: PaymentState;
  mrr: MrrSummary | null;
  feed: { id: string; at: string; status: string; label: string; amount: string; plan: string | null; internal: boolean }[];
  dailyRevenue: number[];
  warnings: string[];
};

export async function revenueView(range: Range, ctx: Ctx, payments: PaymentIntentRow[]): Promise<Revenue> {
  const warnings: string[] = [];
  const keep = (p: PaymentIntentRow) => range.includeInternal || !p.user_id || !ctx.internalUsers.has(p.user_id);
  const cur = payments.filter((p) => Date.parse(p.created_at) >= range.start && keep(p));
  const prev = payments.filter((p) => Date.parse(p.created_at) < range.start && keep(p));

  let mrrSummary: MrrSummary | null = null;
  const subs = await loadSubscriptions(ctx);
  if (subs.error) warnings.push(`Subscriptions could not be read (${subs.error}). MRR is hidden until the subscription tables exist.`);
  else {
    const internal = (uid: string) => !range.includeInternal && ctx.internalUsers.has(uid);
    mrrSummary = mrr(
      subs.subs.filter((s) => !internal(s.user_id)),
      subs.periods.filter((p) => !internal(p.user_id)),
      range.now,
      range.start,
    );
  }

  const label = (p: PaymentIntentRow) => {
    if (p.status === 'completed') return 'Paid';
    if (p.status === 'cancelled') return 'Cancelled at Ziina';
    return range.now - Date.parse(p.created_at) < 3_600_000 ? 'In progress' : 'Abandoned';
  };
  const money = (p: PaymentIntentRow) => `₹${toInr(p.amount, p.currency).toLocaleString('en-IN')}${p.currency !== 'INR' ? ` (${p.currency})` : ''}`;
  const allInWindow = payments.filter((p) => Date.parse(p.created_at) >= range.start);
  const revenueDaily = new Array(range.days).fill(0);
  for (const p of cur) {
    if (p.status !== 'completed') continue;
    const i = Math.floor((Date.parse(p.created_at) - range.start) / 86_400_000);
    if (i >= 0 && i < range.days) revenueDaily[i] += toInr(p.amount, p.currency);
  }

  return {
    state: paymentState(cur, range.now),
    prevState: paymentState(prev, range.now),
    mrr: mrrSummary,
    feed: allInWindow
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .filter((p) => range.includeInternal || keep(p))
      .slice(0, 40)
      .map((p) => ({
        id: p.id.slice(0, 8),
        at: p.created_at,
        status: p.status,
        label: label(p),
        amount: money(p),
        plan: p.plan_type,
        internal: Boolean(p.user_id && ctx.internalUsers.has(p.user_id)),
      })),
    dailyRevenue: revenueDaily,
    warnings,
  };
}

// ── retention ───────────────────────────────────────────────────────────────

export type Retention = {
  rows: (CohortRetentionRow & { paid: number })[];
  warnings: string[];
};

export async function retentionView(range: Range, ctx: Ctx, weeks = 10): Promise<Retention> {
  const now = range.now;
  const since = now - weeks * 7 * 86_400_000;
  const warnings: string[] = [];
  const users = ctx.users
    .filter((u) => u.created_at && Date.parse(u.created_at) >= since)
    .filter((u) => range.includeInternal || !ctx.internalUsers.has(u.id))
    .map((u) => ({ user_id: u.id, signed_up_at: u.created_at! }));
  const ids = new Set(users.map((u) => u.user_id));
  const activity = await fetchAll<{ user_id: string; created_at: string }>((from, to) =>
    ctx.db
      .from('analytics_events')
      .select('user_id, created_at')
      .not('user_id', 'is', null)
      .gte('created_at', new Date(since).toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  if (activity.error) warnings.push(`Activity could not be read: ${activity.error}`);
  const paid = await loadPaidMap(ctx);
  const rows = weeklyCohortRetention(
    users,
    activity.rows.filter((a) => ids.has(a.user_id)),
    { maxWeeks: weeks, throughWeek: utcWeekKey(now) },
  ).map((r) => ({
    ...r,
    paid: users.filter((u) => utcWeekKey(u.signed_up_at) === r.cohortWeek && paid.has(u.user_id)).length,
  }));
  return { rows: rows.reverse(), warnings };
}

// ── reports, cost, ops ──────────────────────────────────────────────────────

export type Ops = {
  reports: { total: number; complete: number; error: number; generating: number; stuck: number; paidNotDelivered: number };
  failures: { id: string; at: string; plan: string | null; status: string }[];
  runs: { complete: number; error: number; timeout: number; running: number; topErrors: { label: string; count: number }[] } | null;
  cost: { totalUsd: number; perReportUsd: number | null; byModel: { model: string; usd: number; calls: number }[]; calls: number } | null;
  crons: { job: string; schedule: string; lastAt: string | null; ok: boolean | null; detail: string | null; stale: boolean }[];
  ephemeris: { reachable: boolean; ok: boolean | null; ayanamsa_ok: boolean | null; worker_thread_ok: boolean | null; error: string | null; ms: number | null };
  tracking: { lastEventAt: string | null; lastCanonicalAt: string | null };
  integrations: { key: string; configured: boolean }[];
  warnings: string[];
};

const CRONS = [
  { job: 'reconcile-payments', schedule: 'daily 03:00 UTC' },
  { job: 'stale-reports', schedule: 'daily 06:00 UTC' },
];

async function ephemerisHealth(): Promise<Ops['ephemeris']> {
  const base = (config.ephemerisApiUrl || '').replace(/\/+$/, '');
  if (!base || base.includes('localhost')) {
    return { reachable: false, ok: null, ayanamsa_ok: null, worker_thread_ok: null, error: 'EPHEMERIS_SERVICE_URL not set', ms: null };
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/health`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    const b = (k: string) => (typeof j[k] === 'boolean' ? (j[k] as boolean) : null);
    return { reachable: r.ok, ok: b('ok'), ayanamsa_ok: b('ayanamsa_ok'), worker_thread_ok: b('worker_thread_ok'), error: r.ok ? null : `HTTP ${r.status}`, ms: Date.now() - t0 };
  } catch (e) {
    return { reachable: false, ok: null, ayanamsa_ok: null, worker_thread_ok: null, error: e instanceof Error ? e.message : 'unreachable', ms: Date.now() - t0 };
  }
}

type ReportRow = { id: string; status: string | null; plan_type: string | null; payment_status: string | null; created_at: string; updated_at: string | null; user_email: string | null };

export async function opsView(range: Range, ctx: Ctx): Promise<Ops> {
  const warnings: string[] = [];
  const since = new Date(range.start).toISOString();
  const [reportsRes, runsRes, agentsRes, cronRes, eph, lastEv, lastCanon] = await Promise.all([
    fetchAll<ReportRow>((from, to) =>
      ctx.db
        .from('reports')
        .select('id, status, plan_type, payment_status, created_at, updated_at, user_email')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAll<{ status: string; error_class: string | null }>((from, to) =>
      ctx.db
        .from('report_runs')
        .select('status, error_class')
        .gte('started_at', since)
        .order('started_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    fetchAll<{ model: string | null; provider: string | null; cost_usd_micro: number | null; report_id: string | null }>((from, to) =>
      ctx.db
        .from('agent_runs')
        .select('model, provider, cost_usd_micro, report_id')
        .gte('started_at', since)
        .order('started_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    ctx.db
      .from('analytics_events')
      .select('created_at, properties')
      .eq('event_name', 'cron_run')
      .gte('created_at', new Date(range.now - 21 * 86_400_000).toISOString())
      .order('created_at', { ascending: false })
      .range(0, 199),
    ephemerisHealth(),
    ctx.db.from('analytics_events').select('created_at').order('created_at', { ascending: false }).range(0, 0),
    ctx.db.from('analytics_events').select('created_at').eq('properties->>schema', '1').order('created_at', { ascending: false }).range(0, 0),
  ]);

  if (reportsRes.error) warnings.push(`Reports: ${reportsRes.error}`);
  const internalEmail = (e: string | null) => !range.includeInternal && isInternalEmail(e, ctx.adminEmails);
  const reports = reportsRes.rows.filter((r) => !internalEmail(r.user_email));
  const stuck = reports.filter((r) => r.status === 'generating' && range.now - Date.parse(r.updated_at ?? r.created_at) > 15 * 60_000);
  const paidNotDelivered = reports.filter((r) => r.payment_status === 'paid' && r.status !== 'complete' && r.status !== 'generating');

  let runs: Ops['runs'] = null;
  if (runsRes.error) warnings.push(
      /report_runs/.test(runsRes.error)
        ? 'Report runs are not being recorded: the report_runs table does not exist in the database yet (run the admin2 SQL).'
        : `Report runs not available (${runsRes.error}).`,
    );
  else {
    const errs = new Map<string, number>();
    for (const r of runsRes.rows) if (r.status !== 'complete' && r.status !== 'running') errs.set(r.error_class ?? 'unclassified', (errs.get(r.error_class ?? 'unclassified') ?? 0) + 1);
    runs = {
      complete: runsRes.rows.filter((r) => r.status === 'complete').length,
      error: runsRes.rows.filter((r) => r.status === 'error').length,
      timeout: runsRes.rows.filter((r) => r.status === 'timeout').length,
      running: runsRes.rows.filter((r) => r.status === 'running').length,
      topErrors: Array.from(errs.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    };
  }

  let cost: Ops['cost'] = null;
  if (agentsRes.error) warnings.push(
      /agent_runs/.test(agentsRes.error)
        ? 'LLM cost is not being recorded: the agent_runs table does not exist in the database yet (run the admin2 SQL).'
        : `LLM cost not available (${agentsRes.error}).`,
    );
  else {
    const byModel = new Map<string, { usd: number; calls: number }>();
    let micro = 0;
    const reportIds = new Set<string>();
    for (const a of agentsRes.rows) {
      micro += a.cost_usd_micro ?? 0;
      if (a.report_id) reportIds.add(a.report_id);
      const k = a.model ?? a.provider ?? 'unknown';
      const m = byModel.get(k) ?? { usd: 0, calls: 0 };
      m.usd += (a.cost_usd_micro ?? 0) / 1e6;
      m.calls++;
      byModel.set(k, m);
    }
    cost = {
      totalUsd: micro / 1e6,
      calls: agentsRes.rows.length,
      perReportUsd: reportIds.size ? micro / 1e6 / reportIds.size : null,
      byModel: Array.from(byModel.entries()).map(([model, v]) => ({ model, ...v })).sort((a, b) => b.usd - a.usd),
    };
  }

  const cronRows = ((cronRes.data ?? []) as { created_at: string; properties: Record<string, unknown> | null }[]);
  const crons = CRONS.map((c) => {
    const last = cronRows.find((r) => r.properties?.job === c.job);
    const lastAt = last?.created_at ?? null;
    return {
      ...c,
      lastAt,
      ok: last ? last.properties?.ok === true : null,
      detail: typeof last?.properties?.detail === 'string' ? (last.properties.detail as string) : null,
      stale: !lastAt || range.now - Date.parse(lastAt) > 26 * 3_600_000,
    };
  });

  const integrations = ['RESEND_API_KEY', 'ZIINA_API_TOKEN', 'ANTHROPIC_API_KEY', 'CRON_SECRET', 'EPHEMERIS_SERVICE_URL', 'NEXT_PUBLIC_META_PIXEL_ID'].map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));

  return {
    reports: {
      total: reports.length,
      complete: reports.filter((r) => r.status === 'complete').length,
      error: reports.filter((r) => r.status === 'error').length,
      generating: reports.filter((r) => r.status === 'generating').length,
      stuck: stuck.length,
      paidNotDelivered: paidNotDelivered.length,
    },
    failures: reports
      .filter((r) => r.status === 'error' || stuck.includes(r) || paidNotDelivered.includes(r))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 15)
      .map((r) => ({ id: r.id, at: r.created_at, plan: r.plan_type, status: stuck.includes(r) ? 'stuck' : r.payment_status === 'paid' && r.status !== 'complete' ? `paid · ${r.status}` : r.status ?? '' })),
    runs,
    cost,
    crons,
    ephemeris: eph,
    tracking: {
      lastEventAt: ((lastEv.data ?? []) as { created_at: string }[])[0]?.created_at ?? null,
      lastCanonicalAt: ((lastCanon.data ?? []) as { created_at: string }[])[0]?.created_at ?? null,
    },
    integrations,
    warnings,
  };
}

