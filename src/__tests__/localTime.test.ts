import { describe, expect, it } from 'vitest';
import {
  addCivilDays,
  civilDateRange,
  civilDateYmd,
  formatIsoTimeInOffset,
  parseDisplayLabelTimeRange,
  resolveLocalSlotTimes,
} from '@/lib/time/localTime';

describe('local time helpers', () => {
  it('formats ISO instants in the entered current-city offset', () => {
    expect(formatIsoTimeInOffset('2026-05-03T02:00:00.000Z', 240)).toBe('06:00');
    expect(formatIsoTimeInOffset('2026-05-03T03:00:00.000Z', 240)).toBe('07:00');
  });

  it('preserves UTC zero offset instead of treating it as missing', () => {
    expect(formatIsoTimeInOffset('2026-05-03T06:00:00.000Z', 0)).toBe('06:00');
  });

  it('uses display labels as the authoritative local slot label', () => {
    expect(parseDisplayLabelTimeRange('6:00-7:00')).toEqual({ start: '06:00', end: '07:00' });
    expect(parseDisplayLabelTimeRange('06:00-07:00')).toEqual({ start: '06:00', end: '07:00' });
  });

  it('resolves report slot fallbacks without leaking UTC time text', () => {
    expect(
      resolveLocalSlotTimes(
        {
          start_iso: '2026-05-03T02:00:00.000Z',
          end_iso: '2026-05-03T03:00:00.000Z',
        },
        240,
      ),
    ).toEqual({
      display_label: '06:00-07:00',
      time: '06:00',
      end_time: '07:00',
    });
  });

  it('civilDateYmd uses seeker offset, not UTC calendar day', () => {
    // 2026-08-01 20:00 UTC → IST (+330) is already 2026-08-02 01:30
    const instant = new Date('2026-08-01T20:00:00.000Z');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-08-01');
    expect(civilDateYmd(instant, 330)).toBe('2026-08-02');
    expect(civilDateYmd(instant, 240)).toBe('2026-08-02');
    // Americas evening: UTC already rolled to next day while local is still prior day
    const west = new Date('2026-08-02T01:30:00.000Z');
    expect(west.toISOString().slice(0, 10)).toBe('2026-08-02');
    expect(civilDateYmd(west, -420)).toBe('2026-08-01');
  });

  it('civilDateRange builds contiguous local days from a civil anchor', () => {
    expect(addCivilDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(civilDateRange('2026-08-01', 3)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });
});
