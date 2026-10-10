/**
 * The /q funnel's screens (VEDICHOUR_QUIZ_SPEC §5), as data.
 *
 * Numbering is fixed: S01 shows "2/18" (endowed start) and S17 shows "18/18". The
 * denominator NEVER changes, whatever is answered — a skipped screen (birth time when the
 * time is unknown) just moves the numerator on by two. Interstitials (`kind: 'info'`)
 * other than S06 are not numbered; they sit between numbered screens.
 *
 * Copy rules (H3/H4): every interstitial line is either educational (how Jyotish reads a
 * thing) or reflects the visitor's own answer back. No statistics, no user counts.
 */

import type { QuizSlug } from '@/config/quiz_slugs';
import { STEPS as START_STEPS } from '@/lib/quiz/questions';

export type Lang = 'en' | 'hi';
export type T = { en: string; hi: string };

export interface Option {
  value: string;
  label: T;
  emoji?: string;
}

export type FocusArea = 'career' | 'love' | 'family' | 'health' | 'trust';
export type Role = 'scholar' | 'warrior' | 'merchant' | 'healer' | 'ruler' | 'seeker';

export type Screen =
  | { id: string; spec: string; kind: 'single'; field: string; title: T; subtitle?: T; options: Option[]; numbered: true }
  | { id: string; spec: string; kind: 'picture'; field: string; title: T; options: Option[]; toast: T; numbered: true }
  | { id: string; spec: string; kind: 'info'; title: T; body: T; cta: T; numbered: boolean }
  | { id: string; spec: string; kind: 'date' | 'time' | 'city'; field: string; title: T; subtitle?: T; numbered: true; showIf?: (a: FunnelAnswers) => boolean }
  | { id: string; spec: string; kind: 'calc' | 'contact' | 'reveal' | 'offer'; numbered: true };

export type FunnelAnswers = Record<string, string | undefined>;

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
 * Concern-adaptive interstitial after S02. Each line is a plain statement of how Jyotish
 * reads that area — true for everyone, and it shows the funnel heard their answer.
 */
export const FOCUS_INTERSTITIAL: Record<FocusArea, { title: T; body: T }> = {
  career: {
    title: { en: 'Career & money. That is exactly what this reading is built around.', hi: 'Career aur paisa — yeh reading isi ke liye bani hai.' },
    body: {
      en: 'In Jyotish, work is read from your 10th house and money from your 2nd and 11th. Saturn shows where effort pays slowly but surely. Your result will say which of these houses your Rahu–Ketu axis falls across.',
      hi: 'Jyotish mein kaam 10th house se aur paisa 2nd aur 11th house se padha jaata hai. Shani batata hai ki mehnat kahan dheere par pakka phal deti hai. Aapka result batayega ki aapka Rahu–Ketu axis in mein se kis ghar se guzarta hai.',
    },
  },
  love: {
    title: { en: 'Love & marriage. That is exactly what this reading is built around.', hi: 'Pyaar aur shaadi — yeh reading isi ke liye bani hai.' },
    body: {
      en: 'In Jyotish, partnership is read from your 7th house and from Venus. When Rahu or Ketu touches the 1st–7th axis, relationships become a main life lesson. Your result will show whether yours does.',
      hi: 'Jyotish mein rishta 7th house aur Shukra se padha jaata hai. Jab Rahu ya Ketu 1st–7th axis par hote hain, toh rishte life ka bada sabak bante hain. Aapka result dikhayega ki aapke chart mein aisa hai ya nahi.',
    },
  },
  family: {
    title: { en: 'Family. That is exactly what this reading is built around.', hi: 'Parivaar — yeh reading isi ke liye bani hai.' },
    body: {
      en: 'In Jyotish, home and mother are read from your 4th house and the Moon, and family wealth and speech from the 2nd. Your result will show whether your Rahu–Ketu axis runs through either.',
      hi: 'Jyotish mein ghar aur maa 4th house aur Chandra se, aur parivaar ka dhan aur vaani 2nd house se padhe jaate hain. Aapka result dikhayega ki aapka Rahu–Ketu axis in gharon se guzarta hai ya nahi.',
    },
  },
  health: {
    title: { en: 'Health & energy. Here is how Jyotish looks at it.', hi: 'Sehat aur energy — Jyotish ise aise dekhta hai.' },
    body: {
      en: 'Jyotish reads vitality from your 1st house and the Sun, and daily routines from the 6th. This is a reading of patterns and timing, never a medical opinion. Your result will show where your Rahu–Ketu axis sits.',
      hi: 'Jyotish mein jeevan-shakti 1st house aur Surya se, aur roz ki dinacharya 6th house se padhi jaati hai. Yeh patterns aur timing ki reading hai, doctor ki salah nahi. Aapka result dikhayega ki aapka Rahu–Ketu axis kahan hai.',
    },
  },
  trust: {
    title: { en: 'Trust & friendships. That is exactly what this reading is built around.', hi: 'Bharosa aur dosti — yeh reading isi ke liye bani hai.' },
    body: {
      en: 'In Jyotish, friends and networks are read from your 11th house, and courage and siblings from the 3rd. Your result will show which houses your Rahu–Ketu axis crosses.',
      hi: 'Jyotish mein dost aur network 11th house se, aur himmat aur bhai-behen 3rd house se padhe jaate hain. Aapka result dikhayega ki aapka Rahu–Ketu axis kin gharon se guzarta hai.',
    },
  },
};

