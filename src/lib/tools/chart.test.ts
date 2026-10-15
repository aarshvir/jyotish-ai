import { describe, expect, it } from 'vitest';
import { chartResultSchema, doshaLabel, makeChartResult, natalSchema } from './chart';

import { syntheticNatal } from './test-fixtures';

describe('honest free chart results', () => {
  it('preserves known natal positions and always exposes doshas', () => {
    const result = makeChartResult(syntheticNatal, 'Pisces');
    expect(result).toMatchObject({ lagna: 'Gemini', moon_sign: 'Sagittarius', mars_house: 3 });
    expect(result.doshas.manglik.present).not.toBeNull();
    expect(result.doshas.kaalSarpa.present).not.toBeNull();
    expect(result).not.toHaveProperty('doshas_locked');
  });
  it.each([undefined, '', 'Invalid'])('does not turn unavailable Saturn %s into reassuring No', sign => {
    const d = makeChartResult(syntheticNatal, sign).doshas.sadeSati;
    expect(d.present).toBeNull();
    expect(doshaLabel(d)).toBe('Unavailable');
  });
  it('distinguishes assessed absence and presence from unknown', () => {
    expect(makeChartResult(syntheticNatal, 'Pisces').doshas.sadeSati.present).toBe(false);
    expect(makeChartResult(syntheticNatal, 'Sagittarius').doshas.sadeSati.present).toBe(true);
  });
  it('marks incomplete natal patterns unavailable', () => {
    const chart = structuredClone(syntheticNatal);
    delete chart.planets.Mars;
    const result = makeChartResult(chart);
    expect(result.doshas.manglik.present).toBeNull();
    expect(result.doshas.kaalSarpa.present).toBeNull();
  });
  it('records approximate-point calculation and an explicit timestamp', () => {
    expect(makeChartResult(syntheticNatal, 'Pisces', 'approximate', new Date('2026-10-15T12:00:00Z'))).toMatchObject({ birth_time_accuracy: 'approximate', calculated_at: '2026-10-15T12:00:00.000Z' });
  });
  it('rejects malformed service output instead of inventing missing facts', () => {
    expect(() => makeChartResult({})).toThrow();
    expect(() => makeChartResult({ ...syntheticNatal, lagna: 'Invented' })).toThrow();
  });
  it('keeps planets when the Vimshottari window has already ended', () => {
    const ended = {
      ...syntheticNatal,
      current_dasha: {},
      dasha_sequence: [{ planet: 'Venus', start_date: '1880-01-01', end_date: '1900-01-01', antardasha: [{ planet: 'Sun', start_date: '1880-01-01', end_date: '1883-01-01' }] }],
    };
    expect(natalSchema.safeParse(ended).success).toBe(false);
    const result = makeChartResult(ended, 'Pisces');
    expect(result).toMatchObject({ lagna: 'Gemini', moon_sign: 'Sagittarius', current_dasha: null, dasha_sequence: [{ planet: 'Venus', start_date: '1880-01-01', end_date: '1900-01-01' }] });
    expect(chartResultSchema.safeParse(result).success).toBe(true);
  });
});
