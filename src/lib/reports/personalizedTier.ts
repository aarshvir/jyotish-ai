/**
 * Paywall-critical tier logic for the personalized-answer feature, extracted so it
 * has ONE source of truth that both the route and a regression test import.
 *
 * The load-bearing invariant: a preview (non-entitled) client must NEVER receive
 * `full_answer` / `key_windows`, even if a fuller object is somehow cached on the
 * report. `projectForTier(p, 'preview')` is the last gate before serialization.
 */

export interface Personalized {
  tier: 'preview' | 'full';
  question_echo: string;
  teaser?: string;
  unlock_points?: string[];
  full_answer?: string;
  key_windows?: string[];
}

/** Which tier a caller may receive, decided server-side from entitlement (never the model). */
export function wantedTier(entitled: boolean): 'preview' | 'full' {
  return entitled ? 'full' : 'preview';
}

/**
 * True when a cached object already satisfies the requested tier (so we can skip a
 * fresh LLM call). A cached FULL object also satisfies a PREVIEW request (we down-
 * project it); a cached PREVIEW object does NOT satisfy a FULL request.
 */
export function cacheSatisfies(cachedTier: 'preview' | 'full', want: 'preview' | 'full'): boolean {
  return cachedTier === want || (cachedTier === 'full' && want === 'preview');
}

/** Never hand a preview client the paid fields, even if a fuller object is cached. */
export function projectForTier(p: Personalized, tier: 'preview' | 'full'): Personalized {
  if (tier === 'full') return p;
  return { tier: 'preview', question_echo: p.question_echo, teaser: p.teaser, unlock_points: p.unlock_points };
}
