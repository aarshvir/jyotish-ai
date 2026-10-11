import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { DATE_ERROR, TIME_ERROR, dateEcho, dayPart, parseDate, parseTime, shiftLocal, splitIso, splitTime, timeEcho } from '@/lib/funnel/birth';
import { computeReveal } from '@/lib/funnel/reveal/compute';
import { houseFrom, type Sign } from '@/lib/funnel/reveal/astro';
import { precisionLabel, precisionNotes } from '@/lib/funnel/precision';
import { chartLines } from '@/lib/funnel/briefLines';
import { screensFor } from '@/lib/funnel/screens';
import { counter, firstIncomplete, nextScreen, prevScreen } from '@/lib/funnel/engine';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';

// Synthetic charts only — this repository is public.

const NOW = new Date(Date.UTC(2026, 9, 11));

describe('date entry', () => {
  it('accepts a real date and writes it as ISO', () => {
    expect(parseDate('15', '7', '1991', NOW)).toEqual({ iso: '1991-07-15' });
    expect(parseDate(' 5 ', '07', '1991', NOW)).toEqual({ iso: '1991-07-05' });
    expect(parseDate('29', '2', '1996', NOW)).toEqual({ iso: '1996-02-29' });
  });
  it('rejects what is not a date, with a reason', () => {
    expect(parseDate('', '7', '1991', NOW)).toEqual({ error: 'incomplete' });
    expect(parseDate('31', '4', '1991', NOW)).toEqual({ error: 'invalid' });
    expect(parseDate('29', '2', '1997', NOW)).toEqual({ error: 'invalid' });
    expect(parseDate('15', '13', '1991', NOW)).toEqual({ error: 'invalid' });
    expect(parseDate('15', '7', '91', NOW)).toEqual({ error: 'invalid' });
    expect(parseDate('15', '7', '1899', NOW)).toEqual({ error: 'year' });
    expect(parseDate('12', '10', '2026', NOW)).toEqual({ error: 'future' });
    expect(parseDate('11', '10', '2026', NOW)).toEqual({ iso: '2026-10-11' });
    for (const e of Object.values(DATE_ERROR)) expect(e.hi.length).toBeGreaterThan(5);
  });
  it('reads the date back with its weekday, in both languages', () => {
    expect(dateEcho('1991-07-15', 'en')).toBe('15 Jul 1991, Monday');
    expect(dateEcho('1991-07-15', 'hi')).toBe('15 Jul 1991, Somvar');
  });
  it('splits a saved ISO date back into the three boxes, and shows no default', () => {
    expect(splitIso('1991-07-05')).toEqual({ d: '5', m: '7', y: '1991' });
    expect(splitIso(undefined)).toEqual({ d: '', m: '', y: '' });
  });
});

describe('time entry never defaults to midnight', () => {
  it('needs AM or PM for hours 1 to 12', () => {
    expect(parseTime('6', '30', null)).toEqual({ error: 'meridiem' });
    expect(parseTime('6', '30', 'am')).toEqual({ hhmm: '06:30' });
    expect(parseTime('6', '30', 'pm')).toEqual({ hhmm: '18:30' });
    expect(parseTime('12', '15', 'am')).toEqual({ hhmm: '00:15' });
    expect(parseTime('12', '15', 'pm')).toEqual({ hhmm: '12:15' });
  });
  it('reads 13 to 23 as a 24-hour time and 0 as midnight', () => {
    expect(parseTime('18', '05', null)).toEqual({ hhmm: '18:05' });
    expect(parseTime('0', '10', null)).toEqual({ hhmm: '00:10' });
  });
  it('refuses empty and impossible times', () => {
    expect(parseTime('', '', null)).toEqual({ error: 'incomplete' });
    expect(parseTime('6', '', 'am')).toEqual({ error: 'incomplete' });
    expect(parseTime('24', '00', 'am')).toEqual({ error: 'invalid' });
    expect(parseTime('6', '60', 'am')).toEqual({ error: 'invalid' });
    for (const e of Object.values(TIME_ERROR)) expect(e.hi.length).toBeGreaterThan(5);
  });
  it('reads the time back with its part of the day so a wrong AM/PM shows', () => {
    expect(timeEcho('06:30', 'en')).toBe('6:30 AM, morning');
    expect(timeEcho('18:30', 'en')).toBe('6:30 PM, evening');
    expect(timeEcho('00:20', 'hi')).toBe('12:20 AM, raat');
    expect(dayPart('13:00', 'hi')).toBe('dopahar');
    expect(dayPart('04:00', 'hi')).toBe('subah');
    expect(dayPart('20:00', 'hi')).toBe('raat');
  });
  it('splits a saved time back into the boxes', () => {
    expect(splitTime('18:30')).toEqual({ h: '6', m: '30', ap: 'pm' });
    expect(splitTime('00:05')).toEqual({ h: '12', m: '05', ap: 'am' });
    expect(splitTime(undefined)).toEqual({ h: '', m: '', ap: null });
  });
  it('shifts a local time across midnight without a time zone', () => {
    expect(shiftLocal('1991-07-15', '23:30', 120)).toEqual({ date: '1991-07-16', time: '01:30' });
    expect(shiftLocal('1991-03-01', '00:30', -120)).toEqual({ date: '1991-02-28', time: '22:30' });
  });
});

