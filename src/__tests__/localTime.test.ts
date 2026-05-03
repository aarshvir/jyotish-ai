import { describe, expect, it } from 'vitest';
import {
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
});
