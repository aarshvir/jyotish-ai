/**
 * Validates the untrusted body of POST /api/quiz/session into a bounded quiz_sessions row.
 * Pure, so it is unit-tested: this is an unauthenticated, service-role write.
 */

export const ANSWER_KEYS = [
  'hook', 'focus_area', 'known_before', 'place_home', 'skills_fears', 'picture', 'self_role', 'goal_12m',
  'birth_date', 'birth_time_known', 'birth_time', 'birth_city', 'birth_city_lat', 'birth_city_lng', 'first_name',
] as const;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

export interface SanitizedSession {
  row: Record<string, unknown>;
  consentedEmail: string | null;
  revealViewed: boolean;
}

export function sanitizeSessionPayload(raw: unknown): SanitizedSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const id = str(b.id, 36);
  const slug = str(b.slug, 64);
  if (!id || !UUID.test(id) || !slug || !/^[a-z0-9-]+$/.test(slug)) return null;

  const answers: Record<string, string> = {};
  const a = (b.answers && typeof b.answers === 'object' ? b.answers : {}) as Record<string, unknown>;
  for (const k of ANSWER_KEYS) {
    const v = str(a[k], 160);
    if (v) answers[k] = v;
  }

  const flags: Record<string, string> = {};
  const f = (b.flags && typeof b.flags === 'object' ? b.flags : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(f).slice(0, 8)) {
    const s = str(v, 32);
    if (s && /^[a-z_]{1,32}$/.test(k)) flags[k] = s;
  }

  const row: Record<string, unknown> = {
    id,
    slug,
    answers,
    flags,
    lang: b.lang === 'hi' ? 'hi' : 'en',
    step_reached: str(b.step, 16),
    fbclid: str(b.fbclid, 256),
    gclid: str(b.gclid, 256),
  };
  const utm = (b.utm && typeof b.utm === 'object' ? b.utm : {}) as Record<string, unknown>;
  for (const k of UTM_KEYS) row[k] = str(utm[k], 256);

  let consentedEmail: string | null = null;
  const c = b.contact && typeof b.contact === 'object' ? (b.contact as Record<string, unknown>) : null;
  if (c) {
    const channel = c.channel === 'whatsapp' ? 'whatsapp' : c.channel === 'email' ? 'email' : null;
    const value = str(c.value, 200);
    const valid =
      channel === 'email' ? Boolean(value && EMAIL.test(value)) : channel === 'whatsapp' ? Boolean(value && /^\+\d{8,15}$/.test(value)) : false;
    if (channel && value && valid) {
      const consent = b.consent === true;
      row.contact = { channel, value: channel === 'email' ? value.toLowerCase() : value, name: str(c.name, 60) };
      row.marketing_consent = consent;
      if (channel === 'email' && consent) consentedEmail = value.toLowerCase();
    }
  }

  return { row, consentedEmail, revealViewed: b.reveal_viewed === true };
}
