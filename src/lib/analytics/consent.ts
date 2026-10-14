export const ANALYTICS_CONSENT_KEY = 'vh_optional_analytics_v1';
const CHANGE_EVENT = 'vh:analytics-consent';
let revision = 0;
let memoryChoice: boolean | null = null;
const cleanups = new Set<() => void>();

export function browserPrivacySignal(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || nav.msDoNotTrack === '1';
}

/** Only an explicit, versioned browser preference grants optional usage tracking. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined' || browserPrivacySignal()) return false;
  if (memoryChoice !== null) return memoryChoice;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) ?? 'null');
    return !!value && typeof value === 'object' &&
      (value as { version?: unknown }).version === 1 &&
      (value as { analytics?: unknown }).analytics === true;
  } catch { return false; }
}

export function analyticsConsentRevision(): number { return revision; }

export function registerAnalyticsCleanup(cleanup: () => void): () => void {
  cleanups.add(cleanup);
  return () => { cleanups.delete(cleanup); };
}

function stopAnalytics() {
  for (const cleanup of Array.from(cleanups)) {
    try { cleanup(); } catch { /* One failed SDK must not prevent the others stopping. */ }
  }
}

function optionalKey(key: string): boolean {
  return ['vh_sid', 'vh_attr_v1', 'vh_session_started', 'vh_dropoff_shown_v1', 'vh_first_touch', 'vh_ref', '_ga', '_gid', '_gat', '_gcl_au', '_fbp', '_fbc'].includes(key) ||
    /^_ga_|^_gat_|^ph_|^__ph_opt_in_out_/.test(key);
}

/** Do not clear all site data: auth, calculator drafts and account preferences are unrelated. */
export function clearOptionalAnalyticsStorage(): void {
  if (typeof window === 'undefined') return;
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
      for (const key of keys) if (key && optionalKey(key)) storage.removeItem(key);
    } catch { /* Browser storage may be unavailable. */ }
  }
  try {
    const names = document.cookie.split(';').map(part => part.trim().split('=')[0]).filter(optionalKey);
    const hostParts = window.location.hostname.split('.');
    const domains = ['', ...hostParts.slice(0, -1).map((_, index) => hostParts.slice(index).join('.'))];
    const paths = ['/', ...window.location.pathname.split('/').filter(Boolean).map((_, index, parts) => '/' + parts.slice(0, index + 1).join('/'))];
    for (const name of names) for (const domain of domains) for (const cookiePath of paths) {
      document.cookie = `${name}=; Max-Age=0; Path=${cookiePath}; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    }
  } catch { /* Third-party and inaccessible cookies cannot be removed here. */ }
}

export function setAnalyticsConsent(enabled: boolean): { enabled: boolean; persistent: boolean } {
  revision++;
  const allowed = enabled === true && !browserPrivacySignal();
  let persistent = false;
  memoryChoice = allowed;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ version: 1, analytics: allowed }));
    memoryChoice = null;
    persistent = true;
  } catch { /* An explicit choice can apply to this tab without persistent storage. */ }
  if (!allowed) {
    stopAnalytics();
    clearOptionalAnalyticsStorage();
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
  return { enabled: allowed, persistent };
}

export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ANALYTICS_CONSENT_KEY && event.key !== null) return;
    revision++;
    memoryChoice = null;
    if (!hasAnalyticsConsent()) {
      stopAnalytics();
      clearOptionalAnalyticsStorage();
    }
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** A withdrawal, even followed by a new opt-in, invalidates older asynchronous work. */
export function analyticsConsentGuard(): () => boolean {
  const startedAt = revision;
  return () => hasAnalyticsConsent() && revision === startedAt;
}

const publicPaths = new Set(['/', '/pricing', '/privacy', '/terms', '/refund', '/about', '/methodology', '/blog', '/help', '/sample-report', '/nakshatra', '/dasha', '/hora', '/muhurat', '/predictions', '/compare']);
const calculatorPaths = new Set(['/free-kundli', '/manglik-dosha-calculator', '/sade-sati-calculator', '/vimshottari-dasha-calculator', '/nakshatra-finder', '/moon-sign-calculator', '/lagna-calculator', '/kaal-sarp-dosha-calculator']);

/** Never derive external event URLs from a query, fragment or private route identifier. */
export function publicAnalyticsPath(pathname: string): string | null {
  return publicPaths.has(pathname) ? pathname : null;
}

export function analyticsRoute(pathname: string): string {
  const publicPath = publicAnalyticsPath(pathname);
  if (publicPath) return publicPath;
  if (calculatorPaths.has(pathname)) return '/calculator';
  if (/^\/(?:q|start|onboard)(?:\/|$)/.test(pathname)) return '/quiz';
  if (/^\/(?:account|dashboard|report|reports|kundali|synastry)(?:\/|$)/.test(pathname)) return '/account';
  return '/other';
}

const propertyValues: Record<string, readonly string[]> = {
  tool: ['manglik', 'kaalsarp', 'sadesati', 'dasha', 'nakshatra', 'moonsign', 'lagna', 'fullchart'],
  reason: ['rate_limited', 'timeout', 'unavailable'],
  product: ['kundali', 'synastry', 'subscription', 'forecast'],
  plan: ['free', '7day', 'monthly', 'annual', 'sub_monthly', 'sub_annual'],
  method: ['email', 'google'],
  channel: ['copy', 'native', 'whatsapp', 'download'],
  surface: ['calculator', 'kundali', 'synastry'],
};

export function safeAnalyticsProperties(properties: Record<string, unknown>): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, values] of Object.entries(propertyValues)) {
    if (typeof properties[key] === 'string' && values.includes(properties[key] as string)) safe[key] = properties[key] as string;
  }
  if (typeof properties.step === 'number' && Number.isInteger(properties.step) && properties.step >= 0 && properties.step <= 30) safe.step = properties.step;
  if (typeof properties.prefilled === 'boolean') safe.prefilled = properties.prefilled;
  return safe;
}

const requests = new Set<AbortController>();
registerAnalyticsCleanup(() => {
  for (const request of Array.from(requests)) request.abort();
  requests.clear();
});

export function sendOptionalAnalytics(endpoint: '/api/track' | '/api/events', body: Record<string, unknown>): void {
  if (!hasAnalyticsConsent()) return;
  const controller = new AbortController();
  requests.add(controller);
  try {
    void fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal, referrerPolicy: 'no-referrer',
    }).catch(() => {}).finally(() => { requests.delete(controller); });
  } catch { requests.delete(controller); }
}
