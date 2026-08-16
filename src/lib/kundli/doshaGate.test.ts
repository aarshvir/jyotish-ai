import { describe, it, expect } from 'vitest';
import { normalizeGateEmail, DOSHA_GATED_VIEWS } from './doshaGate';

describe('normalizeGateEmail', () => {
  it('accepts and normalises a usable address', () => {
    expect(normalizeGateEmail('  Reader@Example.COM ')).toBe('reader@example.com');
  });

  it('rejects anything that would not be a real lead', () => {
    for (const bad of ['', '   ', 'reader', 'reader@', '@example.com', 'a b@example.com', 'reader@example']) {
      expect(normalizeGateEmail(bad), bad).toBeNull();
    }
    expect(normalizeGateEmail(undefined)).toBeNull();
    expect(normalizeGateEmail(null)).toBeNull();
    expect(normalizeGateEmail(42)).toBeNull();
    expect(normalizeGateEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('dosha gate scope', () => {
  it('gates the three dosha verdicts and the kundli snapshot that repeats them', () => {
    expect([...DOSHA_GATED_VIEWS].sort()).toEqual(['fullchart', 'kaalsarp', 'manglik', 'sadesati']);
  });

  it('leaves the SEO entry-point calculators ungated', () => {
    for (const free of ['lagna', 'moonsign', 'nakshatra', 'dasha']) {
      expect((DOSHA_GATED_VIEWS as readonly string[]).includes(free), free).toBe(false);
    }
  });
});