/** Goal-adaptive interstitial before the birth details. Educational and true. */
export function goalInterstitial(goal: string | undefined): { title: T; body: T } {
  const g = (goal && GOAL_LABEL[goal]) || { en: 'Your next 12 months', hi: 'Aapke agle 12 mahine' };
  return {
    title: {
      en: `${g.en}: noted. Now the part that makes this yours.`,
      hi: `${g.hi}: samajh gaye. Ab woh hissa jo ise sirf aapka banata hai.`,
    },
    body: {
      en: 'Rahu and Ketu move one sign about every 18 months, so the sign alone is shared by many people. The house they fall in depends on your exact birth time and place — that is what we calculate next.',
      hi: 'Rahu aur Ketu lagbhag har 18 mahine mein rashi badalte hain, isliye sirf rashi bahut logon ki ek jaisi hoti hai. Woh kis ghar mein hain, yeh aapke janam ke sahi samay aur jagah se tay hota hai — wahi hum ab nikalenge.',
    },
  };
}

function hookOptions(): Option[] {
  return [
    { value: 'again', emoji: '🔁', label: { en: 'Yes, again and again', hi: 'Haan, baar-baar' } },
    { value: 'one_area', emoji: '🎯', label: { en: 'In one area of my life', hi: 'Life ke ek hisse mein' } },
    { value: 'sometimes', emoji: '🌗', label: { en: 'Sometimes', hi: 'Kabhi-kabhi' } },
    { value: 'not_really', emoji: '🙂', label: { en: 'Not really', hi: 'Nahi, khaas nahi' } },
  ];
}

/** Full 18-step funnel, in order. The short variant (E1) filters this list. */
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
    // Body/title are filled at render time from FOCUS_INTERSTITIAL (they depend on S02).
    { id: 'i_focus', spec: 'I1', kind: 'info', numbered: false, title: { en: '', hi: '' }, body: { en: '', hi: '' }, cta: { en: 'Continue', hi: 'Aage badhein' } },
    {
      id: 's03', spec: 'S03', kind: 'single', field: 'known_before', numbered: true,
      title: { en: 'Have you ever felt you knew someone before you met them?', hi: 'Kabhi laga ki kisi ko milne se pehle hi jaante ho?' },
      options: [
        { value: 'instantly', emoji: '⚡', label: { en: 'Yes, instantly', hi: 'Haan, turant' } },
        { value: 'once_twice', emoji: '✌️', label: { en: 'Once or twice', hi: 'Ek-do baar' } },
        { value: 'not_sure', emoji: '🤔', label: { en: 'Not sure', hi: 'Pakka nahi pata' } },
        { value: 'never', emoji: '🙅', label: { en: 'Never', hi: 'Kabhi nahi' } },
      ],
    },
    {
      id: 's04', spec: 'S04', kind: 'single', field: 'place_home', numbered: true,
      title: { en: 'Has a place ever felt like home for no reason?', hi: 'Kya koi jagah bina wajah apne ghar jaisi lagi hai?' },
      options: [
        { value: 'strongly', emoji: '🏡', label: { en: 'Yes, strongly', hi: 'Haan, bahut zyada' } },
        { value: 'few_times', emoji: '🧭', label: { en: 'A few times', hi: 'Kuch baar' } },
        { value: 'not_really', emoji: '🙂', label: { en: 'Not really', hi: 'Nahi, khaas nahi' } },
      ],
    },
    {
      id: 's05', spec: 'S05', kind: 'single', field: 'skills_fears', numbered: true,
      title: { en: 'Which sounds most like you?', hi: 'Inmein se aap par sabse zyada kya lagu hota hai?' },
      options: [
        { value: 'skills', emoji: '✨', label: { en: 'Some skills come unusually easily', hi: 'Kuch hunar bahut aasaani se aate hain' } },
        { value: 'fears', emoji: '🌫️', label: { en: "Some fears I can't explain", hi: 'Kuch dar jinki wajah samajh nahi aati' } },
        { value: 'both', emoji: '☯️', label: { en: 'Both', hi: 'Dono' } },
        { value: 'neither', emoji: '➖', label: { en: 'Neither', hi: 'Dono mein se koi nahi' } },
      ],
    },
    {
      id: 's06', spec: 'S06', kind: 'info', numbered: true,
      title: { en: 'In Jyotish, this has a name.', hi: 'Jyotish mein iska ek naam hai.' },
      body: {
        en: "Vedic astrology reads repeating patterns through the Rahu–Ketu axis in your birth chart. Ketu shows what you carry in from before. Rahu shows what this life pulls you toward. We'll calculate yours from your exact birth moment.",
        hi: 'Vedic jyotish baar-baar aane wale patterns ko aapke birth chart ke Rahu–Ketu axis se padhta hai. Ketu dikhata hai jo aap pehle se saath laaye ho. Rahu dikhata hai ki yeh janam aapko kis taraf kheenchta hai. Hum aapka axis aapke janam ke sahi pal se nikalenge.',
      },
      cta: { en: 'Continue', hi: 'Aage badhein' },
    },
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
    { id: 'i_goal', spec: 'I2', kind: 'info', numbered: false, title: { en: '', hi: '' }, body: { en: '', hi: '' }, cta: { en: 'Enter my birth details', hi: 'Janam ki details bharein' } },
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
  ];
}

/** E1 short variant drops S03, S04, S05, S07, S09 (and the goal interstitial that follows S09). */
const SHORT_DROP = new Set(['s03', 's04', 's05', 's07', 's09', 'i_goal']);

export function screensFor(slug: QuizSlug, length: 'full' | 'short'): Screen[] {
  const all = buildScreens(slug);
  return length === 'short' ? all.filter((s) => !SHORT_DROP.has(s.id)) : all;
}

export function isShown(s: Screen, a: FunnelAnswers): boolean {
  return !('showIf' in s) || !s.showIf || s.showIf(a);
}
