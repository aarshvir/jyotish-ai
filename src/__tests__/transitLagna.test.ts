import { describe, expect, it } from 'vitest';
import { RatingAgent } from '@/lib/agents/RatingAgent';
import { computeFallbackDayData } from '@/lib/ephemeris/fallback';
import type { FullDayData, HoraEntry } from '@/lib/agents/types';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

/**
 * Sign the sidereal (Lahiri) Sun occupies on a given date, from the sankranti
 * ingress dates. Independent of the implementation under test.
 */
function siderealSunSign(dateStr: string): string {
  const [, mm, dd] = dateStr.split('-').map(Number);
  const ingress: Array<[number, number, number]> = [
    [1, 14, 9], [2, 13, 10], [3, 15, 11], [4, 14, 0], [5, 15, 1], [6, 15, 2],
    [7, 16, 3], [8, 17, 4], [9, 17, 5], [10, 17, 6], [11, 16, 7], [12, 16, 8],
  ];
  let sign = 8;
  for (const [m, d, s] of ingress) if (mm > m || (mm === m && dd >= d)) sign = s;
  return SIGNS[sign];
}

/** 18 hourly hora slots 06:00–24:00 plus the panchang/choghadiya/Rahu Kaal shell. */
function fullDayFixture(): FullDayData {
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00:00`;
  const hora_schedule: HoraEntry[] = Array.from({ length: 18 }, (_, i) => ({
    start_time: hh(6 + i),
    end_time: hh(7 + i),
    hora_ruler: 'Jupiter',
    hora_number: i + 1,
  }));
  return {
    panchang: {
      tithi: '', nakshatra: '', yoga: '', karana: '',
      sunrise: '06:00:00', sunset: '18:00:00', moon_sign: '', day_ruler: '',
    },
    hora_schedule,
    choghadiya: [
      { start_time: '00:00:00', end_time: '23:59:59', choghadiya: 'Chal', quality: 'neutral' },
    ],
    rahu_kaal: { start_time: '00:00:00', end_time: '00:00:00' },
  } as FullDayData;
}

describe('RatingAgent transit lagna anchor', () => {
  const agent = new RatingAgent();

  // The 06:00 slot starts at sunrise in the fixture, so its transit lagna is
  // the model's sunrise ascendant — the Sun's own sidereal sign.
  const dates = [
    '2026-01-05', '2026-02-20', '2026-03-20',
    '2026-04-05', '2026-04-20', '2026-05-01', '2026-06-30',
    '2026-07-01', '2026-08-10', '2026-09-10', '2026-10-05',
    '2026-11-01', '2026-12-20', '2026-12-31',
  ];

  it.each(dates)('anchors the sunrise slot on the sidereal Sun sign (%s)', (date) => {
    const rating = agent.rateDay(date, fullDayFixture(), 'Aries');
    expect(rating.all_slots[0].transit_lagna).toBe(siderealSunSign(date));
  });

  it('never walks the Sun backwards across the year boundary', () => {
    // The old ladder reported Capricorn on 20 December and Sagittarius on
    // 5 January, one sign behind, because April onwards was shifted forward.
    const dec = agent.rateDay('2026-12-20', fullDayFixture(), 'Aries');
    const jan = agent.rateDay('2027-01-05', fullDayFixture(), 'Aries');
    expect(dec.all_slots[0].transit_lagna).toBe('Sagittarius');
    expect(jan.all_slots[0].transit_lagna).toBe('Sagittarius');
  });

  it('derives the transit house from the native lagna', () => {
    // 2026-07-01: Sun in Gemini. From an Aries lagna that is the 3rd house.
    const aries = agent.rateDay('2026-07-01', fullDayFixture(), 'Aries');
    expect(aries.all_slots[0].transit_lagna).toBe('Gemini');
    expect(aries.all_slots[0].transit_lagna_house).toBe(3);

    // From a Capricorn lagna the same Gemini is the 6th house.
    const capricorn = agent.rateDay('2026-07-01', fullDayFixture(), 'Capricorn');
    expect(capricorn.all_slots[0].transit_lagna_house).toBe(6);
  });
});

describe('TypeScript ephemeris fallback transit lagna', () => {
  // Equator / Greenwich / UTC keeps sunrise within a few minutes of 06:00 all
  // year, so the 06:00–07:00 slot midpoint always lands in the first rising
  // sign after sunrise and its transit lagna is the Sun's own sign.
  const dates = [
    '2026-01-20', '2026-02-20', '2026-03-20', '2026-04-20', '2026-05-20',
    '2026-06-20', '2026-07-20', '2026-08-20', '2026-09-20', '2026-10-20',
    '2026-11-20', '2026-12-25',
  ];

  it.each(dates)('anchors the sunrise slot on the sidereal Sun sign (%s)', (date) => {
    const day = computeFallbackDayData(date, 0, 0, 0, 0);
    expect(day.slots[0].transit_lagna).toBe(siderealSunSign(date));
  });

  it('advances one sign roughly every two hours from the sunrise sign', () => {
    const day = computeFallbackDayData('2026-06-20', 0, 0, 0, 0);
    const start = SIGNS.indexOf(day.slots[0].transit_lagna);
    expect(start).toBeGreaterThanOrEqual(0);
    for (const slot of day.slots) {
      const signsElapsed = Math.floor(slot.slot_index / 2);
      const expected = SIGNS[(start + signsElapsed) % 12];
      expect(slot.transit_lagna, `slot ${slot.slot_index}`).toBe(expected);
    }
  });

  it('reports the transit house consistently with the sign and natal lagna', () => {
    // Natal lagna Capricorn (9). 2026-06-20 Sun in Gemini (2) → 6th house.
    const day = computeFallbackDayData('2026-06-20', 0, 0, 0, 9);
    expect(day.slots[0].transit_lagna).toBe('Gemini');
    expect(day.slots[0].transit_lagna_house).toBe(6);
  });
});
