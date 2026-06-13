import { describe, expect, it } from 'vitest';
import {
  SIGNS,
  absLongitude,
  navamsaSignIndex,
  saptamsaSignIndex,
  dasamsaSignIndex,
  computeVargas,
} from './varga';
import { detectDoshas } from './doshas';
import { buildDeepKundli } from './deepKundli';
import type { NatalChartData, PlanetData } from '@/lib/agents/types';

// ---------------------------------------------------------------------------
// Test chart builder — pure, no network.
// ---------------------------------------------------------------------------

function planet(sign: string, degree: number, house: number, extra: Partial<PlanetData> = {}): PlanetData {
  return {
    sign,
    degree,
    house,
    nakshatra: 'Ashwini',
    nakshatra_pada: 1,
    is_retrograde: false,
    ...extra,
  };
}

/** A minimal but complete chart; callers override the planets they care about. */
function makeChart(overrides: Partial<Record<string, PlanetData>> = {}, lagna = 'Aries'): NatalChartData {
  const base: Record<string, PlanetData> = {
    Sun: planet('Aries', 10, 1),
    Moon: planet('Taurus', 10, 2),
    Mars: planet('Gemini', 10, 3),
    Mercury: planet('Aries', 12, 1),
    Jupiter: planet('Cancer', 10, 4),
    Venus: planet('Taurus', 12, 2),
    Saturn: planet('Libra', 10, 7),
    Rahu: planet('Leo', 10, 5),
    Ketu: planet('Aquarius', 10, 11),
  };
  return {
    lagna,
    lagna_degree: 5,
    planets: { ...base, ...overrides },
    moon_nakshatra: 'Rohini',
    dasha_sequence: [],
    current_dasha: {
      mahadasha: 'Jupiter',
      antardasha: 'Venus',
      start_date: '2024-01-01',
      end_date: '2030-01-01',
    },
  };
}

// ---------------------------------------------------------------------------
// Divisional math — verified anchor cases from classical Parashari rules.
// ---------------------------------------------------------------------------

describe('navamsaSignIndex (D9)', () => {
  it('maps Aries 0° to Aries (index 0)', () => {
    expect(navamsaSignIndex(absLongitude('Aries', 0))).toBe(0);
    expect(SIGNS[navamsaSignIndex(0)]).toBe('Aries');
  });

  it('maps Taurus 0° (abs 30) to Capricorn (index 9)', () => {
    expect(navamsaSignIndex(absLongitude('Taurus', 0))).toBe(9);
    expect(navamsaSignIndex(30)).toBe(9);
    expect(SIGNS[9]).toBe('Capricorn');
  });

  it('maps Gemini 0° (abs 60) to Libra (index 6)', () => {
    expect(navamsaSignIndex(absLongitude('Gemini', 0))).toBe(6);
    expect(navamsaSignIndex(60)).toBe(6);
    expect(SIGNS[6]).toBe('Libra');
  });

  it('wraps longitudes outside [0,360)', () => {
    expect(navamsaSignIndex(360)).toBe(0);
    expect(navamsaSignIndex(-30 + 360)).toBe(navamsaSignIndex(330));
  });
});

describe('saptamsaSignIndex (D7) and dasamsaSignIndex (D10)', () => {
  it('odd sign (Aries 0°) starts D7 from itself', () => {
    expect(saptamsaSignIndex(absLongitude('Aries', 0))).toBe(0);
  });
  it('even sign (Taurus 0°) starts D7 from the 7th sign (Scorpio, index 7)', () => {
    expect(saptamsaSignIndex(absLongitude('Taurus', 0))).toBe(7);
  });
  it('odd sign (Aries 0°) starts D10 from itself', () => {
    expect(dasamsaSignIndex(absLongitude('Aries', 0))).toBe(0);
  });
  it('even sign (Taurus 0°) starts D10 from the 9th sign (Capricorn, index 9)', () => {
    expect(dasamsaSignIndex(absLongitude('Taurus', 0))).toBe(9);
  });
});

