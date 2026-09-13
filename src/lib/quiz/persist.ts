import type { Answers } from './questions';

/**
 * Quiz progress kept in sessionStorage, so it survives the two full-page round trips in
 * the funnel: Google sign-in, and a cancelled or failed Ziina payment. Without it a
 * visitor who taps "Continue with Google" at question 17 comes back to question 1.
 */

const KEY = 'vh_quiz_state_v1';
/** Stale answers are worse than none — a day-old half-finished quiz starts fresh. */
const MAX_AGE_MS = 24 * 3600_000;

export interface PersistedQuiz {
  answers: Answers;
  stepId: string;
  savedAt: number;
}

export function loadQuiz(now: number = Date.now()): PersistedQuiz | null {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedQuiz;
    if (!parsed || typeof parsed.stepId !== 'string' || typeof parsed.answers !== 'object') return null;
    if (now - (parsed.savedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveQuiz(answers: Answers, stepId: string): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ answers, stepId, savedAt: Date.now() }));
  } catch {
    /* private mode / quota — the quiz still works, it just will not survive a redirect */
  }
}

export function clearQuiz(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
