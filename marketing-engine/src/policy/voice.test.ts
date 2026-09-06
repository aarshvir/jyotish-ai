import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVoice } from './voice';

test('blocks AI tics', () => {
  const r = lintVoice(
    'In today\'s fast-paced world you must unlock your potential at 4pm on Tuesday with HR. Elevate your journey. Leverage the tapestry.',
    { context: 'ad' },
  );
  assert.equal(r.verdict, 'block');
  assert.ok(r.reasons.some((x) => /AI-tic/i.test(x)));
});

test('blocks guaranteed outcomes', () => {
  const r = lintVoice('This hour is guaranteed to get you the job at 4pm Tuesday.', { context: 'ad' });
  assert.equal(r.verdict, 'block');
});

test('blocks Meta personal-attribute ads', () => {
  const r = lintVoice('Are you struggling in your marriage at 9pm? VedicHour knows.', { context: 'ad' });
  assert.equal(r.verdict, 'block');
});

test('blocks jargon in ads', () => {
  const r = lintVoice('Computed with Swiss Ephemeris at 4:10 on Tuesday in Andheri.', { context: 'ad' });
  assert.equal(r.verdict, 'block');
});

test('passes a specific human script', () => {
  const r = lintVoice(
    'HR mailed at 9:47. I replied at 4:10. Same mail. The text did not change. The hour did. VedicHour rates the eighteen hours of your actual Tuesday against your own chart. 9 was heavy. 4 to 5 was clearer. I waited. For reflection, not certainty.',
    { context: 'ad' },
  );
  assert.equal(r.verdict, 'pass', r.reasons.join('; '));
  assert.ok(r.stats.hasConcrete);
});
