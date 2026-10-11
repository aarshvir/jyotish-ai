import { describe, it, expect } from 'vitest';
import { QUIZ_SLUGS, getQuizSlug, revealModeFor } from '@/config/quiz_slugs';
import { FLAG_CONTACT_REQUIRED, FLAG_PRICE_REPORT, assignArm } from '@/config/quiz_flags';
import { screensFor, type FunnelAnswers } from '@/lib/funnel/screens';
import { barFraction, counter, nextScreen, prevScreen, resumeTarget } from '@/lib/funnel/engine';
import { sanitizeSessionPayload } from '@/lib/funnel/sessionPayload';
import { funnelPersonalContext, personalContextFrom } from '@/lib/quiz/personalContext';
import { matchCities, placeFromGeocode } from '@/lib/funnel/cities';

// Invented answers only — this repository is public.

const slug = QUIZ_SLUGS['repeating-lessons'];
const full = screensFor(slug, 'full');
const short = screensFor(slug, 'short');

const birth: FunnelAnswers = {
  birth_date: '1990-04-12',
  birth_time_known: 'exact',
  birth_time: '06:30',
  birth_city: 'Testpur, Somewhere',
  birth_city_lat: '26.85',
  birth_city_lng: '80.95',
};

describe('slug registry', () => {
  it('has every AD_PLAYBOOK slug with an S01 question in English and Hinglish', () => {
    for (const s of ['repeating-lessons', 'known-before', 'stuck-area', 'easy-skill', 'decision-window', 'exact-hour']) {
      const q = getQuizSlug(s);
      expect(q?.s01.en.endsWith('?')).toBe(true);
      expect(q?.s01.hi.length).toBeGreaterThan(5);
    }
    expect(getQuizSlug('constructor')).toBeNull();
    expect(getQuizSlug('nope')).toBeNull();
  });
  it('serves the karmic reveal for timing slugs until the timing reveal exists', () => {
    expect(revealModeFor(QUIZ_SLUGS['exact-hour'])).toBe('karmic');
  });
});

describe('progress', () => {
  it('starts at 2/18 and ends at 18/18 on the full funnel', () => {
    expect(counter(full, 's01')).toEqual({ n: 2, of: 18 });
    expect(counter(full, 's06')).toEqual({ n: 7, of: 18 });
    expect(counter(full, 's17')).toEqual({ n: 18, of: 18 });
  });
  it('never changes the denominator, whatever is answered', () => {
    const dens = new Set(full.filter((s) => s.numbered).map((s) => counter(full, s.id)!.of));
    expect(Array.from(dens)).toEqual([18]);
  });
  it('does not number the extra interstitials, and the bar only moves forward', () => {
    expect(counter(full, 'i_focus')).toBeNull();
    const fr = full.map((s) => barFraction(full, s.id));
    for (let i = 1; i < fr.length; i++) expect(fr[i]).toBeGreaterThan(fr[i - 1]);
  });
  it('short variant (E1) drops S03, S04, S05, S07, S09 and keeps a fixed denominator', () => {
    expect(short.map((s) => s.id)).not.toContain('s03');
    expect(counter(short, 's01')).toEqual({ n: 2, of: 13 });
  });
});

describe('navigation', () => {
  it('skips the birth-time screen when the time is unknown, and back never lands on the calculation', () => {
    const a = { ...birth, birth_time_known: 'unknown' };
    expect(nextScreen(full, 's11', a)?.id).toBe('s13');
    expect(prevScreen(full, 's13', a)?.id).toBe('s11');
    expect(prevScreen(full, 's15', birth)?.id).toBe('s13');
  });
  it('resumes a late screen only when the birth details are complete', () => {
    expect(resumeTarget(full, 's16', { hook: 'again' }).id).toBe('s02');
    expect(resumeTarget(full, 's16', { hook: 'again', focus_area: 'love', ...birth }).id).toBe('s16');
  });
});