describe('absLongitude', () => {
  it('computes signIndex*30 + degree', () => {
    expect(absLongitude('Aries', 0)).toBe(0);
    expect(absLongitude('Taurus', 0)).toBe(30);
    expect(absLongitude('Pisces', 29)).toBe(359);
  });
  it('is robust to unknown signs and bad degrees', () => {
    expect(absLongitude('NotASign', 10)).toBe(10);
    expect(absLongitude('Aries', Number.NaN)).toBe(0);
  });
});

describe('computeVargas', () => {
  it('returns sign names for all nine planets plus a D9 lagna and a note', () => {
    const chart = makeChart();
    const v = computeVargas(chart);
    expect(Object.keys(v.d9)).toHaveLength(9);
    expect(Object.keys(v.d7)).toHaveLength(9);
    expect(Object.keys(v.d10)).toHaveLength(9);
    expect(SIGNS).toContain(v.d9Lagna);
    expect(v.navamsaNote.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Doshas — Manglik present / Kaal Sarpa absent.
// ---------------------------------------------------------------------------

describe('detectDoshas — Manglik', () => {
  it('flags Mangal Dosha when Mars is in the 7th house', () => {
    const chart = makeChart({ Mars: planet('Libra', 5, 7) });
    const report = detectDoshas(chart);
    expect(report.manglik.present).toBe(true);
    expect(report.manglik.from).toContain('Lagna');
    expect(report.manglik.severity).not.toBe('none');
  });

  it('does not flag Mangal Dosha when Mars is in the 3rd house and clear of Moon/Venus', () => {
    // Mars in Gemini (3rd from Aries). Moon Capricorn, Venus Capricorn so Mars is
    // the 6th from each — none of the sensitive houses.
    const chart = makeChart({
      Mars: planet('Gemini', 10, 3),
      Moon: planet('Capricorn', 10, 10),
      Venus: planet('Capricorn', 12, 10),
    });
    const report = detectDoshas(chart);
    expect(report.manglik.present).toBe(false);
    expect(report.manglik.severity).toBe('none');
  });
});

describe('detectDoshas — Kaal Sarpa', () => {
  it('does NOT flag Kaal Sarpa for a chart with planets on both sides of the axis', () => {
    // Default chart: Rahu in Leo (~130°), several planets (e.g. Sun/Mercury in
    // Aries ~10°) fall well outside the Rahu→Ketu forward hemisphere.
    const report = detectDoshas(makeChart());
    expect(report.kaalSarpa.present).toBe(false);
  });

  it('reports Sade Sati pending when no current Saturn sign is supplied', () => {
    const report = detectDoshas(makeChart());
    expect(report.sadeSati.present).toBe(false);
    expect(report.sadeSati.note).toMatch(/pending live transit/i);
  });
});

// ---------------------------------------------------------------------------
// Deep bundle assembly.
// ---------------------------------------------------------------------------

describe('buildDeepKundli', () => {
  it('derives lagna lord, house highlights, vargas, doshas, and 5 year seeds', () => {
    const chart = makeChart();
    const deep = buildDeepKundli(chart);
    expect(deep.lagna).toBe('Aries');
    expect(deep.lagnaLord).toBe('Mars'); // Aries → Mars
    expect(deep.houseHighlights).toHaveLength(12);
    expect(deep.houseHighlights[0].house).toBe(1);
    expect(deep.houseHighlights[0].sign).toBe('Aries'); // whole-sign from Aries lagna
    expect(deep.fiveYear).toHaveLength(5);
    // House 1 should list the Aries occupants (Sun, Mercury) from the default chart.
    expect(deep.houseHighlights[0].occupants).toEqual(expect.arrayContaining(['Sun', 'Mercury']));
  });

  it('detects Sade Sati phase when the live Saturn sign is supplied on the Moon sign', () => {
    // Default Moon is Taurus; Saturn transiting Taurus => peak (1st from Moon).
    const deep = buildDeepKundli(makeChart(), { currentSaturnSign: 'Taurus' });
    expect(deep.doshas.sadeSati.present).toBe(true);
    expect(deep.doshas.sadeSati.severity).toBe('strong');
  });
});