function chart(lagna: Sign, moon: Sign, nak: string): NatalChartData {
  const base: Record<string, Sign> = { Sun: 'Aries', Moon: moon, Mars: 'Gemini', Mercury: 'Aries', Jupiter: 'Leo', Venus: 'Taurus', Saturn: 'Virgo', Rahu: 'Capricorn', Ketu: 'Cancer' };
  const planets: NatalChartData['planets'] = {};
  for (const [name, sign] of Object.entries(base)) {
    planets[name] = { sign, degree: 10, nakshatra: name === 'Moon' ? nak : 'Rohini', nakshatra_pada: 2, is_retrograde: false, house: houseFrom(sign, lagna) };
  }
  return {
    lagna,
    lagna_degree: 5,
    planets,
    moon_nakshatra: nak,
    dasha_sequence: [],
    current_dasha: { mahadasha: 'Venus', antardasha: 'Sun', start_date: '2025-01-01', end_date: '2026-01-01' } as NatalChartData['current_dasha'],
  };
}
const place = { city: 'Testpur', lat: 26.85, lng: 80.95 };

describe('how far the result moves when the time is not exact', () => {
  it('says nothing for an exact time', () => {
    const r = computeReveal({ chart: chart('Cancer', 'Libra', 'Swati'), timeKnown: true, precision: 'exact', ...place });
    expect(r.precision).toBe('exact');
    expect(r.spread).toBeNull();
    expect(precisionNotes(r, 'en')).toEqual([]);
    expect(precisionLabel(r, 'en')).toBe('Birth time: exact');
  });

  it('with no time, says when the Moon changed sign that day, and what that does to the houses', () => {
    const r = computeReveal({
      chart: chart('Aries', 'Libra', 'Vishakha'),
      timeKnown: false,
      precision: 'unknown',
      ...place,
      window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Scorpio', 'Anuradha') },
    });
    expect(r.lagna).toBeNull();
    expect(r.spread?.moonSigns).toEqual(['Libra', 'Scorpio']);
    expect(r.spread?.moonNakshatras).toEqual(['Swati', 'Vishakha', 'Anuradha']);
    expect(r.spread?.lagnas).toEqual([]);
    const notes = precisionNotes(r, 'en');
    expect(notes[0]).toContain('no rising sign');
    expect(notes[0]).toContain('Libra');
    expect(notes[1]).toContain('changed sign on your birth date (Libra, then Scorpio)');
    expect(notes[1]).toContain('If it was Scorpio, every house number here would be one lower');
    expect(notes[2]).toContain('Swati early in the day and Anuradha late');
    expect(chartLines(r, 'en').find((l) => l.key === 'moon')!.text).toBe('Moon on your birth date: Libra then Scorpio, Swati to Anuradha nakshatra');
    expect(chartLines(r, 'en').find((l) => l.key === 'ketu')!.text).toContain('from your Moon');
  });

  it('with no time but a Moon that stays put, says the houses do not depend on the time', () => {
    const r = computeReveal({
      chart: chart('Aries', 'Libra', 'Swati'),
      timeKnown: false,
      precision: 'unknown',
      ...place,
      window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Libra', 'Swati') },
    });
    expect(precisionNotes(r, 'en')[1]).toContain('houses counted from it do not depend on the time');
    expect(chartLines(r, 'en').find((l) => l.key === 'moon')!.text).toBe('Moon: Libra, Swati nakshatra, pada 2');
  });

  it('with a rough time, names the other rising signs it could be, or says it holds', () => {
    const changes = computeReveal({
      chart: chart('Cancer', 'Libra', 'Swati'),
      timeKnown: true,
      precision: 'approx',
      ...place,
      window: { before: chart('Gemini', 'Libra', 'Swati'), after: chart('Leo', 'Libra', 'Swati') },
    });
    expect(precisionNotes(changes, 'en')[0]).toBe(
      'Your birth time is approximate. Your rising sign is Cancer at the time you gave, and could be Gemini or Leo if it is two hours off. Houses here are counted from Cancer.',
    );
    const holds = computeReveal({
      chart: chart('Cancer', 'Libra', 'Swati'),
      timeKnown: true,
      precision: 'approx',
      ...place,
      window: { before: chart('Cancer', 'Libra', 'Swati'), after: chart('Cancer', 'Libra', 'Swati') },
    });
    expect(precisionNotes(holds, 'en')[0]).toContain('stays Cancer for two hours either side');
  });

  it('still says something honest when the edge charts could not be fetched', () => {
    const r = computeReveal({ chart: chart('Cancer', 'Libra', 'Swati'), timeKnown: true, precision: 'approx', ...place });
    expect(r.spread).toBeNull();
    expect(precisionNotes(r, 'en')[0]).toContain('could differ');
  });

  it('has no invented claim and no AI tell, in both languages, and no Devanagari', () => {
    const r = computeReveal({
      chart: chart('Aries', 'Libra', 'Vishakha'),
      timeKnown: false,
      precision: 'unknown',
      ...place,
      window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Scorpio', 'Anuradha') },
    });
    const a = computeReveal({
      chart: chart('Cancer', 'Libra', 'Swati'),
      timeKnown: true,
      precision: 'approx',
      ...place,
      window: { before: chart('Gemini', 'Libra', 'Swati'), after: chart('Leo', 'Scorpio', 'Swati') },
    });
    for (const lang of ['en', 'hi'] as const) {
      for (const s of [...precisionNotes(r, lang), ...precisionNotes(a, lang), precisionLabel(r, lang), precisionLabel(a, lang)]) {
        expect(claimHits(s), s).toEqual([]);
        expect(aiTells(s), s).toEqual([]);
        expect(s).not.toMatch(/[ऀ-ॿ]/);
      }
    }
  });
});

