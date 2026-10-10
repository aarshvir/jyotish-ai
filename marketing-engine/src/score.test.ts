import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEEDS } from '../config/seeds';
import { rankIdeas } from './score';

test('top idea is the Tuesday slots angle, health stays last', () => {
  const ranked = rankIdeas(SEEDS);
  assert.equal(ranked[0].slug, 'two-slots-same-tuesday');
  assert.equal(ranked[ranked.length - 1].slug, 'health-and-energy');
  assert.ok(ranked[0].score > ranked[1].score);
});
