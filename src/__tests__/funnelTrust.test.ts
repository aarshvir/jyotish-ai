import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { NatalChartData } from '@/lib/agents/types';
import { computeReveal } from '@/lib/funnel/reveal/compute';
import { houseFrom, type Sign } from '@/lib/funnel/reveal/astro';
import { crossCheck, dms } from '@/lib/funnel/crossCheck';
import { buildInterstitial } from '@/lib/funnel/interstitials';
import { PRODUCT_FACTS } from '@/lib/funnel/productFacts';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';

// Synthetic charts only - this repository is public.

function chart(lagna: Sign, moon: Sign, nak: string): NatalChartData {
  const base: Record<string, Sign> = { Sun: 'Aries', Moon: moon, Mars: 'Gemini', Mercury: 'Aries', Jupiter: 'Leo', Venus: 'Taurus', Saturn: 'Virgo', Rahu: 'Capricorn', Ketu: 'Cancer' };
  const planets: NatalChartData['planets'] = {};
  for (const [name, sign] of Object.entries(base)) {
    planets[name] = { sign, degree: name === 'Moon' ? 19.0602 : name === 'Rahu' || name === 'Ketu' ? 19.3864 : 10, nakshatra: name === 'Moon' ? nak : 'Rohini', nakshatra_pada: 4, is_retrograde: false, house: houseFrom(sign, lagna) };
  }
  return {
    lagna,
    lagna_degree: 11.31,
    planets,
    moon_nakshatra: nak,
    dasha_sequence: [],
    current_dasha: { mahadasha: 'Venus', antardasha: 'Sun', start_date: '2025-01-01', end_date: '2026-01-01' },
  };
}
const place = { city: 'Testpur', lat: 26.85, lng: 80.95 };

describe('the cross-check card', () => {
  it('formats degrees the way other kundli sites print them', () => {
    expect(dms(19.0602)).toBe("19°04′");
    expect(dms(0)).toBe("0°00′");
    expect(dms(29.99999)).toBe("29°59′");
    expect(dms(11.31)).toBe("11°19′");
  });

  it('lists the numbers to compare, from the engine, with the method', () => {
    const r = computeReveal({ chart: chart('Aries', 'Libra', 'Swati'), timeKnown: true, precision: 'exact', ...place });
    const c = crossCheck(r, 'en');
    expect(c.rows.map((x) => `${x.label}: ${x.value}`)).toEqual([
      "Rising sign: Aries 11°19′",
      "Moon: Libra 19°04′, Swati, pada 4",
      "Rahu: Capricorn 19°23′, 10th house",
      "Ketu: Cancer 19°23′, 4th house",
    ]);
    expect(c.method).toContain('Swiss Ephemeris, Lahiri ayanamsa, whole-sign houses');
    expect(c.caution).toContain('12:00 AM');
  });

  it('prints no figure that the missing birth time would make wrong', () => {
    const r = computeReveal({
      chart: chart('Aries', 'Libra', 'Vishakha'),
      timeKnown: false,
      precision: 'unknown',
      ...place,
      window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Scorpio', 'Anuradha') },
    });
    const c = crossCheck(r, 'en');
    expect(c.rows[0].value).toBe('Needs your birth time');
    expect(c.rows[1].value).toBe('Moves during the day. Needs your birth time.');
    // Rahu and Ketu barely move in a day, so their degrees are still honest to print.
    expect(c.rows.some((x) => x.key === 'rahu')).toBe(true);
  });

  it('has no invented claim and no AI tell in either language', () => {
    const r = computeReveal({ chart: chart('Aries', 'Libra', 'Swati'), timeKnown: true, precision: 'exact', ...place });
    for (const lang of ['en', 'hi'] as const) {
      const c = crossCheck(r, lang);
      for (const s of [c.title, c.intro, c.method, c.caution, ...c.rows.map((x) => `${x.label} ${x.value}`)]) {
        expect(claimHits(s), s).toEqual([]);
        expect(aiTells(s), s).toEqual([]);
        expect(s).not.toMatch(/[ऀ-ॿ]/);
      }
    }
  });
});

describe('the trust devices are real', () => {
  const root = path.resolve(__dirname, '../..');

  it('only states product facts that hold today, and the refund and never-say pages exist', () => {
    expect(PRODUCT_FACTS.refund_24h).toBe(true);
    expect(PRODUCT_FACTS.no_fear_predictions).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/refund/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/what-we-never-say/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/chart-privacy/page.tsx'))).toBe(true);
  });

  it('the never-say page names every category the reading is tested against', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/what-we-never-say/page.tsx'), 'utf8').toLowerCase();
    for (const term of ['die', 'illness', 'cursed', 'black magic', 'divorce', 'children', 'pregnancy', 'sex', 'lose', 'danger', 'another person', 'guarantee']) {
      expect(page, term).toContain(term);
    }
  });

  it('the page promises nothing the funnel does not do, and makes no claim about users', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/what-we-never-say/page.tsx'), 'utf8');
    // It names "a guarantee of any outcome" as something we do NOT give, so that word is expected here.
    expect(claimHits(page.replace(/<[^>]+>/g, ' ')).filter((h) => h !== 'accuracy')).toEqual([]);
    expect(page).not.toMatch(/\d+\s?%/);
  });

  it('points to the never-say page from the interstitial when fear was a complaint, and only then', () => {
    const withFear = buildInterstitial('built', { focus_area: 'career', frustration: 'fear' }, 'en');
    expect(withFear.blocks.some((b) => b.kind === 'link' && b.href === '/what-we-never-say')).toBe(true);
    const without = buildInterstitial('built', { focus_area: 'career', frustration: 'vague' }, 'en');
    expect(without.blocks.some((b) => b.kind === 'link')).toBe(false);
  });
});
