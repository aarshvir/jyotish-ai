import { STEPS, visibleSteps, type Answers, type Step, type Concern } from './questions';

/**
 * Pure interpreter over the question graph. No React, no network — so the whole
 * funnel's branching logic is unit-testable, which matters because a wrong turn
 * here silently costs conversions rather than throwing an error.
 */

export interface QuizState {
  answers: Answers;
  /** Id of the step to render. */
  stepId: string;
}

export function firstStepId(): string {
  return STEPS[0].id;
}

export function getStep(stepId: string): Step | undefined {
  return STEPS.find((s) => s.id === stepId);
}

/**
 * Progress 0..1 over the steps that will ACTUALLY be shown for these answers.
 *
 * Deliberately never reaches 1.0 before the recap, and never goes backwards
 * when a branch adds steps: a bar that jumps back is the fastest way to lose
 * someone mid-quiz. We floor it at the previous value via `atLeast`.
 */
export function progress(stepId: string, answers: Answers, atLeast = 0): number {
  const steps = visibleSteps(answers);
  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx < 0) return atLeast;
  // Cap the denominator so late-added branch steps cannot rewind the bar.
  const total = Math.max(steps.length - 1, 1);
  const raw = idx / total;
  return Math.max(atLeast, Math.min(raw, 0.98));
}

/** Human step counter, e.g. "4 of 15", using the resolved branch. */
export function stepPosition(stepId: string, answers: Answers): { index: number; total: number } {
  const steps = visibleSteps(answers).filter((s) => s.kind !== 'recap' && s.kind !== 'loader');
  const index = steps.findIndex((s) => s.id === stepId);
  return { index: index < 0 ? 0 : index + 1, total: steps.length };
}

export function nextStepId(stepId: string, answers: Answers): string | null {
  const steps = visibleSteps(answers);
  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx < 0) {
    // The current step was branched away by the latest answer — resume at the
    // first step that has no answer yet rather than dead-ending.
    const firstUnanswered = steps.find((s) => !isAnswered(s, answers));
    return firstUnanswered?.id ?? steps[steps.length - 1]?.id ?? null;
  }
  return steps[idx + 1]?.id ?? null;
}

export function prevStepId(stepId: string, answers: Answers): string | null {
  const steps = visibleSteps(answers);
  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx <= 0) return null;
  return steps[idx - 1].id;
}

export function isAnswered(step: Step, answers: Answers): boolean {
  if (step.kind === 'info' || step.kind === 'loader' || step.kind === 'recap') return true;
  if ('optional' in step && step.optional) return true;
  const v = answers[step.field];
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === 'string' && v.trim().length > 0;
}

/** Validation for the current step. Returns an error message, or null if fine. */
export function validate(step: Step, value: unknown): string | null {
  const optional = 'optional' in step && step.optional === true;
  const empty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  if (empty) return optional ? null : 'Please choose an option to continue.';

  switch (step.kind) {
    case 'multi': {
      const min = step.min ?? 1;
      if (Array.isArray(value) && value.length < min) return `Please choose at least ${min}.`;
      return null;
    }
    case 'text': {
      const s = String(value).trim();
      if (step.maxLength && s.length > step.maxLength) return `Please keep it under ${step.maxLength} characters.`;
      return null;
    }
    case 'date': {
      const s = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Please enter a valid date.';
      const d = new Date(`${s}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return 'Please enter a valid date.';
      const year = d.getUTCFullYear();
      if (year < 1900) return 'Please check the year.';
      if (d.getTime() > Date.now()) return 'That date is in the future.';
      return null;
    }
    case 'time': {
      if (!/^\d{2}:\d{2}$/.test(String(value))) return 'Please enter a valid time.';
      return null;
    }
    default:
      return null;
  }
}

/**
 * Birth-time confidence drives what we are allowed to claim. An unknown time
 * makes the ascendant and every house-based reading unreliable, so the product
 * must say so rather than quietly assume noon.
 */
export type TimeConfidence = 'exact' | 'approx' | 'unknown';

export function timeConfidence(answers: Answers): TimeConfidence {
  const v = answers.birth_time_known;
  return v === 'exact' || v === 'approx' ? v : 'unknown';
}

/** The single line the recap leads with, tailored to their stated problem. */
export function concernHeadline(answers: Answers): string {
  const c = answers.concern as Concern | undefined;
  switch (c) {
    case 'career':   return 'your work and money';
    case 'marriage': return 'your marriage and relationships';
    case 'children': return 'children and family';
    case 'health':   return 'your health and energy';
    case 'business': return 'your business decision';
    default:         return 'the year ahead';
  }
}

/** Which product surfaces to emphasise after purchase. */
export function derivedFocus(answers: Answers): string[] {
  const focus = new Set<string>(['daily_timing']);
  if (answers.concern === 'marriage' || answers.partner_known) focus.add('compatibility');
  if (answers.granularity === 'months' || answers.granularity === 'all') focus.add('year_ahead');
  if (answers.has_event === 'yes') focus.add('event_windows');
  // Array.from, not spread: this repo's tsconfig target predates downlevelIteration.
  return Array.from(focus);
}
