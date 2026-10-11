import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyLearning } from './score';

test('a paid idea gains weight and a reached-but-unpaid idea decays', () => {
  const next = applyLearning(
    [
      { slug: 'win', score: 0.5 },
      { slug: 'lose', score: 0.5 },
      { slug: 'quiet', score: 0.4 },
    ],
    [
      { slug: 'win', paid: 4, reached: 100 },
      { slug: 'lose', paid: 0, reached: 100 },
    ],
  );
  const win = next.find((n) => n.slug === 'win');
  const lose = next.find((n) => n.slug === 'lose');
  const quiet = next.find((n) => n.slug === 'quiet');
  assert.ok(win && lose && quiet);
  assert.ok(win.score > 0.5);
  assert.ok(lose.score < 0.5);
  assert.equal(quiet.score, 0.4);
});
