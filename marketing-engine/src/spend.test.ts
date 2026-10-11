import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spendDecision } from './spend';

test('zero customers means zero spend', () => {
  const d = spendDecision({ payingCustomers: 0, cacUsd: null, ltvUsd: null, d30Retention: null });
  assert.equal(d.dailyBudgetUsd, 0);
  assert.equal(d.stage, 'hold');
});

test('customers without retention still hold', () => {
  const d = spendDecision({ payingCustomers: 12, cacUsd: 10, ltvUsd: null, d30Retention: null });
  assert.equal(d.dailyBudgetUsd, 0);
});

test('CAC above the stop line stops', () => {
  const d = spendDecision({ payingCustomers: 12, cacUsd: 80, ltvUsd: 90, d30Retention: 0.4 });
  assert.equal(d.stage, 'stop');
  assert.equal(d.dailyBudgetUsd, 0);
});

test('validation budget is capped and still needs a founder tap', () => {
  const d = spendDecision({ payingCustomers: 12, cacUsd: 8, ltvUsd: 120, d30Retention: 0.5 });
  assert.equal(d.stage, 'validate');
  assert.equal(d.dailyBudgetUsd, 20);
  assert.equal(d.requiresFounderApproval, true);
});
