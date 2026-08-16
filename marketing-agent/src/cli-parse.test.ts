import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from './cli-parse';

test('boolean --estimate does not swallow the following slug', () => {
  const r = parse(['--estimate', 'the-18-hours-presenter']);
  assert.equal(r.flags.estimate, 'true');
  assert.equal(r.pos[0], 'the-18-hours-presenter');
  assert.equal(r.text, 'the-18-hours-presenter');
});

test('slug then --estimate still sets the flag', () => {
  const r = parse(['same-tuesday-two-windows', '--estimate']);
  assert.equal(r.flags.estimate, 'true');
  assert.equal(r.text, 'same-tuesday-two-windows');
});

test('value flags still consume the next token', () => {
  const r = parse(['--count', '3', '--tier', 'smart', 'hello']);
  assert.equal(r.flags.count, '3');
  assert.equal(r.flags.tier, 'smart');
  assert.equal(r.text, 'hello');
});

test('--dry --keep --resume --skip-sense --allow-paid are booleans', () => {
  const r = parse(['--dry', 'a-slug', '--keep', '--resume', '--skip-sense', '--allow-paid']);
  assert.equal(r.flags.dry, 'true');
  assert.equal(r.flags.keep, 'true');
  assert.equal(r.flags.resume, 'true');
  assert.equal(r.flags['skip-sense'], 'true');
  assert.equal(r.flags['allow-paid'], 'true');
  assert.equal(r.text, 'a-slug');
});
