/**
 * Pure maths behind /admin2. No I/O: loaders fetch rows and pass plain objects in,
 * so every number on the dashboard is defined once here and unit-tested.
 *
 * Vocabulary
 *  - visitor: the browser's `vh_sid` id (persists in localStorage), falling back to
 *    `u:<user_id>` for server-side rows. One person on two devices = two visitors.
 *  - Stages are STRICT: a visitor counts at a stage only if they also reached
 *    every earlier stage, so each % of previous is a real hand-off rate.
 */
import { LEGACY_EVENT_MAP, slugFromPath, type DropoffReason } from '@/lib/analytics/events';
import { isInternalHost } from './internal';

// ── row shapes ──────────────────────────────────────────────────────────────

export type RawEvent = {
  event_name: string;
  user_id: string | null;
  created_at: string;
  properties: Record<string, unknown> | null;
};

export type NormEvent = {
  name: string;
  visitor: string | null;
  sid: string | null;
  uid: string | null;
  t: number;
  step: string | null;
  stepIndex: number | null;
  slug: string | null;
  source: string | null;
  host: unknown;
  props: Record<string, unknown>;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** Bucket a visitor's arrival into a readable source. */
export function classifySource(p: Record<string, unknown>): string | null {
  const utm = (p.utm && typeof p.utm === 'object' ? (p.utm as Record<string, unknown>) : {}) as Record<string, unknown>;
  const src = str(p.utm_source) ?? str(utm.utm_source);
  if (src) return src.toLowerCase().slice(0, 40);
  if (str(p.fbclid)) return 'meta (click id)';
  if (str(p.gclid)) return 'google ads (click id)';
  const ref = str(p.referrer);
  if (ref === null) return null;
  let host = '';
  try {
    host = new URL(ref).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (!host || host.includes('vedichour')) return null;
  if (/google\.|bing\.|duckduckgo|yahoo\.|ecosia/.test(host)) return 'organic search';
  if (/instagram|facebook|fb\.|youtube|tiktok|reddit|twitter|x\.com|t\.co|linkedin|pinterest|whatsapp|threads|quora/.test(host)) {
    return `social: ${host.split('.').slice(-2, -1)[0] ?? host}`;
  }
  return `referral: ${host}`;
}

export function normalizeEvent(r: RawEvent): NormEvent {
  const p = (r.properties ?? {}) as Record<string, unknown>;
  let name = LEGACY_EVENT_MAP[r.event_name] ?? r.event_name;
  const step = str(p.step);
  // The legacy /start tracker logged the reveal (recap screen) as a quiz step.
  if (r.event_name === 'quiz_step' && step === 'recap') name = 'reveal_view';
  const sid = str(p.session_id);
  const idx = typeof p.step_index === 'number' ? p.step_index : null;
  return {
    name,
    sid: sid && sid !== 'anon' ? sid : null,
    uid: r.user_id,
    visitor: sid && sid !== 'anon' ? sid : r.user_id ? `u:${r.user_id}` : null,
    t: Date.parse(r.created_at),
    step,
    stepIndex: idx,
    slug: str(p.slug) ?? slugFromPath(str(p.path)),
    source: classifySource(p),
    host: p.host,
    props: p,
  };
}

// ── visitors ────────────────────────────────────────────────────────────────

export type Visitor = {
  key: string;
  firstAt: number;
  users: Set<string>;
  slug: string | null;
  source: string;
  internal: boolean;
  /** first time the visitor reached each event name */
  firstOf: Map<string, number>;
  steps: Map<string, { t: number; index: number | null }>;
};

/**
 * Fold events into visitors. Slug/source = the first one seen (first touch within
 * the window). A visitor is internal if any of their events came from a
 * non-production host or any linked account is internal.
 */
export function buildVisitors(events: NormEvent[], internalUsers: Set<string>): Map<string, Visitor> {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const out = new Map<string, Visitor>();
  for (const e of sorted) {
    if (!e.visitor || Number.isNaN(e.t)) continue;
    let v = out.get(e.visitor);
    if (!v) {
      v = {
        key: e.visitor,
        firstAt: e.t,
        users: new Set(),
        slug: null,
        source: '',
        internal: false,
        firstOf: new Map(),
        steps: new Map(),
      };
      out.set(e.visitor, v);
    }
    if (e.uid) {
      v.users.add(e.uid);
      if (internalUsers.has(e.uid)) v.internal = true;
    }
    if (isInternalHost(e.host)) v.internal = true;
    if (!v.slug && e.slug) v.slug = e.slug;
    if (!v.source && e.source) v.source = e.source;
    if (!v.firstOf.has(e.name)) v.firstOf.set(e.name, e.t);
    if (e.name === 'quiz_view' && e.step && !v.steps.has(e.step)) v.steps.set(e.step, { t: e.t, index: e.stepIndex });
  }
  for (const v of Array.from(out.values())) if (!v.source) v.source = 'direct / unknown';
  return out;
}

export type VisitorFilter = { slug?: string | null; source?: string | null; includeInternal?: boolean };

export function filterVisitors(visitors: Iterable<Visitor>, f: VisitorFilter): Visitor[] {
  const out: Visitor[] = [];
  for (const v of Array.from(visitors)) {
    if (!f.includeInternal && v.internal) continue;
    if (f.slug && v.slug !== f.slug) continue;
    if (f.source && v.source !== f.source) continue;
    out.push(v);
  }
  return out;
}

// ── funnel ──────────────────────────────────────────────────────────────────

export type Stage = {
  key: string;
  label: string;
  count: number;
  pctOfFirst: number | null;
  pctOfPrev: number | null;
  dropped: number;
  /** median ms from the previous stage, among visitors who made it */
  medianMsFromPrev: number | null;
};

export const FUNNEL_STAGES: { key: string; label: string; event: string | null }[] = [
  { key: 'visit', label: 'Visited', event: null },
  { key: 'quiz', label: 'Started the quiz', event: 'quiz_view' },
  { key: 'reveal', label: 'Saw their chart (reveal)', event: 'reveal_view' },
  { key: 'offer', label: 'Saw the offer', event: 'offer_view' },
  { key: 'checkout', label: 'Started checkout', event: 'checkout_start' },
  { key: 'paid', label: 'Paid', event: null },
];

export function pct(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** userId → first completed payment time */
export type PaidMap = Map<string, number>;

function paidAt(v: Visitor, paid: PaidMap): number | null {
  let best: number | null = null;
  for (const u of Array.from(v.users)) {
    const t = paid.get(u);
    if (t !== undefined && t >= v.firstAt - 60_000 && (best === null || t < best)) best = t;
  }
  return best;
}

export function computeFunnel(visitors: Visitor[], paid: PaidMap): Stage[] {
  const stages: Stage[] = [];
  let alive = visitors.map((v) => ({ v, at: v.firstAt }));
  let first = 0;
  let prevCount = 0;
  FUNNEL_STAGES.forEach((s, i) => {
    let next: { v: Visitor; at: number }[];
    if (i === 0) next = alive;
    else {
      next = [];
      for (const a of alive) {
        const t = s.key === 'paid' ? paidAt(a.v, paid) : s.event ? a.v.firstOf.get(s.event) ?? null : null;
        if (t !== null && t !== undefined) next.push({ v: a.v, at: Math.max(t, a.at) });
      }
    }
    const prevAt = new Map(alive.map((a) => [a.v, a.at] as const));
    const deltas = i === 0 ? [] : next.map((n) => n.at - (prevAt.get(n.v) ?? n.at));
    if (i === 0) first = next.length;
    stages.push({
      key: s.key,
      label: s.label,
      count: next.length,
      pctOfFirst: i === 0 ? (first ? 100 : null) : pct(next.length, first),
      pctOfPrev: i === 0 ? null : pct(next.length, prevCount),
      dropped: i === 0 ? 0 : prevCount - next.length,
      medianMsFromPrev: median(deltas),
    });
    prevCount = next.length;
    alive = next;
  });
  return stages;
}

export type StepRow = { step: string; reached: number; pctOfStart: number | null; order: number };

/**
 * Screen-by-screen reach among visitors who started the quiz. Ordered by the
 * funnel's declared order when given, else by the median step index seen, else
 * by reach. Branching screens (only shown to some answers) naturally have lower
 * reach without being a drop-off, so the UI marks them rather than computing a loss.
 */
export function quizSteps(visitors: Visitor[], declaredOrder: string[] = []): StepRow[] {
  const starters = visitors.filter((v) => v.firstOf.has('quiz_view'));
  const reach = new Map<string, number>();
  const idx = new Map<string, number[]>();
  for (const v of starters) {
    for (const [step, info] of Array.from(v.steps.entries())) {
      reach.set(step, (reach.get(step) ?? 0) + 1);
      if (info.index !== null) {
        const arr = idx.get(step) ?? [];
        arr.push(info.index);
        idx.set(step, arr);
      }
    }
  }
  const rows = Array.from(reach.entries()).map(([step, n]) => {
    const declared = declaredOrder.indexOf(step);
    const med = median(idx.get(step) ?? []);
    return {
      step,
      reached: n,
      pctOfStart: pct(n, starters.length),
      order: declared >= 0 ? declared : med !== null ? 1000 + med : 10_000 - n,
    };
  });
  return rows.sort((a, b) => a.order - b.order || b.reached - a.reached);
}

// ── breakdowns (slug / source) ──────────────────────────────────────────────

export type MoneyRow = { user_id: string | null; inr: number; created_at: string };

export type BreakdownRow = {
  key: string;
  visitors: number;
  quizStarts: number;
  offers: number;
  payers: number;
  revenueInr: number;
  /** revenue per visitor (stands in for revenue per click until ad clicks are imported) */
  rpvInr: number | null;
  convPct: number | null;
};

/**
 * Revenue is credited to the visitor (and so the slug/source) that brought the
 * paying account — the earliest visitor linked to that user in the window.
 * Payments from users with no tracked visit go to "(no tracked visit)".
 */
export function breakdown(
  visitors: Visitor[],
  payments: MoneyRow[],
  by: 'slug' | 'source',
): BreakdownRow[] {
  const groupOf = (v: Visitor) => (by === 'slug' ? v.slug ?? '(no funnel)' : v.source);
  const firstVisitorOfUser = new Map<string, Visitor>();
  for (const v of [...visitors].sort((a, b) => a.firstAt - b.firstAt)) {
    for (const u of Array.from(v.users)) if (!firstVisitorOfUser.has(u)) firstVisitorOfUser.set(u, v);
  }
  const rows = new Map<string, BreakdownRow & { payerSet: Set<string> }>();
  const row = (k: string) => {
    let r = rows.get(k);
    if (!r) {
      r = { key: k, visitors: 0, quizStarts: 0, offers: 0, payers: 0, revenueInr: 0, rpvInr: null, convPct: null, payerSet: new Set() };
      rows.set(k, r);
    }
    return r;
  };
  for (const v of visitors) {
    const r = row(groupOf(v));
    r.visitors++;
    if (v.firstOf.has('quiz_view')) r.quizStarts++;
    if (v.firstOf.has('offer_view')) r.offers++;
  }
  for (const p of payments) {
    const v = p.user_id ? firstVisitorOfUser.get(p.user_id) : undefined;
    const r = row(v ? groupOf(v) : '(no tracked visit)');
    r.revenueInr += p.inr;
    if (p.user_id) r.payerSet.add(p.user_id);
  }
  return Array.from(rows.values())
    .map(({ payerSet, ...r }) => ({
      ...r,
      payers: payerSet.size,
      rpvInr: r.visitors ? Math.round((r.revenueInr / r.visitors) * 100) / 100 : null,
      convPct: pct(payerSet.size, r.visitors),
    }))
    .sort((a, b) => b.revenueInr - a.revenueInr || b.visitors - a.visitors);
}

// ── drop-off reasons ────────────────────────────────────────────────────────

export type ReasonSummary = {
  promptViews: number;
  answers: number;
  dismissals: number;
  responsePct: number | null;
  byReason: { reason: string; count: number; pct: number | null }[];
  byContext: { context: string; views: number; answers: number }[];
  notes: { at: number; context: string; reason: string; text: string }[];
};

export function summarizeReasons(events: NormEvent[], keep: (e: NormEvent) => boolean): ReasonSummary {
  const ev = events.filter(keep);
  const views = ev.filter((e) => e.name === 'dropoff_prompt_view');
  const answers = ev.filter((e) => e.name === 'dropoff_reason');
  const dismissals = ev.filter((e) => e.name === 'dropoff_prompt_dismiss');
  const byReason = new Map<string, number>();
  for (const a of answers) {
    const r = (str(a.props.reason) ?? 'other') as DropoffReason;
    byReason.set(r, (byReason.get(r) ?? 0) + 1);
  }
  const ctx = new Map<string, { views: number; answers: number }>();
  const c = (k: string) => {
    let x = ctx.get(k);
    if (!x) ctx.set(k, (x = { views: 0, answers: 0 }));
    return x;
  };
  for (const v of views) c(str(v.props.context) ?? 'unknown').views++;
  for (const a of answers) c(str(a.props.context) ?? 'unknown').answers++;
  return {
    promptViews: views.length,
    answers: answers.length,
    dismissals: dismissals.length,
    responsePct: pct(answers.length, views.length),
    byReason: Array.from(byReason.entries())
      .map(([reason, count]) => ({ reason, count, pct: pct(count, answers.length) }))
      .sort((a, b) => b.count - a.count),
    byContext: Array.from(ctx.entries()).map(([context, x]) => ({ context, ...x })),
    notes: answers
      .filter((a) => str(a.props.text))
      .sort((a, b) => b.t - a.t)
      .slice(0, 30)
      .map((a) => ({ at: a.t, context: str(a.props.context) ?? '', reason: str(a.props.reason) ?? 'other', text: str(a.props.text) ?? '' })),
  };
}

// ── payments state ──────────────────────────────────────────────────────────

export type PaymentIntentRow = {
  id: string;
  user_id: string | null;
  status: string;
  amount: number;
  currency: string;
  plan_type: string | null;
  created_at: string;
};

export type PaymentState = {
  created: number;
  completed: number;
  inFlight: number;
  abandoned: number;
  cancelled: number;
  completionPct: number | null;
  revenueInr: number;
};

const INR_PER: Record<string, number> = { INR: 1, USD: 83, AED: 22.6 };

/** Minor units (paise / cents / fils) → rupees at fixed planning rates. */
export function toInr(amountMinor: number, currency: string | null | undefined): number {
  const rate = INR_PER[(currency ?? 'INR').toUpperCase()] ?? 83;
  return Math.round(((amountMinor || 0) / 100) * rate);
}

export function paymentState(rows: PaymentIntentRow[], now: number): PaymentState {
  let completed = 0;
  let inFlight = 0;
  let abandoned = 0;
  let cancelled = 0;
  let revenueInr = 0;
  for (const r of rows) {
    if (r.status === 'completed') {
      completed++;
      revenueInr += toInr(r.amount, r.currency);
    } else if (r.status === 'cancelled') cancelled++;
    else if (now - Date.parse(r.created_at) < 60 * 60_000) inFlight++;
    else abandoned++;
  }
  return {
    created: rows.length,
    completed,
    inFlight,
    abandoned,
    cancelled,
    completionPct: pct(completed, rows.length - inFlight),
    revenueInr,
  };
}

// ── MRR ─────────────────────────────────────────────────────────────────────

export type SubRow = {
  user_id: string;
  plan: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
};
export type PeriodRow = { user_id: string; plan: string; amount: number; currency: string; period_start: string; created_at: string };

export type MrrSummary = {
  activeSubs: number;
  mrrInr: number;
  newInWindow: number;
  renewalsInWindow: number;
  lapsedInWindow: number;
};

export function mrr(subs: SubRow[], periods: PeriodRow[], now: number, windowStart: number): MrrSummary {
  const latestPeriod = new Map<string, PeriodRow>();
  const periodCount = new Map<string, PeriodRow[]>();
  for (const p of [...periods].sort((a, b) => Date.parse(a.period_start) - Date.parse(b.period_start))) {
    latestPeriod.set(p.user_id, p);
    const arr = periodCount.get(p.user_id) ?? [];
    arr.push(p);
    periodCount.set(p.user_id, arr);
  }
  let active = 0;
  let mrrInr = 0;
  let lapsed = 0;
  for (const s of subs) {
    const end = Date.parse(s.current_period_end);
    if (end > now) {
      active++;
      const p = latestPeriod.get(s.user_id);
      if (p) {
        const inr = toInr(p.amount, p.currency);
        mrrInr += s.plan === 'annual' ? Math.round(inr / 12) : inr;
      }
    } else if (end >= windowStart) lapsed++;
  }
  let fresh = 0;
  let renewals = 0;
  for (const arr of Array.from(periodCount.values())) {
    arr.forEach((p, i) => {
      if (Date.parse(p.created_at) < windowStart) return;
      if (i === 0) fresh++;
      else renewals++;
    });
  }
  return { activeSubs: active, mrrInr, newInWindow: fresh, renewalsInWindow: renewals, lapsedInWindow: lapsed };
}

// ── daily series ────────────────────────────────────────────────────────────

export function dailySeries(times: number[], start: number, days: number): number[] {
  const out = new Array(days).fill(0);
  for (const t of times) {
    const i = Math.floor((t - start) / 86_400_000);
    if (i >= 0 && i < days) out[i]++;
  }
  return out;
}

export function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}
