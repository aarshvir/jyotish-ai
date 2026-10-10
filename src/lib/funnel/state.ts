/**
 * Browser-side funnel state: survives refresh, the Google sign-in round trip and a
 * cancelled payment. One saved session per slug; stale sessions start fresh.
 */

import type { FunnelAnswers, Lang } from './screens';
import type { RevealData } from './reveal/compute';

export interface Contact {
  channel: 'whatsapp' | 'email';
  value: string;
  name?: string;
  consent: boolean;
}

export interface FunnelState {
  v: 1;
  sessionId: string;
  slug: string;
  lang: Lang;
  screenId: string;
  answers: FunnelAnswers;
  utm: Record<string, string>;
  fbclid: string | null;
  gclid: string | null;
  contact: Contact | null;
  contactSkipped: boolean;
  reveal: RevealData | null;
  savedAt: number;
}

const MAX_AGE_MS = 7 * 24 * 3600_000;
const key = (slug: string) => `vh_q_state_v1:${slug}`;

export function loadState(slug: string, now = Date.now()): FunnelState | null {
  try {
    const raw = window.localStorage.getItem(key(slug));
    if (!raw) return null;
    const s = JSON.parse(raw) as FunnelState;
    if (!s || s.v !== 1 || s.slug !== slug || typeof s.sessionId !== 'string') return null;
    if (now - (s.savedAt ?? 0) > MAX_AGE_MS) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveState(s: FunnelState): void {
  try {
    window.localStorage.setItem(key(s.slug), JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    /* private mode — the funnel still works, it just will not survive a refresh */
  }
}

export function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older browsers: RFC4122-shaped v4 from Math.random (not security-relevant here).
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

export function attributionFrom(search: URLSearchParams): { utm: Record<string, string>; fbclid: string | null; gclid: string | null } {
  const utm: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = search.get(k);
    if (v) utm[k] = v.slice(0, 256);
  }
  return { utm, fbclid: search.get('fbclid')?.slice(0, 256) ?? null, gclid: search.get('gclid')?.slice(0, 256) ?? null };
}
