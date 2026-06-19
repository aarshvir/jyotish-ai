import { describe, it, expect } from 'vitest';
import { getPanchangDayAdj } from '@/lib/agents/RatingAgent';
import type { PanchangData } from '@/lib/agents/types';

/**
 * Cross-engine parity guard. The TypeScript scoring tables in RatingAgent are a
 * copy of the Python engine's *_MOD tables (ephemeris-service/main.py); when they
 * drift, the same chart on the same day scores differently depending on whether
 * the Python service was reachable. This pins each TS modifier to the EXACT Python
 * value (not merely non-zero) for tithi, yoga and nakshatra — the substring/key
 * matched tables that have repeatedly drifted.
 */

const blank: PanchangData = {
  tithi: '', nakshatra: '', yoga: '', karana: '',
  sunrise: '06:00:00', sunset: '18:00:00', moon_sign: '', day_ruler: '',
};
// Isolate one field: day_ruler '' → weekday mod 0, moon_sign '' → 0, so adj == that field's value.
const tithiAdj = (t: string) => getPanchangDayAdj({ ...blank, tithi: t });
const yogaAdj = (y: string) => getPanchangDayAdj({ ...blank, yoga: y });
const nakAdj = (n: string) => getPanchangDayAdj({ ...blank, nakshatra: n });

// Verbatim from ephemeris-service/main.py TITHI_MOD (the raw daily-grid tithi
// strings include "(Full Moon)"/"(New Moon)" suffixes — assert those normalize too).
const PY_TITHI: Record<string, number> = {
  'Shukla Pratipada': 2, 'Shukla Dwitiya': 3, 'Shukla Tritiya': 5, 'Shukla Chaturthi': 1,
  'Shukla Panchami': 3, 'Shukla Shashthi': 2, 'Shukla Saptami': 3, 'Shukla Ashtami': 0,
  'Shukla Navami': 4, 'Shukla Dashami': 3, 'Shukla Ekadashi': 6, 'Shukla Dwadashi': 3,
  'Shukla Trayodashi': 3, 'Shukla Chaturdashi': 2,
  'Krishna Pratipada': 0, 'Krishna Dwitiya': 0, 'Krishna Tritiya': 0, 'Krishna Chaturthi': -1,
  'Krishna Panchami': -1, 'Krishna Shashthi': 0, 'Krishna Saptami': -1, 'Krishna Ashtami': -3,
  'Krishna Navami': -3, 'Krishna Dashami': -1, 'Krishna Ekadashi': 5, 'Krishna Dwadashi': 1,
  'Krishna Trayodashi': -2, 'Krishna Chaturdashi': -5,
  'Purnima (Full Moon)': 5, 'Amavasya (New Moon)': -25,
};

const PY_YOGA: Record<string, number> = {
  Vishkambha: -4, Priti: 4, Ayushman: 6, Saubhagya: 10, Shobhana: 5, Atiganda: -18,
  Sukarma: 3, Dhriti: 5, Shula: -8, Ganda: -14, Vriddhi: 10, Dhruva: 8, Vyaghata: -16,
  Harshana: 8, Vajra: 2, Siddhi: 10, Vyatipata: -14, Variyan: 2, Parigha: -8, Shiva: 6,
  Siddha: 8, Sadhya: 4, Shubha: 4, Shukla: 4, Brahma: 12, Indra: 12, Vaidhriti: -10,
};

const PY_NAK: Record<string, number> = {
  Ashwini: 4, Bharani: -4, Krittika: 3, Rohini: 8, Mrigashira: 3, Ardra: -8, Punarvasu: 4,
  Pushya: 15, Ashlesha: -6, Magha: 4, 'Purva Phalguni': 4, 'Uttara Phalguni': 3, Hasta: 6,
  Chitra: 3, Swati: 0, Vishakha: 2, Anuradha: 4, Jyeshtha: -2, Mula: -6, 'Purva Ashadha': 2,
  'Uttara Ashadha': 5, Shravana: 5, Dhanishta: 3, Shatabhisha: -2, 'Purva Bhadrapada': -3,
  'Uttara Bhadrapada': 4, Revati: 3,
};

describe('panchang cross-engine value parity (TS == Python)', () => {
  it('tithi modifiers equal Python TITHI_MOD (paksha-aware, incl. suffixed strings)', () => {
    for (const [t, v] of Object.entries(PY_TITHI)) {
      expect(tithiAdj(t), `tithi "${t}"`).toBe(v);
    }
    // The bare-name substring bug would have scored Krishna days as Shukla — guard it.
    expect(tithiAdj('Krishna Panchami')).not.toBe(tithiAdj('Shukla Panchami'));
  });

  it('yoga modifiers equal Python YOGA_MOD', () => {
    for (const [y, v] of Object.entries(PY_YOGA)) {
      expect(yogaAdj(y), `yoga "${y}"`).toBe(v);
    }
  });

  it('nakshatra modifiers equal Python NAKSHATRA_MOD (incl. Swati=0)', () => {
    for (const [n, v] of Object.entries(PY_NAK)) {
      expect(nakAdj(n), `nakshatra "${n}"`).toBe(v);
    }
  });
});
