import { describe, expect, it } from 'vitest';
import { computeAshtakoot } from './ashtakoot';

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
