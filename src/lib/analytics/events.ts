/**
 * Canonical funnel event schema — the ONE place event names and their allowed
 * properties are defined. Isomorphic (no server or browser imports), so the client
 * tracker, the ingestion route, the server emitter and the /admin2 dashboard all
 * agree on names.
 *
 * Names follow VEDICHOUR_QUIZ_SPEC.md §8. Every event also carries the attribution
 * envelope (session_id, slug, utm_*, fbclid/gclid, geo) — the client tracker adds
 * it and the ingestion route stamps geo + host server-side.
 *
 * Import from the browser:  import { trackEvent } from '@/lib/analytics/client';
 * Import from the server:   import { emitServerEvent } from '@/lib/analytics/server';
 *
 * PRIVACY: properties are allow-listed per event. Anything not listed is dropped at
 * ingestion, so a caller cannot accidentally send a name, birth date, birth place,
 * email or phone number. quiz_answer.value only survives when it looks like an
 * option code (e.g. "career", "yes_often") — free text and dates are discarded.
 */

export const FUNNEL_EVENTS = [
  'quiz_view',
  'quiz_answer',
  'quiz_back',
  'calc_complete',
  'contact_submit',
  'reveal_view',
  'offer_view',
  'checkout_start',
  'purchase',
  'bump_taken',
  'upsell_view',
  'upsell_accept',
  'upsell_decline',
  'downsell_accept',
  'refund',
] as const;

/** Drop-off capture ("what stopped you?") — see components/analytics/DropoffPrompt. */
export const DROPOFF_EVENTS = ['dropoff_prompt_view', 'dropoff_reason', 'dropoff_prompt_dismiss'] as const;

/** Operational heartbeats written by server code only (never accepted from browsers). */
export const SERVER_ONLY_EVENTS = ['cron_run'] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];
export type DropoffEventName = (typeof DROPOFF_EVENTS)[number];
export type ServerOnlyEventName = (typeof SERVER_ONLY_EVENTS)[number];
export type ClientEventName = FunnelEventName | DropoffEventName;
export type CanonicalEventName = ClientEventName | ServerOnlyEventName;

const CLIENT_SET = new Set<string>([...FUNNEL_EVENTS, ...DROPOFF_EVENTS]);
export function isClientEventName(name: unknown): name is ClientEventName {
  return typeof name === 'string' && CLIENT_SET.has(name);
}

// ── drop-off reasons ─────────────────────────────────────────────────────────

/** Where the "what stopped you?" prompt was shown. */
export const DROPOFF_CONTEXTS = [
  'paywall_exit', // desktop exit-intent on the offer/paywall
  'paywall_back', // tapped Back from the paywall
  'handoff_cancel', // backed out of the "you're going to Ziina" sheet
  'checkout_cancelled', // came back from Ziina with payment=cancelled
] as const;
export type DropoffContext = (typeof DROPOFF_CONTEXTS)[number];

export const DROPOFF_REASONS = [
  'price',
  'trust',
  'payment_method',
  'card_declined',
  'not_now',
  'didnt_believe',
  'other',
] as const;
export type DropoffReason = (typeof DROPOFF_REASONS)[number];

/** Owner-facing labels for the dashboard (the prompt has its own friendlier copy). */
export const DROPOFF_REASON_LABELS: Record<DropoffReason, string> = {
  price: 'Price',
  trust: "Didn't trust it yet",
  payment_method: 'Payment method / no UPI',
  card_declined: 'Card declined / payment failed',
  not_now: 'Not now',
  didnt_believe: "Didn't believe the reading",
  other: 'Other',
};

// ── attribution envelope ─────────────────────────────────────────────────────

export const ATTRIBUTION_KEYS = [
  'slug',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'landing',
] as const;
export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

// ── per-event property allow-list ────────────────────────────────────────────

type PropKind = 'code' | 'int' | 'money' | 'bool' | 'text';

/**
 * code  = short machine token ([a-z0-9_-], ≤48 chars, never a long run of digits)
 * int   = finite integer
 * money = finite number ≥ 0 (major units, e.g. 199 for ₹199)
 * text  = voluntary free text (drop-off "other" only), ≤500 chars
 */