describe('the birth screens in the flow', () => {
  const slug = QUIZ_SLUGS['repeating-lessons'];
  const full = screensFor(slug, 'full');

  it('has one screen for how sure the time is and the time itself', () => {
    expect(full.map((s) => s.id).slice(-7)).toEqual(['s10', 's11', 's13', 's14', 's15', 's16', 's17']);
    expect(full.find((s) => s.id === 's12')).toBeUndefined();
    expect(counter(full, 's17')).toEqual({ n: 17, of: 17 });
  });

  it('goes from the date straight to the time screen, and on to the place whether or not a time was given', () => {
    expect(nextScreen(full, 's10', {})?.id).toBe('s11');
    expect(nextScreen(full, 's11', { birth_time_known: 'unknown' })?.id).toBe('s13');
    expect(prevScreen(full, 's13', {})?.id).toBe('s11');
  });

  it('treats the time screen as incomplete until it has a time or an honest "unknown"', () => {
    const base = { hook: 'again', focus_area: 'career', problems: 'career_stuck', frustration: 'vague', picture: 'fort', self_role: 'scholar', goal_12m: 'peace', birth_date: '1990-04-12' };
    expect(firstIncomplete(full, { ...base, birth_time_known: 'exact' }).id).toBe('s11');
    expect(firstIncomplete(full, { ...base, birth_time_known: 'exact', birth_time: '06:30' }).id).toBe('s13');
    expect(firstIncomplete(full, { ...base, birth_time_known: 'unknown' }).id).toBe('s13');
  });
});
