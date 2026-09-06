import { describe, expect, it } from 'vitest';
import {
  firstStepId, getStep, nextStepId, prevStepId, progress, stepPosition,
  validate, timeConfidence, derivedFocus, concernHeadline,
} from '@/lib/quiz/engine';
import { visibleSteps, type Answers } from '@/lib/quiz/questions';

/**
 * The quiz is the conversion engine: a wrong branch does not throw, it silently
 * drops people. These lock the behaviour that matters.
 */
describe('quiz engine', () => {
  it('opens on the user problem, not a form field', () => {
    const first = getStep(firstStepId());
    expect(first?.id).toBe('concern');
    expect(first?.kind).toBe('single');
  });

  it('asks birth details only AFTER the emotional questions', () => {
    const order = visibleSteps({ concern: 'career' }).map((s) => s.id);
    expect(order.indexOf('concern')).toBeLessThan(order.indexOf('birth_date'));
    expect(order.indexOf('granularity')).toBeLessThan(order.indexOf('birth_date'));
  });

  describe('branching', () => {
    it('marriage + specific person asks for their name and birth details', () => {
      const a: Answers = { concern: 'marriage', marriage_detail: 'someone' };
      const ids = visibleSteps(a).map((s) => s.id);
      expect(ids).toContain('partner_name');
      expect(ids).toContain('partner_known');
      expect(ids).not.toContain('career_detail');
    });

    it('marriage + still searching does NOT ask about a partner', () => {
      const a: Answers = { concern: 'marriage', marriage_detail: 'searching' };
      const ids = visibleSteps(a).map((s) => s.id);
      expect(ids).not.toContain('partner_name');
      expect(ids).not.toContain('partner_known');
    });

    it('each concern shows only its own follow-up', () => {
      const detailFor = (concern: string) =>
        visibleSteps({ concern }).map((s) => s.id).filter((id) => id.endsWith('_detail'));
      expect(detailFor('career')).toEqual(['career_detail']);
      expect(detailFor('children')).toEqual(['children_detail']);
      expect(detailFor('business')).toEqual(['business_detail']);
      expect(detailFor('health')).toEqual(['health_detail']);
    });

    it('"just curious" skips the pain-duration question', () => {
      expect(visibleSteps({ concern: 'curious' }).map((s) => s.id)).not.toContain('duration');
      expect(visibleSteps({ concern: 'career' }).map((s) => s.id)).toContain('duration');
    });

    it('never-consulted users are not asked what frustrated them', () => {
      expect(visibleSteps({ prior: 'never' }).map((s) => s.id)).not.toContain('frustration');
      expect(visibleSteps({ prior: 'few' }).map((s) => s.id)).toContain('frustration');
    });

    it('birth time is skipped entirely when unknown (no noon fallback)', () => {
      expect(visibleSteps({ birth_time_known: 'unknown' }).map((s) => s.id)).not.toContain('birth_time');
      expect(visibleSteps({ birth_time_known: 'exact' }).map((s) => s.id)).toContain('birth_time');
    });

    it('event description appears only when there is a dated decision', () => {
      expect(visibleSteps({ has_event: 'yes' }).map((s) => s.id)).toContain('event_what');
      expect(visibleSteps({ has_event: 'no' }).map((s) => s.id)).not.toContain('event_what');
    });
  });

  describe('navigation', () => {
    it('walks a full career path to the recap without dead-ending', () => {
      const a: Answers = {
        concern: 'career', career_detail: 'switch', duration: 'months', prior: 'few',
        frustration: ['vague'], granularity: 'days', has_event: 'no',
        birth_date: '1991-07-31', birth_time_known: 'exact', birth_time: '14:20',
        birth_city: 'Bargarh', current_city: 'Raipur', first_name: 'Asha', reminder_time: 'morning',
      };
      let id: string | null = firstStepId();
      const seen: string[] = [];
      for (let i = 0; i < 40 && id; i++) { seen.push(id); id = nextStepId(id, a); }
      expect(seen[seen.length - 1]).toBe('recap');
      expect(seen).toContain('compute');
      expect(new Set(seen).size).toBe(seen.length); // no loops
    });

    it('recovers when the current step is branched away by a new answer', () => {
      // Was on partner_name, then changed concern to career.
      const next = nextStepId('partner_name', { concern: 'career' });
      expect(next).toBeTruthy();
      expect(next).not.toBe('partner_name');
    });

    it('back from the first step is null', () => {
      expect(prevStepId(firstStepId(), {})).toBeNull();
    });
  });

  describe('progress bar', () => {
    it('starts at zero and never reports complete before the recap', () => {
      const a: Answers = { concern: 'career' };
      expect(progress('concern', a)).toBe(0);
      expect(progress('first_name', a)).toBeLessThanOrEqual(0.98);
    });

    it('never moves backwards even when a branch adds steps', () => {
      // Answering "marriage/someone" inserts two extra steps; the bar must hold.
      const before = progress('prior', { concern: 'career' });
      const after = progress('prior', { concern: 'marriage', marriage_detail: 'someone' }, before);
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('reports a sane human counter', () => {
      const { index, total } = stepPosition('concern', { concern: 'career' });
      expect(index).toBe(1);
      expect(total).toBeGreaterThan(8);
      expect(total).toBeLessThanOrEqual(20); // owner asked for 10-15ish, under 4 minutes
    });
  });

  describe('validation', () => {
    const dateStep = getStep('birth_date')!;
    it('rejects a future or malformed birth date', () => {
      expect(validate(dateStep, '2999-01-01')).toMatch(/future/i);
      expect(validate(dateStep, 'not-a-date')).toMatch(/valid date/i);
      expect(validate(dateStep, '1991-07-31')).toBeNull();
    });
    it('lets optional questions through empty', () => {
      expect(validate(getStep('partner_name')!, '')).toBeNull();
    });
    it('blocks required questions when empty', () => {
      expect(validate(getStep('concern')!, '')).toMatch(/choose/i);
    });
  });

  describe('derived signals', () => {
    it('treats a missing birth time as unknown rather than assuming one', () => {
      expect(timeConfidence({})).toBe('unknown');
      expect(timeConfidence({ birth_time_known: 'approx' })).toBe('approx');
    });
    it('turns on compatibility for partner answers', () => {
      expect(derivedFocus({ concern: 'marriage' })).toContain('compatibility');
      expect(derivedFocus({ concern: 'career' })).not.toContain('compatibility');
    });
    it('speaks back the user’s own concern', () => {
      expect(concernHeadline({ concern: 'marriage' })).toMatch(/marriage/i);
      expect(concernHeadline({})).toMatch(/year ahead/i);
    });
  });
});
