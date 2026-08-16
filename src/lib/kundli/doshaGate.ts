/**
 * Soft gate for the three dosha verdicts (Manglik / Kaal Sarpa / Sade Sati).
 *
 * These are the highest-intent answers on the site and were being handed out with no
 * contact captured at all. They are still computed for free — the visitor just has to
 * leave an email (or already be signed in) before the verdict is revealed.
 *
 * The purely factual calculators (lagna, moon sign, nakshatra, dasha) stay ungated:
 * they are the SEO entry point for the large majority of sessions.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lower-cased email if it is usable as a lead, else null. */
export function normalizeGateEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length > 254) return null;
  return EMAIL_RE.test(e) ? e : null;
}

/** Which tool views show a dosha verdict as their primary/secondary answer. */
export const DOSHA_GATED_VIEWS = ['manglik', 'kaalsarp', 'sadesati', 'fullchart'] as const;
