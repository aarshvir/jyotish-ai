/**
 * The /q funnel's screens, as data (VEDICHOUR_QUIZ_SPEC §5, rebuilt as v2 after the quiz
 * teardown research).
 *
 * Numbering is fixed: the first screen shows "2/N" (endowed start) and the last shows
 * "N/N". The denominator NEVER changes, whatever is answered — a skipped screen (birth
 * time when the time is unknown) just moves the numerator on by two. Interstitials are not
 * numbered; they sit between numbered screens.
 *
 * Copy rules (H3/H4): every interstitial line is either a method fact, a product fact, or
 * reflects the visitor's own answer back (see interstitials.ts). No statistics, no user
 * counts. Hinglish is Roman-script Hindi in the "aap" form.
 */

import type { QuizSlug } from '@/config/quiz_slugs';
import { STEPS as START_STEPS } from '@/lib/quiz/questions';
import { problemOptions, splitCodes, realProblems, problemLabel, OTHER_PROBLEM, CURIOUS_PROBLEM } from './problems';
import type { InterstitialId } from './interstitials';

export type Lang = 'en' | 'hi';
export type T = { en: string; hi: string };

export interface Option {
  value: string;
  label: T;
  emoji?: string;
}

export type FocusArea = 'career' | 'love' | 'family' | 'health' | 'trust';
export type Role = 'scholar' | 'warrior' | 'merchant' | 'healer' | 'ruler' | 'seeker';

/** Screens that vary with earlier answers resolve their title / options at render time. */
export interface Dynamic {
  title?: T;
  subtitle?: T;
  options?: Option[];
}

export type FunnelAnswers = Record<string, string | undefined>;

export type Screen =
  | {
      id: string; spec: string; kind: 'single'; field: string; title: T; subtitle?: T; options: Option[]; numbered: true;
      dyn?: (a: FunnelAnswers) => Dynamic; showIf?: (a: FunnelAnswers) => boolean; legacy?: boolean;
    }
  | { id: string; spec: string; kind: 'picture'; field: string; title: T; options: Option[]; toast: T; numbered: true }
  | {
      id: string; spec: string; kind: 'multi'; field: string; title: T; subtitle?: T; options: Option[]; numbered: true;
      min: number; max: number; exclusive?: string[]; dyn?: (a: FunnelAnswers) => Dynamic; cta: T;
    }
  | {
      id: string; spec: string; kind: 'text'; field: string; title: T; subtitle?: T; placeholder: T; numbered: true;
      maxLength: number; optional: true; cta: T; skip: T;
    }
  | { id: string; spec: string; kind: 'interstitial'; template: InterstitialId; numbered: false; showIf?: (a: FunnelAnswers) => boolean }
  | { id: string; spec: string; kind: 'date' | 'time' | 'city'; field: string; title: T; subtitle?: T; numbered: true; showIf?: (a: FunnelAnswers) => boolean }
  | { id: string; spec: string; kind: 'calc' | 'contact' | 'reveal' | 'offer'; numbered: true };

/** Reused verbatim from /start (spec S10–S13: "REUSE the existing /start components verbatim"). */
function fromStart(id: string): { title: string; subtitle?: string; options?: { value: string; label: string; hint?: string }[] } {
  const s = START_STEPS.find((x) => x.id === id);
  if (!s || !('title' in s)) throw new Error(`missing /start step ${id}`);
  return {
    title: s.title,
    subtitle: 'subtitle' in s ? s.subtitle : undefined,
    options: 'options' in s ? s.options : undefined,
  };
}

const startDate = fromStart('birth_date');
const startKnown = fromStart('birth_time_known');
const startTime = fromStart('birth_time');
const startCity = fromStart('birth_city');
const startFrustration = fromStart('frustration');

const KNOWN_HI: Record<string, string> = {
  exact: 'Haan, bilkul pata hai',
  approx: 'Lagbhag — ek-do ghante idhar-udhar',
  unknown: 'Pata nahi',
};

