import { describe, it, expect } from 'vitest';
import { personalContextFrom } from '@/lib/quiz/personalContext';

// Invented answers only — this repository is public.

describe('personalContextFrom', () => {
  it('writes the concern and its detail in the words the person tapped', () => {
    const text = personalContextFrom({
      concern: 'career',
      career_detail: 'switch',
      duration: 'months',
      granularity: 'hours',
    });
    expect(text).toContain('What is weighing on me most: Work and money.');
    expect(text).toContain('More specifically: I am thinking of changing jobs.');
    expect(text).toContain('On my mind for: several months.');
    expect(text).toContain('Most useful to me: the best hours in a day.');
    // Internal codes never leak into the brief.
    expect(text).not.toMatch(/\bswitch\b|\bcareer\b/);
  });

  it('includes the person involved when they named one', () => {
    const text = personalContextFrom({
      concern: 'marriage',
      marriage_detail: 'someone',
      partner_name: 'Asha',
      partner_known: 'date',
    });
    expect(text).toContain('The person involved is Asha.');
    expect(text).toContain('Their birth details: Only the date of birth.');
  });

  it('carries a dated decision without doubling its full stop', () => {
    const text = personalContextFrom({ concern: 'business', has_event: 'yes', event_what: 'signing a lease on 3 October.' });
    expect(text).toContain('Coming up: signing a lease on 3 October.');
    expect(text).not.toContain('..');
  });

  it('notes an upcoming decision even without details', () => {
    expect(personalContextFrom({ concern: 'career', has_event: 'soon' })).toContain('A decision is coming up soon.');
  });

  it('keeps the question a returning person typed before', () => {
    const text = personalContextFrom({ concern: 'career', prior_question: '  when   will I find work  ' });
    expect(text).toContain('Earlier I asked: "when will I find work".');
  });

  it('is empty when nothing was answered', () => {
    expect(personalContextFrom({})).toBe('');
  });

  it('stays within the length the report row accepts', () => {
    const text = personalContextFrom({ concern: 'business', has_event: 'yes', event_what: 'x'.repeat(5000) }, 1200);
    expect(text.length).toBeLessThanOrEqual(1200);
  });
});
