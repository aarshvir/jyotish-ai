import { describe, expect, it } from 'vitest';
import { computeAshtakoot } from './ashtakoot';

function koota(name: string, r: ReturnType<typeof computeAshtakoot>) {
  return r.breakdown.find((k) => k.name === name);
}

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
    const nadi = koota('Nadi', r);
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

  it('flags Bhakoot dosha for 2/12 Moon signs (Aries–Taurus), not for 7th (Aries–Libra)', () => {
    const dosha = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 3,
      moonSignIndexA: 0, // Aries
      moonSignIndexB: 1, // Taurus — 2/12
    });
    expect(koota('Bhakoot', dosha)?.score).toBe(0);

    const opposition = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 14,
      moonSignIndexA: 0, // Aries
      moonSignIndexB: 6, // Libra — 7th, full points
    });
    expect(koota('Bhakoot', opposition)?.score).toBe(7);
  });

  it('flags Bhakoot dosha for 5/9 and 6/8 Moon signs', () => {
    const fiveNine = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 10,
      moonSignIndexA: 0, // Aries
      moonSignIndexB: 4, // Leo — 5/9
    });
    expect(koota('Bhakoot', fiveNine)?.score).toBe(0);

    const sixEight = computeAshtakoot({
      moonNakshatraIndexA: 0,
      moonNakshatraIndexB: 12,
      moonSignIndexA: 0, // Aries
      moonSignIndexB: 5, // Virgo — 6/8
    });
    expect(koota('Bhakoot', sixEight)?.score).toBe(0);
  });

  it('scores Graha Maitri from Moon-sign lords, not gana', () => {
    // Same Mars lord (Aries + Scorpio) → full 5 even when ganas differ
    // Ashwini=Deva, Jyeshtha=Rakshasa
    const sameLord = computeAshtakoot({
      moonNakshatraIndexA: 0, // Ashwini / Aries / Mars
      moonNakshatraIndexB: 17, // Jyeshtha / Scorpio / Mars
      moonSignIndexA: 0,
      moonSignIndexB: 7,
    });
    expect(koota('Graha Maitri', sameLord)?.score).toBe(5);

    // Sun (Leo) vs Venus (Libra) — mutual enemies → 0
    const enemies = computeAshtakoot({
      moonNakshatraIndexA: 10,
      moonNakshatraIndexB: 14,
      moonSignIndexA: 4, // Leo / Sun
      moonSignIndexB: 6, // Libra / Venus
    });
    expect(koota('Graha Maitri', enemies)?.score).toBe(0);
  });

  it('treats Ardra as Manushya gana (not Rakshasa)', () => {
    // Ardra (5) + Bharani (1) — both Manushya → full Gana 6
    const r = computeAshtakoot({
      moonNakshatraIndexA: 5,
      moonNakshatraIndexB: 1,
      moonSignIndexA: 2, // Gemini (Ardra spans Gemini)
      moonSignIndexB: 0, // Aries (Bharani)
    });
    expect(koota('Gana', r)?.score).toBe(6);
  });
});
