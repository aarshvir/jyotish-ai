import { describe, expect, it } from 'vitest';
import { computeAshtakoot, nakshatraNameToIndex, NAKSHATRA_NAMES } from './ashtakoot';

describe('computeAshtakoot', () => {
  it('matches golden total for identical Moons (Ashwini, Aries / Ashwini, Aries)', () => {
    const r = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 0,
      moonSignIndexA: 0,
      moonSignIndexB: 0,
    });
    expect(r.max).toBe(36);
    expect(r.breakdown).toHaveLength(8);
    expect(r.total).toBe(28);
  });

  it('awards full Nadi when Moons fall in different nadi groups', () => {
    const r = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 2,
      moonSignIndexA: 0,
      moonSignIndexB: 0,
    });
    const nadi = r.breakdown.find((k) => k.name === 'Nadi');
    expect(nadi?.score).toBe(8);
  });

  it('normalizes indices outside 0..26 / 0..11', () => {
    const r = computeAshtakoot({
      moonNakshatraIndexA: -1,
      moonNakshatraIndexB: 28,
      moonSignIndexA: 15,
      moonSignIndexB: -3,
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThanOrEqual(36);
  });
});

describe('nakshatraNameToIndex', () => {
  it('matches ephemeris canonical Dhanishta at index 22', () => {
    expect(NAKSHATRA_NAMES[22]).toBe('Dhanishta');
    expect(nakshatraNameToIndex('Dhanishta')).toBe(22);
  });

  it('accepts Dhanishtha transliteration alias (does not fall through to Ashwini)', () => {
    expect(nakshatraNameToIndex('Dhanishtha')).toBe(22);
    expect(nakshatraNameToIndex('dhanishtha')).toBe(22);
  });

  it('returns -1 for unknown names instead of inventing Ashwini', () => {
    expect(nakshatraNameToIndex('NotAStar')).toBe(-1);
    expect(nakshatraNameToIndex('')).toBe(-1);
    expect(nakshatraNameToIndex(undefined)).toBe(-1);
  });

  it('keeps Ashwini+Dhanishta Nadi at full points (regression for silent Ashwini remap)', () => {
    const correct = computeAshtakoot({
      moonNakshatraIndexA: nakshatraNameToIndex('Ashwini'),
      moonNakshatraIndexB: nakshatraNameToIndex('Dhanishta'),
      moonSignIndexA: 0,
      moonSignIndexB: 9,
    });
    const viaAlias = computeAshtakoot({
      moonNakshatraIndexA: nakshatraNameToIndex('Ashwini'),
      moonNakshatraIndexB: nakshatraNameToIndex('Dhanishtha'),
      moonSignIndexA: 0,
      moonSignIndexB: 9,
    });
    expect(correct.breakdown.find((k) => k.name === 'Nadi')?.score).toBe(8);
    expect(viaAlias.total).toBe(correct.total);
  });
});
