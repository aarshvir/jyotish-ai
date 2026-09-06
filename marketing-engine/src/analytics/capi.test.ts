import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAnalyticsSafe, buildCapiBody } from './capi';

test('refuses birth fields', () => {
  assert.throws(() => assertAnalyticsSafe({ birth_date: '1990-01-01' }));
});

test('builds a clean trial event', () => {
  const body = buildCapiBody({ name: 'trial_start', event_id: 'abc', utm: { utm_campaign: 'hr-mail' } });
  assert.equal((body as { event_name: string }).event_name, 'trial_start');
});
