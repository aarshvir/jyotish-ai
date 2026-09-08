/**
 * Reddit is off unless an explicit commercial licence is asserted. This is a legal gate, not a
 * tuning knob, so it gets a test that fails loudly if someone flips the default back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redditEnabled, REDDIT_SKIP_REASON } from './sense';

test('Reddit is OFF unless REDDIT_COMMERCIAL_LICENSE is exactly 1', () => {
  assert.equal(redditEnabled({}), false, 'unset must mean off');
  assert.equal(redditEnabled({ REDDIT_COMMERCIAL_LICENSE: '' }), false);
  assert.equal(redditEnabled({ REDDIT_COMMERCIAL_LICENSE: '0' }), false);
  assert.equal(redditEnabled({ REDDIT_COMMERCIAL_LICENSE: 'true' }), false, 'truthy strings must not open a legal gate');
  assert.equal(redditEnabled({ REDDIT_COMMERCIAL_LICENSE: '1' }), true);
});

test('the skip reason cites the term it is honouring', () => {
  assert.match(REDDIT_SKIP_REASON, /Developer Terms/);
  assert.match(REDDIT_SKIP_REASON, /PLATFORM_POLICY/);
});