const PROPS: Record<CanonicalEventName, Record<string, PropKind>> = {
  quiz_view: { step: 'code', step_index: 'int', step_total: 'int', variant: 'code' },
  quiz_answer: { step: 'code', value: 'code', step_index: 'int' },
  quiz_back: { step: 'code' },
  calc_complete: { ok: 'bool' },
  contact_submit: { channel: 'code' },
  reveal_view: { mode: 'code' },
  offer_view: { plan: 'code', currency: 'code', variant: 'code' },
  checkout_start: { plan: 'code', currency: 'code', value: 'money', items: 'code' },
  purchase: { value: 'money', currency: 'code', items: 'code', plan: 'code' },
  bump_taken: { item: 'code', value: 'money', currency: 'code' },
  upsell_view: { offer: 'code' },
  upsell_accept: { offer: 'code', value: 'money', currency: 'code' },
  upsell_decline: { offer: 'code' },
  downsell_accept: { offer: 'code', value: 'money', currency: 'code' },
  refund: { value: 'money', currency: 'code', items: 'code' },
  dropoff_prompt_view: { context: 'code' },
  dropoff_reason: { context: 'code', reason: 'code', text: 'text' },
  dropoff_prompt_dismiss: { context: 'code' },
  cron_run: { job: 'code', ok: 'bool', duration_ms: 'int', detail: 'code' },
};

const CODE_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/i;

/** True for option codes; false for free text, dates (1990-05-12), phone numbers, emails. */
export function isSafeCode(v: unknown): v is string {
  return typeof v === 'string' && CODE_RE.test(v) && !/\d{4,}/.test(v) && !v.includes('@');
}

/** Strip anything that looks like contact details from voluntary free text. */
export function scrubFreeText(raw: string): string {
  return raw
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function clean(kind: PropKind, v: unknown): unknown {
  switch (kind) {
    case 'code':
      if (Array.isArray(v)) {
        const parts = v.filter(isSafeCode).slice(0, 8);
        return parts.length ? parts.join(',') : undefined;
      }
      return isSafeCode(v) ? v : undefined;
    case 'int': {
      const n = typeof v === 'string' ? Number(v) : v;
      return typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : undefined;
    }
    case 'money': {
      const n = typeof v === 'string' ? Number(v) : v;
      return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
    }
    case 'bool':
      return typeof v === 'boolean' ? v : undefined;
    case 'text':
      return typeof v === 'string' && v.trim() ? scrubFreeText(v) : undefined;
  }
}

/** Keep only allow-listed, well-formed properties for this event. */
export function sanitizeEventProps(name: CanonicalEventName, props: unknown): Record<string, unknown> {
  const spec = PROPS[name];
  const out: Record<string, unknown> = {};
  if (!spec || !props || typeof props !== 'object') return out;
  for (const [k, kind] of Object.entries(spec)) {
    const v = clean(kind, (props as Record<string, unknown>)[k]);
    if (v !== undefined) out[k] = v;
  }
  // Reason codes must be from the fixed list; unknown ones become "other".
  if (name === 'dropoff_reason') {
    if (!DROPOFF_REASONS.includes(out.reason as DropoffReason)) out.reason = 'other';
    if (!DROPOFF_CONTEXTS.includes(out.context as DropoffContext)) delete out.context;
  }
  return out;
}

/** Clean an attribution envelope (UTM values are free-ish text, but short). */
export function sanitizeAttribution(raw: unknown): Attribution {
  const out: Attribution = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of ATTRIBUTION_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v !== 'string' || !v.trim()) continue;
    if (k === 'slug') {
      if (isSafeCode(v)) out.slug = v.toLowerCase();
      continue;
    }
    if (k === 'landing') {
      // Path only — never a query string (which can carry anything).
      out.landing = v.split('?')[0].slice(0, 128);
      continue;
    }
    out[k] = v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, k === 'fbclid' || k === 'gclid' ? 255 : 100);
  }
  return out;
}

/** Funnel slug from a path: /q/<slug> → <slug>, /start → "start". */
export function slugFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const m = /^\/q\/([^/?#]+)/.exec(path);
  if (m && isSafeCode(m[1])) return m[1].toLowerCase();
  if (path === '/start' || path.startsWith('/start?') || path.startsWith('/start/')) return 'start';
  return null;
}

/**
 * Names the /start quiz emitted before this schema existed. The dashboard reads
 * them as their canonical equivalents so history from before this change counts.
 */
export const LEGACY_EVENT_MAP: Record<string, FunnelEventName> = {
  quiz_step: 'quiz_view',
  paywall_view: 'offer_view',
  checkout_started: 'checkout_start',
};
