import { describe, it, expect } from 'vitest';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { funnelPersonalContext, personalContextFrom } from '@/lib/quiz/personalContext';
import { STEPS, type Answers } from '@/lib/quiz/questions';
import { parseSeekerProfile } from '@/lib/personalization/parse';
import { parseEventDate } from '@/lib/personalization/eventDate';
import { hasAnyAnswer, wantsCalm, wantsConcrete, wantsNoSales } from '@/lib/personalization/profile';
import { selectionsOf } from '@/lib/personalization/selections';
import { ASHA_ANSWERS, FUNNEL_ANSWERS, MEERA_ANSWERS, ROHAN_ANSWERS } from '@/lib/personalization/fixtures';

// Invented answers only — this repository is public.

describe('personal_context round trip (/start)', () => {
  it('reads every tapped answer back from the note it was written into', () => {
    const p = parseSeekerProfile(personalContextFrom(ASHA_ANSWERS));
    expect(p.origin).toBe('start');
    expect(p.concern).toBe('career');
    expect(p.area).toBe('career');
    expect(p.detail).toBe('switch');
    expect(p.duration).toBe('years');
    expect(p.prior).toBe('often');
    expect(p.frustrations).toEqual(['vague', 'upsell']);
    expect(p.granularity).toBe('months');
    expect(p.hasEvent).toBe('yes');
    expect(p.eventText).toBe('interview at a new company on 12 November');
    expect(p.timeConfidence).toBe('exact');
  });

  it('reads a named person and what is known of them', () => {
    const p = parseSeekerProfile(personalContextFrom(ROHAN_ANSWERS));
    expect(p.area).toBe('love');
    expect(p.detail).toBe('someone');
    expect(p.partnerName).toBe('Kavya');
    expect(p.partnerKnown).toBe('date');
    expect(p.hasEvent).toBe('soon');
    expect(p.timeConfidence).toBe('approx');
    expect(p.prior).toBe('never');
    expect(p.frustrations).toEqual([]);
  });

  it('every option of every /start question survives the round trip', () => {
    for (const step of STEPS) {
      if (step.kind !== 'single') continue;
      for (const o of step.options) {
        const a: Answers = { [step.field]: o.value };
        const p = parseSeekerProfile(personalContextFrom(a));
        const back: Record<string, unknown> = {
          concern: p.concern,
          duration: p.duration,
          prior: p.prior,
          granularity: p.granularity,
          partner_known: p.partnerKnown,
          birth_time_known: p.timeConfidence,
          has_event: p.hasEvent,
        };
        if (step.field in back) {
          // has_event "yes" and "no" carry no sentence of their own without event_what; "soon" does.
          if (step.field === 'has_event' && o.value !== 'soon') continue;
          expect(back[step.field], `${step.field}=${o.value}`).toBe(o.value);
        } else if (step.field.endsWith('_detail')) {
          expect(p.detail, `${step.field}=${o.value}`).toBe(o.value);
        }
      }
    }
  });

  it('every frustration combination survives, and "nothing" stands alone', () => {
    const f = ['vague', 'fear', 'upsell', 'generic', 'cost'];
    for (let mask = 1; mask < 1 << f.length; mask++) {
      const picked = f.filter((_, i) => mask & (1 << i));
      expect(parseSeekerProfile(personalContextFrom({ concern: 'career', frustration: picked })).frustrations).toEqual(picked);
    }
    expect(parseSeekerProfile(personalContextFrom({ concern: 'career', frustration: ['nothing'] })).frustrations).toEqual(['nothing']);
  });

  it('keeps typed words intact, even with full stops and quotes inside them', () => {
    const a: Answers = {
      concern: 'business',
      has_event: 'yes',
      event_what: 'Mr. Rao signs the lease on 3 October (2nd floor, "Shop 4")',
      partner_name: "D'Souza Jr.",
      prior_question: 'when will the shop do well',
    };
    const p = parseSeekerProfile(personalContextFrom(a));
    expect(p.eventText).toBe('Mr. Rao signs the lease on 3 October (2nd floor, "Shop 4")');
    expect(p.partnerName).toBe("D'Souza Jr.");
    expect(p.priorQuestion).toBe('when will the shop do well');
  });

  it('an empty note is an empty profile, and an unrecognised one is ignored rather than guessed', () => {
    expect(hasAnyAnswer(parseSeekerProfile(''))).toBe(false);
    expect(hasAnyAnswer(parseSeekerProfile(null))).toBe(false);
    expect(hasAnyAnswer(parseSeekerProfile('Please tell me my future. What is weighing on me most: Moon landing.'))).toBe(false);
  });

  it('drops the least important sentence, never half of one, when the note is too long', () => {
    const long = personalContextFrom({ ...ASHA_ANSWERS, prior_question: 'x'.repeat(300), event_what: 'y'.repeat(140) }, 330);
    expect(long.length).toBeLessThanOrEqual(330);
    expect(long.startsWith('What is weighing on me most: Work and money.')).toBe(true);
    expect(long.endsWith('.')).toBe(true);
    expect(parseSeekerProfile(long).concern).toBe('career');
  });

  it('flags what the reader asked for: concrete, calm, no sales', () => {
    const a = parseSeekerProfile(personalContextFrom(ASHA_ANSWERS));
    expect(wantsConcrete(a)).toBe(true);
    expect(wantsNoSales(a)).toBe(true);
    expect(wantsCalm(a)).toBe(false);
    const m = parseSeekerProfile(personalContextFrom(MEERA_ANSWERS));
    expect(wantsCalm(m)).toBe(true);
    expect(wantsConcrete(m)).toBe(true); // "same answer for everyone" counts
  });
});

