import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cheapTropeHits } from './cheap-tropes';

test('blocks spinning-mandala / fake-proof prompts', () => {
  const hits = cheapTropeHits(
    'A rotating gold mandala over a neon purple nebula',
    'Join 10k users — five-star reviews',
  );
  assert.ok(hits.includes('mandala'));
  assert.ok(hits.includes('neon purple'));
  assert.ok(hits.includes('10k users'));
  assert.ok(hits.includes('five-star'));
});

test('allows presenter + report language', () => {
  const hits = cheapTropeHits(
    'Late-20s Indian man in a navy room. Cut to the VedicHour hourly grid on a phone.',
    'Free kundli, then unlock your hours. vedichour.com',
  );
  assert.equal(hits.length, 0);
});
