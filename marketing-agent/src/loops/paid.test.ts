/**
 * The ladder is pure, so every rung is provable without Supabase, without a browser, and without
 * an ad account. These tests are the reason a HOLD cannot quietly become a VALIDATE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spendLadder,
  summarizePayments,
  buildMetaCsv,
  buildGoogleCsv,
  campaignStructure,
  STOP_CONDITIONS,
  VALIDATE_GATE,
  SCALE_GATE,
  type CompletedPaymentRow,
} from './paid';

/** A completed Rs 799 sale as `ziina_payments` stores it: 79900 paise. */
const inr = (id: string, rupees: number): CompletedPaymentRow => ({
  id,
  user_id: id,
  report_id: `r-${id}`,
  amount: rupees * 100,
  currency: 'INR',
});

test('zero paying customers is HOLD, whatever else is true', () => {
  const d = spendLadder({ paying: 0, trials: 2146, ltv: null });
  assert.equal(d.status, 'hold');
  assert.equal(d.cacCeiling, null);
  assert.match(d.headline, /HOLD/);
});

test('a big funnel does not buy its way past the gate', () => {
  const d = spendLadder({ paying: VALIDATE_GATE - 1, trials: 100000, ltv: 900, currency: 'INR' });
  assert.equal(d.status, 'hold');
});

test('paying customers with no computable LTV is still HOLD', () => {
  const d = spendLadder({ paying: 12, trials: 400, ltv: null });
  assert.equal(d.status, 'hold');
  assert.match(d.headline, /LTV/);
});

test('an LTV with no currency quotes no ceiling', () => {
  const d = spendLadder({ paying: 40, trials: 400, ltv: 61319.8, currency: null, observedCac: null });
  assert.equal(d.status, 'hold');
  assert.equal(d.cacCeiling, null);
  assert.equal(d.ltv, null, 'an undenominated mean must not be published as an LTV');
  assert.match(d.headline, /no currency/);
});

test('a quoted ceiling always names its currency', () => {
  const validate = spendLadder({ paying: VALIDATE_GATE, trials: 200, ltv: 771, currency: 'INR', observedCac: 200 });
  assert.match(validate.headline, /INR 771\.00/);
  assert.match(validate.reasoning, /INR 385\.50/);
  const stop = spendLadder({ paying: 40, trials: 900, ltv: 771, currency: 'INR', observedCac: 500 });
  assert.match(stop.headline, /INR 500\.00/);
  assert.match(stop.headline, /INR 771\.00/);
});

test('LTV is the price a customer paid, not the stored base-unit amount', () => {
  // Five Indian buyers: Rs 799, Rs 799, Rs 559 (30% off), Rs 899 kundali, Rs 799.
  const s = summarizePayments([inr('u1', 799), inr('u2', 799), inr('u3', 559), inr('u4', 899), inr('u5', 799)]);
  assert.equal(s.paying, 5);
  assert.equal(s.currency, 'INR');
  assert.equal(s.grossRevenue, 3855);
  assert.equal(s.ltv, 771);

  // The ceiling has to be affordable against a Rs 799 product, not a hundred times it.
  const d = spendLadder({ ...s, trials: 2146, observedCac: null });
  assert.equal(d.status, 'validate');
  assert.equal(d.cacCeiling, 385.5);
  assert.ok(d.cacCeiling! < 799, `a CAC ceiling of ${d.cacCeiling} exceeds the price of the product`);
});

test('one person buying twice is one customer with a higher LTV', () => {
  const repeat: CompletedPaymentRow = { ...inr('u1', 899), id: 'p2', report_id: 'r-2' };
  const s = summarizePayments([inr('u1', 799), repeat, inr('u2', 799)]);
  assert.equal(s.paying, 2);
  assert.equal(s.grossRevenue, 2497);
  assert.equal(s.ltv, 1248.5);
});

test('rupees and dollars are never summed into one LTV', () => {
  const s = summarizePayments([
    inr('u1', 799),
    inr('u2', 799),
    inr('u3', 559),
    inr('u4', 899),
    { id: 'p5', user_id: 'u5', report_id: 'r5', amount: 999, currency: 'USD' },
  ]);
  assert.equal(s.paying, 5);
  assert.equal(s.ltv, null, 'a blended rupee+dollar mean is not an LTV');
  assert.equal(s.currency, null);
  assert.equal(s.grossRevenue, null);
  // The per-currency truth is still reported, in major units.
  assert.deepEqual(s.revenueByCurrency, { INR: 3056, USD: 9.99 });

  const d = spendLadder({ ...s, trials: 2146, observedCac: null });
  assert.equal(d.status, 'hold');
  assert.equal(d.cacCeiling, null);
});

test('an amount with no currency code never becomes revenue', () => {
  const s = summarizePayments([
    inr('u1', 799),
    { id: 'p2', user_id: 'u2', report_id: 'r2', amount: 79900, currency: null },
  ]);
  assert.equal(s.paying, 2, 'the customer still counts');
  assert.equal(s.currency, 'INR');
  assert.equal(s.grossRevenue, 799, 'an amount that names no currency is not added to a priced total');
  // Counting the customer without their amount biases LTV DOWN, which tightens the ceiling.
  // A spend gate may err toward spending less; it may never err toward spending more.
  assert.equal(s.ltv, 399.5);
});

test('the gate opens at VALIDATE, not at SCALE', () => {
  const d = spendLadder({ paying: VALIDATE_GATE, trials: 200, ltv: 900, currency: 'INR', observedCac: 200 });
  assert.equal(d.status, 'validate');
  assert.equal(d.cacCeiling, 450); // 0.5 x LTV
});

test('CAC above half of LTV is STOP', () => {
  const d = spendLadder({ paying: 40, trials: 900, ltv: 900, currency: 'INR', observedCac: 500 });
  assert.equal(d.status, 'stop');
});

test('SCALE needs both headroom and volume', () => {
  const headroomOnly = spendLadder({ paying: SCALE_GATE - 1, trials: 900, ltv: 900, currency: 'INR', observedCac: 100 });
  assert.equal(headroomOnly.status, 'validate');
  const both = spendLadder({ paying: SCALE_GATE, trials: 900, ltv: 900, currency: 'INR', observedCac: 100 });
  assert.equal(both.status, 'scale');
  assert.equal(both.cacCeiling, 270); // 0.3 x LTV
});

test('every rung carries the full stop list', () => {
  for (const d of [
    spendLadder({ paying: 0, trials: 0, ltv: null }),
    spendLadder({ paying: 8, trials: 10, ltv: 900, currency: 'INR', observedCac: 100 }),
    spendLadder({ paying: 40, trials: 10, ltv: 900, currency: 'INR', observedCac: 500 }),
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
