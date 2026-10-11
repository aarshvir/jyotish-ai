/**
 * SeekerProfile: everything a person told us in a quiz, as structured answers.
 *
 * The quiz funnels write their answers into one sentence-per-answer note
 * (`reports.personal_context`, see src/lib/quiz/personalContext.ts). That note is the only
 * channel that already reaches every report and every commentary route, so the profile is
 * read back OUT of it (./parse.ts) rather than stored in a second place that could drift.
 *
 * Everything downstream of the profile — the opening brief, section order, the "why this is
 * in your report" lines, the event windows and the writing directives — is deterministic.
 * Only the narrative is written by a model, and it is told exactly what to do by the profile.
 */

export type Area = 'career' | 'love' | 'family' | 'health' | 'trust' | 'business' | 'curious';
export type Duration = 'weeks' | 'months' | 'year' | 'years';
export type Prior = 'often' | 'few' | 'once' | 'never';
export type Frustration = 'vague' | 'fear' | 'upsell' | 'generic' | 'cost' | 'nothing';
export type Granularity = 'hours' | 'days' | 'months' | 'all';
export type TimeConfidence = 'exact' | 'approx' | 'unknown';
export type PartnerKnown = 'full' | 'date' | 'none';
export type Role = 'scholar' | 'warrior' | 'merchant' | 'healer' | 'ruler' | 'seeker';
export type Goal = 'career_move' | 'relationship' | 'money' | 'peace' | 'business';

/** A quiz answer as the person saw it: what we asked (short) and what they picked. */
export interface Selection {
  /** Stable key of the answer, e.g. "concern", "event", "frustration". */
  key: string;
  /** The short question or topic, in everyday words. */
  topic: string;
  /** What they picked, in the words of the option they tapped (or the words they typed). */
  value: string;
}

export interface SeekerProfile {
  origin: 'start' | 'funnel' | 'none';
  /** Main area of life they came with. */
  area: Area | null;
  /** The /start concern exactly as asked ("marriage" and "children" fold into love / family). */
  concern: 'career' | 'marriage' | 'children' | 'health' | 'business' | 'curious' | null;
  /** Second-level answer under the concern (switch, stuck, delay, strain, …). */
  detail: string | null;
  duration: Duration | null;
  prior: Prior | null;
  frustrations: Frustration[];
  granularity: Granularity | null;
  hasEvent: 'yes' | 'soon' | 'no' | null;
  /** What they typed about the upcoming decision or date. */
  eventText: string | null;
  partnerName: string | null;
  partnerKnown: PartnerKnown | null;
  timeConfidence: TimeConfidence | null;
  /** A question they typed on an earlier visit (win-back). */
  priorQuestion: string | null;
  // /q funnel only
  hookAnswer: string | null;
  knownBefore: string | null;
  placeHome: string | null;
  skillsFears: string | null;
  goal: Goal | null;
  selfRole: Role | null;
  picture: string | null;
  /** Option labels exactly as shown, for quoting back (field → label). */
  labels: Record<string, string>;
}

export function emptyProfile(): SeekerProfile {
  return {
    origin: 'none',
    area: null,
    concern: null,
    detail: null,
    duration: null,
    prior: null,
    frustrations: [],
    granularity: null,
    hasEvent: null,
    eventText: null,
    partnerName: null,
    partnerKnown: null,
    timeConfidence: null,
    priorQuestion: null,
    hookAnswer: null,
    knownBefore: null,
    placeHome: null,
    skillsFears: null,
    goal: null,
    selfRole: null,
    picture: null,
    labels: {},
  };
}

/** Anything the person actually told us. A profile with nothing in it gets the standard report. */
export function hasAnyAnswer(p: SeekerProfile): boolean {
  return (
    p.area !== null ||
    p.detail !== null ||
    p.duration !== null ||
    p.prior !== null ||
    p.frustrations.length > 0 ||
    p.granularity !== null ||
    p.hasEvent !== null ||
    p.eventText !== null ||
    p.partnerName !== null ||
    p.timeConfidence !== null ||
    p.priorQuestion !== null ||
    p.goal !== null ||
    p.selfRole !== null ||
    p.hookAnswer !== null
  );
}

/** Raised "too vague" — the reader wants concrete actions and dates, not general themes. */
export function wantsConcrete(p: SeekerProfile): boolean {
  return p.frustrations.includes('vague') || p.frustrations.includes('generic') || p.prior === 'often';
}

/** Raised fear or sales pressure — calm framing, and nothing to buy. */
export function wantsCalm(p: SeekerProfile): boolean {
  return p.frustrations.includes('fear');
}

export function wantsNoSales(p: SeekerProfile): boolean {
  return p.frustrations.includes('upsell') || p.frustrations.includes('cost');
}

/** Houses (counted from the reference sign) that read each area of life. First is the main one. */
export const AREA_HOUSES: Record<Exclude<Area, 'curious'>, number[]> = {
  career: [10, 6, 2, 11],
  love: [7, 1, 5, 8],
  family: [4, 2, 9, 3],
  health: [1, 6, 12, 8],
  trust: [11, 3, 7],
  business: [7, 10, 11, 3],
};

export const AREA_NAME: Record<Area, string> = {
  career: 'work and money',
  love: 'love and marriage',
  family: 'family',
  health: 'health and energy',
  trust: 'trust and friendships',
  business: 'a business decision',
  curious: 'your chart as a whole',
};
