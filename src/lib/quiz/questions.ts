/**
 * The onboarding question graph.
 *
 * Data, not screens: the interpreter in ./engine.ts walks this, so questions can
 * be reordered, translated or A/B-tested without touching UI code.
 *
 * Sequencing follows what actually converts in habit/health onboarding (Simple,
 * Noom, Cal AI): open on the user's own problem, not on data collection; ask the
 * emotionally engaging questions FIRST and the boring identity fields LAST, once
 * they are invested; branch visibly on their answer so the product feels like it
 * is listening; and end on a recap that shows real work was done.
 *
 * Copy rules for this audience (Indian, ~28-60, often not fluent in English):
 * short sentences, everyday words, no Sanskrit without a gloss, no jargon
 * ("dasha", "lagna" never appear before the paywall), and no promises of
 * certainty — this product is for planning, not fortune-telling.
 */

export type Concern = 'career' | 'marriage' | 'children' | 'health' | 'business' | 'curious';

export type Step =
  | {
      id: string;
      kind: 'single';
      /** Answer key stored on the session. */
      field: string;
      title: string;
      subtitle?: string;
      options: { value: string; label: string; hint?: string }[];
      /** Advance as soon as one is tapped — fewer taps, faster completion. */
      autoAdvance?: boolean;
      showIf?: (a: Answers) => boolean;
    }
  | {
      id: string;
      kind: 'multi';
      field: string;
      title: string;
      subtitle?: string;
      options: { value: string; label: string }[];
      min?: number;
      showIf?: (a: Answers) => boolean;
    }
  | {
      id: string;
      kind: 'text';
      field: string;
      title: string;
      subtitle?: string;
      placeholder?: string;
      optional?: boolean;
      maxLength?: number;
      showIf?: (a: Answers) => boolean;
    }
  | {
      id: string;
      kind: 'date' | 'time' | 'city';
      field: string;
      title: string;
      subtitle?: string;
      optional?: boolean;
      showIf?: (a: Answers) => boolean;
    }
  | {
      id: string;
      kind: 'info';
      title: string;
      body: string;
      cta: string;
      showIf?: (a: Answers) => boolean;
    }
  | { id: string; kind: 'loader'; title: string; lines: string[] }
  | { id: string; kind: 'recap' };

export type Answers = Record<string, string | string[] | undefined>;

const concernOf = (a: Answers): Concern | undefined => a.concern as Concern | undefined;

