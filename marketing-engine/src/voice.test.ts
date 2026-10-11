import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lintCopy } from './voice';
import { AD_VARIANTS, ENGLISH_SCRIPT, HINDI_SCRIPT, HINGLISH_SCRIPT } from '../config/pieces';

test('house English script passes the voice lint', () => {
  const r = lintCopy(ENGLISH_SCRIPT, { kind: 'script', lang: 'en' });
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('Hinglish and Hindi are rewrites, not a word-swap', () => {
  const hi = lintCopy(HINGLISH_SCRIPT, { kind: 'script', lang: 'hinglish' });
  const dv = lintCopy(HINDI_SCRIPT, { kind: 'script', lang: 'hi' });
  assert.equal(hi.ok, true, hi.errors.join('; '));
  assert.equal(dv.ok, true, dv.errors.join('; '));
});

test('personal-attribute ad with a fake trial is rejected', () => {
  const bad = AD_VARIANTS.find((a) => a.id === 'rejected-personal');
  assert.ok(bad);
  const r = lintCopy(bad.text, { kind: 'ad', lang: 'en' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /personal-attribute|banned phrase/i.test(e)));
});

test('uniform sentences and slop phrases fail', () => {
  const text = 'Unlock your destiny today. Unlock your destiny today. Unlock your destiny today. Unlock your destiny today.';
  const r = lintCopy(text, { kind: 'script', lang: 'en' });
  assert.equal(r.ok, false);
});
