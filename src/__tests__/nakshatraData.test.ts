import { describe, it, expect } from 'vitest';
import { NAKSHATRAS } from '../content/nakshatras';

/**
 * The nakshatra pages show Gana and Nadi. These must match the classical Ashtakoot tables the
 * matching engine uses (src/lib/synastry/ashtakoot.ts). Nine pages once showed the wrong Nadi.
 */
const NADI: Record<string, string[]> = {
  Adi: ['Ashwini', 'Ardra', 'Punarvasu', 'Uttara Phalguni', 'Hasta', 'Jyeshtha', 'Mula', 'Shatabhisha', 'Purva Bhadrapada'],
  Madhya: ['Bharani', 'Mrigashira', 'Pushya', 'Purva Phalguni', 'Chitra', 'Anuradha', 'Purva Ashadha', 'Dhanishtha', 'Uttara Bhadrapada'],
  Antya: ['Krittika', 'Rohini', 'Ashlesha', 'Magha', 'Swati', 'Vishakha', 'Uttara Ashadha', 'Shravana', 'Revati'],
};

describe('nakshatra reference data', () => {
  it('has 27 nakshatras in order', () => {
    expect(NAKSHATRAS).toHaveLength(27);
    NAKSHATRAS.forEach((n, i) => expect(n.order).toBe(i + 1));
  });

  it('shows the classical Nadi for every nakshatra', () => {
    for (const [nadi, names] of Object.entries(NADI)) {
      for (const name of names) {
        const n = NAKSHATRAS.find((x) => x.name === name);
        expect(n, name).toBeDefined();
        expect(n?.nadi, `${name} Nadi`).toBe(nadi);
      }
    }
  });

  it('assigns nine nakshatras to each Nadi', () => {
    for (const nadi of Object.keys(NADI)) {
      expect(NAKSHATRAS.filter((n) => n.nadi === nadi)).toHaveLength(9);
    }
  });
});
