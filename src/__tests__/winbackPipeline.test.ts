import { describe, it, expect } from 'vitest';
import { acceptInsight, insightRejection, isInternalEmail } from '@/lib/notify/winbackPipeline';
import type { WinbackChart } from '@/lib/notify/winback';

// All names and wording here are invented. This repository is public.

const NOW = new Date('2026-09-12T00:00:00Z');

const chart: WinbackChart = {
  lagna: 'Aquarius',
  moonSign: 'Cancer',
  nakshatra: 'Pushya',
  mahadasha: 'Rahu',
  antardasha: 'Jupiter',
  subPeriodEnds: '2027-03-14',
  next: { mahadasha: 'Rahu', antardasha: 'Saturn' },
};

describe('acceptInsight — the last gate before a model reading reaches an inbox', () => {
  it('accepts a clean reading that uses only the date it was given', () => {
    const t = 'Your Rahu–Jupiter period, running until March 2027, favours patient groundwork over sudden leaps.';
    expect(acceptInsight(t, chart, NOW)).toBe(t);
  });

  it('accepts the current year', () => {
    const t = 'The rest of 2026 rewards steady effort in this period.';
    expect(acceptInsight(t, chart, NOW)).toBe(t);
  });

  it('rejects a year it was never given — that is an invented date', () => {
    expect(acceptInsight('Expect a breakthrough by 2031.', chart, NOW)).toBe('');
  });

  it('rejects drift into health', () => {
    expect(acceptInsight('This period may bring a risk of illness, so rest.', chart, NOW)).toBe('');
  });

  it('rejects claims about someone else’s feelings', () => {
    expect(acceptInsight('Your chart suggests she loves you deeply.', chart, NOW)).toBe('');
  });

  it('does not treat a Cancer Moon as a diagnosis', () => {
    const t = 'With your Moon in Cancer, you steady yourself through close ties before acting.';
    expect(acceptInsight(t, chart, NOW)).toBe(t);
  });

  it('does not mistake chart vocabulary for a person’s name', () => {
    const t = 'Your Aquarius Ascendant and a Uttara Bhadrapada influence lean towards structured, technical work.';
    expect(acceptInsight(t, chart, NOW)).toBe(t);
  });

  it('strips wrapping quotes the model sometimes adds', () => {
    expect(acceptInsight('"Patience serves you in this period."', chart, NOW)).toBe('Patience serves you in this period.');
  });

  it('rejects empty and runaway output', () => {
    expect(acceptInsight('', chart, NOW)).toBe('');
    expect(acceptInsight('word '.repeat(300), chart, NOW)).toBe('');
  });
});

describe('insightRejection — a skipped person is never a mystery', () => {
  it('returns null for a reading that may be sent', () => {
    expect(insightRejection('Patience serves you in this period.', chart, NOW)).toBeNull();
  });

  it('names the invented year', () => {
    expect(insightRejection('Expect a breakthrough by 2031.', chart, NOW)).toBe(
      'the reading named a year it was never given (2031)',
    );
  });

  it('names the topic it drifted into', () => {
    expect(insightRejection('This period may bring a risk of illness.', chart, NOW)).toBe(
      'the reading drifted into health',
    );
    expect(insightRejection('Your chart suggests she loves you deeply.', chart, NOW)).toBe(
      "the reading drifted into another person's feelings or actions",
    );
  });

  it('says when the reading was empty or too long', () => {
    expect(insightRejection('', chart, NOW)).toBe('the reading came back empty');
    expect(insightRejection('word '.repeat(300), chart, NOW)).toBe('the reading was too long');
  });
});

describe('isInternalEmail', () => {
  it('excludes staff, fixtures and example addresses', () => {
    expect(isInternalEmail('admin@vedichour.com')).toBe(true);
    expect(isInternalEmail('e2e-runner-3@somewhere.test')).toBe(true);
    expect(isInternalEmail('someone@example.com')).toBe(true);
  });

  it('keeps real-looking customer addresses', () => {
    expect(isInternalEmail('reader@gmail.com')).toBe(false);
  });

  it('honours INTERNAL_EMAILS without hardcoding anyone in the repo', () => {
    const prev = process.env.INTERNAL_EMAILS;
    process.env.INTERNAL_EMAILS = 'owner@personal.test, Tester@Mail.test';
    try {
      expect(isInternalEmail('owner@personal.test')).toBe(true);
      expect(isInternalEmail('tester@mail.test')).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.INTERNAL_EMAILS;
      else process.env.INTERNAL_EMAILS = prev;
    }
  });
});
