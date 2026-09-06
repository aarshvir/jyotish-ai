import { describe, expect, it } from 'vitest';
import { getSpecialEventsForDate, specialEventAdj } from './specialEvents';

describe('getSpecialEventsForDate — jupiter retrograde window', () => {
  it('does not tag dates before the bounded Rx window (old open-ended Oct 9 bug)', () => {
    expect(getSpecialEventsForDate('2026-10-09')).not.toContain('jupiter_retrograde');
    expect(getSpecialEventsForDate('2026-12-12')).not.toContain('jupiter_retrograde');
  });

  it('tags the station-to-direct civil window inclusively', () => {
    expect(getSpecialEventsForDate('2026-12-13')).toContain('jupiter_retrograde');
    expect(getSpecialEventsForDate('2027-02-01')).toContain('jupiter_retrograde');
    expect(getSpecialEventsForDate('2027-04-13')).toContain('jupiter_retrograde');
  });

  it('stops after the bounded end — never permanently depresses scores', () => {
    expect(getSpecialEventsForDate('2027-04-14')).not.toContain('jupiter_retrograde');
    expect(getSpecialEventsForDate('2028-01-01')).not.toContain('jupiter_retrograde');
  });
});

describe('getSpecialEventsForDate — mercury station-direct days', () => {
  it('tags station-direct as mercury_direct only (no Rx penalty + tier2 double-count)', () => {
    for (const d of ['2026-03-20', '2026-07-12', '2026-11-03']) {
      const events = getSpecialEventsForDate(d);
      expect(events).toContain('mercury_direct');
      expect(events).not.toContain('mercury_retrograde');
    }
  });

  it('still tags mid-period retrograde days', () => {
    expect(getSpecialEventsForDate('2026-03-01')).toContain('mercury_retrograde');
    expect(getSpecialEventsForDate('2026-03-01')).not.toContain('mercury_direct');
  });

  it('station-direct adj is +6 (direct) without the -8 Rx penalty', () => {
    const events = getSpecialEventsForDate('2026-03-20');
    // yogaVal >= 6 → tier2 stacking +12 on top of mercury_direct +6
    expect(specialEventAdj(events, 6, 0, 'Rohini')).toBe(6 + 12);
  });
});
