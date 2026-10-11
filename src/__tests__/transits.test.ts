import { describe, it, expect } from 'vitest';
import { GET as sitemapGET } from '../app/api/sitemap/route';
import { TRANSIT_SEGMENTS, SLOW_PLANETS } from '../content/transits';
import {
  SIGN_ORDER,
  currentSign,
  describeVisit,
  fmtDate,
  houseFromMoon,
  moonSignForHouse,
  saturnPressure,
  statusFor,
  todayIST,
  visitsFor,
} from '../lib/seo/transits';

/**
 * The transit pages publish dates and "who has Sade Sati" lists. These checks pin the
 * well-known sidereal (Lahiri) positions so a regenerated data file cannot silently drift.
 */
describe('transit data', () => {
  it('puts the slow planets where the Lahiri sidereal zodiac has them on 11 October 2026', () => {
    const d = '2026-10-11';
    expect(currentSign('saturn', d)).toMatchObject({ sign: 'pisces', since: '2025-03-29', until: '2027-06-03' });
    expect(currentSign('jupiter', d)).toMatchObject({ sign: 'cancer', since: '2026-06-02', until: '2026-10-31' });
    expect(currentSign('rahu', d)).toMatchObject({ sign: 'aquarius', since: '2025-05-18', until: '2026-12-05' });
    expect(currentSign('ketu', d)).toMatchObject({ sign: 'leo', since: '2025-05-18', until: '2026-12-05' });
  });

  it('keeps Ketu exactly opposite Rahu', () => {
    for (const sign of SIGN_ORDER) {
      const opposite = SIGN_ORDER[(SIGN_ORDER.indexOf(sign) + 6) % 12];
      expect(TRANSIT_SEGMENTS.ketu[opposite]).toEqual(TRANSIT_SEGMENTS.rahu[sign]);
    }
  });

  it('gives every sign at least one stay for every slow planet', () => {
    for (const planet of SLOW_PLANETS) {
      for (const sign of SIGN_ORDER) {
        expect(TRANSIT_SEGMENTS[planet][sign].length, `${planet} in ${sign}`).toBeGreaterThan(0);
      }
    }
  });

  it('has segments that are in order and never overlap', () => {
    for (const planet of SLOW_PLANETS) {
      const all = SIGN_ORDER.flatMap((s) => TRANSIT_SEGMENTS[planet][s].map((seg) => [...seg, s] as const));
      all.sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 0; i < all.length; i++) {
        expect(all[i][0] < all[i][1], `${planet} ${all[i][2]} start before end`).toBe(true);
        if (i > 0) expect(all[i][0] >= all[i - 1][1], `${planet} overlap at ${all[i][0]}`).toBe(true);
      }
    }
  });
});

describe('transit helpers', () => {
  it('counts the house from the Moon', () => {
    expect(houseFromMoon('aries', 'aries')).toBe(1);
    expect(houseFromMoon('pisces', 'aries')).toBe(2);
    expect(houseFromMoon('aries', 'pisces')).toBe(12);
    expect(moonSignForHouse('pisces', 12)).toBe('aries');
    expect(moonSignForHouse('pisces', 2)).toBe('aquarius');
  });

  it('lists Sade Sati for Aquarius, Pisces and Aries Moon signs while Saturn is in Pisces', () => {
    const p = saturnPressure('pisces');
    expect(p.sadeSati.map((x) => x.sign).sort()).toEqual(['aquarius', 'aries', 'pisces']);
    expect(p.dhaiya.map((x) => x.sign).sort()).toEqual(['leo', 'sagittarius']);
  });

  it('groups a retrograde dip back into one stay', () => {
    const visits = visitsFor('saturn', 'pisces').filter((v) => v.start === '2025-03-29');
    expect(visits).toHaveLength(1);
    expect(visits[0].segments).toHaveLength(2);
    expect(describeVisit(visits[0])).toBe('29 March 2025 to 3 June 2027, and again 20 October 2027 to 23 February 2028');
  });

  it('reports in, dip, next and past correctly', () => {
    expect(statusFor('saturn', 'pisces', '2026-10-11').kind).toBe('in');
    expect(statusFor('saturn', 'pisces', '2027-08-01').kind).toBe('dip');
    expect(statusFor('saturn', 'aries', '2026-10-11').kind).toBe('next');
    expect(statusFor('saturn', 'aquarius', '2026-10-11').kind).toBe('next');
    expect(statusFor('saturn', 'aquarius', '2100-01-01').kind).toBe('past');
  });

  it('formats dates without a time zone shift', () => {
    expect(fmtDate('2027-06-03')).toBe('3 June 2027');
    expect(todayIST(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-12');
  });
});

describe('sitemap thin-page policy', () => {
  it('lists no horoscope stubs and only slow-planet transit pages', async () => {
    const xml = await sitemapGET().text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    expect(locs.filter((l) => l.includes('/horoscope/'))).toEqual([]);
    expect(locs).toContain('https://www.vedichour.com/transit');
    expect(locs).toContain('https://www.vedichour.com/transit/saturn/pisces');
    expect(locs).not.toContain('https://www.vedichour.com/transit/sun/aries');
    expect(locs.filter((l) => l.includes('/transit/')).length).toBe(48);
  });
});