export const FOCUS_LABEL: Record<FocusArea, T> = {
  career: { en: 'Career & money', hi: 'Career aur paisa' },
  love: { en: 'Love & marriage', hi: 'Pyaar aur shaadi' },
  family: { en: 'Family', hi: 'Parivaar' },
  health: { en: 'Health & energy', hi: 'Sehat aur energy' },
  trust: { en: 'Trust & friendships', hi: 'Bharosa aur dosti' },
};

export const ROLE_LABEL: Record<Role, T> = {
  scholar: { en: 'Scholar / teacher', hi: 'Vidvaan / guru' },
  warrior: { en: 'Warrior / protector', hi: 'Yoddha / rakshak' },
  merchant: { en: 'Merchant / builder', hi: 'Vyapari / nirmaata' },
  healer: { en: 'Healer / caregiver', hi: 'Vaidya / sevak' },
  ruler: { en: 'Ruler / leader', hi: 'Raja / neta' },
  seeker: { en: 'Seeker / monk', hi: 'Saadhak / sanyasi' },
};

export const GOAL_LABEL: Record<string, T> = {
  career_move: { en: 'A career move', hi: 'Career mein badlaav' },
  relationship: { en: 'Marriage / relationship', hi: 'Shaadi / rishta' },
  money: { en: 'More money', hi: 'Zyada paisa' },
  peace: { en: 'Peace of mind', hi: 'Mann ki shaanti' },
  business: { en: 'Starting a business', hi: 'Apna business shuru karna' },
};

/**
 * What has bothered the person about astrology so far. Same codes and English labels as
 * /start's `frustration` question, so the brief reads the same wherever it came from.
 */
const FRUSTRATION_HI: Record<string, string> = {
  vague: 'Bahut general tha, kuch kar nahi paaye',
  fear: 'Chinta badh gayi, clarity nahi mili',
  upsell: 'Gemstone ya puja kharidne ka dabaav',
  generic: 'Sabko ek jaisa jawab',
  cost: 'Har minute ke paise',
  nothing: 'Kuch nahi, mujhe isse madad mili hai',
  new: 'Pehle kabhi try nahi kiya',
};

function frustrationOptions(): Option[] {
  const base = (startFrustration.options ?? [])
    .filter((o) => o.value !== 'nothing')
    .map((o) => ({ value: o.value, label: { en: o.label, hi: FRUSTRATION_HI[o.value] ?? o.label } }));
  return [
    ...base,
    { value: 'nothing', label: { en: 'Nothing, it has helped me', hi: FRUSTRATION_HI.nothing } },
    { value: 'new', label: { en: 'I have not tried it before', hi: FRUSTRATION_HI.new } },
  ];
}

function hookOptions(): Option[] {
  return [
    { value: 'again', emoji: '🔁', label: { en: 'Yes, again and again', hi: 'Haan, baar-baar' } },
    { value: 'one_area', emoji: '🎯', label: { en: 'In one area of my life', hi: 'Life ke ek hisse mein' } },
    { value: 'sometimes', emoji: '🌗', label: { en: 'Sometimes', hi: 'Kabhi-kabhi' } },
    { value: 'not_really', emoji: '🙂', label: { en: 'Not really', hi: 'Nahi, khaas nahi' } },
  ];
}

const hasWords = (a: FunnelAnswers) => (a.mind_words ?? '').trim().length > 0;

/** "Which of these…?" is only worth asking when there is more than one real worry to choose between. */
const hasChoice = (a: FunnelAnswers) => realProblems(splitCodes(a.problems)).length >= 2;

function mindFocusDyn(a: FunnelAnswers): Dynamic {
  const picked = realProblems(splitCodes(a.problems)).slice(0, 3);
  return {
    title: hasWords(a)
      ? { en: 'Which of these is closest to what you wrote?', hi: 'Inmein se kaunsa aapke likhe hue ke sabse kareeb hai?' }
      : { en: 'Which of these weighs on you most?', hi: 'Inmein se sabse zyada kaunsa dabaav daalta hai?' },
    options: [
      ...picked.map((p) => ({ value: p.value, label: p.label })),
      { value: OTHER_PROBLEM.value, label: { en: 'None of these', hi: 'Inmein se koi nahi' } },
    ],
  };
}

