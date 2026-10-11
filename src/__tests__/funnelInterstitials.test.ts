import { describe, it, expect, vi } from 'vitest';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { screensFor, buildScreens, isShown, resolveChoice, chosenLabel, type FunnelAnswers, type Screen } from '@/lib/funnel/screens';
import {
  INTERSTITIALS,
  allInterstitialText,
  buildInterstitial,
  policyLine,
  safetyNote,
  type InterstitialId,
} from '@/lib/funnel/interstitials';
import { LENS_TEXT, PROBLEMS, problemOptions, realProblems, splitCodes } from '@/lib/funnel/problems';
import { containsContactDetails } from '@/components/funnel/TextScreen';
import { sanitizeSessionPayload } from '@/lib/funnel/sessionPayload';
import { h5Hits } from '@/lib/funnel/reveal/lint';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';
import { nextScreen } from '@/lib/funnel/engine';

// Invented answers only — this repository is public.

const slug = QUIZ_SLUGS['repeating-lessons'];
const full = screensFor(slug, 'full');

describe('interstitial truth rules', () => {
  it('every template declares what it rests on', () => {
    for (const id of Object.keys(INTERSTITIALS) as InterstitialId[]) {
      expect(INTERSTITIALS[id].truth.length).toBeGreaterThan(0);
      expect(buildInterstitial(id, { focus_area: 'career' }, 'en').truth).toEqual(INTERSTITIALS[id].truth);
    }
  });

  it('never makes an invented claim, in either language', () => {
    const text = allInterstitialText();
    expect(text.length).toBeGreaterThan(40);
    // The never-say list may be NAMED, but only inside a sentence that refuses it.
    const refuses = /(?:do not|does not|makes? no|never|nahi|koi bhavishyavani)/i;
    for (const s of text) {
      expect(claimHits(s), s).toEqual([]);
      if (h5Hits(s).length) expect(s, 'a banned term outside a refusal').toMatch(refuses);
    }
  });

  it('has none of the words or shapes that read as machine-written', () => {
    for (const s of allInterstitialText()) expect(aiTells(s), s).toEqual([]);
  });

  it('screens Hinglish in Roman script, never Devanagari', () => {
    for (const s of allInterstitialText()) expect(s).not.toMatch(/[ऀ-ॿ]/);
  });
});

describe('the problems question', () => {
  it('offers six specific worries per area plus two honest exits, all with a lens and both languages', () => {
    const seen = new Set<string>();
    for (const [area, list] of Object.entries(PROBLEMS)) {
      expect(list.length, area).toBe(6);
      for (const p of list) {
        expect(seen.has(p.value), p.value).toBe(false);
        seen.add(p.value);
        expect(p.label.en.length).toBeGreaterThan(5);
        expect(p.label.hi.length).toBeGreaterThan(5);
        expect(LENS_TEXT[p.lens]).toBeTruthy();
      }
      const opts = problemOptions(area);
      expect(opts.length).toBe(8);
      expect(opts.map((o) => o.value)).toEqual(expect.arrayContaining(['curious', 'other']));
    }
  });

  it('keeps the options in step with the chosen area', () => {
    const screen = full.find((s) => s.id === 'q_problems') as Extract<Screen, { kind: 'multi' }>;
    const love = resolveChoice(screen, { focus_area: 'love' }).options.map((o) => o.value);
    const trust = resolveChoice(screen, { focus_area: 'trust' }).options.map((o) => o.value);
    expect(love).toContain('love_delay');
    expect(love).not.toContain('tr_betrayed');
    expect(trust).toContain('tr_betrayed');
  });

  it('asks the follow-up only when there is a real choice, and builds it from their own picks', () => {
    const follow = full.find((s) => s.id === 'q_focus') as Extract<Screen, { kind: 'single' }>;
    expect(isShown(follow, { problems: 'career_stuck' })).toBe(false);
    expect(isShown(follow, { problems: 'career_stuck,curious' })).toBe(false);
    expect(isShown(follow, { problems: 'career_stuck,money_leaks' })).toBe(true);
    const r = resolveChoice(follow, { problems: 'career_stuck,money_leaks,money_debt', mind_words: 'x' });
    expect(r.options.map((o) => o.value)).toEqual(['career_stuck', 'money_leaks', 'money_debt', 'other']);
    expect(r.title.en).toBe('Which of these is closest to what you wrote?');
    expect(resolveChoice(follow, { problems: 'career_stuck,money_leaks' }).title.en).toBe('Which of these weighs on you most?');
  });

  it('splits and ignores unknown codes safely', () => {
    expect(splitCodes('a, b,,c')).toEqual(['a', 'b', 'c']);
    expect(splitCodes(undefined)).toEqual([]);
    expect(realProblems(['career_stuck', 'nope', 'curious']).map((p) => p.value)).toEqual(['career_stuck']);
    expect(chosenLabel(full, 'problems', 'money_leaks', 'en')).toBe('Money comes in and goes straight out');
    expect(chosenLabel(full, 'problems', 'money_leaks', 'hi')).toContain('Paisa');
  });
});

