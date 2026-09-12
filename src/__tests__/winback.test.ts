import { describe, it, expect } from 'vitest';
import {
  classifyQuestion,
  mayAnswer,
  displayFirstName,
  nextSubPeriod,
  winbackChartFrom,
  periodLabel,
  formatDashaDate,
  askedWhen,
  shortQuestion,
  winbackSubject,
  buildWinbackEmail,
  type WinbackChart,
  type WinbackInput,
} from '@/lib/notify/winback';

// Every name and question here is invented or paraphrased. This repository is
// public, so no real user's words or identity may appear in it.

const NOW = new Date('2026-09-12T00:00:00Z');

const chart: WinbackChart = {
  lagna: 'Virgo',
  moonSign: 'Scorpio',
  nakshatra: 'Anuradha',
  mahadasha: 'Rahu',
  antardasha: 'Jupiter',
  subPeriodEnds: '2027-03-14',
  next: { mahadasha: 'Rahu', antardasha: 'Saturn' },
};

const base: WinbackInput = {
  firstName: 'Anjali',
  question: 'When will I get a job?',
  askedAt: '2026-07-10T10:00:00Z',
  chart,
  insight: 'This sub-period favours steady consolidation over sudden moves.',
  offerHref: 'https://www.vedichour.com/resume?t=abc',
  unsubscribeHref: 'https://www.vedichour.com/api/unsubscribe?t=xyz',
  now: NOW,
};

describe('question safety', () => {
  it('refuses health questions, including plural and suffixed forms', () => {
    expect(classifyQuestion('will I be diagnosed with cancer next year')).toBe('medical');
    // "pregnancies" — the plural the first version of the classifier missed.
    expect(classifyQuestion('how many pregnancies will I have')).toBe('medical');
    expect(mayAnswer('medical')).toBe(false);
  });

  it('refuses mortality questions, ahead of medical when both apply', () => {
    expect(classifyQuestion('when will I die')).toBe('mortality');
    expect(classifyQuestion('will my disease kill me')).toBe('mortality');
    expect(mayAnswer('mortality')).toBe(false);
  });

  it('refuses to read the feelings of another person', () => {
    // The "she loves me or not" phrasing slipped past the first version.
    expect(classifyQuestion('I love a girl and need to know if she loves me or not')).toBe('third_party');
    expect(classifyQuestion('does she love me or not')).toBe('third_party');
    expect(classifyQuestion('When is Arjun Mehta likely to text me back?')).toBe('third_party');
    expect(mayAnswer('third_party')).toBe(false);
  });

  it('does not mistake title case, chart terms or job questions for a named person', () => {
    expect(classifyQuestion('When Will I Get Job')).toBe('general');
    expect(classifyQuestion('My Business Growth')).toBe('general');
    expect(classifyQuestion('will they call me for the interview')).toBe('general');
  });

  it('allows ordinary career, money and timing questions', () => {
    expect(classifyQuestion('why is my business not running')).toBe('general');
    expect(classifyQuestion('what is the best profession for me')).toBe('general');
    expect(classifyQuestion('Relationship and career, how will things go this year')).toBe('general');
    expect(mayAnswer('general')).toBe(true);
  });
});

describe('the model insight never reaches an unsafe email', () => {
  for (const [label, question] of [
    ['health', 'will I be diagnosed with cancer'],
    ['third party', 'does she love me or not'],
    ['mortality', 'when will I die'],
  ] as const) {
    it(`withholds it for a ${label} question`, () => {
      const out = buildWinbackEmail({ ...base, question, insight: 'SHOULD_NEVER_APPEAR' });
      expect(out.html).not.toContain('SHOULD_NEVER_APPEAR');
      expect(out.text).not.toContain('SHOULD_NEVER_APPEAR');
    });
  }

  it('uses it for an ordinary question', () => {
    const out = buildWinbackEmail(base);
    expect(out.category).toBe('general');
    expect(out.html).toContain('steady consolidation');
  });
});

describe('names', () => {
  it('fixes shouting and lower case', () => {
    expect(displayFirstName('RAHUL SHARMA')).toBe('Rahul');
    expect(displayFirstName('priya')).toBe('Priya');
  });
  it('leaves deliberate casing and non-Latin names alone', () => {
    expect(displayFirstName('McKenzie')).toBe('McKenzie');
    expect(displayFirstName('राहुल')).toBe('राहुल');
  });
  it('never greets the checkout placeholder or junk', () => {
    expect(displayFirstName('Seeker')).toBe('there');
    expect(displayFirstName('')).toBe('there');
    expect(displayFirstName('123')).toBe('there');
    expect(displayFirstName(null)).toBe('there');
  });
});

