import { describe, it, expect } from 'vitest';
import { selectComputedWeeks, type WeekData } from '@/lib/reports/weeklyWeeks';

function week(overrides: Partial<WeekData> = {}): WeekData {
  return {
    week_label: 'Week of 12 Aug',
    week_start: '2026-08-12',
    score: 72,
    theme: 'Momentum returns',
    commentary: 'Real computed prose.',
    ...overrides,
  };
}

/**
 * Regression guard: WeeklyAnalysis padded to a fixed 6 weeks with a hardcoded
 * `score: 65` placeholder, so a paid report with 2 computed weeks showed 4
 * invented ones. Same fabrication class as the "65 65 65" MonthlyAnalysis bug.
 */
describe('selectComputedWeeks — never invents a week', () => {
  it('returns exactly the weeks that were computed, without padding to 6', () => {
    const got = selectComputedWeeks([week({ score: 80 }), week({ score: 41 })]);
    expect(got).toHaveLength(2);
    expect(got.map((w) => w.score)).toEqual([80, 41]);
  });

  it('never manufactures the old 65 placeholder score', () => {
    for (const input of [[], [week()], [week(), week({ score: 30 })]]) {
      const got = selectComputedWeeks(input);
      expect(got).toHaveLength(input.length);
      expect(got.some((w) => w.score === 65 && w.theme === 'Weekly energy arc.')).toBe(false);
    }
  });

  it('drops entries with no usable score rather than defaulting one', () => {
    const got = selectComputedWeeks([
      week({ score: 70 }),
      undefined,
      null,
      { ...week(), score: NaN },
      { ...week(), score: undefined as unknown as number },
    ]);
    expect(got).toHaveLength(1);
    expect(got[0]?.score).toBe(70);
  });

  it('a score of 0 is real data and is kept', () => {
    expect(selectComputedWeeks([week({ score: 0 })])).toHaveLength(1);
  });

  it('empty / null / undefined input yields no weeks (caller renders nothing)', () => {
    expect(selectComputedWeeks([])).toEqual([]);
    expect(selectComputedWeeks(null)).toEqual([]);
    expect(selectComputedWeeks(undefined)).toEqual([]);
  });
});