export const STEPS: Step[] = [
  // ── 1. Their problem, in their words. Never open with a form field. ──────
  {
    id: 'concern',
    kind: 'single',
    field: 'concern',
    title: 'What is weighing on you most right now?',
    subtitle: 'Pick the one closest to your situation.',
    autoAdvance: true,
    options: [
      { value: 'career', label: 'Work and money', hint: 'A job, a switch, income' },
      { value: 'marriage', label: 'Marriage and love', hint: 'Finding someone, or a decision with someone' },
      { value: 'children', label: 'Children and family', hint: 'Planning, or family matters' },
      { value: 'health', label: 'Health and energy', hint: 'Mine or my family’s' },
      { value: 'business', label: 'A business decision', hint: 'Starting, investing, timing a launch' },
      { value: 'curious', label: 'Nothing specific — I am curious', hint: 'Just want to understand my chart' },
    ],
  },

  // ── 2. Branch immediately. The product must feel like it heard them. ─────
  {
    id: 'career_detail',
    kind: 'single',
    field: 'career_detail',
    title: 'Which is closest?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) === 'career',
    options: [
      { value: 'switch', label: 'I am thinking of changing jobs' },
      { value: 'promotion', label: 'I want growth where I am' },
      { value: 'money', label: 'Money is tight and I want it to improve' },
      { value: 'stuck', label: 'I feel stuck and cannot see the way' },
    ],
  },
  {
    id: 'marriage_detail',
    kind: 'single',
    field: 'marriage_detail',
    title: 'Which is closest?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) === 'marriage',
    options: [
      { value: 'someone', label: 'There is someone specific' },
      { value: 'searching', label: 'I am looking, but have not found the right person' },
      { value: 'delay', label: 'It keeps getting delayed and I do not know why' },
      { value: 'strain', label: 'My marriage is under strain' },
    ],
  },
  // The specific-person branch the owner asked for by name.
  {
    id: 'partner_name',
    kind: 'text',
    field: 'partner_name',
    title: 'What is their name?',
    subtitle: 'Only so your reading can speak about them properly. You can skip this.',
    placeholder: 'First name is enough',
    optional: true,
    maxLength: 60,
    showIf: (a) => a.marriage_detail === 'someone' || a.marriage_detail === 'strain',
  },
  {
    id: 'partner_known',
    kind: 'single',
    field: 'partner_known',
    title: 'Do you know their birth details?',
    subtitle: 'With their date of birth we can compare both charts. Without it, we still read yours.',
    autoAdvance: true,
    showIf: (a) => a.marriage_detail === 'someone' || a.marriage_detail === 'strain',
    options: [
      { value: 'full', label: 'Yes — date, time and place' },
      { value: 'date', label: 'Only the date of birth' },
      { value: 'none', label: 'No, I do not' },
    ],
  },
  {
    id: 'children_detail',
    kind: 'single',
    field: 'children_detail',
    title: 'Which is closest?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) === 'children',
    options: [
      { value: 'planning', label: 'We are trying to conceive' },
      { value: 'timing', label: 'We are deciding when to start' },
      { value: 'childcare', label: 'Something about my child concerns me' },
      { value: 'family', label: 'Family matters at home' },
    ],
  },
  {
    id: 'business_detail',
    kind: 'single',
    field: 'business_detail',
    title: 'Which is closest?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) === 'business',
    options: [
      { value: 'start', label: 'I am starting something new' },
      { value: 'launch', label: 'I need to time a launch or a deal' },
      { value: 'invest', label: 'I am deciding on an investment' },
      { value: 'scale', label: 'I want to grow what I already run' },
    ],
  },
  {
    id: 'health_detail',
    kind: 'single',
    field: 'health_detail',
    title: 'Which is closest?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) === 'health',
    options: [
      { value: 'energy', label: 'My energy is low most days' },
      { value: 'ongoing', label: 'Something ongoing I am managing' },
      { value: 'family', label: 'A family member’s health' },
      { value: 'prevent', label: 'I want to stay ahead of problems' },
    ],
  },

  // ── 3. How long it has been running. Names the pain without prying. ──────
  {
    id: 'duration',
    kind: 'single',
    field: 'duration',
    title: 'How long has this been on your mind?',
    autoAdvance: true,
    showIf: (a) => concernOf(a) !== 'curious',
    options: [
      { value: 'weeks', label: 'A few weeks' },
      { value: 'months', label: 'Several months' },
      { value: 'year', label: 'About a year' },
      { value: 'years', label: 'Years' },
    ],
  },

  // ── 4. Prior experience: builds identity and sets our positioning. ───────
  {
    id: 'prior',
    kind: 'single',
    field: 'prior',
    title: 'Have you consulted an astrologer before?',
    autoAdvance: true,
    options: [
      { value: 'often', label: 'Yes, regularly' },
      { value: 'few', label: 'A few times' },
      { value: 'once', label: 'Once, long ago' },
      { value: 'never', label: 'Never' },
    ],
  },
  {
    id: 'frustration',
    kind: 'multi',
    field: 'frustration',
    title: 'What has bothered you about astrology so far?',
    subtitle: 'Choose any that apply. This shapes what we show you.',
    showIf: (a) => a.prior !== 'never',
    options: [
      { value: 'vague', label: 'Too vague to act on' },
      { value: 'fear', label: 'Made me anxious rather than clearer' },
      { value: 'upsell', label: 'Constant pressure to buy gemstones or pujas' },
      { value: 'generic', label: 'Same answer for everyone' },
      { value: 'cost', label: 'Charged by the minute' },
      { value: 'nothing', label: 'Nothing — it has helped me' },
    ],
  },

  // ── 5. Positioning stated as a question. This is where we differentiate. ─
  {
    id: 'granularity',
    kind: 'single',
    field: 'granularity',
    title: 'VedicHour works out your timing down to the hour.',
    subtitle: 'Which would actually change how you plan?',
    autoAdvance: true,
    options: [
      { value: 'hours', label: 'The best hours in a day', hint: 'When to make the call, sign, ask' },
      { value: 'days', label: 'The best days in a month', hint: 'When to schedule the big thing' },
      { value: 'months', label: 'The best months in a year', hint: 'When to make the big move' },
      { value: 'all', label: 'All three' },
    ],
  },

  // ── 6. A dated decision: makes the value concrete and time-bound. ────────
  {
    id: 'has_event',
    kind: 'single',
    field: 'has_event',
    title: 'Is there a decision or date coming up?',
    autoAdvance: true,
    options: [
      { value: 'yes', label: 'Yes, there is something specific' },
      { value: 'soon', label: 'Not yet, but soon' },
      { value: 'no', label: 'No, nothing fixed' },
    ],
  },
  {
    id: 'event_what',
    kind: 'text',
    field: 'event_what',
    title: 'What is it?',
    subtitle: 'A few words is enough. We will mark the good and difficult windows around it.',
    placeholder: 'e.g. interview on 12 November, or starting a new shop',
    optional: true,
    maxLength: 140,
    showIf: (a) => a.has_event === 'yes',
  },

  // ── 7. Now the birth details — asked only after they are invested. ───────
  {
    id: 'birth_date',
    kind: 'date',
    field: 'birth_date',
    title: 'When were you born?',
    subtitle: 'Everything is calculated from this. Your details stay private.',
  },
  {
    id: 'birth_time_known',
    kind: 'single',
    field: 'birth_time_known',
    title: 'Do you know your time of birth?',
    subtitle: 'Be honest here — a guessed time gives a wrong reading, and we would rather tell you that.',
    autoAdvance: true,
    options: [
      { value: 'exact', label: 'Yes, I know it exactly', hint: 'From a certificate or family record' },
      { value: 'approx', label: 'Roughly — within an hour or two' },
      { value: 'unknown', label: 'No idea' },
    ],
  },
  {
    id: 'birth_time',
    kind: 'time',
    field: 'birth_time',
    title: 'What time were you born?',
    subtitle: 'As close as you can.',
    showIf: (a) => a.birth_time_known === 'exact' || a.birth_time_known === 'approx',
  },
  {
    id: 'birth_city',
    kind: 'city',
    field: 'birth_city',
    title: 'Where were you born?',
    subtitle: 'Town or city is enough — we work out the rest.',
  },
  {
    id: 'current_city',
    kind: 'city',
    field: 'current_city',
    title: 'Where do you live now?',
    subtitle: 'Your daily timings depend on your sunrise, so this matters.',
  },
  {
    id: 'first_name',
    kind: 'text',
    field: 'first_name',
    title: 'And your name?',
    subtitle: 'So your readings are addressed to you.',
    placeholder: 'First name',
    maxLength: 60,
  },

  // ── 8. Commitment: sets up the daily habit before they have paid. ────────
  {
    id: 'reminder_time',
    kind: 'single',
    field: 'reminder_time',
    title: 'When should we send your timings each day?',
    subtitle: 'One short message. You can change or stop it anytime.',
    autoAdvance: true,
    options: [
      { value: 'early', label: 'Early morning', hint: 'Around 6 am' },
      { value: 'morning', label: 'With my morning tea', hint: 'Around 8 am' },
      { value: 'evening', label: 'Evening, to plan tomorrow', hint: 'Around 8 pm' },
      { value: 'none', label: 'Do not send anything' },
    ],
  },

  // ── 9. Real computation. The wait is honest, not theatrical. ────────────
  {
    id: 'compute',
    kind: 'loader',
    title: 'Working out your chart',
    lines: [
      'Finding the sky at your birth moment',
      'Placing the nine grahas',
      'Working out which period you are running now',
      'Scoring your next 30 days, hour by hour',
      'Marking the windows that matter for you',
    ],
  },

  { id: 'recap', kind: 'recap' },
];

/** Steps that apply given the answers so far (branching resolved). */
export function visibleSteps(answers: Answers): Step[] {
  return STEPS.filter((s) => !('showIf' in s) || !s.showIf || s.showIf(answers));
}
