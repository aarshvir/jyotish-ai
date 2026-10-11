/**
 * Pure navigation + progress for the /q funnel. No React, no network — unit tested,
 * because a wrong turn here costs conversions silently instead of throwing.
 */

import { isShown, type FunnelAnswers, type Screen } from './screens';

/** "2/18": numerator and the FIXED denominator for a screen, or null for unnumbered interstitials. */
export function counter(screens: Screen[], id: string): { n: number; of: number } | null {
  const numbered = screens.filter((s) => s.numbered);
  const of = numbered.length + 1; // endowed progress: the ad click is step 1
  const idx = numbered.findIndex((s) => s.id === id);
  return idx < 0 ? null : { n: idx + 2, of };
}

/**
 * Bar fill 0..1. Unnumbered interstitials sit half a step past the screen before them,
 * so the bar always moves forward and never jumps back.
 */
export function barFraction(screens: Screen[], id: string): number {
  const c = counter(screens, id);
  const of = screens.filter((s) => s.numbered).length + 1;
  if (c) return c.n / of;
  const idx = screens.findIndex((s) => s.id === id);
  for (let i = idx - 1; i >= 0; i--) {
    const before = counter(screens, screens[i].id);
    if (before) return (before.n + 0.5) / of;
  }
  return 1 / of;
}

export function nextScreen(screens: Screen[], id: string, a: FunnelAnswers): Screen | null {
  const idx = screens.findIndex((s) => s.id === id);
  for (let i = idx + 1; i < screens.length; i++) if (isShown(screens[i], a)) return screens[i];
  return null;
}

/** Previous screen to go back to. Never steps back into the calculation screen. */
export function prevScreen(screens: Screen[], id: string, a: FunnelAnswers): Screen | null {
  const idx = screens.findIndex((s) => s.id === id);
  for (let i = idx - 1; i >= 0; i--) {
    const s = screens[i];
    if (s.kind === 'calc') continue;
    if (isShown(s, a)) return s;
  }
  return null;
}

/** First screen whose answer is still missing — used to resume a half-finished session safely. */
export function firstIncomplete(screens: Screen[], a: FunnelAnswers): Screen {
  for (const s of screens) {
    if (!isShown(s, a)) continue;
    if ('field' in s && !a[s.field]) return s;
    if (s.kind === 'calc' || s.kind === 'contact' || s.kind === 'reveal' || s.kind === 'offer') return s;
  }
  return screens[0];
}

/** Birth details complete enough to compute a chart. */
export function birthReady(a: FunnelAnswers): boolean {
  const timeOk = a.birth_time_known === 'unknown' || /^\d{2}:\d{2}$/.test(a.birth_time ?? '');
  return Boolean(a.birth_date && a.birth_time_known && timeOk && a.birth_city && a.birth_city_lat && a.birth_city_lng);
}

/**
 * Where a resumed session may land. Anything at or past the calculation needs complete
 * birth details; without them we send the visitor to the first missing one.
 */
export function resumeTarget(screens: Screen[], savedId: string, a: FunnelAnswers): Screen {
  const saved = screens.find((s) => s.id === savedId);
  if (!saved) return firstIncomplete(screens, a);
  const late = saved.kind === 'calc' || saved.kind === 'contact' || saved.kind === 'reveal' || saved.kind === 'offer';
  if (late && !birthReady(a)) return firstIncomplete(screens, a);
  if (!isShown(saved, a)) return firstIncomplete(screens, a);
  return saved;
}
