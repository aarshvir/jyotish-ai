import { STEPS, type Answers } from './questions';
import type { QuizSlug } from '@/config/quiz_slugs';
import { buildScreens, type FunnelAnswers, type Screen } from '@/lib/funnel/screens';

/**
 * Turns quiz answers into the plain-English note the report pipeline personalises from
 * (`reports.personal_context`).
 *
 * The pipeline already writes to whatever question a visitor typed; a third of real
 * users typed one. The quiz asks every visitor what is on their mind, so every report
 * gets a clear brief — in the person's own terms, built from the option labels they
 * actually tapped rather than internal codes.
 *
 * Every sentence here has a fixed prefix on purpose: `parseSeekerProfile`
 * (src/lib/personalization/parse.ts) reads the same text back into structured answers,
 * and a round-trip test keeps the two in step. Change a prefix in one place only together
 * with the other.
 */

function one(a: Answers, field: string): string {
  const v = a[field];
  return typeof v === 'string' ? v.trim() : '';
}

function many(a: Answers, field: string): string[] {
  const v = a[field];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

export function labelFor(field: string, value: string): string {
  for (const s of STEPS) {
    if ((s.kind === 'single' || s.kind === 'multi') && s.field === field) {
      return s.options.find((o) => o.value === value)?.label ?? value;
    }
  }
  return value;
}

export const DETAIL_FIELDS = ['career_detail', 'marriage_detail', 'children_detail', 'business_detail', 'health_detail'];

/** How sure the person is of their birth time, in the words used in the brief. */
export function birthTimeSentence(known: string): string {
  return `Birth time: ${known === 'exact' ? 'known exactly' : known === 'approx' ? 'approximate, within an hour or two' : 'not known'}.`;
}

/**
 * Keep as many whole sentences as fit. Sentences are ordered most-important first, so a
 * long free-text answer can cost the least important sentence but never cut one in half.
 */
function fit(parts: string[], maxLength: number): string {
  const kept = [...parts];
  while (kept.length > 1 && kept.join(' ').length > maxLength) kept.pop();
  const text = kept.join(' ');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function personalContextFrom(a: Answers, maxLength = 1200): string {
  const parts: string[] = [];

  const concern = one(a, 'concern');
  if (concern) parts.push(`What is weighing on me most: ${labelFor('concern', concern)}.`);

  for (const f of DETAIL_FIELDS) {
    const v = one(a, f);
    if (v) parts.push(`More specifically: ${labelFor(f, v)}.`);
  }

  // The honest limit on every house-based claim, so it comes before the optional colour.
  const timeKnown = one(a, 'birth_time_known');
  if (timeKnown) parts.push(birthTimeSentence(timeKnown));

  const duration = one(a, 'duration');
  if (duration) parts.push(`On my mind for: ${labelFor('duration', duration).toLowerCase()}.`);

  const event = one(a, 'event_what').replace(/[.\s]+$/, '');
  if (event) parts.push(`Coming up: ${event}.`);
  else if (one(a, 'has_event') === 'soon') parts.push('A decision is coming up soon.');

  const partner = one(a, 'partner_name');
  if (partner) parts.push(`The person involved is ${partner}.`);
  const known = one(a, 'partner_known');
  if (known) parts.push(`Their birth details: ${labelFor('partner_known', known)}.`);

  const prior = one(a, 'prior');
  if (prior) parts.push(`Consulted an astrologer before: ${labelFor('prior', prior)}.`);
  const frustrations = many(a, 'frustration');
  const bothered = frustrations.filter((v) => v !== 'nothing');
  if (bothered.length) {
    parts.push(`What has bothered me about astrology: ${bothered.map((v) => labelFor('frustration', v)).join('; ')}.`);
  } else if (frustrations.includes('nothing')) {
    parts.push('What has bothered me about astrology: nothing, it has helped me.');
  }

  const granularity = one(a, 'granularity');
  if (granularity) parts.push(`Most useful to me: ${labelFor('granularity', granularity).toLowerCase()}.`);

  // Someone returning from the win-back email already typed a question once; keep it.
  const priorQuestion = one(a, 'prior_question').replace(/\s+/g, ' ');
  if (priorQuestion) parts.push(`Earlier I asked: "${priorQuestion.slice(0, 300)}".`);

  return fit(parts, maxLength);
}

// ── /q ad funnel (VEDICHOUR_QUIZ_SPEC) ───────────────────────────────────────
// Every funnel answer reaches the written report through the same personal_context field.
// The picture and role answers are passed as the person's own picks to COMPARE with the
// chart, never as chart evidence (spec H3), and the brief says so explicitly.

function funnelLabel(screens: Screen[], field: string, value: string): string {
  for (const s of screens) {
    if ((s.kind === 'single' || s.kind === 'picture') && s.field === field) {
      return s.options.find((o) => o.value === value)?.label.en ?? value;
    }
  }
  return value;
}

export function funnelPersonalContext(a: FunnelAnswers, slug: QuizSlug, maxLength = 1200): string {
  const screens = buildScreens(slug);
  const v = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');
  const parts: string[] = [];
  if (v('hook')) parts.push(`Asked "${slug.s01.en}", I answered: ${funnelLabel(screens, 'hook', v('hook'))}.`);
  if (v('focus_area')) parts.push(`Where it repeats most: ${funnelLabel(screens, 'focus_area', v('focus_area'))}.`);
  if (v('known_before')) parts.push(`Felt I knew someone before meeting them: ${funnelLabel(screens, 'known_before', v('known_before'))}.`);
  if (v('place_home')) parts.push(`A place felt like home for no reason: ${funnelLabel(screens, 'place_home', v('place_home'))}.`);
  if (v('skills_fears')) parts.push(`Which sounds most like me: ${funnelLabel(screens, 'skills_fears', v('skills_fears'))}.`);
  if (v('goal_12m')) parts.push(`What matters most in the next 12 months: ${funnelLabel(screens, 'goal_12m', v('goal_12m'))}.`);
  const known = v('birth_time_known');
  if (known) parts.push(birthTimeSentence(known));
  const picks: string[] = [];
  if (v('picture')) picks.push(`image that pulled me first: ${funnelLabel(screens, 'picture', v('picture'))}`);
  if (v('self_role')) picks.push(`role that feels familiar: ${funnelLabel(screens, 'self_role', v('self_role'))}`);
  if (picks.length) parts.push(`My own picks, to compare with my chart but not to read it from: ${picks.join('; ')}.`);
  return fit(parts, maxLength);
}
