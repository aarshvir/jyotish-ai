/**
 * The ask-reel pre-flight is browser-free and deterministic, so every rule that matters is checked
 * here, before Chromium or ffmpeg is ever started. A bad idea must be refused at $0.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caption, loadAskReelConfig, preflightAskReel, visibleCopy, type AskReelConfig, type AskReelSpec } from './askreel';
import { FORBIDDEN_CAPTURE, resolveCapture } from '../render/capture-policy';
import { TIMELINE, cardHtml, totalSeconds, MAX_REEL_SECONDS } from '../render/askreel';

const cfg: AskReelConfig = loadAskReelConfig();
const good: AskReelSpec = cfg.reels[0];
const withSpec = (patch: Partial<AskReelSpec>): AskReelSpec => ({ ...good, ...patch });
const problemsFor = (patch: Partial<AskReelSpec>, c: AskReelConfig = cfg) => preflightAskReel(c, withSpec(patch));

test('every reel idea we ship passes the pre-flight', () => {
  assert.ok(cfg.reels.length >= 6, 'expected at least six ideas');
  assert.equal(new Set(cfg.reels.map((r) => r.slug)).size, cfg.reels.length, 'slugs must be unique');
  for (const spec of cfg.reels) assert.deepEqual(preflightAskReel(cfg, spec), [], `${spec.slug} should be clean`);
});

test('only timing questions are allowed: VedicHour answers WHEN, never whether', () => {
  for (const q of ['Is she right for me?', 'Should I leave my job?', 'Will I get the offer?', 'Does he love me?']) {
    const p = problemsFor({ questions: [q, good.questions[1]] });
    assert.ok(p.some((x) => /not a timing question/.test(x)), `"${q}" should be refused`);
  }
  for (const q of ['When should I sign?', 'Which hour for the call?', 'Which day to launch?', 'What time should I leave?']) {
    assert.deepEqual(problemsFor({ questions: [q, good.questions[1]] }), [], `"${q}" should pass`);
  }
});

test("another person's feelings, health, death, pregnancy and money bets are refused even when phrased as timing", () => {
  const unsafe = [
    'When will she cheat on me?',
    'When will my husband stop loving me?',
    'Which day will I get pregnant?',
    'When should I start chemotherapy for cancer?',
    'Which hour to buy crypto?',
    'When will my father die?',
    'Which day to invest in stocks?',
  ];
  for (const q of unsafe) {
    const p = problemsFor({ questions: [q, good.questions[1]] });
    assert.ok(p.some((x) => /never speculates/.test(x)), `"${q}" should be refused for topic`);
  }
});

test('competitors are never named in our own content', () => {
  for (const name of ['Melooha', 'AstroTalk', 'Astroyogi', 'AstroSage', 'Prokerala', 'Co-Star']) {
    assert.ok(problemsFor({ hook: `Better than ${name}` }).some((x) => /names a competitor/.test(x)), name);
  }
});

test('no prices, promo codes or the retired free-report promises', () => {
  for (const bad of ['Only ₹999 a month', 'Just $14.99', '30% off today', 'Use NEWUSER30', 'Get your free report', 'Ask your free question']) {
    assert.ok(problemsFor({ hook: bad }).some((x) => /price, promo or retired offer/.test(x)), bad);
  }
});

test('ad-copy jargon is a hard block', () => {
  const p = problemsFor({ hook: 'Computed with the Swiss Ephemeris and Lahiri' });
  assert.ok(p.some((x) => /jargon/.test(x)));
});

test('a card must fit: hook, question and slug limits', () => {
  assert.ok(problemsFor({ hook: 'x'.repeat(61) }).some((x) => /hook is 61 characters/.test(x)));
  assert.ok(problemsFor({ questions: ['When ' + 'a'.repeat(50) + '?', good.questions[1]] }).some((x) => /question 1 is/.test(x)));
  assert.ok(problemsFor({ slug: 'Bad Slug!' }).some((x) => /slug/.test(x)));
  assert.ok(problemsFor({ questions: [good.questions[0]] as unknown as [string, string] }).some((x) => /exactly two questions/.test(x)));
});

test('the caption carries the disclaimer and a tracked link to the free calculator, and no retired code', () => {
  const { text, link } = caption(cfg, good);
  assert.match(text, /For reflection and planning only/);
  assert.match(link, /\/lagna-calculator\?/);
  assert.equal(new URL(link).searchParams.get('utm_campaign'), 'ask_reel');
  assert.equal(new URL(link).searchParams.get('utm_content'), good.slug);
  assert.doesNotMatch(text, /NEWUSER30|\/onboard|\/pricing|checkout/i);
  assert.doesNotMatch(visibleCopy(cfg, good, text), /18 planetary hours|all 18 horas/i);
});

test('the proof shot is the report, never pricing, checkout or onboarding', () => {
  const target = resolveCapture('hour slot report window');
  assert.doesNotMatch(target.url, FORBIDDEN_CAPTURE);
  assert.match(target.url, /sample-report|\/$/);
});

test('the reel is the length it claims: 16 seconds, inside the 20 second ceiling', () => {
  assert.equal(totalSeconds(), 16.2);
  assert.ok(totalSeconds() <= MAX_REEL_SECONDS);
  assert.ok(TIMELINE.proof >= 5, 'the real report needs time to be seen');
});

test('cards escape their text, and the second question only shows on the second card', () => {
  const copy = {
    hook: 'Tom & <b>Jerry</b>',
    questions: [good.questions[0], good.questions[1]] as [string, string],
    reveal: cfg.reveal,
    endCard: cfg.endCard,
    disclaimer: 'd',
  };
  assert.doesNotMatch(cardHtml('hook', copy), /<b>Jerry/);
  assert.match(cardHtml('hook', copy), /Tom &amp; &lt;b&gt;Jerry/);
  assert.match(cardHtml('q1', copy), /visibility:hidden[^>]*>[^<]*When should I send/);
  assert.match(cardHtml('q2', copy), /visibility:visible[^>]*>[^<]*When should I send/);
  assert.match(cardHtml('end', copy), /vedichour\.com/);
});

import { mergeTargets, resolveCapture as resolve2, DEFAULT_CAPTURE_TARGETS } from '../render/capture-policy';
import { HOUR_LABEL } from './askreel';
import { computeProofWindow, type Measure } from '../render/reportMeasure';

// A realistic fixture: the sample report on 2026-10-12, after a long reading grew above the hour cards.
const LABELS = ['6 – 7 am', '7 – 8 am', '8 – 9 am', '9 – 10 am', '10 – 11 am', '12 – 1 pm', '1 – 2 pm', '2 – 3 pm', '3 – 4 pm', '4 – 5 pm', '5 – 6 pm', '6 – 7 pm', '7 – 8 pm', '8 – 9 pm', '9 – 10 pm', '10 – 11 pm'];
const measure = (over: Partial<Measure> = {}): Measure => ({
  cards: LABELS.map((label, i) => ({ label, y: 33586 + i * 880 })),
  danger: [
    { text: 'Pricing', y: 120 },
    { text: 'Compare full reports', y: 52000 },
    { text: 'Subscribe', y: 53100 },
  ],
  pageHeightPx: 65016,
  ...over,
});

test('the scroll window is measured from the live page and ends on the chosen hour card', () => {
  const m = measure();
  const w = computeProofWindow(m, '5 - 6 pm', 2);
  const focus = m.cards.find((c) => c.label === '5 – 6 pm')!;
  assert.equal(w.focusLabel, '5 – 6 pm', 'a plain hyphen in the config matches the en dash the page prints');
  assert.equal(w.focusTopPx, focus.y - 70);
  assert.equal(w.endPx, focus.y - 70 - 160);
  assert.equal(w.startPx, m.cards.find((c) => c.label === '3 – 4 pm')!.y - 70 - 40);
  assert.ok(w.startPx < w.endPx);
  assert.ok(w.endPx + 1920 < (w.dangerTopPx as number), 'the last frame must stay above the pricing block');
  assert.equal(w.dangerTopPx, 52000, 'the pricing block is the first risky element BELOW the cards, not the navbar link');
});

test('it follows the page when the page moves (same logic, different rows)', () => {
  const moved = measure({ cards: LABELS.map((label, i) => ({ label, y: 2348 + i * 566 })), danger: [{ text: 'Now do this', y: 12753 }] });
  const w = computeProofWindow(moved, '5 - 6 pm', 2);
  assert.ok(w.endPx + 1920 < 12753);
  assert.ok(w.startPx >= 2348 - 400);
});

test('it refuses to film when it cannot be sure of what is on screen', () => {
  assert.throws(() => computeProofWindow(measure(), '11 - 12 am', 2), /is not on the sample report/);
  assert.throws(() => computeProofWindow(measure({ cards: [] }), '5 - 6 pm', 2), /hour cards/);
  // The pricing block is too close: the last frame would show it.
  const tight = measure({ danger: [{ text: 'Subscribe', y: 33586 + 10 * 880 + 400 }] });
  assert.throws(() => computeProofWindow(tight, '5 - 6 pm', 2), /past the pricing block|refusing to film/);
  // A risky element inside the window itself.
  const inside = measure({ danger: [{ text: 'Start with the quiz', y: 33586 + 9 * 880 }] });
  assert.throws(() => computeProofWindow(inside, '5 - 6 pm', 2), /sits inside the scroll window/);
});

test('the config names a real hour card and a small lead-in', () => {
  assert.match(cfg.proof.focus, HOUR_LABEL);
  assert.ok(Number.isInteger(cfg.proof.cardsBefore) && cfg.proof.cardsBefore >= 0 && cfg.proof.cardsBefore <= 4);
  for (const bad of [{ focus: 'midnight', cardsBefore: 2 }, { focus: '5 - 6 pm', cardsBefore: 9 }, { focus: '5 - 6 pm', cardsBefore: 1.5 }]) {
    assert.ok(preflightAskReel({ ...cfg, proof: bad }, good).some((x) => /proof\./.test(x)), JSON.stringify(bad));
  }
  assert.ok(preflightAskReel({ ...cfg, proof: undefined as never }, good).some((x) => /proof\.focus/.test(x)));
});

test('a configured capture target can change its scroll limits but never silently drop them', () => {
  const builtin = DEFAULT_CAPTURE_TARGETS.find((t) => t.key === 'sample_report_page')!;
  assert.ok(builtin.scrollPx !== undefined && builtin.panToPx !== undefined, 'the built-in target carries measured limits');
  // The shape of the config entry that caused the 2026-10-12 breach: no limits at all.
  const merged = mergeTargets([{ key: 'sample_report_page', keywords: ['hour'], path: '/sample-report' }]);
  assert.equal(merged[0].scrollPx, builtin.scrollPx);
  assert.equal(merged[0].panToPx, builtin.panToPx);
  // An explicit limit in the config wins.
  const own = mergeTargets([{ key: 'sample_report_page', keywords: ['hour'], path: '/sample-report', scrollPx: 5000, panToPx: 6000 }]);
  assert.equal(own[0].scrollPx, 5000);
  assert.equal(own[0].panToPx, 6000);
  // A key the code does not know is passed through untouched.
  assert.deepEqual(mergeTargets([{ key: 'new_page', keywords: [], path: '/x' }])[0], { key: 'new_page', keywords: [], path: '/x' });
});

test('the report capture the engine resolves today stops before the pricing block', () => {
  const t = resolve2('hour slot report window');
  assert.ok(t.panToPx !== undefined && t.panToPx < 12753, `pan would end at ${t.panToPx}`);
  assert.ok(t.scrollPx !== undefined && t.scrollPx >= 2000);
});
