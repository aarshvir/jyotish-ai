import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spendLadder } from '../loops/paid';

test('hold under 5 paying', () => {
  const d = spendLadder(0, 12, 900, null);
  assert.equal(d.status, 'hold');
});

test('validate after 5 paying with LTV', () => {
  const d = spendLadder(6, 40, 900, 200);
  assert.equal(d.status, 'validate');
});

test('stop when CAC is too high', () => {
  const d = spendLadder(8, 40, 900, 500);
  assert.equal(d.status, 'stop');
});
