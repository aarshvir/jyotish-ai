/**
 * The words around the free reveal (headings, card titles, labels) in English and Hinglish.
 *
 * The reading itself (lib/funnel/reveal/content.ts, forty-odd paragraphs keyed to signs and
 * houses) is English only. Putting that much astrology into Hinglish needs a native editor,
 * not a quick translation, so in Hinglish mode the headings are Hinglish and a plain line says
 * the reading is in English for now.
 */

import { ROLE_LABEL, type Lang } from './screens';
import type { RevealData } from './reveal/compute';

export function revealChrome(lang: Lang, name?: string) {
  const hi = lang === 'hi';
  return {
    eyebrow: hi ? 'Aapka Karmic Blueprint · free hissa' : 'Your Karmic Blueprint · the free part',
    title: hi ? (name ? `${name}, yeh raha aapka Rahu–Ketu axis.` : 'Yeh raha aapka Rahu–Ketu axis.') : name ? `${name}, here is your Rahu–Ketu axis.` : 'Here is your Rahu–Ketu axis.',
    englishNote: hi ? 'Reading abhi sirf English mein hai.' : null,
    pickVsChart: hi ? 'Aapki pasand aur aapka chart' : 'Your pick vs your chart',
    fullBlueprint: hi ? 'Aapke poore blueprint mein' : 'In your full blueprint',
    sameChart: hi ? 'Isi chart se nikala gaya.' : 'Worked out from the same chart.',
  };
}

const CARD_TITLE_HI: Record<string, string> = {
  ketu: 'Aap kya saath laaye (Ketu)',
  rahu: 'Yeh janam aapse kya maangta hai (Rahu)',
  merit: 'Purva punya ka bhandaar (5th ghar ka swami)',
};

export function cardTitle(card: RevealData['cards'][number], lang: Lang): string {
  return lang === 'hi' ? (CARD_TITLE_HI[card.key] ?? card.title) : card.title;
}

const LOCKED_HI: Record<string, string> = {
  'Your karmic-debt house & what eases it': 'Aapka karmic karz ka ghar aur use kya halka karta hai',
  'Rahu–Ketu sensitive windows, next 12 months': 'Agle 12 mahine ke Rahu–Ketu ke naazuk din',
  'The life chapter (dasha) you’re in now': 'Aapki chal rahi dasha, life ka chapter',
  'Relationship karma (7th house + Venus)': 'Rishton ka karma (7th ghar + Shukra)',
  'Career karma (10th house + Saturn)': 'Career ka karma (10th ghar + Shani)',
};

export function lockedTitle(title: string, lang: Lang): string {
  return lang === 'hi' ? (LOCKED_HI[title] ?? title) : title;
}

/** The "your pick vs your chart" sentence, rebuilt in the chosen language from the same facts. */
export function matchLine(m: NonNullable<RevealData['match']>, lang: Lang): string {
  if (lang !== 'hi') return m.text;
  const you = ROLE_LABEL[m.chosen].hi;
  return m.agrees
    ? `Aapne ${you} chuna. Aapka Ketu bhi yahi kehta hai.`
    : `Aapne ${you} chuna. Aapka Ketu ${ROLE_LABEL[m.archetype].hi} ki taraf ishaara karta hai, aur poora blueprint is farq ko samjhata hai.`;
}
