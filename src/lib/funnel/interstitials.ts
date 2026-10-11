/**
 * Interstitials for the /q funnel — the screens between questions.
 *
 * Rule: an interstitial may say only three kinds of thing, and every template declares
 * which (`truth`):
 *   answer   — it repeats what the person chose or typed, in their own words;
 *   computed — it shows a value our chart engine produced for them;
 *   policy   — it states how the method works, or a product fact from productFacts.ts.
 * Nothing else is allowed: no counts of other users, no ratings, no "accuracy", no
 * testimonials, no interpretation of free text. The tests in funnelInterstitials.test.ts
 * fail the build if a template has no truth source or contains such a claim.
 *
 * Templates are pure: (answers, language) → resolved strings. The React side only renders.
 */

import { classifyQuestion } from '@/lib/notify/winback';
import { FOCUS_LABEL, type FocusArea, type FunnelAnswers, type Lang, type T } from './screens';
import { LENS_TEXT, realProblems, splitCodes, type Lens } from './problems';
import { factHolds, type FactKey } from './productFacts';

export type TruthSource = 'answer' | 'computed' | 'policy';
export type InterstitialId = 'method' | 'built' | 'echo';

export type Block =
  | { kind: 'chips'; label: string; items: string[] }
  | { kind: 'pair'; head: string; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'line'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'note'; text: string };

export interface BuiltInterstitial {
  id: InterstitialId;
  eyebrow: string;
  title: string;
  blocks: Block[];
  cta: string;
  truth: TruthSource[];
}

export interface InterstitialDef {
  id: InterstitialId;
  /** What this interstitial is allowed to rest on. Never empty. */
  truth: TruthSource[];
  cta: T;
}

const t = (x: T, lang: Lang) => x[lang] || x.en;

/** The longest free-text answer we accept, in characters. */
export const MIND_WORDS_MAX = 240;

