/**
 * Carousel composition is browser-free and deterministic, so every rule that matters is checked
 * here — before Chromium launches, and without one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlides, buildCaption, usableLines, visibleText, MIN_SLIDES, MAX_SLIDES } from './carousel';
import { jargonHits } from '../policy/linter';
import { headlineSize, slideHtml } from '../render/carousel';

const creative = {
  slug: 'test-creative',
  hook: 'Your day isn\'t one mood. It\'s 18.',
  title: 'The 18 planetary hours',
  shots: [
    { role: 'presenter', dialogue: 'Aapka din ek mood nahi hai.' },
    { role: 'broll_hero', vo: 'Some windows are clearer, some heavier.' },
    { role: 'product', vo: 'We compute all eighteen with the Swiss Ephemeris and Lahiri ayanamsa.' },
    { role: 'broll', vo: 'Plain English. No jargon. Just when to act, and when to wait.' },
  ],
  publish: { hashtags: ['#vedichour', '#hora', 'notahashtag'] },
};

test('jargon lines are dropped, never rewritten', () => {
  const lines = usableLines(creative);
  assert.ok(!lines.some((l) => /swiss ephemeris|ayanamsa|lahiri/i.test(l)), 'jargon line survived');
  assert.ok(lines.includes('Aapka din ek mood nahi hai.'));
  assert.equal(lines.length, 3);
});

test('deck is 6-8 slides and ends on the close card', () => {
  const slides = buildSlides(creative);
  assert.ok(slides.length >= MIN_SLIDES && slides.length <= MAX_SLIDES, `got ${slides.length} slides`);
  const last = slides[slides.length - 1];
  assert.equal(last.kind, 'close');
  assert.equal(last.canvas, 'night');
  assert.match(last.headline, /vedichour\.com/i);
  assert.match(last.footnote ?? '', /reflection and planning/i);
});

test('a thin creative still reaches the minimum', () => {
  const slides = buildSlides({ hook: 'One line only.', shots: [] });
  assert.ok(slides.length >= MIN_SLIDES, `got ${slides.length}`);
  assert.equal(slides[slides.length - 1].kind, 'close');
});

test('nothing visible to a stranger carries ad-copy jargon', () => {
  const slides = buildSlides(creative);
  const { caption } = buildCaption(creative, 'test-creative');
  assert.deepEqual(jargonHits(visibleText(slides, caption)), []);
});

test('caption carries the sample-report link, never checkout', () => {
  const { caption, link, hashtags } = buildCaption(creative, 'test-creative');
  assert.match(link, /\/sample-report/);
  assert.ok(!/\/pricing|\/checkout/.test(caption), 'caption must not link to pricing/checkout');
  assert.match(caption, /reflection and planning/i);
  assert.deepEqual(hashtags, ['#vedichour', '#hora']);
});

test('headline sizes shrink as copy grows', () => {
  assert.ok(headlineSize('Short hook') > headlineSize('x'.repeat(120)));
});

test('slide HTML escapes and never emits mono or uppercase micro-labels', () => {
  const html = slideHtml({ kind: 'story', canvas: 'paper', kicker: 'a & b', headline: '<script>', body: '' }, 2, 7);
  assert.ok(html.includes('a &amp; b'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!/font-family:'JetBrains Mono|monospace/.test(html), 'no mono per docs/DESIGN_SYSTEM.md');
  assert.ok(!/text-transform:\s*uppercase/.test(html), 'no uppercase micro-labels');
  assert.ok(html.includes('2 / 7'));
});
