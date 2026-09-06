import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCaptureAllowed } from './capture';

test('allows sample report', () => {
  assert.doesNotThrow(() => assertCaptureAllowed('https://www.vedichour.com/sample-report'));
});

test('refuses pricing', () => {
  assert.throws(() => assertCaptureAllowed('https://www.vedichour.com/pricing'));
});

test('refuses onboard', () => {
  assert.throws(() => assertCaptureAllowed('https://www.vedichour.com/onboard?plan=free'));
});