export function mindWords(a: FunnelAnswers): string {
  return (a.mind_words ?? '').replace(/\s+/g, ' ').trim().slice(0, MIND_WORDS_MAX);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ── focus ─────────────────────────────────────────────────────────────────────

/** Where Jyotish reads each life area. Method facts, true for everyone. */
const FOCUS_READ: Record<FocusArea, T> = {
  career: {
    en: 'In Jyotish, work is read from your 10th house and money from your 2nd and 11th. Saturn shows where effort pays slowly but surely.',
    hi: 'Jyotish mein kaam 10th house se aur paisa 2nd aur 11th house se padha jaata hai. Shani batata hai ki mehnat kahan dheere par pakka phal deti hai.',
  },
  love: {
    en: 'In Jyotish, partnership is read from your 7th house and from Venus. When Rahu or Ketu sits on the 1st–7th axis, relationships become a main life lesson.',
    hi: 'Jyotish mein rishta 7th house aur Shukra se padha jaata hai. Jab Rahu ya Ketu 1st–7th axis par hote hain, toh rishte life ka bada sabak bante hain.',
  },
  family: {
    en: 'In Jyotish, home and mother are read from your 4th house and the Moon, and family wealth and speech from the 2nd.',
    hi: 'Jyotish mein ghar aur maa 4th house aur Chandra se padhe jaate hain. Parivaar ka dhan aur vaani 2nd house se.',
  },
  health: {
    en: 'Jyotish reads vitality from your 1st house and the Sun, and daily routine from the 6th. This is a reading of patterns and timing, never a medical opinion.',
    hi: 'Jyotish mein jeevan-shakti 1st house aur Surya se, aur roz ki dinacharya 6th house se padhi jaati hai. Yeh patterns aur timing ki reading hai, doctor ki salah nahi.',
  },
  trust: {
    en: 'In Jyotish, friends and networks are read from your 11th house, and courage and siblings from the 3rd.',
    hi: 'Jyotish mein dost aur network 11th house se, aur himmat aur bhai-behen 3rd house se padhe jaate hain.',
  },
};

const FOCUS_CLOSE: T = {
  en: 'Your result will show which of these houses your Rahu–Ketu axis falls across.',
  hi: 'Aapka result dikhayega ki aapka Rahu–Ketu axis in mein se kin gharon se guzarta hai.',
};

function focusOf(a: FunnelAnswers): FocusArea | null {
  const f = a.focus_area;
  return f && f in FOCUS_LABEL ? (f as FocusArea) : null;
}

// ── policy sentences, each tied to a product fact ────────────────────────────

interface PolicyLine {
  /** Facts that must all hold for this sentence to be shown. */
  needs: FactKey[];
  text: T;
}

const FRUSTRATION_POLICY: Record<string, PolicyLine[]> = {
  vague: [
    {
      needs: [],
      text: {
        en: 'Each result starts from something we calculated for you: a sign, a house, a nakshatra or a date.',
        hi: 'Har result ek nikaali hui cheez se shuru hota hai. Rashi, ghar, nakshatra ya tareekh.',
      },
    },
  ],
  fear: [
    {
      needs: ['no_fear_predictions'],
      text: {
        en: 'We describe tendencies and timing. We do not predict illness, loss or death.',
        hi: 'Hum rujhaan aur samay batate hain. Bimari, nuksaan ya maut ki bhavishyavani nahi karte.',
      },
    },
  ],
  upsell: [
    {
      needs: ['no_gemstone_sales', 'no_puja_sales'],
      text: { en: 'We do not sell gemstones, pujas or rituals.', hi: 'Hum gemstone, puja ya anushthan nahi bechte.' },
    },
    { needs: ['no_gemstone_sales'], text: { en: 'We do not sell gemstones.', hi: 'Hum gemstone nahi bechte.' } },
  ],
  generic: [
    {
      needs: [],
      text: {
        en: 'Change your birth time or place and the houses and dates change. The answers you give here travel with your chart too.',
        hi: 'Janm ka samay ya jagah badlo toh ghar aur tareekhein badal jaati hain. Yahan diye aapke jawab bhi aapke chart ke saath rehte hain.',
      },
    },
  ],
  cost: [
    {
      needs: ['flat_price_not_per_minute'],
      text: { en: 'Plans are a flat price. Nothing is billed by the minute.', hi: 'Plan ek fixed keemat ka hota hai. Har minute ke paise nahi lagte.' },
    },
  ],
};

/** The first policy sentence for `code` whose facts all hold today, or null. */
export function policyLine(code: string, lang: Lang): string | null {
  const options = FRUSTRATION_POLICY[code];
  if (!options) return null;
  const hit = options.find((o) => o.needs.every(factHolds));
  return hit ? t(hit.text, lang) : null;
}

// ── safety note for typed words ──────────────────────────────────────────────

/**
 * Typed words are never interpreted. But if they touch something we will not read
 * (health, death, what another person feels), the plain policy is stated once so the
 * person is not left hoping we will. This only names our policy; it says nothing
 * about the person. A capitalised "Cancer" is the zodiac sign, not the illness.
 */
export function safetyNote(words: string, lang: Lang): string | null {
  const cleaned = words.replace(/\bCancer\b/g, 'the sign');
  const kind = classifyQuestion(cleaned);
  if (kind === 'medical')
    return lang === 'hi'
      ? 'Ek baat saaf bata dein: VedicHour sehat ki bhavishyavani ya medical salah nahi deta. Sehat ki chinta ho toh doctor se milein.'
      : 'One thing to say plainly: VedicHour makes no health predictions and gives no medical advice. For a health worry, please see a doctor.';
  if (kind === 'mortality')
    return lang === 'hi'
      ? 'Ek baat saaf bata dein: VedicHour maut ya umar ke baare mein koi bhavishyavani nahi karta.'
      : 'One thing to say plainly: VedicHour makes no predictions about death or how long anyone will live.';
  if (kind === 'third_party')
    return lang === 'hi'
      ? 'VedicHour sirf aapki apni kundli padhta hai. Kisi doosre insaan ke mann ya agle kadam ke baare mein nahi batata.'
      : 'VedicHour reads your own chart. It does not tell you what another person feels or will do.';
  return null;
}

// ── the templates ────────────────────────────────────────────────────────────

export const INTERSTITIALS: Record<InterstitialId, InterstitialDef> = {
  method: { id: 'method', truth: ['policy', 'answer'], cta: { en: 'Continue', hi: 'Aage badhein' } },
  built: { id: 'built', truth: ['answer', 'policy'], cta: { en: 'Continue', hi: 'Aage badhein' } },
  echo: { id: 'echo', truth: ['answer', 'policy'], cta: { en: 'Continue', hi: 'Aage badhein' } },
};

export function buildInterstitial(id: InterstitialId, a: FunnelAnswers, lang: Lang): BuiltInterstitial {
  const def = INTERSTITIALS[id];
  const base = { id, cta: t(def.cta, lang), truth: def.truth };
  const focus = focusOf(a);

  if (id === 'method') {
    const blocks: Block[] = [
      {
        kind: 'line',
        text:
          lang === 'hi'
            ? 'Vedic jyotish inhe aapke birth chart ke Rahu–Ketu axis se padhta hai. Ketu dikhata hai jo aap pehle se saath laaye ho. Rahu dikhata hai ki yeh janam aapko kis taraf kheenchta hai. Hum aapka axis aapki janam tithi, samay aur jagah se nikalenge.'
            : 'Vedic astrology reads them through the Rahu–Ketu axis in your birth chart. Ketu shows what you carry in from before. Rahu shows what this life pulls you toward. We calculate yours from your birth date, time and place.',
      },
    ];
    if (focus) {
      blocks.push({ kind: 'chips', label: lang === 'hi' ? 'Aapne chuna' : 'You chose', items: [t(FOCUS_LABEL[focus], lang)] });
      blocks.push({
        kind: 'line',
        text: `${lang === 'hi' ? 'Hum pehle yahi dekhenge.' : 'We will look at this first.'} ${t(FOCUS_READ[focus], lang)} ${t(FOCUS_CLOSE, lang)}`,
      });
    }
    return {
      ...base,
      eyebrow: lang === 'hi' ? 'Tareeka kaise kaam karta hai' : 'How the method works',
      title: lang === 'hi' ? 'Jyotish mein baar-baar aane wale patterns ka ek naam hai.' : 'In Jyotish, repeating patterns have a name.',
      blocks,
    };
  }

  if (id === 'built') {
    const codes = splitCodes(a.problems);
    const problems = realProblems(codes);
    const frustrations = splitCodes(a.frustration).filter((c) => c !== 'nothing');
    const blocks: Block[] = [];

    // The area they chose is a chip; each worry they picked appears once, as its own card below.
    if (focus) blocks.push({ kind: 'chips', label: lang === 'hi' ? 'Aapne chuna' : 'You chose', items: [t(FOCUS_LABEL[focus], lang)] });

    // One sentence per distinct lens — where each worry is read from. Method facts only.
    const seen = new Set<Lens>();
    for (const p of problems) {
      if (seen.has(p.lens)) continue;
      seen.add(p.lens);
      blocks.push({ kind: 'pair', head: t(p.label, lang), text: t(LENS_TEXT[p.lens], lang) });
    }
    if (!problems.length && focus) blocks.push({ kind: 'line', text: t(FOCUS_READ[focus], lang) });

    const policy = frustrations.map((c) => policyLine(c, lang)).filter((x): x is string => Boolean(x));
    if (policy.length) {
      blocks.push({ kind: 'heading', text: lang === 'hi' ? 'Astrology se jo shikayat thi' : 'About astrology so far' });
      for (const p of policy) blocks.push({ kind: 'line', text: p });
    }

    blocks.push({
      kind: 'note',
      text:
        lang === 'hi'
          ? 'Aapka free first look sirf aapke birth chart se aayega. Aapke jawab us brief mein jaate hain jisse aapki poori reading likhi jaati hai.'
          : 'Your free first look comes from your birth chart alone. Your answers go into the brief your full reading is written from.',
    });
    return {
      ...base,
      eyebrow: lang === 'hi' ? 'Aapke jawab' : 'Your answers',
      title: lang === 'hi' ? 'Aapki reading ise is tarah use karegi.' : 'Here is how your reading will use them.',
      blocks,
    };
  }

  // echo
  const words = mindWords(a);
  const blocks: Block[] = [
    { kind: 'quote', text: words },
    {
      kind: 'line',
      text: lang === 'hi' ? 'Humne ise bilkul waise hi aapke chart ke saath rakh liya hai.' : 'We have kept it, word for word, with your chart.',
    },
    {
      kind: 'line',
      text:
        lang === 'hi'
          ? 'Yeh us brief mein jaata hai jisse aapki poori reading likhi jaati hai. Aapka free first look sirf aapke birth chart se aata hai.'
          : 'It goes into the brief your full reading is written from. Your free first look comes from your birth chart alone.',
    },
  ];
  const safety = safetyNote(words, lang);
  if (safety) blocks.push({ kind: 'note', text: safety });
  return {
    ...base,
    eyebrow: lang === 'hi' ? 'Aapke shabdon mein' : 'In your own words',
    title: lang === 'hi' ? 'Aapne yeh likha.' : 'This is what you wrote.',
    blocks,
  };
}

/**
 * Every string an interstitial can show, in both languages, for the content tests: the
 * built templates for every focus area, plus the lens, policy and safety sentences
 * (whatever the product facts say today).
 */
export function allInterstitialText(): string[] {
  const out: string[] = [];
  const allProblems = ALL_PROBLEM_CODES.join(',');
  for (const lang of ['en', 'hi'] as Lang[]) {
    for (const f of Object.keys(FOCUS_LABEL)) {
      const a: FunnelAnswers = { focus_area: f, problems: allProblems.split(',').slice(0, 3).join(','), frustration: 'vague,fear,upsell,generic,cost,nothing', mind_words: 'sample words' };
      for (const id of Object.keys(INTERSTITIALS) as InterstitialId[]) {
        const b = buildInterstitial(id, a, lang);
        out.push(b.eyebrow, b.title, b.cta);
        for (const blk of b.blocks) {
          if (blk.kind === 'chips') out.push(blk.label, ...blk.items);
          else if (blk.kind === 'pair') out.push(blk.head, blk.text);
          else if (blk.kind !== 'quote') out.push(blk.text);
        }
      }
      out.push(t(FOCUS_READ[f as FocusArea], lang));
    }
    for (const lens of Object.values(LENS_TEXT)) out.push(t(lens, lang));
    for (const lines of Object.values(FRUSTRATION_POLICY)) for (const l of lines) out.push(t(l.text, lang));
    for (const w of ['my health report worries me', 'will I die early', 'does he love me or not']) {
      const n = safetyNote(w, lang);
      if (n) out.push(n);
    }
    out.push(t(FOCUS_CLOSE, lang));
  }
  return out;
}

const ALL_PROBLEM_CODES = ['career_stuck', 'money_leaks', 'money_debt'];
