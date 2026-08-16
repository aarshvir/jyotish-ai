import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BRAND, BRAND_BRIEF, landingPath } from './brand';

test('ad generation brief never injects engine jargon into prompts as copy to include', () => {
  assert.doesNotMatch(BRAND_BRIEF, /Swiss Ephemeris/i);
  assert.doesNotMatch(BRAND_BRIEF, /Lahiri/i);
  assert.doesNotMatch(BRAND_BRIEF, /vimshottari/i);
  assert.match(BRAND_BRIEF, /NEVER put engine jargon/);
  assert.match(BRAND_BRIEF, /real astronomical data/i);
  assert.match(BRAND_BRIEF, /sample-report/);
});

test('forecast social/ads land on the sample report, not checkout', () => {
  assert.equal(landingPath('forecast'), '/sample-report');
  assert.equal(landingPath('kundali'), '/kundali');
  assert.equal(landingPath('matchmaking'), '/synastry');
  assert.equal(landingPath('free'), BRAND.links.freeKundli);
  assert.doesNotMatch(BRAND.links.freeKundli, /pricing/);
});
