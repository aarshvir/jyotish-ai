/**
 * "What is hardest right now?" — the multi-select that makes the quiz feel like it is
 * about the person. The options depend on the area they chose, and every option carries
 * a `lens`: the classical house(s) Jyotish reads for that kind of worry. That mapping is
 * the whole of what the next interstitial claims, so it is data, not prose written on
 * the fly (nothing here interprets a person; it only says where a topic is read from).
 *
 * Multi-select answers are stored as comma-separated codes ("career_stuck,money_leaks")
 * so the funnel's answer type stays a flat string map.
 */

import type { FocusArea, Option, T } from './screens';

export type Lens = 'work' | 'money' | 'partnership' | 'home' | 'duty' | 'mind' | 'energy' | 'friends' | 'trust';

export interface ProblemOption {
  value: string;
  label: T;
  lens: Lens;
}

export const OTHER_PROBLEM: { value: string; label: T } = {
  value: 'other',
  label: { en: 'Something else', hi: 'Kuch aur' },
};
export const CURIOUS_PROBLEM: { value: string; label: T } = {
  value: 'curious',
  label: { en: 'Nothing urgent, I am just curious', hi: 'Koi jaldi nahi, bas jaanna hai' },
};

export const PROBLEMS: Record<FocusArea, ProblemOption[]> = {
  career: [
    { value: 'career_stuck', lens: 'work', label: { en: 'I am stuck in the same role with no growth', hi: 'Ek hi role mein atka hun, growth nahi hai' } },
    { value: 'career_switch', lens: 'work', label: { en: 'I want to change jobs but cannot decide', hi: 'Job badalni hai, par faisla nahi ho paa raha' } },
    { value: 'career_unseen', lens: 'work', label: { en: 'My effort is not recognised', hi: 'Meri mehnat ki kadar nahi hoti' } },
    { value: 'money_leaks', lens: 'money', label: { en: 'Money comes in and goes straight out', hi: 'Paisa aata hai aur turant nikal jaata hai' } },
    { value: 'money_debt', lens: 'duty', label: { en: 'Loans or EMIs are weighing on me', hi: 'Loan ya EMI ka bojh hai' } },
    { value: 'business_slow', lens: 'work', label: { en: 'My business is not growing as it should', hi: 'Business utna nahi badh raha jitna badhna chahiye' } },
  ],
  love: [
    { value: 'love_delay', lens: 'partnership', label: { en: 'Marriage keeps getting delayed', hi: 'Shaadi baar-baar tal rahi hai' } },
    { value: 'love_repeat', lens: 'partnership', label: { en: 'The same relationship trouble keeps coming back', hi: 'Rishton mein wahi pareshani baar-baar aati hai' } },
    { value: 'love_doubt', lens: 'partnership', label: { en: 'I am unsure about my partner or a proposal', hi: 'Partner ya rishte ke prastaav ko lekar pakka nahi hun' } },
    { value: 'love_talk', lens: 'partnership', label: { en: 'We do not understand each other', hi: 'Hum ek-doosre ko samajh nahi paate' } },
    { value: 'love_alone', lens: 'mind', label: { en: 'I feel alone even around people', hi: 'Logon ke beech bhi akelapan lagta hai' } },
    { value: 'love_pressure', lens: 'home', label: { en: 'My family is pressing me about marriage', hi: 'Shaadi ko lekar ghar ka dabaav hai' } },
  ],
  family: [
    { value: 'fam_tension', lens: 'home', label: { en: 'There is tension at home', hi: 'Ghar mein tanaav rehta hai' } },
    { value: 'fam_expect', lens: 'home', label: { en: "I cannot meet my parents' expectations", hi: 'Mata-pita ki umeedein poori nahi ho paa rahi' } },
    { value: 'fam_burden', lens: 'duty', label: { en: 'Too much responsibility sits on me', hi: 'Zimmedaari ka bojh mujh par zyada hai' } },
    { value: 'fam_distance', lens: 'home', label: { en: 'I live far from my family', hi: 'Parivaar se door rehna pad raha hai' } },
    { value: 'fam_property', lens: 'home', label: { en: 'A property or inheritance matter is stuck', hi: 'Zameen ya jaidaad ka maamla atka hua hai' } },
    { value: 'fam_worry', lens: 'home', label: { en: 'I keep worrying about someone in my family', hi: 'Parivaar ke kisi sadasya ki chinta rehti hai' } },
  ],
  health: [
    { value: 'en_tired', lens: 'energy', label: { en: 'I feel low on energy most days', hi: 'Zyada tar din energy kam rehti hai' } },
    { value: 'en_sleep', lens: 'mind', label: { en: 'My mind will not switch off at night', hi: 'Raat ko dimaag band nahi hota' } },
    { value: 'en_stress', lens: 'mind', label: { en: 'Stress does not go away', hi: 'Tanaav jaata hi nahi' } },
    { value: 'en_routine', lens: 'duty', label: { en: 'My routine keeps falling apart', hi: 'Meri dinacharya baar-baar bigad jaati hai' } },
    { value: 'en_flat', lens: 'mind', label: { en: 'I feel flat and unmotivated', hi: 'Mann nahi lagta, motivation nahi hai' } },
    { value: 'en_focus', lens: 'energy', label: { en: 'I cannot hold my focus on one thing', hi: 'Ek cheez par dhyan nahi tikta' } },
  ],
  trust: [
    { value: 'tr_betrayed', lens: 'trust', label: { en: 'Someone I trusted let me down', hi: 'Jis par bharosa kiya, usne dhokha diya' } },
    { value: 'tr_hard', lens: 'trust', label: { en: 'It is hard for me to trust people now', hi: 'Ab logon par bharosa karna mushkil lagta hai' } },
    { value: 'tr_oneway', lens: 'friends', label: { en: 'My friendships feel one-sided', hi: 'Dosti mein sab kuch ek taraf se lagta hai' } },
    { value: 'tr_work', lens: 'work', label: { en: 'There is politics at work', hi: 'Office mein politics hai' } },
    { value: 'tr_few', lens: 'friends', label: { en: 'I have few people I can truly rely on', hi: 'Bharosa karne layak log kam hain' } },
    { value: 'tr_money', lens: 'money', label: { en: 'Money I lent has not come back', hi: 'Udhaar diya hua paisa wapas nahi aaya' } },
  ],
};

