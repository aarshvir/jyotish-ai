/**
 * Browser tracker for canonical funnel events (names: ./events.ts).
 *
 *   import { trackEvent } from '@/lib/analytics/client';
 *   trackEvent('quiz_view', { step: 'concern', step_index: 2, step_total: 18 });
 *
 * Every event is stamped with the attribution envelope: session id (the same
 * `vh_sid` visitor id the page_view tracker uses, so the two join), funnel slug,
 * utm_*, fbclid/gclid and landing path. Attribution is captured from the URL the
 * visitor arrived on and kept for 30 days (last click wins), so later steps on
 * URLs without UTMs still carry the ad that brought them. Geo + host are added
 * server-side by /api/events.
 *
 * Respects opt-outs: Global Privacy Control, Do Not Track, and
 * localStorage `vh_analytics_optout = '1'` stop everything except an answer the
 * visitor deliberately submits in the drop-off prompt (`force: true`).
 * Never throws; analytics must never break a page.
 */
import {
  ATTRIBUTION_KEYS,
  slugFromPath,
  type Attribution,
  type ClientEventName,
} from './events';

const SID_KEY = 'vh_sid';
const ATTR_KEY = 'vh_attr_v1';
const ATTR_MAX_AGE_MS = 30 * 24 * 3600_000;
const CLICK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const;

export function analyticsAllowed(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    if (nav.globalPrivacyControl === true) return false;
    if (nav.doNotTrack === '1' || nav.msDoNotTrack === '1') return false;
    if (localStorage.getItem('vh_analytics_optout') === '1') return false;
  } catch {
    /* storage blocked: still allowed, ids just won't persist */
  }
  return true;
}

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/**
 * Read click attribution from the current URL and remember it. A URL with any
 * utm/fbclid/gclid is a new click and replaces what was stored; otherwise the
 * stored attribution (≤30 days old) is kept. Pass `slug` when the funnel knows it.
 */
export function captureAttribution(slug?: string): Attribution {
  let stored: (Attribution & { at?: number }) | null = null;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Attribution & { at?: number };
      if (parsed && typeof parsed === 'object' && Date.now() - (parsed.at ?? 0) < ATTR_MAX_AGE_MS) stored = parsed;
    }
  } catch {
    /* ignore */
  }

  let next: Attribution & { at?: number } = stored ?? {};
  try {
    const params = new URLSearchParams(window.location.search);
    const fresh: Attribution = {};
    for (const k of CLICK_KEYS) {
      const v = params.get(k);
      if (v) fresh[k] = v.slice(0, 255);
    }
    if (Object.keys(fresh).length > 0 || !stored) {
      next = { ...fresh, landing: window.location.pathname, at: Date.now() };
    }
    const pathSlug = slugFromPath(window.location.pathname);
    const s = slug ?? pathSlug;
    if (s) next.slug = s;
    localStorage.setItem(ATTR_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const out: Attribution = {};
  for (const k of ATTRIBUTION_KEYS) if (next[k]) out[k] = next[k];
  return out;
}

export interface TrackOptions {
  /** Override the funnel slug for this event (otherwise taken from the URL / stored). */
  slug?: string;
  /** Send even when the visitor opted out — only for answers they chose to submit. */
  force?: boolean;
}

export function trackEvent(name: ClientEventName, props: Record<string, unknown> = {}, opts: TrackOptions = {}): void {
  try {
    if (!opts.force && !analyticsAllowed()) return;
    const attribution = captureAttribution(opts.slug);
    if (opts.slug) attribution.slug = opts.slug;
    const body = JSON.stringify({
      name,
      session_id: getSessionId(),
      path: window.location.pathname,
      attribution,
      props,
    });
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}