describe('dasha arithmetic', () => {
  it('advances to the next sub-period inside the same mahadasha', () => {
    expect(nextSubPeriod('Rahu', 'Jupiter')).toEqual({ mahadasha: 'Rahu', antardasha: 'Saturn' });
  });
  it('rolls into the next mahadasha after its last sub-period', () => {
    // Rahu's sub-periods end with Mars; the Jupiter mahadasha follows, opening Jupiter–Jupiter.
    expect(nextSubPeriod('Rahu', 'Mars')).toEqual({ mahadasha: 'Jupiter', antardasha: 'Jupiter' });
    expect(nextSubPeriod('Ketu', 'Mercury')).toEqual({ mahadasha: 'Venus', antardasha: 'Venus' });
  });
  it('returns null for names it does not recognise', () => {
    expect(nextSubPeriod('Surya', 'Chandra')).toBeNull();
    expect(nextSubPeriod(null, 'Moon')).toBeNull();
  });

  it('prefers real dates from the sequence over arithmetic', () => {
    const c = winbackChartFrom(
      {
        lagna: 'Virgo',
        current: { mahadasha: 'Rahu', antardasha: 'Jupiter', start_date: '2024-06-01', end_date: '2027-03-14' },
        sequence: [
          {
            planet: 'Rahu',
            start_date: '2020-01-01',
            end_date: '2038-01-01',
            antardasha: [
              { planet: 'Jupiter', start_date: '2024-06-01', end_date: '2027-03-14' },
              { planet: 'Saturn', start_date: '2027-03-14', end_date: '2030-01-01' },
            ],
          },
        ],
      },
      NOW,
    );
    expect(c.subPeriodEnds).toBe('2027-03-14');
    expect(c.next).toEqual({ mahadasha: 'Rahu', antardasha: 'Saturn' });
  });

  it('falls back to arithmetic when the sequence carries no sub-periods', () => {
    const c = winbackChartFrom({ current: { mahadasha: 'Rahu', antardasha: 'Jupiter', end_date: '2027-03-14' } }, NOW);
    expect(c.next).toEqual({ mahadasha: 'Rahu', antardasha: 'Saturn' });
  });

  it('drops a sub-period end date that is already in the past', () => {
    const c = winbackChartFrom({ current: { mahadasha: 'Rahu', antardasha: 'Jupiter', end_date: '2025-01-01' } }, NOW);
    expect(c.subPeriodEnds).toBeNull();
  });

  it('labels periods the standard way', () => {
    expect(periodLabel('Rahu', 'Jupiter')).toBe('Rahu–Jupiter');
    expect(periodLabel('Rahu', null)).toBe('Rahu');
    expect(periodLabel(null, null)).toBeNull();
  });
});

describe('subject lines lead with the near-term date', () => {
  it('names the sub-period and when it changes', () => {
    expect(winbackSubject(base)).toBe('Anjali, your Rahu–Jupiter period changes in March 2027');
  });
  it('drops the name rather than greeting "there"', () => {
    expect(winbackSubject({ ...base, firstName: 'there' })).toBe('Your Rahu–Jupiter period changes in March 2027');
  });
  it('degrades when dates or dasha are missing', () => {
    expect(winbackSubject({ ...base, chart: { ...chart, subPeriodEnds: null } })).toBe(
      'Anjali, you are in your Rahu–Jupiter period',
    );
    expect(
      winbackSubject({ ...base, chart: { ...chart, mahadasha: null, antardasha: null, subPeriodEnds: null } }),
    ).toBe('Anjali, about the question you asked us');
  });
  it('carries no invented urgency or discount', () => {
    const s = winbackSubject(base).toLowerCase();
    for (const w of ['% off', 'sale', 'discount', 'hurry', 'last chance', 'expires', 'free']) {
      expect(s).not.toContain(w);
    }
  });
});

describe('the email body', () => {
  it('quotes the person back to themselves', () => {
    expect(buildWinbackEmail(base).html).toContain('When will I get a job?');
  });

  it('says honestly how long ago they asked', () => {
    expect(askedWhen('2026-09-05T00:00:00Z', NOW)).toBe('A few days ago');
    expect(askedWhen('2026-08-01T00:00:00Z', NOW)).toBe('A few weeks ago');
    expect(askedWhen('2026-05-01T00:00:00Z', NOW)).toBe('A while back');
  });

  it('never quotes a currency amount — checkout picks currency by location', () => {
    const { html, text } = buildWinbackEmail(base);
    for (const sym of ['₹', '$', 'AED', '£', '€']) {
      expect(html).not.toContain(sym);
      expect(text).not.toContain(sym);
    }
  });

  it('links to the resume page and states the discount that link really applies', () => {
    const { html } = buildWinbackEmail(base);
    expect(html).toContain('https://www.vedichour.com/resume?t=abc');
    expect(html).toContain('30% off applied');
  });

  it('carries a visible unsubscribe link, not just the header', () => {
    const { html, text } = buildWinbackEmail(base);
    expect(html).toContain('https://www.vedichour.com/api/unsubscribe?t=xyz');
    expect(text).toContain('Unsubscribe: https://www.vedichour.com/api/unsubscribe?t=xyz');
  });

  it('shows the next sub-period alongside the end date', () => {
    expect(buildWinbackEmail(base).html).toContain('then Rahu–Saturn');
  });

  it('escapes HTML in a question rather than injecting it', () => {
    const out = buildWinbackEmail({ ...base, question: 'will <script>alert(1)</script> work' });
    expect(out.html).not.toContain('<script>');
    expect(out.html).toContain('&lt;script&gt;');
  });

  it('shortens a long question on a word boundary', () => {
    const s = shortQuestion(
      'tell me about my career, my studies, my achievements, every month from now until the end of next year, and also my family and my finances',
    );
    expect(s.length).toBeLessThanOrEqual(121);
    expect(s.endsWith('…')).toBe(true);
  });
});

describe('dates', () => {
  it('renders month and year', () => {
    expect(formatDashaDate('2027-03-14')).toBe('March 2027');
  });
  it('does not slip a month back west of Greenwich', () => {
    expect(formatDashaDate('2027-03-01')).toBe('March 2027');
  });
  it('returns null for junk rather than "Invalid Date"', () => {
    expect(formatDashaDate('not-a-date')).toBeNull();
    expect(formatDashaDate(null)).toBeNull();
  });
});
