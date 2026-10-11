import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { screensFor, isShown, type Screen } from '@/lib/funnel/screens';
import { nextScreen, prevScreen } from '@/lib/funnel/engine';
import { computeReveal } from '@/lib/funnel/reveal/compute';
import { houseFrom, type Sign } from '@/lib/funnel/reveal/astro';
import { dayLabel, firstLook } from '@/lib/funnel/firstLook';
import { leadStatusLine } from '@/lib/funnel/leadClient';
import { suggestEmail, validateConsent } from '@/components/funnel/ConsentFields';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';

// Synthetic charts and invented answers only — this repository is public.

const slug = QUIZ_SLUGS['repeating-lessons'];
const adultAnswers = { birth_date: '1990-04-12' };

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
    dasha_sequence: [{ planet: 'Mercury', start_date: '2024-01-01', end_date: '2041-01-01', antardasha: [] }],
    current_dasha: { mahadasha: 'Mercury', antardasha: 'Venus', start_date: '2026-07-19', end_date: '2028-12-14' },
  };
}
const place = { city: 'Testpur', lat: 26.85, lng: 80.95 };

describe('where the email ask sits (experiment 1)', () => {
  const ids = (s: Screen[]) => s.map((x) => x.id);

  it('shows the first look, then the ask, then the reveal by default', () => {
    expect(ids(screensFor(slug, 'full')).slice(-5)).toEqual(['s14', 's_look', 's15', 's16', 's17']);
  });

  it('asks first, then shows the look, in the other arm', () => {
    expect(ids(screensFor(slug, 'full', 'ask_look')).slice(-5)).toEqual(['s14', 's15', 's_look', 's16', 's17']);
  });

  it('numbers both arms the same: the first look is never a numbered step', () => {
    const a = screensFor(slug, 'full', 'look_ask').filter((s) => s.numbered).length;
    const b = screensFor(slug, 'full', 'ask_look').filter((s) => s.numbered).length;
    expect(a).toBe(b);
  });

  it('skips the ask for a birth date under 18, but still shows the first look', () => {
    const flow = screensFor(slug, 'full');
    const contact = flow.find((s) => s.id === 's15')!;
    const look = flow.find((s) => s.id === 's_look')!;
    expect(isShown(contact, { birth_date: '2015-01-01' })).toBe(false);
    expect(isShown(look, { birth_date: '2015-01-01' })).toBe(true);
    expect(isShown(contact, adultAnswers)).toBe(true);
    expect(nextScreen(flow, 's_look', { birth_date: '2015-01-01' })?.id).toBe('s16');
  });

  it('sends someone arriving from their chart link straight from the calculation to the result', () => {
    const flow = screensFor(slug, 'full');
    const a = { ...adultAnswers, via_link: '1' };
    expect(nextScreen(flow, 's14', a)?.id).toBe('s16');
    expect(prevScreen(flow, 's16', a)?.id).toBe('s13');
  });
});

