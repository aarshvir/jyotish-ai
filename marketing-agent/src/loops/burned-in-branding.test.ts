import test from 'node:test';
import assert from 'node:assert/strict';
import { burnedInBrandingHit, type Shot } from './creative';

/**
 * The 2026-09-08 batch lost 5 of 6 variants to a FALSE POSITIVE here: the writer had obeyed the
 * instruction and written a negated list — "No generated text, logos or end card." — but the
 * negation guard only looked back 24 characters, and 26 characters separated "No" from "end card".
 * The writer was punished for being correct, and a 20-minute run produced nothing.
 *
 * These lock both directions: a negated mention (however long the list) passes, a genuine request
 * still fails.
 */

const shot = (visualPrompt: string): Shot =>
  ({ kind: 'presenter', seconds: 4, visualPrompt });

test('a negated LIST passes, however far the banned word sits from the negation', () => {
  // The exact prompt tail that killed the 2026-09-08 batch.
  assert.equal(
    burnedInBrandingHit([shot('Medium close-up, warm window light, he holds the last beat of the decision. No generated text, logos or end card.')]),
    null,
  );
});

test('short negations still pass', () => {
  for (const p of ['A quiet room, no logos anywhere.', 'Street at dusk, without any wordmark.', 'Never a title card in this shot.']) {
    assert.equal(burnedInBrandingHit([shot(p)]), null, p);
  }
});

test('a genuine request is still rejected', () => {
  const hit = burnedInBrandingHit([shot('Close on his face, then the VedicHour logo animates in over the shoulder.')]);
  assert.ok(hit, 'a real branding request must be caught');
  assert.equal(hit.shotIndex, 1);
});

test('an early negation does not excuse a later genuine request', () => {
  const hit = burnedInBrandingHit([
    shot('No generated text in the first half. Then the brand lockup fades up centre frame.'),
  ]);
  assert.ok(hit, 'the second sentence asks for a lockup and must be caught');
});

test('screencap shots are exempt — they record the real site, logo and all', () => {
  const cap: Shot = { kind: 'screencap', seconds: 3, visualPrompt: 'the VedicHour logo in the header' };
  assert.equal(burnedInBrandingHit([cap]), null);
});
