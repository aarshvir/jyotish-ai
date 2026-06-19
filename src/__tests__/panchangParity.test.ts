import { describe, it, expect } from 'vitest';
import { getPanchangDayAdj } from '@/lib/agents/RatingAgent';
import type { PanchangData } from '@/lib/agents/types';

/**
 * Cross-engine parity guard. The Python ephemeris emits canonical nakshatra and
 * yoga spellings; the TypeScript scoring tables must recognise every one of them.
 * A spelling drift (e.g. "Mula" vs "Moola", "Shula" vs "Shoola") silently scores
 * 0 instead of the intended modifier — this has regressed twice, so pin it.
 */

// Verbatim from ephemeris-service/main.py NAKSHATRAS (every entry has a non-zero quality).
const PY_NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Verbatim from ephemeris-service/main.py YOGAS (every entry has a non-zero quality).
const PY_YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
  'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
  'Brahma', 'Indra', 'Vaidhriti',
];

const blank: PanchangData = {
  tithi: '', nakshatra: '', yoga: '', karana: '',
  sunrise: '06:00:00', sunset: '18:00:00', moon_sign: '', day_ruler: '',
};

describe('panchang cross-engine spelling parity', () => {
  it('recognises every Python nakshatra spelling (non-zero modifier)', () => {
    for (const n of PY_NAKSHATRAS) {
      const adj = getPanchangDayAdj({ ...blank, nakshatra: n });
      expect(adj, `nakshatra "${n}" did not resolve`).not.toBe(0);
    }
  });

  it('recognises every Python yoga spelling (non-zero modifier)', () => {
    for (const y of PY_YOGAS) {
      const adj = getPanchangDayAdj({ ...blank, yoga: y });
      expect(adj, `yoga "${y}" did not resolve`).not.toBe(0);
    }
  });

  it('scores the previously-broken keys correctly', () => {
    expect(getPanchangDayAdj({ ...blank, nakshatra: 'Mula' })).toBe(-3);
    expect(getPanchangDayAdj({ ...blank, nakshatra: 'Dhanishta' })).toBe(5);
    expect(getPanchangDayAdj({ ...blank, yoga: 'Shula' })).toBe(-6);
  });
});