describe('personal_context round trip (/q funnel)', () => {
  it('reads the funnel answers back, including the question the ad asked', () => {
    const p = parseSeekerProfile(funnelPersonalContext(FUNNEL_ANSWERS, QUIZ_SLUGS['repeating-lessons']));
    expect(p.origin).toBe('funnel');
    expect(p.area).toBe('family');
    expect(p.goal).toBe('peace');
    expect(p.selfRole).toBe('healer');
    expect(p.picture).toBe('temple');
    expect(p.knownBefore).toBe('instantly');
    expect(p.placeHome).toBe('strongly');
    expect(p.skillsFears).toBe('both');
    expect(p.hookAnswer).toBe('again');
    expect(p.timeConfidence).toBe('exact');
    expect(p.labels.hook_question).toBe('Do the same lessons keep showing up in your life?');
  });

  it('works for every slug and every role', () => {
    for (const slug of Object.values(QUIZ_SLUGS)) {
      for (const role of ['scholar', 'warrior', 'merchant', 'healer', 'ruler', 'seeker']) {
        const p = parseSeekerProfile(funnelPersonalContext({ ...FUNNEL_ANSWERS, self_role: role }, slug));
        expect(p.selfRole).toBe(role);
        expect(p.labels.hook_question).toBe(slug.s01.en);
      }
    }
  });
});

describe('the reader’s own words, for the brief', () => {
  it('quotes the option labels and the typed event back', () => {
    const p = parseSeekerProfile(personalContextFrom(ASHA_ANSWERS));
    const s = selectionsOf(p, '2026-11-12');
    const by = Object.fromEntries(s.map((x) => [x.key, x.value]));
    expect(by.concern).toBe('Work and money');
    expect(by.detail).toBe('I am thinking of changing jobs');
    expect(by.event).toBe('“interview at a new company on 12 November” (12 November 2026)');
    expect(by.frustration).toContain('too vague to act on');
    expect(by.time).toBe('known exactly');
  });

  it('is empty for a reader who answered nothing', () => {
    expect(selectionsOf(parseSeekerProfile(''))).toEqual([]);
  });
});

describe('event dates typed in free text', () => {
  const today = '2026-10-11';
  const cases: [string, string | null][] = [
    ['interview on 12 November', '2026-11-12'],
    ['12th Nov', '2026-11-12'],
    ['Nov 12', '2026-11-12'],
    ['signing a lease on 3 October', '2027-10-03'], // already passed this year, so next year
    ['12/11/2026', '2026-11-12'],
    ['12-11-26', '2026-11-12'],
    ['2026-12-01', '2026-12-01'],
    ['3/12', '2026-12-03'],
    ['shop opening next month', '2026-11-10'],
    ['in 2 weeks', '2026-10-25'],
    ['tomorrow', '2026-10-12'],
    ['sometime in March', null],
    ['starting a new shop', null],
    ['31 February', null],
    ['', null],
  ];
  for (const [text, want] of cases) {
    it(`"${text}" → ${want}`, () => expect(parseEventDate(text, today)).toBe(want));
  }
});
