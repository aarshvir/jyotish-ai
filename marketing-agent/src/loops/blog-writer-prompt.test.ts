import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blogPrompt } from './blog';
import type { Topic } from './blog-topics';

const TOPIC: Topic = {
  slug: '2026-fresher-job-hunt-use-your-chart-timing',
  title: "The 2026 Fresher Job Market Is Genuinely Tough — Here Is How to Use Your Chart's Timing While You Hunt",
  product: 'forecast',
  angle: 'Read the current period to pick the weeks for applications and the weeks for preparation.',
  keywords: ['fresher job market 2026', 'job hunting timing astrology'],
};

test('the writer prompt draws the outcome line with the exact sentences that got an article blocked', () => {
  const p = blogPrompt(TOPIC);
  assert.match(p, /THE OUTCOME LINE/);
  // The three rejected sentences are verbatim from the 2026-09-08 blocked draft. Keeping them in
  // the prompt is what turned the re-run from BLOCK into a publishable FLAG.
  assert.match(p, /genuinely shifts outcomes at the margin/);
  assert.match(p, /emerge with more durable placements/);
  assert.match(p, /tends to be more stable/);
  assert.match(p, /softening words \("tends to", "at the margin", "often", "frequently"\)/);
  assert.match(p, /ACCEPTED:[\s\S]*clearer window/);
  assert.match(p, /Stop before the result\./);
});

test('the writer prompt bans the tells that make copy read as generated', () => {
  const p = blogPrompt(TOPIC);
  assert.match(p, /DO NOT WRITE LIKE AN AI/);
  for (const tell of ['unlock', 'elevate', 'delve', "in today's\nfast-paced world", 'game-changer', 'empower']) {
    assert.ok(p.includes(tell), `banned tell "${tell}" must be named in the prompt`);
  }
  assert.match(p, /Vary sentence length hard/);
});

test('the topic itself still reaches the writer — the prompt is built from the backlog row', () => {
  const p = blogPrompt(TOPIC);
  assert.ok(p.includes(TOPIC.title));
  assert.ok(p.includes(TOPIC.angle));
  assert.ok(p.includes(TOPIC.keywords.join(', ')));
});
