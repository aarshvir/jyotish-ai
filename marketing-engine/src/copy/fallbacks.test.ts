import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackPack, lintPack } from '../copy/fallbacks';

const cats = ['career', 'family_parents', 'timing_basics', 'marriage', 'money_property', 'product'] as const;

for (const category of cats) {
  test(`fallback pack lint-passes: ${category}`, () => {
    const pack = fallbackPack({
      id: 1,
      slug: `test-${category}`,
      title: 't',
      angle: 'a',
      category,
      score: 1,
    });
    const lint = lintPack(pack);
    assert.notEqual(lint.verdict, 'block', lint.reasons.join('\n'));
  });
}
