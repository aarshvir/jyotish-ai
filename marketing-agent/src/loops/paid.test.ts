/**
 * The ladder is pure, so every rung is provable without Supabase, without a browser, and without
 * an ad account. These tests are the reason a HOLD cannot quietly become a VALIDATE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spendLadder,
  buildMetaCsv,
  buildGoogleCsv,
  campaignStructure,
  STOP_CONDITIONS,
  VALIDATE_GATE,
  SCALE_GATE,
} from './paid';

test('zero paying customers is HOLD, whatever else is true', () => {
  const d = spendLadder({ paying: 0, trials: 2146, ltv: null });
  assert.equal(d.status, 'hold');
  assert.equal(d.cacCeiling, null);
  assert.match(d.headline, /HOLD/);
});

test('a big funnel does not buy its way past the gate', () => {
  const d = spendLadder({ paying: VALIDATE_GATE - 1, trials: 100000, ltv: 900 });
  assert.equal(d.status, 'hold');
});

test('paying customers with no computable LTV is still HOLD', () => {
  const d = spendLadder({ paying: 12, trials: 400, ltv: null });
  assert.equal(d.status, 'hold');
  assert.match(d.headline, /LTV/);
});

test('the gate opens at VALIDATE, not at SCALE', () => {
  const d = spendLadder({ paying: VALIDATE_GATE, trials: 200, ltv: 900, observedCac: 200 });
  assert.equal(d.status, 'validate');
  assert.equal(d.cacCeiling, 450); // 0.5 x LTV
});

test('CAC above half of LTV is STOP', () => {
  const d = spendLadder({ paying: 40, trials: 900, ltv: 900, observedCac: 500 });
  assert.equal(d.status, 'stop');
});

test('SCALE needs both headroom and volume', () => {
  const headroomOnly = spendLadder({ paying: SCALE_GATE - 1, trials: 900, ltv: 900, observedCac: 100 });
  assert.equal(headroomOnly.status, 'validate');
  const both = spendLadder({ paying: SCALE_GATE, trials: 900, ltv: 900, observedCac: 100 });
  assert.equal(both.status, 'scale');
  assert.equal(both.cacCeiling, 270); // 0.3 x LTV
});

test('every rung carries the full stop list', () => {
  for (const d of [
    spendLadder({ paying: 0, trials: 0, ltv: null }),
    spendLadder({ paying: 8, trials: 10, ltv: 900, observedCac: 100 }),
    spendLadder({ paying: 40, trials: 10, ltv: 900, observedCac: 500 }),
  ]) {
    assert.deepEqual(d.stopConditions, STOP_CONDITIONS);
    assert.ok(d.stopConditions.length >= 5);
  }
});

test('exports are import sheets, never spend instructions', () => {
  const ads = [{ name: 'a1', primary: 'Some "quoted" copy, with a comma', headline: 'H', description: 'D' }];
  const meta = buildMetaCsv(ads, 'https://www.vedichour.com/sample-report');
  assert.ok(meta.includes('""quoted""'), 'CSV must escape embedded quotes');
  assert.ok(!/budget|bid|spend now/i.test(meta));
  const google = buildGoogleCsv(ads, 'https://www.vedichour.com/sample-report');
  assert.ok(google.includes('VH-Search-Timing'));
});

test('the structure never points an ad at checkout and never leaks birth data', () => {
  const s = campaignStructure(spendLadder({ paying: 0, trials: 0, ltv: null }), 'https://www.vedichour.com/sample-report');
  // The structure legitimately NAMES /pricing and /checkout in order to forbid them, so the
  // assertion has to be about the landing URL itself, not about the word appearing anywhere.
  assert.ok(!/\/pricing|\/checkout/.test(s.meta.landing), s.meta.landing);
  assert.match(s.meta.landing, /\/sample-report/);
  assert.ok(s.capi.neverSend.includes('birth_time'));
  assert.ok(s.capi.neverSend.includes('personal_context'));
  assert.ok(!s.capi.send.some((e) => /birth|context|name/.test(e)));
});
