import { describe, expect, it } from 'vitest';
import { resolveHourlyProseDays, resolveProseDayCount } from '@/lib/reports/hourlyProseWindow';

/**
 * Guards the bounded-window sizing that keeps report generation under 10 minutes.
 * A regression here silently reverts to ~27-min reports or drops prose the pipeline
 * is supposed to cover.
 */
describe('hourly-prose window sizing', () => {
  describe('resolveHourlyProseDays (env parsing)', () => {
    it('defaults to 10 when unset or blank', () => {
      expect(resolveHourlyProseDays(undefined)).toBe(10);
      expect(resolveHourlyProseDays('')).toBe(10);
      expect(resolveHourlyProseDays('   ')).toBe(10);
    });
    it('honours a valid positive bound', () => {
      expect(resolveHourlyProseDays('7')).toBe(7);
      expect(resolveHourlyProseDays('30')).toBe(30);
    });
    it('treats 0 as an explicit "no bound" (old behavior)', () => {
      expect(resolveHourlyProseDays('0')).toBe(0);
    });
    it('falls back to 10 on garbage / negative', () => {
      expect(resolveHourlyProseDays('abc')).toBe(10);
      expect(resolveHourlyProseDays('-5')).toBe(10);
    });
  });

  describe('resolveProseDayCount (clamping)', () => {
    it('bounds a monthly report to the window (the <10-min win)', () => {
      expect(resolveProseDayCount(10, 30)).toBe(10);
    });
    it('never exceeds the days available', () => {
      expect(resolveProseDayCount(10, 7)).toBe(7);
    });
    it('0 (no bound) covers every day', () => {
      expect(resolveProseDayCount(0, 30)).toBe(30);
      expect(resolveProseDayCount(0, 365)).toBe(365);
    });
    it('handles empty forecasts safely', () => {
      expect(resolveProseDayCount(10, 0)).toBe(0);
      expect(resolveProseDayCount(0, 0)).toBe(0);
    });
    it('a 7-day report is fully covered by the default window', () => {
      expect(resolveProseDayCount(resolveHourlyProseDays(undefined), 7)).toBe(7);
    });
  });
});