describe('the first look', () => {
  it('prints the engine values with dates, and the house for their area', () => {
    const r = computeReveal({ chart: chart('Cancer', 'Libra', 'Swati'), timeKnown: true, precision: 'exact', focusArea: 'career', ...place });
    const look = firstLook(r, 'en');
    expect(look.rows.map((x) => x.key)).toEqual(['rising', 'moon', 'period', 'focus']);
    expect(look.rows[0].value).toBe('Cancer');
    expect(look.rows[1].value).toBe('Libra, Swati nakshatra, pada 2');
    expect(look.rows[2].value).toBe('Mercury / Venus, until 14 Dec 2028');
    // Cancer rising: the 10th house is Aries, ruled by Mars, which this chart puts in Gemini, the 12th house from Cancer (Mercury's sign, an enemy of Mars).
    expect(look.rows[3].label).toBe('For career & money');
    expect(look.rows[3].value).toBe("The 10th house is Aries, ruled by Mars, which sits in your 12th house, in an uneasy sign.");
    expect(look.precision).toBe('Birth time: exact');
    expect(look.notes).toEqual([]);
  });

  it('says what it cannot know without a birth time, and never prints a rising sign or dates', () => {
    const r = computeReveal({
      chart: chart('Aries', 'Libra', 'Vishakha'),
      timeKnown: false,
      precision: 'unknown',
      focusArea: 'love',
      ...place,
      window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Scorpio', 'Anuradha') },
    });
    const look = firstLook(r, 'en');
    expect(look.rows[0].value).toBe('Needs your birth time');
    expect(look.rows[1].value).toBe('Libra then Scorpio, Swati to Anuradha nakshatra (it moves during the day)');
    expect(look.rows[2].value).toBe('Needs your exact birth time');
    expect(look.rows[3].value).toContain('(counted from your Moon)');
    expect(JSON.stringify(look.rows)).not.toMatch(/Dec 2028/);
    expect(look.precision).toBe('Birth time: not known');
    expect(look.notes.length).toBeGreaterThan(1);
  });

  it('gives the running period to the month only when the time is rough, and withholds it if the nakshatra could change', () => {
    const rough = computeReveal({
      chart: chart('Cancer', 'Libra', 'Swati'),
      timeKnown: true,
      precision: 'approx',
      ...place,
      window: { before: chart('Cancer', 'Libra', 'Swati'), after: chart('Cancer', 'Libra', 'Swati') },
    });
    expect(firstLook(rough, 'en').rows.find((x) => x.key === 'period')!.value).toBe('Mercury / Venus, until about Dec 2028');
    const edge = computeReveal({
      chart: chart('Cancer', 'Libra', 'Swati'),
      timeKnown: true,
      precision: 'approx',
      ...place,
      window: { before: chart('Cancer', 'Libra', 'Chitra'), after: chart('Cancer', 'Libra', 'Swati') },
    });
    expect(firstLook(edge, 'en').rows.find((x) => x.key === 'period')!.value).toBe('Needs your exact birth time');
    expect(dayLabel('2028-12-14')).toBe('14 Dec 2028');
  });

  it('speaks Hinglish, with no invented claim and no AI tell, in every case', () => {
    const cases = [
      computeReveal({ chart: chart('Cancer', 'Libra', 'Swati'), timeKnown: true, precision: 'exact', focusArea: 'trust', ...place }),
      computeReveal({
        chart: chart('Aries', 'Libra', 'Vishakha'),
        timeKnown: false,
        precision: 'unknown',
        focusArea: 'health',
        ...place,
        window: { before: chart('Aries', 'Libra', 'Swati'), after: chart('Aries', 'Scorpio', 'Anuradha') },
      }),
    ];
    for (const r of cases) {
      for (const lang of ['en', 'hi'] as const) {
        const look = firstLook(r, lang);
        const all = [...look.rows.map((x) => `${x.label}. ${x.value}`), look.precision, look.footer, ...look.notes];
        for (const s of all) {
          expect(claimHits(s), s).toEqual([]);
          expect(aiTells(s), s).toEqual([]);
          expect(s).not.toMatch(/[ऀ-ॿ]/);
        }
      }
    }
    expect(firstLook(cases[0], 'hi').rows[3].value).toContain('ghar');
  });
});

describe('the save step', () => {
  it('suggests, and never forces, a fix for an obvious domain slip', () => {
    expect(suggestEmail('asha@gmial.com')).toBe('asha@gmail.com');
    expect(suggestEmail('ASHA@Yahooo.com')).toBe('asha@yahoo.com');
    expect(suggestEmail('asha@gmail.com')).toBeNull();
    expect(suggestEmail('nonsense')).toBeNull();
  });

  it('needs a real address, and the first box when it is on screen', () => {
    expect(validateConsent({ email: 'nope', service: true }, true, 'en')).toBe('Please check your email address.');
    expect(validateConsent({ email: 'a@b.co', service: false }, true, 'en')).toContain('tick the first box');
    expect(validateConsent({ email: 'a@b.co', service: false }, false, 'en')).toBeNull();
    expect(validateConsent({ email: 'a@b.co', service: true }, true, 'hi')).toBeNull();
    expect(validateConsent({ email: 'x', service: true }, true, 'hi')).toContain('email');
  });

  it('words the result of saving honestly, in both languages', () => {
    expect(leadStatusLine(null, 'en')).toBeNull();
    expect(leadStatusLine({ saved: true, emailed: true, to: 'a***@example.invalid' }, 'en')).toBe('We sent your chart link to a***@example.invalid.');
    expect(leadStatusLine({ saved: true, emailed: false, reason: 'suppressed' }, 'en')).toContain('unsubscribed');
    expect(leadStatusLine({ saved: true, emailed: false, reason: 'dry_run' }, 'en')).toContain('could not send the link');
    expect(leadStatusLine({ saved: false, emailed: false, reason: 'network' }, 'en')).toContain('could not save');
    expect(leadStatusLine({ saved: false, emailed: false, reason: 'minor' }, 'en')).toBeNull();
    expect(leadStatusLine({ saved: true, emailed: true, to: 'a***@example.invalid' }, 'hi')).toContain('bhej diya');
    // Never claims a send that did not happen.
    for (const reason of ['dry_run', 'unconfigured', 'provider_error', 'suppressed', 'no_token']) {
      expect(leadStatusLine({ saved: true, emailed: false, reason }, 'en')).not.toMatch(/we sent/i);
    }
  });
});

describe('what leaves the browser', () => {
  it('never includes the free-text answer or the link marker', async () => {
    const { answersForServer } = await import('@/lib/funnel/leadClient');
    expect(answersForServer({ focus_area: 'career', mind_words: 'private words', via_link: '1', birth_date: '1990-04-12' })).toEqual({ focus_area: 'career', birth_date: '1990-04-12' });
  });
});
