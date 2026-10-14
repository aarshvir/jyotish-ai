import { isClientEventName, sanitizeEventProps, type Attribution, type ClientEventName } from './events';
import { analyticsRoute, hasAnalyticsConsent, sendOptionalAnalytics } from './consent';

export function analyticsAllowed(): boolean { return hasAnalyticsConsent(); }

/** Optional visitor identifier: never read or create it before usage consent. */
export function getSessionId(): string {
  if (!hasAnalyticsConsent()) return 'anon';
  try {
    let id = localStorage.getItem('vh_sid');
    if (!id || !/^[a-f0-9-]{16,64}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem('vh_sid', id);
    }
    return id;
  } catch { return 'anon'; }
}

/** Keep a coarse route, not raw campaign values, click IDs, query strings or private route tokens. */
export function captureAttribution(_slug?: string): Attribution {
  void _slug;
  if (!hasAnalyticsConsent()) return {};
  return { landing: analyticsRoute(window.location.pathname) };
}

export interface TrackOptions {
  slug?: string;
  /** Retained for caller compatibility; never overrides optional analytics consent. */
  force?: boolean;
}

export function trackEvent(name: ClientEventName, properties: Record<string, unknown> = {}, _options: TrackOptions = {}): void {
  void _options;
  if (!hasAnalyticsConsent() || !isClientEventName(name)) return;
  const sanitized = sanitizeEventProps(name, properties);
  const safe: Record<string, unknown> = {};
  // Counts and fixed reasons are enough to understand the journey; quiz answers and free text stay out.
  for (const key of ['step_index', 'step_total', 'duration_ms', 'lines', 'words', 'ok']) {
    if (typeof sanitized[key] === 'number' || typeof sanitized[key] === 'boolean') safe[key] = sanitized[key];
  }
  if (['paywall_exit', 'paywall_back', 'handoff_cancel', 'checkout_cancelled'].includes(String(sanitized.context))) safe.context = sanitized.context;
  if (['price', 'trust', 'payment_method', 'card_declined', 'not_now', 'didnt_believe', 'other'].includes(String(sanitized.reason))) safe.reason = sanitized.reason;
  if (['free', 'sub_monthly', 'sub_annual', 'monthly', 'annual', '7day'].includes(String(sanitized.plan))) safe.plan = sanitized.plan;
  if (['USD', 'AED', 'INR'].includes(String(sanitized.currency))) safe.currency = sanitized.currency;
  sendOptionalAnalytics('/api/events', {
    name, session_id: getSessionId(), path: analyticsRoute(window.location.pathname),
    attribution: captureAttribution(), props: safe,
  });
}
