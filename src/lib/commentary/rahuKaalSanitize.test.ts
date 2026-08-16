import { describe, it, expect } from 'vitest';
import {
  rahuKaalRecommendsInitiation,
  sanitizeRahuKaalCommentary,
} from './rahuKaalSanitize';

describe('rahuKaalSanitize', () => {
  it('detects unsigned initiation verbs', () => {
    expect(rahuKaalRecommendsInitiation('A good hour to sign the contract.')).toBe(true);
    expect(rahuKaalRecommendsInitiation('Commit to the launch today.')).toBe(true);
  });

  it('allows initiation verbs when negated', () => {
    expect(rahuKaalRecommendsInitiation('Do not sign anything in this window.')).toBe(false);
    expect(rahuKaalRecommendsInitiation('Avoid launching new projects.')).toBe(false);
  });

  it('leaves non-Rahu-Kaal commentary untouched', () => {
    const text = 'A strong hour to sign and commit.';
    expect(sanitizeRahuKaalCommentary(text, false)).toBe(text);
  });

  it('rewrites Rahu Kaal copy that recommends initiation', () => {
    const out = sanitizeRahuKaalCommentary('This hour is charged — sign the deal and commit.', true);
    expect(out.startsWith('RAHU KAAL —')).toBe(true);
    expect(out.toLowerCase()).toContain('avoid starting');
    expect(out.toLowerCase()).toContain('do not sign');
  });

  it('prefixes a caution when Rahu Kaal copy is otherwise clean but unlabeled', () => {
    const out = sanitizeRahuKaalCommentary('Keep to routine and finish existing work.', true);
    expect(out.startsWith('RAHU KAAL —')).toBe(true);
    expect(out).toContain('Keep to routine');
  });
});
