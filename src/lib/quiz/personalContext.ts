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
 */

function one(a: Answers, field: string): string {
  const v = a[field];
  return typeof v === 'string' ? v.trim() : '';
}

function labelFor(field: string, value: string): string {
  for (const s of STEPS) {
    if ((s.kind === 'single' || s.kind === 'multi') && s.field === field) {
      return s.options.find((o) => o.value === value)?.label ?? value;
    }
  }
  return value;
}

const DETAIL_FIELDS = ['career_detail', 'marriage_detail', 'children_detail', 'business_detail', 'health_detail'];

export function personalContextFrom(a: Answers, maxLength = 1200): string {
  const parts: string[] = [];

  const concern = one(a, 'concern');
  if (concern) parts.push(`What is weighing on me most: ${labelFor('concern', concern)}.`);

  // Someone returning from the win-back email already typed a question once; keep it.
  const prior = one(a, 'prior_question').replace(/\s+/g, ' ');
  if (prior) parts.push(`Earlier I asked: "${prior.slice(0, 300)}".`);

  for (const f of DETAIL_FIELDS) {
    const v = one(a, f);
    if (v) parts.push(`More specifically: ${labelFor(f, v)}.`);
  }

  const partner = one(a, 'partner_name');
  if (partner) parts.push(`The person involved is ${partner}.`);
  const known = one(a, 'partner_known');
  if (known) parts.push(`Their birth details: ${labelFor('partner_known', known)}.`);

  const duration = one(a, 'duration');
  if (duration) parts.push(`On my mind for: ${labelFor('duration', duration).toLowerCase()}.`);

  const event = one(a, 'event_what').replace(/[.\s]+$/, '');
  if (event) parts.push(`Coming up: ${event}.`);
  else if (one(a, 'has_event') === 'soon') parts.push('A decision is coming up soon.');

  const granularity = one(a, 'granularity');
  if (granularity) parts.push(`Most useful to me: ${labelFor('granularity', granularity).toLowerCase()}.`);

  const text = parts.join(' ');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
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
  if (known) parts.push(`Birth time: ${known === 'exact' ? 'known exactly' : known === 'approx' ? 'approximate, within an hour or two' : 'not known'}.`);
  const picks: string[] = [];
  if (v('picture')) picks.push(`image that pulled me first: ${funnelLabel(screens, 'picture', v('picture'))}`);
  if (v('self_role')) picks.push(`role that feels familiar: ${funnelLabel(screens, 'self_role', v('self_role'))}`);
  if (picks.length) parts.push(`My own picks, to compare with my chart but not to read it from: ${picks.join('; ')}.`);
  const text = parts.join(' ');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