describe('flags', () => {
  it('assigns deterministically and never to a switched-off arm', () => {
    const id = '7d3c1f9e-1111-4222-8333-444455556666';
    expect(assignArm(FLAG_CONTACT_REQUIRED, id)).toBe(assignArm(FLAG_CONTACT_REQUIRED, id));
    for (let i = 0; i < 200; i++) expect(assignArm(FLAG_PRICE_REPORT, `s-${i}`)).toBe('199');
  });
  it('splits a 50/50 flag roughly evenly', () => {
    let a = 0;
    for (let i = 0; i < 2000; i++) if (assignArm(FLAG_CONTACT_REQUIRED, `sess-${i}`) === 'A') a++;
    expect(a).toBeGreaterThan(850);
    expect(a).toBeLessThan(1150);
  });
});

describe('session payload', () => {
  const id = '7d3c1f9e-1111-4222-8333-444455556666';
  it('rejects bad ids and slugs', () => {
    expect(sanitizeSessionPayload({ id: 'x', slug: 'a' })).toBeNull();
    expect(sanitizeSessionPayload({ id, slug: 'Bad Slug' })).toBeNull();
  });
  it('keeps only known answers, bounds sizes, and records consent separately', () => {
    const p = sanitizeSessionPayload({
      id,
      slug: 'repeating-lessons',
      answers: { hook: 'again', evil: 'x', birth_city: 'y'.repeat(500) },
      contact: { channel: 'email', value: 'Asha@Example.com', name: 'Asha' },
      consent: true,
      utm: { utm_source: 'meta', other: 'z' },
    })!;
    expect(p.row.answers).toEqual({ hook: 'again', birth_city: 'y'.repeat(160) });
    expect(p.row.contact).toEqual({ channel: 'email', value: 'asha@example.com', name: 'Asha' });
    expect(p.row.marketing_consent).toBe(true);
    expect(p.consentedEmail).toBe('asha@example.com');
    expect(p.row.utm_source).toBe('meta');
    expect('other' in p.row).toBe(false);
  });
  it('does not keep a WhatsApp number without its country code, nor an email lead without consent', () => {
    const p = sanitizeSessionPayload({ id, slug: 'known-before', contact: { channel: 'whatsapp', value: '9876543210' } })!;
    expect(p.row.contact).toBeUndefined();
    const q = sanitizeSessionPayload({ id, slug: 'known-before', contact: { channel: 'email', value: 'a@b.co' } })!;
    expect(q.consentedEmail).toBeNull();
  });
});

describe('every funnel answer reaches personal_context', () => {
  it('writes each answer in words, and marks the picture and role picks as comparison only', () => {
    const text = funnelPersonalContext(
      {
        hook: 'again', focus_area: 'career', known_before: 'instantly', place_home: 'strongly', skills_fears: 'both',
        picture: 'fort', self_role: 'scholar', goal_12m: 'business', ...birth,
      },
      slug,
    );
    expect(text).toContain('Asked "Do the same lessons keep showing up in your life?", I answered: Yes, again and again.');
    expect(text).toContain('Where it repeats most: Career & money.');
    expect(text).toContain('Felt I knew someone before meeting them: Yes, instantly.');
    expect(text).toContain('A place felt like home for no reason: Yes, strongly.');
    expect(text).toContain('Which sounds most like me: Both.');
    expect(text).toContain('What matters most in the next 12 months: Starting a business.');
    expect(text).toContain('Birth time: known exactly.');
    expect(text).toContain('not to read it from: image that pulled me first: Old fort at dusk; role that feels familiar: Scholar / teacher.');
    expect(text.length).toBeLessThanOrEqual(1200);
  });
  it('leaves the /start brief unchanged', () => {
    expect(personalContextFrom({ concern: 'career' })).toBe('What is weighing on me most: Work and money.');
  });
});

describe('city type-ahead', () => {
  it('finds big cities on the first letters and trims geocoder names', () => {
    expect(matchCities('luck')[0].name).toBe('Lucknow');
    expect(matchCities('d').length).toBe(0);
    expect(placeFromGeocode('Sitapur, Sitapur Tehsil, Uttar Pradesh, 261001, India', 27.57, 80.68)).toMatchObject({
      name: 'Sitapur',
      region: 'Uttar Pradesh, India',
    });
  });
});
