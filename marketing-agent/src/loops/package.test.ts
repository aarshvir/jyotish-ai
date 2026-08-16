import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carouselSlides, defaultCaption, longformOutline, presenterLines } from './package';

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

test('default caption is the spoken scene plus one proof line, not hook+tagline', () => {
  const caption = defaultCaption(
    { hook: 'HR sent two slots.' },
    {
      hook: 'HR sent two slots.',
      shots: [
        { role: 'presenter', dialogue: 'HR sent 10am and 5pm. Same Tuesday. Same call. Not the same hour.' },
        { role: 'presenter_close', dialogue: 'See both windows on VedicHour.com. Free to start.' },
      ],
    },
  );
  assert.match(caption, /HR sent 10am and 5pm/);
  assert.match(caption, /VedicHour\.com/);
  assert.match(caption, /18 hours of your day/i);
  assert.doesNotMatch(caption, /Swiss Ephemeris/i);
  assert.equal(presenterLines({ shots: [{ dialogue: 'One.' }, { vo: 'ignore' }, { dialogue: 'Two.' }] }).join('|'), 'One.|Two.');
});
