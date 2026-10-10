/**
 * Slug registry for the /q/[slug] ad funnels (VEDICHOUR_QUIZ_SPEC §7, AD_PLAYBOOK §B–C).
 *
 * Every short-video ad links to /q/{slug}. The slug decides the first question (the ad's
 * own hook, so the click lands on the question the viewer just heard) and which reveal
 * is shown. Adding a slug here is the whole job of launching a new hook — no screen code
 * changes.
 *
 * Changing a slug's S01 question only swaps the wording; the answer is stored as the S01
 * answer either way, so funnel reports stay comparable across slugs.
 */

export type RevealMode = 'karmic' | 'timing';

export interface QuizSlug {
  slug: string;
  /** The S01 question, worded exactly as the paired ad asks it. */
  s01: { en: string; hi: string };
  /** One short line above the S01 question. Must be a true statement. */
  eyebrow: { en: string; hi: string };
  /** Paired ad id(s) from AD_PLAYBOOK, for attribution and audits. */
  adIds: string[];
  /**
   * Which reveal this hook promises. 'timing' slugs promise clear hours / windows
   * (spec §9 E5). Until the timing reveal ships they show the karmic reveal; see
   * `revealModeFor` below, which is the one place that decision is made.
   */
  reveal: RevealMode;
}

export const DEFAULT_SLUG = 'repeating-lessons';

export const QUIZ_SLUGS: Record<string, QuizSlug> = {
  'repeating-lessons': {
    slug: 'repeating-lessons',
    s01: {
      en: 'Do the same lessons keep showing up in your life?',
      hi: 'Kya life mein kuch sabak baar-baar repeat hote hain?',
    },
    eyebrow: { en: 'Your Rahu–Ketu axis, from your real birth chart', hi: 'Aapka Rahu–Ketu axis, aapke asli birth chart se' },
    adIds: ['VH-01', 'VH-06', 'VH-08'],
    reveal: 'karmic',
  },
  'known-before': {
    slug: 'known-before',
    s01: {
      en: "Have you met someone and felt you'd known them before?",
      hi: 'Kabhi kisi se pehli baar mile aur laga ki unhe pehle se jaante ho?',
    },
    eyebrow: { en: 'Your Rahu–Ketu axis, from your real birth chart', hi: 'Aapka Rahu–Ketu axis, aapke asli birth chart se' },
    adIds: ['VH-02'],
    reveal: 'karmic',
  },
  'stuck-area': {
    slug: 'stuck-area',
    s01: {
      en: 'Is one area of your life stuck no matter what you try?',
      hi: 'Kya life ka koi ek hissa atka hua hai, chahe kuch bhi kar lo?',
    },
    eyebrow: { en: 'Your Rahu–Ketu axis, from your real birth chart', hi: 'Aapka Rahu–Ketu axis, aapke asli birth chart se' },
    adIds: ['VH-03'],
    reveal: 'karmic',
  },
  'easy-skill': {
    slug: 'easy-skill',
    s01: {
      en: 'Is there a skill that came to you too easily?',
      hi: 'Kya koi hunar aapko bina sikhe hi aa gaya?',
    },
    eyebrow: { en: 'Your Rahu–Ketu axis, from your real birth chart', hi: 'Aapka Rahu–Ketu axis, aapke asli birth chart se' },
    adIds: ['VH-04'],
    reveal: 'karmic',
  },
  'decision-window': {
    slug: 'decision-window',
    s01: {
      en: 'Do you have a big decision coming up?',
      hi: 'Kya koi bada faisla aane wala hai?',
    },
    eyebrow: { en: 'Worked out from your real birth chart', hi: 'Aapke asli birth chart se nikala hua' },
    adIds: ['VH-05'],
    reveal: 'timing',
  },
  'exact-hour': {
    slug: 'exact-hour',
    s01: {
      en: 'Want to see your clearest hour this week?',
      hi: 'Is hafte ka aapka sabse clear ghanta dekhna hai?',
    },
    eyebrow: { en: 'Worked out from your real birth chart', hi: 'Aapke asli birth chart se nikala hua' },
    adIds: ['VH-07'],
    reveal: 'timing',
  },
};

export function getQuizSlug(slug: string | null | undefined): QuizSlug | null {
  if (!slug) return null;
  return Object.prototype.hasOwnProperty.call(QUIZ_SLUGS, slug) ? QUIZ_SLUGS[slug] : null;
}

/**
 * The reveal actually served for a slug. The timing reveal (spec §9 E5) is not built yet,
 * so timing slugs fall back to the karmic reveal. Keep this the single switch point.
 */
export function revealModeFor(_s: QuizSlug): RevealMode {
  return 'karmic';
}
