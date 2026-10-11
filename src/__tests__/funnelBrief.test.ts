import { describe, it, expect } from 'vitest';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import type { FunnelAnswers } from '@/lib/funnel/screens';
import { briefSentences } from '@/lib/funnel/briefSentences';
import { funnelPersonalContext } from '@/lib/quiz/personalContext';

// Invented answers only — this repository is public.

const slug = QUIZ_SLUGS['repeating-lessons'];

describe('the brief carries the v2 answers', () => {
  const answers: FunnelAnswers = {
    hook: 'again',
    focus_area: 'career',
    problems: 'career_stuck,money_leaks',
    mind_focus: 'money_leaks',
    frustration: 'vague,upsell',
    mind_words: 'I keep "delaying" the move',
    goal_12m: 'business',
    birth_time_known: 'approx',
  };

  it('writes each in words, keeps the /start sentence for astrology complaints, and quotes the free text as data', () => {
    const text = funnelPersonalContext(answers, slug);
    expect(text).toContain('What is hardest right now: I am stuck in the same role with no growth; Money comes in and goes straight out.');
    expect(text).toContain('The one that weighs most: Money comes in and goes straight out.');
    expect(text).toContain('What has bothered me about astrology: Too vague to act on; Constant pressure to buy gemstones or pujas.');
    expect(text).toContain(`In my own words: "I keep 'delaying' the move".`);
    expect(text).not.toMatch(/career_stuck|money_leaks|upsell/);
    expect(text.length).toBeLessThanOrEqual(1200);
  });

  it('says plainly when someone is new to astrology or just curious', () => {
    expect(funnelPersonalContext({ problems: 'curious', frustration: 'new' }, slug)).toContain('Nothing urgent right now, I am just curious.');
    expect(funnelPersonalContext({ frustration: 'new' }, slug)).toContain('I have not tried astrology before.');
    expect(funnelPersonalContext({ frustration: 'nothing' }, slug)).toContain('nothing, it has helped me');
  });

  it('writes nothing for answers that were skipped', () => {
    expect(briefSentences({})).toEqual([]);
    expect(briefSentences({ mind_words: '   ' })).toEqual([]);
  });
});