/**
 * Every screen the funnel knows about, in flow order, followed by retired questions that
 * are kept only so old saved answers still print their labels in the report brief.
 * Use `screensFor` for the flow a visitor actually walks.
 */
export function buildScreens(slug: QuizSlug): Screen[] {
  return [
    { id: 's01', spec: 'S01', kind: 'single', field: 'hook', numbered: true, title: slug.s01, options: hookOptions() },
    {
      id: 's02', spec: 'S02', kind: 'single', field: 'focus_area', numbered: true,
      title: { en: 'Where does it repeat most?', hi: 'Yeh sabse zyada kahan repeat hota hai?' },
      options: [
        { value: 'career', emoji: '💼', label: FOCUS_LABEL.career },
        { value: 'love', emoji: '💍', label: FOCUS_LABEL.love },
        { value: 'family', emoji: '🏠', label: FOCUS_LABEL.family },
        { value: 'health', emoji: '🌿', label: FOCUS_LABEL.health },
        { value: 'trust', emoji: '🤝', label: FOCUS_LABEL.trust },
      ],
    },
    // Interstitial 1 — the method, and that the funnel heard their area.
    { id: 'i_method', spec: 'I1', kind: 'interstitial', template: 'method', numbered: false },
    {
      id: 'q_problems', spec: 'P1', kind: 'multi', field: 'problems', numbered: true, min: 1, max: 3,
      exclusive: [CURIOUS_PROBLEM.value],
      title: { en: 'What is hardest for you right now?', hi: 'Abhi aapke liye sabse mushkil kya hai?' },
      subtitle: { en: 'Pick up to 3.', hi: 'Zyada se zyada 3 chunein.' },
      options: problemOptions('career'),
      dyn: (a) => ({ options: problemOptions(a.focus_area) }),
      cta: { en: 'Continue', hi: 'Aage badhein' },
    },
    {
      id: 'q_frustration', spec: 'P2', kind: 'multi', field: 'frustration', numbered: true, min: 1, max: 7,
      exclusive: ['nothing', 'new'],
      title: { en: 'What has bothered you about astrology so far?', hi: 'Astrology ke baare mein ab tak kya achha nahi laga?' },
      subtitle: { en: 'Pick any that apply. We use it to decide what to show you.', hi: 'Jo bhi sahi lage chunein. Isse tay hota hai ki hum aapko kya dikhayein.' },
      options: frustrationOptions(),
      cta: { en: 'Continue', hi: 'Aage badhein' },
    },
    // Interstitial 2 — their own answers, and where each is read from.
    { id: 'i_built', spec: 'I2', kind: 'interstitial', template: 'built', numbered: false },
    {
      id: 's07', spec: 'S07', kind: 'picture', field: 'picture', numbered: true,
      title: { en: 'Which image pulls you first?', hi: 'Kaunsi tasveer aapko sabse pehle kheenchti hai?' },
      options: [
        { value: 'temple', label: { en: 'Temple at dawn', hi: 'Subah ka mandir' } },
        { value: 'ghat', label: { en: 'River ghat', hi: 'Nadi ka ghat' } },
        { value: 'fort', label: { en: 'Old fort at dusk', hi: 'Shaam ka purana kila' } },
        { value: 'court', label: { en: 'Royal court', hi: 'Raj darbaar' } },
      ],
      toast: { en: "Noted. Your result comes only from your chart — let's see if it agrees.", hi: 'Note kar liya. Result sirf aapke chart se aayega — dekhte hain woh kya kehta hai.' },
    },
    {
      id: 's08', spec: 'S08', kind: 'single', field: 'self_role', numbered: true,
      title: { en: 'If you lived another life, which role feels familiar?', hi: 'Agar aapka koi aur janam tha, toh kaunsa roop jaana-pehchaana lagta hai?' },
      options: [
        { value: 'scholar', emoji: '📜', label: ROLE_LABEL.scholar },
        { value: 'warrior', emoji: '⚔️', label: ROLE_LABEL.warrior },
        { value: 'merchant', emoji: '🏛️', label: ROLE_LABEL.merchant },
        { value: 'healer', emoji: '🌿', label: ROLE_LABEL.healer },
        { value: 'ruler', emoji: '👑', label: ROLE_LABEL.ruler },
        { value: 'seeker', emoji: '🕉️', label: ROLE_LABEL.seeker },
      ],
    },
    {
      id: 's09', spec: 'S09', kind: 'single', field: 'goal_12m', numbered: true,
      title: { en: 'What matters most in the next 12 months?', hi: 'Agle 12 mahino mein sabse zaroori kya hai?' },
      options: [
        { value: 'career_move', emoji: '🚀', label: GOAL_LABEL.career_move },
        { value: 'relationship', emoji: '💞', label: GOAL_LABEL.relationship },
        { value: 'money', emoji: '💰', label: GOAL_LABEL.money },
        { value: 'peace', emoji: '🕊️', label: GOAL_LABEL.peace },
        { value: 'business', emoji: '🏪', label: GOAL_LABEL.business },
      ],
    },
    {
      id: 'q_words', spec: 'W1', kind: 'text', field: 'mind_words', numbered: true, optional: true, maxLength: 240,
      title: { en: 'In your own words, what is on your mind right now?', hi: 'Apne shabdon mein bataiye, abhi aapke mann mein kya chal raha hai?' },
      subtitle: {
        en: 'A line or two is plenty. English, Hindi or Hinglish all work. You can skip this.',
        hi: 'Ek-do line kaafi hai. English, Hindi ya Hinglish, jo chalega. Chaahein toh skip kar sakte hain.',
      },
      placeholder: { en: 'Write here', hi: 'Yahan likhein' },
      cta: { en: 'Continue', hi: 'Aage badhein' },
      skip: { en: 'Skip', hi: 'Skip karein' },
    },
    // Interstitial 3 — their words, quoted back unchanged.
    { id: 'i_echo', spec: 'I3', kind: 'interstitial', template: 'echo', numbered: false, showIf: hasWords },
    {
      id: 'q_focus', spec: 'W2', kind: 'single', field: 'mind_focus', numbered: true, showIf: hasChoice,
      title: { en: 'Which of these weighs on you most?', hi: 'Inmein se sabse zyada kaunsa dabaav daalta hai?' },
      options: [],
      dyn: mindFocusDyn,
    },
    {
      id: 's10', spec: 'S10', kind: 'date', field: 'birth_date', numbered: true,
      title: { en: startDate.title, hi: 'Aapka janam kab hua?' },
      subtitle: startDate.subtitle ? { en: startDate.subtitle, hi: 'Sab kuch isi se nikalta hai. Aapki details private rehti hain.' } : undefined,
    },
    {
      id: 's11', spec: 'S11', kind: 'single', field: 'birth_time_known', numbered: true,
      title: { en: startKnown.title, hi: 'Kya aapko janam ka samay pata hai?' },
      subtitle: startKnown.subtitle
        ? { en: startKnown.subtitle, hi: 'Sach batayein — andaaze ka samay galat reading deta hai, aur hum yeh saaf bata denge.' }
        : undefined,
      options: (startKnown.options ?? []).map((o) => ({ value: o.value, label: { en: o.label, hi: KNOWN_HI[o.value] ?? o.label } })),
    },
    {
      id: 's12', spec: 'S12', kind: 'time', field: 'birth_time', numbered: true,
      title: { en: startTime.title, hi: 'Aapka janam kitne baje hua?' },
      subtitle: startTime.subtitle ? { en: startTime.subtitle, hi: 'Jitna sahi ho sake.' } : undefined,
      showIf: (a) => a.birth_time_known === 'exact' || a.birth_time_known === 'approx',
    },
    {
      id: 's13', spec: 'S13', kind: 'city', field: 'birth_city', numbered: true,
      title: { en: startCity.title, hi: 'Aapka janam kahan hua?' },
      subtitle: startCity.subtitle ? { en: startCity.subtitle, hi: 'Shehar ya kasbe ka naam kaafi hai — baaki hum nikal lenge.' } : undefined,
    },
    { id: 's14', spec: 'S14', kind: 'calc', numbered: true },
    { id: 's15', spec: 'S15', kind: 'contact', numbered: true },
    { id: 's16', spec: 'S16', kind: 'reveal', numbered: true },
    { id: 's17', spec: 'S17', kind: 'offer', numbered: true },

    // ── retired from the flow, kept so saved answers still print their labels ──────────
    {
      id: 's03', spec: 'S03', kind: 'single', field: 'known_before', numbered: true, legacy: true,
      title: { en: 'Have you ever felt you knew someone before you met them?', hi: 'Kabhi laga ki kisi ko milne se pehle hi jaante ho?' },
      options: [
        { value: 'instantly', emoji: '⚡', label: { en: 'Yes, instantly', hi: 'Haan, turant' } },
        { value: 'once_twice', emoji: '✌️', label: { en: 'Once or twice', hi: 'Ek-do baar' } },
        { value: 'not_sure', emoji: '🤔', label: { en: 'Not sure', hi: 'Pakka nahi pata' } },
        { value: 'never', emoji: '🙅', label: { en: 'Never', hi: 'Kabhi nahi' } },
      ],
    },
    {
      id: 's04', spec: 'S04', kind: 'single', field: 'place_home', numbered: true, legacy: true,
      title: { en: 'Has a place ever felt like home for no reason?', hi: 'Kya koi jagah bina wajah apne ghar jaisi lagi hai?' },
      options: [
        { value: 'strongly', emoji: '🏡', label: { en: 'Yes, strongly', hi: 'Haan, bahut zyada' } },
        { value: 'few_times', emoji: '🧭', label: { en: 'A few times', hi: 'Kuch baar' } },
        { value: 'not_really', emoji: '🙂', label: { en: 'Not really', hi: 'Nahi, khaas nahi' } },
      ],
    },
    {
      id: 's05', spec: 'S05', kind: 'single', field: 'skills_fears', numbered: true, legacy: true,
      title: { en: 'Which sounds most like you?', hi: 'Inmein se aap par sabse zyada kya lagu hota hai?' },
      options: [
        { value: 'skills', emoji: '✨', label: { en: 'Some skills come unusually easily', hi: 'Kuch hunar bahut aasaani se aate hain' } },
        { value: 'fears', emoji: '🌫️', label: { en: "Some fears I can't explain", hi: 'Kuch dar jinki wajah samajh nahi aati' } },
        { value: 'both', emoji: '☯️', label: { en: 'Both', hi: 'Dono' } },
        { value: 'neither', emoji: '➖', label: { en: 'Neither', hi: 'Dono mein se koi nahi' } },
      ],
    },
  ];
}

