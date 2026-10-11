import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { computeReveal, wordCount, RevealError } from '@/lib/funnel/reveal/compute';
import { SIGNS, dignityOf, houseFrom, meritLevel, signOnHouse, type Sign } from '@/lib/funnel/reveal/astro';
import * as content from '@/lib/funnel/reveal/content';
import { h5Hits } from '@/lib/funnel/reveal/lint';

// Synthetic charts only — no real person's birth data (this repository is public).

function chart(opts: { lagna: Sign; rahu: Sign; others?: Partial<Record<string, Sign>>; moon?: Sign }): NatalChartData {
  const ketu = SIGNS[(SIGNS.indexOf(opts.rahu) + 6) % 12];
  const base: Record<string, Sign> = {
    Sun: 'Aries', Moon: opts.moon ?? 'Taurus', Mars: 'Gemini', Mercury: 'Aries', Jupiter: 'Leo', Venus: 'Taurus', Saturn: 'Virgo',
    ...(opts.others as Record<string, Sign>),
    Rahu: opts.rahu,
    Ketu: ketu,
  };
  const planets: NatalChartData['planets'] = {};
  for (const [name, sign] of Object.entries(base)) {
    planets[name] = { sign, degree: 10, nakshatra: 'Rohini', nakshatra_pada: 2, is_retrograde: false, house: houseFrom(sign, opts.lagna) };
  }
  return {
    lagna: opts.lagna, lagna_degree: 5, planets, moon_nakshatra: 'Rohini',
    dasha_sequence: [], current_dasha: { mahadasha: 'Venus', antardasha: 'Sun', start_date: '2025-01-01', end_date: '2026-01-01' } as NatalChartData['current_dasha'],
  };
}

const base = { city: 'Testpur', lat: 26.85, lng: 80.95 };

describe('astro tables', () => {
  it('counts whole-sign houses', () => {
    expect(houseFrom('Aries', 'Aries')).toBe(1);
    expect(houseFrom('Pisces', 'Aries')).toBe(12);
    expect(houseFrom('Aries', 'Libra')).toBe(7);
    expect(signOnHouse('Leo', 5)).toBe('Sagittarius');
  });
  it('knows dignities', () => {
    expect(dignityOf('Sun', 'Aries')).toBe('exalted');
    expect(dignityOf('Sun', 'Libra')).toBe('debilitated');
    expect(dignityOf('Venus', 'Taurus')).toBe('own');
    expect(dignityOf('Jupiter', 'Scorpio')).toBe('friend');
    expect(dignityOf('Saturn', 'Leo')).toBe('enemy');
    expect(dignityOf('Mercury', 'Sagittarius')).toBe('neutral');
  });
  it('grades past merit', () => {
    expect(meritLevel('own', 5).level).toBe('Strong');
    expect(meritLevel('debilitated', 8).level).toBe('Developing');
    expect(meritLevel('neutral', 3).level).toBe('Moderate');
  });
});

describe('computeReveal', () => {
  it('every Rahu sign × lagna gives 90–125-word node cards, sourced sentences and no H5 terms', () => {
    let reveals = 0;
    for (const lagna of SIGNS) {
      for (const rahu of SIGNS) {
        const r = computeReveal({ ...base, chart: chart({ lagna, rahu }), timeKnown: true, focusArea: 'career', selfRole: 'seeker' });
        reveals++;
        for (const card of r.cards) {
          for (const p of card.paragraphs) {
            expect(p.source_keys.length).toBeGreaterThan(0);
            expect(h5Hits(p.text)).toEqual([]);
          }
          if (card.key !== 'merit') {
            // Spec: 90–120 words from sign + house; conjunction lines are added on top.
            const core = card.paragraphs.filter((p) => !p.source_keys.some((k) => k.includes('.conj=')));
            const n = wordCount(core);
            expect(n, `${card.key} lagna=${lagna} rahu=${rahu}`).toBeGreaterThanOrEqual(90);
            expect(n, `${card.key} lagna=${lagna} rahu=${rahu}`).toBeLessThanOrEqual(120);
            expect(wordCount(card.paragraphs)).toBeLessThanOrEqual(150);
          }
        }
        expect(r.ketu.house).toBe(((r.rahu.house + 5) % 12) + 1);
        for (const l of r.calcLines) expect(l.source_keys.length).toBeGreaterThan(0);
        expect(r.match?.source_keys.length).toBeGreaterThan(0);
      }
    }
    expect(reveals).toBe(144);
  });

  it('adds conjunction sentences and stays within the word budget', () => {
    const r = computeReveal({
      ...base,
      chart: chart({ lagna: 'Aries', rahu: 'Leo', others: { Sun: 'Leo', Mars: 'Leo', Venus: 'Leo', Saturn: 'Aquarius' } }),
      timeKnown: true,
    });
    const rahuCard = r.cards.find((c) => c.key === 'rahu')!;
    expect(rahuCard.paragraphs.some((p) => p.source_keys.includes('rahu.conj=Sun'))).toBe(true);
    expect(rahuCard.paragraphs.some((p) => p.source_keys.includes('rahu.conj=Venus'))).toBe(true);
    expect(wordCount(rahuCard.paragraphs)).toBeLessThanOrEqual(140);
    expect(r.ketu.conj).toEqual(['Saturn']);
  });

  it('counts houses from the Moon when the birth time is unknown, and says so', () => {
    const r = computeReveal({ ...base, chart: chart({ lagna: 'Aries', rahu: 'Gemini', moon: 'Cancer' }), timeKnown: false });
    expect(r.lagna).toBeNull();
    expect(r.reference).toBe('moon');
    expect(r.rahu.house).toBe(12); // Gemini from Cancer
    expect(r.calcLines[1].text).toContain('needs a birth time');
    expect(r.cards[0].paragraphs[1].text).toContain('counted from your Moon');
  });

  it('matches the chosen role against the Ketu archetype honestly', () => {
    // Rahu in Aquarius → Ketu in Leo → Ruler / leader.
    const yes = computeReveal({ ...base, chart: chart({ lagna: 'Aries', rahu: 'Aquarius' }), timeKnown: true, selfRole: 'ruler' });
    expect(yes.match?.agrees).toBe(true);
    expect(yes.match?.text).toBe('You chose Ruler / leader. Your Ketu says the same.');
    const no = computeReveal({ ...base, chart: chart({ lagna: 'Aries', rahu: 'Aquarius' }), timeKnown: true, selfRole: 'healer' });
    expect(no.match?.agrees).toBe(false);
    expect(no.match?.text).toContain('your Ketu points to Ruler / leader');
  });

  it('orders the locked sections by focus area', () => {
    const r = computeReveal({ ...base, chart: chart({ lagna: 'Aries', rahu: 'Aries' }), timeKnown: true, focusArea: 'love' });
    expect(r.locked[0]).toContain('Relationship karma');
  });

  it('refuses a chart without nodes rather than inventing them', () => {
    const c = chart({ lagna: 'Aries', rahu: 'Aries' });
    delete c.planets.Rahu;
    expect(() => computeReveal({ ...base, chart: c, timeKnown: true })).toThrow(RevealError);
  });
});

describe('H5 lint', () => {
  it('flags banned terms and passes the whole content library', () => {
    expect(h5Hits('This is a danger period')).toContain('danger');
    expect(h5Hits('Your studies and diet')).toEqual([]);
    const all = JSON.stringify(content);
    expect(h5Hits(all)).toEqual([]);
  });
});
