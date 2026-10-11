/**
 * INVENTED people for tests, dry-runs and the sample report. None of these is a real
 * person; the birth data and answers are made up (this repository is public).
 *
 * `SAME_CHART_BIRTH` is shared on purpose: the point of the personalisation tests is that
 * two people with an identical chart and different answers receive visibly different
 * reports.
 */

import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { funnelPersonalContext, personalContextFrom } from '@/lib/quiz/personalContext';
import type { Answers } from '@/lib/quiz/questions';
import type { FunnelAnswers } from '@/lib/funnel/screens';

export const SAME_CHART_BIRTH = {
  date: '1991-03-14',
  time: '06:40',
  city: 'Pune, India',
  lat: 18.52,
  lng: 73.86,
};

/** A planning date used by every fixture, so event windows are reproducible. */
export const FIXTURE_TODAY = '2026-10-11';

/** Works in a job she is thinking of leaving; astrology has been vague and pushy. Interview coming up. */
export const ASHA_ANSWERS: Answers = {
  concern: 'career',
  career_detail: 'switch',
  duration: 'years',
  prior: 'often',
  frustration: ['vague', 'upsell'],
  granularity: 'months',
  has_event: 'yes',
  event_what: 'interview at a new company on 12 November',
  birth_time_known: 'exact',
};

/** Wants to understand a delayed relationship with a named person; new to astrology; birth time is a guess. */
export const ROHAN_ANSWERS: Answers = {
  concern: 'marriage',
  marriage_detail: 'someone',
  partner_name: 'Kavya',
  partner_known: 'date',
  duration: 'months',
  prior: 'never',
  granularity: 'hours',
  has_event: 'soon',
  birth_time_known: 'approx',
};

/** Anxious about health; asked for calm; a doctor is already involved. */
export const MEERA_ANSWERS: Answers = {
  concern: 'health',
  health_detail: 'ongoing',
  duration: 'year',
  prior: 'few',
  frustration: ['fear', 'generic'],
  granularity: 'days',
  has_event: 'no',
  birth_time_known: 'unknown',
};

export const START_FIXTURES = {
  asha: personalContextFrom(ASHA_ANSWERS),
  rohan: personalContextFrom(ROHAN_ANSWERS),
  meera: personalContextFrom(MEERA_ANSWERS),
  nobody: '',
};

/** /q funnel: the question that repeats is family; picks a healer; wants peace. */
export const FUNNEL_ANSWERS: FunnelAnswers = {
  hook: 'again',
  focus_area: 'family',
  known_before: 'instantly',
  place_home: 'strongly',
  skills_fears: 'both',
  picture: 'temple',
  self_role: 'healer',
  goal_12m: 'peace',
  birth_time_known: 'exact',
};

export const FUNNEL_FIXTURE = funnelPersonalContext(FUNNEL_ANSWERS, QUIZ_SLUGS['repeating-lessons']);
