import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { computeReveal } from '@/lib/funnel/reveal/compute';
import { SIGNS, houseFrom, type Sign } from '@/lib/funnel/reveal/astro';
import { answerLines, chartLines, inputLines } from '@/lib/funnel/briefLines';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';

// Synthetic chart only — this repository is public.
function chart(lagna: Sign, rahu: Sign): NatalChartData {
  const ketu = SIGNS[(SIGNS.indexOf(rahu) + 6) % 12];
  const base: Record<string, Sign> = { Sun: 'Aries', Moon: 'Taurus', Mars: 'Gemini', Mercury: 'Aries', Jupiter: 'Leo', Venus: 'Taurus', Saturn: 'Virgo', Rahu: rahu, Ketu: ketu };
  const planets: NatalChartData['planets'] = {};
  for (const [name, sign] of Object.entries(base)) {
    planets[name] = { sign, degree: 10, nakshatra: 'Rohini', nakshatra_pada: 3, is_retrograde: false, house: houseFrom(sign, lagna) };
  }
  return { lagna, lagna_degree: 5, planets, moon_nakshatra: 'Rohini', dasha_sequence: [], current_dasha: { mahadasha: 'Venus', antardasha: 'Sun', start_date: '2025-01-01', end_date: '2026-01-01' } as NatalChartData['current_dasha'] };
}

const place = { city: 'Testpur, Somewhere, India', lat: 26.85, lng: 80.95 };

describe('building the brief: every line comes from something real', () => {
  const known = computeReveal({ chart: chart('Cancer', 'Capricorn'), timeKnown: true, ...place });
  const unknown = computeReveal({ chart: chart('Cancer', 'Capricorn'), timeKnown: false, ...place });

  it('states the place and how sure the birth time is, before the engine has answered', () => {
    const exact = inputLines({ ...place, birth_time: '06:30', time_known: 'exact' }, 'en');
    expect(exact[0].text).toBe('Birth place found: Testpur, Somewhere, India · 26.85°N 80.95°E');
    expect(exact[1].text).toBe('Birth time: 06:30 (exact)');
    expect(inputLines({ ...place, birth_time: '06:30', time_known: 'approx' }, 'en')[1].text).toBe('Birth time: about 06:30');
    expect(inputLines({ ...place, birth_time: null, time_known: 'unknown' }, 'en')[1].text).toBe('Birth time: not known. Houses will be counted from your Moon.');
    expect(inputLines({ ...place, birth_time: null, time_known: 'unknown' }, 'hi')[1].text).toContain('pata nahi');
  });

  it('prints the engine values: rising sign, Moon nakshatra and pada, Ketu and Rahu houses', () => {
    expect(chartLines(known, 'en').map((l) => l.text)).toEqual([
      'Rising sign: Cancer',
      'Moon: Taurus, Rohini nakshatra, pada 3',
      `Ketu: ${known.ketu.sign}, ${known.ketu.house}${['', 'st', 'nd', 'rd'][known.ketu.house] ?? 'th'} house`,
      `Rahu: ${known.rahu.sign}, ${known.rahu.house}${['', 'st', 'nd', 'rd'][known.rahu.house] ?? 'th'} house`,
    ]);
  });

  it('never invents a rising sign when there is no birth time', () => {
    const lines = chartLines(unknown, 'en').map((l) => l.key);
    expect(lines).not.toContain('lagna');
    expect(lines).toEqual(['moon', 'ketu', 'rahu']);
  });

  it('lists only the answers that exist, and says which picks are never used to read the chart', () => {
    expect(answerLines({}, 'en')).toEqual([]);
    const lines = answerLines(
      { focus_area: 'career', problems: 'career_stuck,money_leaks', mind_focus: 'money_leaks', frustration: 'vague,upsell,nothing', goal_12m: 'business', mind_words: 'two small words', picture: 'fort', self_role: 'scholar' },
      'en',
    );
    expect(lines.map((l) => l.key)).toEqual(['focus', 'problems', 'weighs', 'frustration', 'goal', 'words', 'compare']);
    expect(lines.find((l) => l.key === 'frustration')!.text).toBe('2 things that bothered you about astrology, kept in mind');
    expect(lines.find((l) => l.key === 'words')!.text).toBe('Your own words (3 words), as you wrote them');
    expect(lines.find((l) => l.key === 'compare')!.text).toContain('never used to read your chart');
    // The free text itself is not repeated here.
    expect(JSON.stringify(lines)).not.toContain('two small words');
  });

  it('has no invented claim, no AI tell, and no Devanagari, in either language', () => {
    const all: string[] = [];
    for (const lang of ['en', 'hi'] as const) {
      all.push(
        ...inputLines({ ...place, birth_time: '06:30', time_known: 'exact' }, lang).map((l) => l.text),
        ...inputLines({ ...place, birth_time: null, time_known: 'unknown' }, lang).map((l) => l.text),
        ...chartLines(known, lang).map((l) => l.text),
        ...chartLines(unknown, lang).map((l) => l.text),
        ...answerLines({ focus_area: 'love', problems: 'love_delay', mind_focus: 'love_delay', frustration: 'fear', goal_12m: 'peace', mind_words: 'x', picture: 'ghat', self_role: 'healer' }, lang).map((l) => l.text),
        ...answerLines({ self_role: 'healer' }, lang).map((l) => l.text),
        ...answerLines({ picture: 'ghat' }, lang).map((l) => l.text),
      );
    }
    for (const s of all) {
      expect(claimHits(s), s).toEqual([]);
      expect(aiTells(s), s).toEqual([]);
      expect(s).not.toMatch(/[\u0900-\u097F]/);
    }
  });
});
