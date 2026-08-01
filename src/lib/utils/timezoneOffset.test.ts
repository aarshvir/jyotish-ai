import { describe, expect, it } from 'vitest';
import {
  estimateTimezoneOffsetMinutes,
  localDateStringForOffset,
  resolveReportTimezoneOffset,
} from './timezoneOffset';

describe('estimateTimezoneOffsetMinutes', () => {
  it('maps known Indian cities to IST (+330)', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'New Delhi, India', lng: 77.2 })).toBe(330);
    expect(estimateTimezoneOffsetMinutes({ city: 'Mumbai', lng: 72.8 })).toBe(330);
  });

  it('maps Dubai to +240', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'Dubai, UAE', lng: 55.27 })).toBe(240);
  });

  it('falls back to longitude buckets when city is unknown', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'Somewhere', lng: 0 })).toBe(0);
  });
});

describe('resolveReportTimezoneOffset', () => {
  it('uses birth-city TZ when current city is blank — ignores browser TZ', () => {
    // Seeker in Dubai (browser +240) buying a Delhi-timed report without "live elsewhere".
    expect(
      resolveReportTimezoneOffset({
        clientOffset: 240,
        birthCity: 'New Delhi, India',
        birthLng: 77.209,
        currentCity: null,
        currentLng: null,
      }),
    ).toBe(330);
  });

  it('uses current-city TZ when the seeker lives elsewhere', () => {
    expect(
      resolveReportTimezoneOffset({
        clientOffset: 240,
        birthCity: 'New Delhi, India',
        birthLng: 77.209,
        currentCity: 'Dubai, UAE',
        currentLng: 55.27,
      }),
    ).toBe(240);
  });

  it('falls back to client offset only when location cannot be estimated', () => {
    expect(
      resolveReportTimezoneOffset({
        clientOffset: 180,
        birthCity: '',
        birthLng: null,
      }),
    ).toBe(180);
  });
});

describe('localDateStringForOffset', () => {
  it('uses the seeker-local civil date near UTC midnight', () => {
    // 2026-08-01 21:00 UTC = 2026-08-02 01:00 in Dubai (UTC+4).
    const utc = new Date('2026-08-01T21:00:00.000Z');
    expect(localDateStringForOffset(utc, 240)).toBe('2026-08-02');
    expect(localDateStringForOffset(utc, 0)).toBe('2026-08-01');
  });
});