/**
 * Where Jyotish reads each lens. Parashari basics: 10th career, 2nd and 11th wealth, 7th
 * partnership, 4th home, 6th debts and daily duties, 1st vitality, 3rd courage, 9th
 * dharma, Moon the mind. Each is a statement about the method, true for everyone.
 */
export const LENS_TEXT: Record<Lens, T> = {
  work: {
    en: 'Work and standing are read from your 10th house. Saturn shows where steady effort pays.',
    hi: 'Kaam aur pad 10th ghar se padhe jaate hain. Shani batata hai ki lagatar mehnat kahan rang laati hai.',
  },
  money: {
    en: 'Money is read from your 2nd house, what you keep, and your 11th, what comes in.',
    hi: 'Paisa 2nd ghar (jo bachta hai) aur 11th ghar (jo aata hai) se padha jaata hai.',
  },
  partnership: {
    en: 'Partnership and marriage are read from your 7th house and Venus.',
    hi: 'Rishta aur shaadi 7th ghar aur Shukra se padhe jaate hain.',
  },
  home: {
    en: 'Home, family property and peace at home are read from your 4th house and the Moon.',
    hi: 'Ghar, jaidaad aur ghar ki shaanti 4th ghar aur Chandra se padhi jaati hai.',
  },
  duty: {
    en: 'Daily routine, duties and debts are read from your 6th house.',
    hi: 'Roz ki dinacharya, zimmedaari aur karz 6th ghar se padhe jaate hain.',
  },
  mind: {
    en: 'The mind, and how steady it feels, is read from the Moon and your 4th house.',
    hi: 'Mann aur uski sthirta Chandra aur 4th ghar se padhi jaati hai.',
  },
  energy: {
    en: 'Vitality and daily energy are read from your 1st house and the Sun.',
    hi: 'Jeevan-shakti aur roz ki energy 1st ghar aur Surya se padhi jaati hai.',
  },
  friends: {
    en: 'Friends and wider circles are read from your 11th house, courage and siblings from your 3rd.',
    hi: 'Dost aur daayra 11th ghar se, himmat aur bhai-behen 3rd ghar se padhe jaate hain.',
  },
  trust: {
    en: 'Close dealings with other people are read from your 7th house, friendships from your 11th.',
    hi: 'Doosron ke saath nazdiki lena-dena 7th ghar se, dosti 11th ghar se padhi jaati hai.',
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

export function splitCodes(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function joinCodes(codes: string[]): string {
  return codes.join(',');
}

/** The options to offer for a focus area: six specific ones, then the two escape hatches. */
export function problemOptions(focus: string | undefined): Option[] {
  const list = (focus && PROBLEMS[focus as FocusArea]) || PROBLEMS.career;
  return [
    ...list.map((p) => ({ value: p.value, label: p.label })),
    { value: CURIOUS_PROBLEM.value, label: CURIOUS_PROBLEM.label },
    { value: OTHER_PROBLEM.value, label: OTHER_PROBLEM.label },
  ];
}

const ALL: ProblemOption[] = (Object.values(PROBLEMS) as ProblemOption[][]).flat();

export function findProblem(code: string): ProblemOption | undefined {
  return ALL.find((p) => p.value === code);
}

export function problemLabel(code: string, lang: 'en' | 'hi'): string {
  if (code === OTHER_PROBLEM.value) return OTHER_PROBLEM.label[lang];
  if (code === CURIOUS_PROBLEM.value) return CURIOUS_PROBLEM.label[lang];
  const p = findProblem(code);
  return p ? p.label[lang] || p.label.en : code;
}

/** Chosen problems that are real worries (not the "just curious" / "something else" exits). */
export function realProblems(codes: string[]): ProblemOption[] {
  return codes.map(findProblem).filter((p): p is ProblemOption => Boolean(p));
}