describe('the "built for this" interstitial', () => {
  const a: FunnelAnswers = {
    focus_area: 'career',
    problems: 'career_stuck,career_switch,money_leaks',
    frustration: 'vague,upsell,cost',
  };

  it('repeats their own choices and says where each is read from, once per lens', () => {
    const b = buildInterstitial('built', a, 'en');
    const chips = b.blocks.find((x) => x.kind === 'chips');
    expect(chips && chips.kind === 'chips' && chips.items).toEqual(['Career & money']);
    const pairs = b.blocks.filter((x) => x.kind === 'pair');
    // career_stuck and career_switch share the "work" lens, so it is stated once.
    expect(pairs.length).toBe(2);
    expect(pairs[0]).toMatchObject({ head: 'I am stuck in the same role with no growth' });
    expect(JSON.stringify(pairs)).toContain('10th house');
    expect(JSON.stringify(pairs)).toContain('2nd house');
  });

  it('answers each thing that bothered them about astrology with a policy line', () => {
    const lines = buildInterstitial('built', a, 'en').blocks.filter((x) => x.kind === 'line').map((x) => (x.kind === 'line' ? x.text : ''));
    expect(lines.some((l) => l.includes('We do not sell gemstones, pujas or rituals.'))).toBe(true);
    expect(lines.some((l) => l.includes('Nothing is billed by the minute'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Each result starts from something we calculated'))).toBe(true);
  });

  it('says nothing about astrology when nothing bothered them or they are new to it', () => {
    const b = buildInterstitial('built', { ...a, frustration: 'nothing' }, 'en');
    expect(b.blocks.some((x) => x.kind === 'heading')).toBe(false);
    expect(policyLine('nothing', 'en')).toBeNull();
    expect(policyLine('new', 'en')).toBeNull();
  });

  it('falls back to the area itself when the person picked no real worry', () => {
    const b = buildInterstitial('built', { focus_area: 'love', problems: 'curious' }, 'en');
    expect(b.blocks.some((x) => x.kind === 'pair')).toBe(false);
    expect(JSON.stringify(b.blocks)).toContain('7th house');
  });

  it('speaks Hinglish when asked', () => {
    const b = buildInterstitial('built', a, 'hi');
    expect(b.title).toContain('reading');
    expect(JSON.stringify(b.blocks)).toContain('padhe jaate hain');
  });

  it('drops a promise the moment its product fact is no longer true', async () => {
    vi.resetModules();
    vi.doMock('@/lib/funnel/productFacts', () => ({
      PRODUCT_FACTS: { no_gemstone_sales: false, no_puja_sales: true, flat_price_not_per_minute: false, refund_24h: true, no_fear_predictions: true },
      factHolds: (k: string) => ({ no_gemstone_sales: false, no_puja_sales: true, flat_price_not_per_minute: false, refund_24h: true, no_fear_predictions: true } as Record<string, boolean>)[k],
    }));
    const mod = await import('@/lib/funnel/interstitials');
    expect(mod.policyLine('upsell', 'en')).toBeNull();
    expect(mod.policyLine('cost', 'en')).toBeNull();
    expect(mod.policyLine('fear', 'en')).toContain('We do not predict illness');
    vi.doUnmock('@/lib/funnel/productFacts');
    vi.resetModules();
  });
});

describe('the "in your own words" interstitial', () => {
  it('quotes the words back exactly, without interpreting them', () => {
    const b = buildInterstitial('echo', { mind_words: '  I keep  delaying   the move to Pune.  ' }, 'en');
    expect(b.blocks[0]).toEqual({ kind: 'quote', text: 'I keep delaying the move to Pune.' });
    // Nothing in the other blocks mentions the content of what was written.
    const rest = JSON.stringify(b.blocks.slice(1));
    expect(rest).not.toMatch(/Pune|delay|move/i);
  });

  it('only states policy when the words touch something we do not read', () => {
    expect(safetyNote('I want a better job', 'en')).toBeNull();
    expect(safetyNote('My Cancer moon makes me emotional', 'en')).toBeNull();
    expect(safetyNote('my father has cancer', 'en')).toContain('no health predictions');
    expect(safetyNote('my father has cancer', 'hi')).toContain('doctor');
    expect(safetyNote('when will I die', 'en')).toContain('death');
    expect(safetyNote('does he love me or not', 'en')).toContain('your own chart');
    const b = buildInterstitial('echo', { mind_words: 'my father has cancer' }, 'en');
    expect(b.blocks.some((x) => x.kind === 'note')).toBe(true);
  });

  it('is skipped when the person typed nothing, and the follow-up still works', () => {
    const echo = full.find((s) => s.id === 'i_echo')!;
    expect(isShown(echo, {})).toBe(false);
    expect(isShown(echo, { mind_words: '   ' })).toBe(false);
    expect(isShown(echo, { mind_words: 'x' })).toBe(true);
    expect(nextScreen(full, 'q_words', { problems: 'career_stuck' })?.id).toBe('s10');
    expect(nextScreen(full, 'q_words', { problems: 'career_stuck,money_leaks' })?.id).toBe('q_focus');
    expect(nextScreen(full, 'q_words', { mind_words: 'hello', problems: 'career_stuck' })?.id).toBe('i_echo');
  });
});

describe('free text', () => {
  it('refuses contact details but lets dates and ordinary words through', () => {
    expect(containsContactDetails('mail me at asha@example.com')).toBe(true);
    expect(containsContactDetails('call 98765 43210')).toBe(true);
    expect(containsContactDetails('+91 98765-43210 please')).toBe(true);
    expect(containsContactDetails('born on 12-04-1990 and still stuck')).toBe(false);
    expect(containsContactDetails('I have 2 jobs and 3 loans')).toBe(false);
  });

  it('is never sent to our servers with the session', () => {
    const id = '7d3c1f9e-1111-4222-8333-444455556666';
    const p = sanitizeSessionPayload({
      id,
      slug: 'repeating-lessons',
      answers: { focus_area: 'career', problems: 'career_stuck,money_leaks', frustration: 'vague', mind_focus: 'career_stuck', mind_words: 'private words' },
    })!;
    expect(p.row.answers).toEqual({ focus_area: 'career', problems: 'career_stuck,money_leaks', frustration: 'vague', mind_focus: 'career_stuck' });
  });
});

describe('the v2 flow', () => {
  it('puts an interstitial after every few questions', () => {
    const ids = full.map((s) => s.id);
    expect(ids.slice(0, 4)).toEqual(['s01', 's02', 'i_method', 'q_problems']);
    expect(ids.indexOf('i_built')).toBe(ids.indexOf('q_frustration') + 1);
    expect(ids.indexOf('i_echo')).toBe(ids.indexOf('q_words') + 1);
    // No more than four questions in a row without one.
    let run = 0;
    let worst = 0;
    for (const s of full) {
      if (s.kind === 'interstitial') run = 0;
      else if (s.id === 's14') break;
      else worst = Math.max(worst, ++run);
    }
    expect(worst).toBeLessThanOrEqual(6);
  });

  it('keeps every retired question available for old saved answers', () => {
    const all = buildScreens(slug).map((s) => s.id);
    for (const id of ['s03', 's04', 's05']) {
      expect(all).toContain(id);
      expect(full.map((s) => s.id)).not.toContain(id);
    }
  });

  it('has Hinglish for every visible string on every question', () => {
    for (const s of full) {
      if (s.kind === 'single' || s.kind === 'multi' || s.kind === 'text' || s.kind === 'picture') {
        expect(s.title.hi.length, s.id).toBeGreaterThan(3);
        for (const o of 'options' in s ? s.options : []) expect(o.label.hi.length, `${s.id}:${o.value}`).toBeGreaterThan(1);
      }
    }
  });
});
