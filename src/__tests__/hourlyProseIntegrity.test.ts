import { describe, expect, it } from 'vitest';
import {
  containsDeterministicHourlyFallback,
  hasCompleteHourlyProse,
} from '@/lib/reports/hourlyProseIntegrity';

const prose = 'This is substantive personalized hourly prose with enough detail to pass the completeness check.';

describe('hourly prose integrity', () => {
  it('accepts complete, unique coverage of every requested slot', () => {
    const slots = Array.from({ length: 18 }, (_, slot_index) => ({ slot_index, commentary: prose }));

    expect(hasCompleteHourlyProse(slots, Array.from({ length: 18 }, (_, i) => i))).toBe(true);
  });

  it('rejects partial model output instead of allowing template-filled paid content', () => {
    const slots = Array.from({ length: 5 }, (_, slot_index) => ({ slot_index, commentary: prose }));

    expect(hasCompleteHourlyProse(slots, Array.from({ length: 18 }, (_, i) => i))).toBe(false);
  });

  it('rejects duplicate indexes and commentary that is too short', () => {
    expect(hasCompleteHourlyProse([
      { slot_index: 0, commentary: prose },
      { slot_index: 0, commentary: prose },
    ], [0, 1])).toBe(false);
    expect(hasCompleteHourlyProse([
      { slot_index: 0, commentary: 'Too short' },
    ], [0])).toBe(false);
  });

  it('detects reports whose completed marker masks deterministic fallback slots', () => {
    expect(containsDeterministicHourlyFallback([
      {
        slot_index: 0,
        commentary: 'Deterministic guidance',
        guidance_v2: { summary_plain: 'Deterministic guidance' },
      },
      {
        slot_index: 1,
        commentary: prose,
        guidance_v2: { summary_plain: 'Different deterministic guidance' },
      },
    ])).toBe(true);
  });

  it('does not invalidate a fully personalized stored day', () => {
    expect(containsDeterministicHourlyFallback([
      {
        slot_index: 0,
        commentary: prose,
        guidance_v2: { summary_plain: 'Deterministic guidance' },
      },
    ])).toBe(false);
  });
});
