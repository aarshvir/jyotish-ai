import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carouselSlides, longformOutline } from './package';

test('longform outline uses real newlines, not escaped \\n', () => {
  const md = longformOutline(
    { youtubeTitle: 'Your day is not one mood' },
    {
      hook: 'Your day is not one mood',
      shots: [{ role: 'presenter', seconds: 6, dialogue: 'Aapka din ek mood nahi hai.' }],
    },
  );
  assert.equal(md.includes('\\n'), false);
  assert.match(md, /^# YouTube long-form outline/m);
  assert.match(md, /## Cold open\nYour day is not one mood/);
  assert.match(md, /### 1\. presenter/);
  assert.match(md, /vedichour\.com/i);
});

test('carousel always includes a product-proof slide and spoken-site CTA', () => {
  const slides = carouselSlides({ hook: 'Same Tuesday. Two windows.' }, {});
  assert.equal(slides.length, 5);
  assert.equal(slides[2].title, 'The proof');
  assert.match(slides[2].body, /18 hour-slots/i);
  assert.match(slides[4].body, /VedicHour\.com/);
});
