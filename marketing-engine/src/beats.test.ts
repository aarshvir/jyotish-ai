import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { REEL_BEATS, ENGLISH_SCRIPT } from '../config/beats';
import { REPO_ROOT } from './paths';
import { lintCopy } from './voice';

test('spoken hours are the Monday sample, and the voice file is not a formant synth', () => {
  const sample = readFileSync(`${REPO_ROOT}/src/components/landing/sampleData.ts`, 'utf8');
  const pairs = [
    ['09:00–10:00', '94'],
    ['12:00–13:00', '49'],
    ['17:00–18:00', '98'],
  ] as const;
  for (const [label, score] of pairs) {
    assert.match(sample, new RegExp(`label: '${label}'[^\\n]*score: ${score}`));
    const beat = REEL_BEATS.find((b) => b.shot.kind === 'hour' && b.shot.label === label);
    assert.ok(beat, label);
    assert.match(beat.line, new RegExp(score));
    assert.equal(beat.shot.kind === 'hour' && beat.shot.score, Number(score));
  }
  assert.match(sample, /sampleDayLabel: 'Monday · Bangalore'/);
  assert.match(ENGLISH_SCRIPT, /Monday/);
  assert.match(ENGLISH_SCRIPT, /70/);
  assert.doesNotMatch(ENGLISH_SCRIPT, /Tuesday|best hour|espeak|free trial/i);
  const speak = readFileSync(new URL('./media/speak.ts', import.meta.url), 'utf8');
  assert.equal(/espeak/i.test(speak), false);
  const lint = lintCopy(ENGLISH_SCRIPT, { kind: 'script', lang: 'en' });
  assert.equal(lint.ok, true, lint.errors.join('; '));
});
