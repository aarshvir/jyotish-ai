/**
 * Validation for POST /api/lead/capture — an unauthenticated write that stores contact
 * details, so everything is checked and bounded here and unit-tested.
 */

import { sanitizeAnswers } from '@/lib/funnel/sessionPayload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export type LeadSource = 'quiz_s15' | 'reveal_reask';

export interface CaptureInput {
  sessionId: string;
  slug: string;
  lang: 'en' | 'hi';
  email: string;
  firstName: string | null;
  source: LeadSource;
  consent: { service: true; marketing: boolean };
  /** The first (service) tick box was on screen. It decides which words the ledger records. */
  serviceBox: boolean;
  answers: Record<string, string>;
  utm: Record<string, string>;
  country: string | null;
}

export type CaptureParse = { ok: true; input: CaptureInput } | { ok: false; error: 'bad_payload' | 'bad_email' | 'consent_required' };

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f]/g, '').trim();
  return s ? s.slice(0, max) : null;
}

export function parseCapture(raw: unknown, country: string | null): CaptureParse {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'bad_payload' };
  const b = raw as Record<string, unknown>;
  const sessionId = str(b.sessionId, 36);
  const slug = str(b.slug, 64);
  if (!sessionId || !UUID.test(sessionId) || !slug || !/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: 'bad_payload' };
  const source: LeadSource | null = b.source === 'quiz_s15' || b.source === 'reveal_reask' ? b.source : null;
  if (!source) return { ok: false, error: 'bad_payload' };

  const email = str(b.email, 254)?.toLowerCase() ?? '';
  if (!EMAIL.test(email)) return { ok: false, error: 'bad_email' };

  // The address is only stored for the purpose it was given for, and only on an affirmative act.
  const c = (b.consent && typeof b.consent === 'object' ? b.consent : {}) as Record<string, unknown>;
  if (c.service !== true) return { ok: false, error: 'consent_required' };

  const utm: Record<string, string> = {};
  const u = (b.utm && typeof b.utm === 'object' ? b.utm : {}) as Record<string, unknown>;
  for (const k of UTM_KEYS) {
    const v = str(u[k], 256);
    if (v) utm[k] = v;
  }

  return {
    ok: true,
    input: {
      sessionId,
      slug,
      lang: b.lang === 'hi' ? 'hi' : 'en',
      email,
      firstName: str(b.firstName, 60),
      source,
      consent: { service: true, marketing: c.marketing === true },
      serviceBox: b.serviceBox !== false,
      answers: sanitizeAnswers(b.answers),
      utm,
      country: country ? country.slice(0, 2).toUpperCase() : null,
    },
  };
}

/**
 * Whole-year age on `now`, from an ISO birth date. DPDP treats under-18 as a child:
 * verifiable parental consent would be needed and we cannot verify parents, so a chart for
 * a date of birth under 18 never gets a lead record (the visitor can still view it).
 */
export function ageOn(isoBirth: string | undefined, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoBirth ?? '');
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() < d)) age -= 1;
  return age;
}

export function isMinor(isoBirth: string | undefined, now = new Date()): boolean {
  const a = ageOn(isoBirth, now);
  return a !== null && a < 18;
}
