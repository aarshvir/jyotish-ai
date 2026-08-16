import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeEnvLayers } from './env';

test('marketing-agent/.env wins over process.env placeholders', () => {
  const { env, sources } = mergeEnvLayers([
    { label: 'process.env', env: { FAL_KEY: 'placeholder-from-cloud', SARVAM_API_KEY: '' } },
    { label: '../.env.local', env: { FAL_KEY: 'from-app-local' } },
    { label: 'marketing-agent/.env', env: { FAL_KEY: 'from-canonical-file', SARVAM_API_KEY: 'sarvam-from-file' } },
  ]);
  assert.equal(env.FAL_KEY, 'from-canonical-file');
  assert.equal(sources.FAL_KEY, 'marketing-agent/.env');
  assert.equal(env.SARVAM_API_KEY, 'sarvam-from-file');
  assert.equal(sources.SARVAM_API_KEY, 'marketing-agent/.env');
});

test('empty strings do not count as set', () => {
  const { env, sources } = mergeEnvLayers([
    { label: 'process.env', env: { FAL_KEY: '   ' } },
    { label: 'marketing-agent/.env', env: {} },
  ]);
  assert.equal(env.FAL_KEY, undefined);
  assert.equal(sources.FAL_KEY, undefined);
});

test('process.env is used only when the canonical file omits the key', () => {
  const { env, sources } = mergeEnvLayers([
    { label: 'process.env', env: { YOUTUBE_API_KEY: 'from-process' } },
    { label: 'marketing-agent/.env', env: { FAL_KEY: 'fal' } },
  ]);
  assert.equal(env.FAL_KEY, 'fal');
  assert.equal(env.YOUTUBE_API_KEY, 'from-process');
  assert.equal(sources.YOUTUBE_API_KEY, 'process.env');
});
