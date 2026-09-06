import { describe, expect, it } from 'vitest';
import {
  cityMentionsKey,
  estimateTimezoneOffsetMinutes,
  localDateStringForOffset,
  resolveReportTimezoneOffset,
} from './timezoneOffset';

const AUG = new Date('2026-08-02T16:00:00.000Z'); // NY/London DST
const JAN = new Date('2026-01-15T16:00:00.000Z'); // NY/London standard

describe('cityMentionsKey', () => {
  it('matches India as a whole token, not Indiana / Indianapolis', () => {
    expect(cityMentionsKey('New Delhi, India', 'india')).toBe(true);
    expect(cityMentionsKey('Indianapolis, Indiana, United States', 'india')).toBe(false);
    expect(cityMentionsKey('Indiana', 'india')).toBe(false);
    expect(cityMentionsKey('Indianapolis', 'india')).toBe(false);
  });

  it('matches multi-word cities as consecutive tokens', () => {
    expect(cityMentionsKey('New York, New York, United States', 'new york')).toBe(true);
    expect(cityMentionsKey('Hong Kong', 'hong kong')).toBe(true);
    expect(cityMentionsKey('York, United Kingdom', 'new york')).toBe(false);
  });
});

describe('estimateTimezoneOffsetMinutes', () => {
  it('maps known Indian cities to IST (+330)', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'New Delhi, India', lng: 77.2 })).toBe(330);
    expect(estimateTimezoneOffsetMinutes({ city: 'Mumbai', lng: 72.8 })).toBe(330);
  });

  it('maps Dubai to +240', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'Dubai, UAE', lng: 55.27 })).toBe(240);
  });

  it('does not assign IST to Indiana / Indianapolis (substring trap)', () => {
    const indy = estimateTimezoneOffsetMinutes({
      city: 'Indianapolis, Marion County, Indiana, United States',
      lng: -86.158,
      at: AUG,
    });
    // Must be US Eastern (EDT -240), never IST +330 from "india" inside "Indiana".
    expect(indy).toBe(-240);
    expect(indy).not.toBe(330);
  });

  it('uses IANA DST for New York and London', () => {
    expect(estimateTimezoneOffsetMinutes({ city: 'New York, USA', lng: -74, at: AUG })).toBe(-240);
    expect(estimateTimezoneOffsetMinutes({ city: 'New York, USA', lng: -74, at: JAN })).toBe(-300);
    expect(estimateTimezoneOffsetMinutes({ city: 'London, United Kingdom', lng: -0.12, at: AUG })).toBe(60);
    expect(estimateTimezoneOffsetMinutes({ city: 'London, United Kingdom', lng: -0.12, at: JAN })).toBe(0);
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

  it('does not persist IST for an Indianapolis-timed paid report', () => {
    expect(
      resolveReportTimezoneOffset({
        clientOffset: -240,
        birthCity: 'Indianapolis, Indiana, United States',
        birthLng: -86.158,
        currentCity: null,
        currentLng: null,
        at: AUG,
      }),
    ).toBe(-240);
  });

  it('persists EDT for a New York seeker in August, not year-round EST', () => {
    expect(
      resolveReportTimezoneOffset({
        clientOffset: -300, // stale EST constant from the old table
        birthCity: 'New York',
        birthLng: -74.0,
        currentCity: null,
        currentLng: null,
        at: AUG,
      }),
    ).toBe(-240);
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