/** E1 short variant drops these questions. */
const SHORT_DROP = new Set(['q_frustration', 's07', 's09', 'q_focus']);

/** The flow a visitor walks. */
export function screensFor(slug: QuizSlug, length: 'full' | 'short'): Screen[] {
  const flow = buildScreens(slug).filter((s) => !('legacy' in s && s.legacy));
  return length === 'short' ? flow.filter((s) => !SHORT_DROP.has(s.id)) : flow;
}

export function isShown(s: Screen, a: FunnelAnswers): boolean {
  return !('showIf' in s) || !s.showIf || s.showIf(a);
}

/** A single- or multi-choice screen's title, subtitle and options after earlier answers apply. */
export function resolveChoice(s: Extract<Screen, { kind: 'single' | 'multi' }>, a: FunnelAnswers): { title: T; subtitle?: T; options: Option[] } {
  const d = s.dyn ? s.dyn(a) : {};
  return { title: d.title ?? s.title, subtitle: d.subtitle ?? s.subtitle, options: d.options ?? s.options };
}

/** Label of a chosen option, in the given language, for any choice screen (including retired ones). */
export function chosenLabel(screens: Screen[], field: string, value: string, lang: Lang): string {
  if (field === 'problems' || field === 'mind_focus') return problemLabel(value, lang);
  for (const s of screens) {
    if ((s.kind === 'single' || s.kind === 'picture' || s.kind === 'multi') && s.field === field) {
      const o = s.options.find((x) => x.value === value);
      if (o) return o.label[lang] || o.label.en;
    }
  }
  return value;
}
