import { describe, expect, it } from 'vitest';
import {
  type Personalized,
  wantedTier,
  cacheSatisfies,
  projectForTier,
} from '@/lib/reports/personalizedTier';

/**
 * Paywall invariant for /api/reports/[id]/personalized: a preview (non-entitled)
 * client must NEVER receive full_answer / key_windows, even from a cached full
 * object. If this ever regresses, a free user could read the paid answer.
 */
describe('personalized-answer tier gating (paywall)', () => {
  const full: Personalized = {
    tier: 'full',
    question_echo: 'Will my career move work out?',
    teaser: 'A glimpse…',
    unlock_points: ['a', 'b', 'c'],
    full_answer: 'THE PAID ANSWER — must never reach a preview client.',
    key_windows: ['Mid-March', 'Early June'],
  };

  it('entitlement decides the tier, never the model', () => {
    expect(wantedTier(false)).toBe('preview');
    expect(wantedTier(true)).toBe('full');
  });

  it('projecting a full object to preview STRIPS full_answer and key_windows', () => {
    const shown = projectForTier(full, 'preview');
    expect(shown.tier).toBe('preview');
    expect(shown.full_answer).toBeUndefined();
    expect(shown.key_windows).toBeUndefined();
    // The preview still gets its own teaser + unlock bullets.
    expect(shown.teaser).toBe('A glimpse…');
    expect(shown.unlock_points).toEqual(['a', 'b', 'c']);
    // Nothing paid survives serialization.
    expect(JSON.stringify(shown)).not.toContain('PAID ANSWER');
  });

  it('an entitled client receives the full object unchanged', () => {
    expect(projectForTier(full, 'full')).toBe(full);
  });

  it('cache reuse: full satisfies preview (down-projected); preview never satisfies full', () => {
    expect(cacheSatisfies('preview', 'preview')).toBe(true);
    expect(cacheSatisfies('full', 'preview')).toBe(true); // down-projected, safe
    expect(cacheSatisfies('full', 'full')).toBe(true);
    expect(cacheSatisfies('preview', 'full')).toBe(false); // must regenerate the paid answer
  });

  it('a non-entitled request against a cached FULL object still leaks nothing', () => {
    // Defense-in-depth: even if a full object is cached, a preview caller is down-projected.
    const want = wantedTier(false);
    expect(cacheSatisfies('full', want)).toBe(true);
    const shown = projectForTier(full, want);
    expect(shown.full_answer).toBeUndefined();
    expect(JSON.stringify(shown)).not.toContain('PAID ANSWER');
  });
});
