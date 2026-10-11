/**
 * The lines on the "Building your brief" screen. Pure: every line is produced from a value
 * that exists — the birth details the person gave, the chart the engine returned, or an
 * answer they chose — so the screen can never claim a step that did not happen.
 *
 * Two groups:
 *   chart   — computed by the chart engine from their birth details;
 *   answers — their own choices, listed as the inputs the brief is written from.
 */

import { ordinal } from './reveal/astro';
import type { RevealData } from './reveal/compute';
import { FOCUS_LABEL, GOAL_LABEL, type FocusArea, type FunnelAnswers, type Lang } from './screens';
import { findProblem, problemLabel, realProblems, splitCodes } from './problems';
import { mindWords, wordCount } from './interstitials';

export interface BriefLine {
  key: string;
  text: string;
}

export interface BirthInput {
  city: string;
  lat: number;
  lng: number;
  birth_time: string | null;
  time_known: string;
}

const deg = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

/** What we know before the engine answers: the place and how sure the time is. Both are the person's own input. */
export function inputLines(b: BirthInput, lang: Lang): BriefLine[] {
  const hi = lang === 'hi';
  const place = `${b.city} · ${deg(b.lat, 'N', 'S')} ${deg(b.lng, 'E', 'W')}`;
  const time =
    b.time_known === 'exact' && b.birth_time
      ? hi ? `Janm ka samay: ${b.birth_time} (pakka)` : `Birth time: ${b.birth_time} (exact)`
      : b.time_known === 'approx' && b.birth_time
        ? hi ? `Janm ka samay: lagbhag ${b.birth_time}` : `Birth time: about ${b.birth_time}`
        : hi ? 'Janm ka samay: pata nahi. Ghar aapke Chandra se ginenge.' : 'Birth time: not known. Houses will be counted from your Moon.';
  return [
    { key: 'place', text: hi ? `Janm sthan mil gaya: ${place}` : `Birth place found: ${place}` },
    { key: 'time', text: time },
  ];
}

/** Lines from the engine's answer. Houses are counted from the rising sign, or from the Moon when there is no birth time. */
export function chartLines(r: RevealData, lang: Lang): BriefLine[] {
  const hi = lang === 'hi';
  const out: BriefLine[] = [];
  if (r.lagna) out.push({ key: 'lagna', text: hi ? `Lagna: ${r.lagna}` : `Rising sign: ${r.lagna}` });
  if (r.moonNakshatra) {
    const pada = r.moonPada ? (hi ? `, charan ${r.moonPada}` : `, pada ${r.moonPada}`) : '';
    out.push({
      key: 'moon',
      text: hi ? `Chandrama: ${r.moonSign}, ${r.moonNakshatra} nakshatra${pada}` : `Moon: ${r.moonSign}, ${r.moonNakshatra} nakshatra${pada}`,
    });
  } else {
    out.push({ key: 'moon', text: hi ? `Chandrama: ${r.moonSign}` : `Moon: ${r.moonSign}` });
  }
  const house = (n: number) => (hi ? `${ordinal(n)} ghar` : `${ordinal(n)} house`);
  out.push({ key: 'ketu', text: `Ketu: ${r.ketu.sign}, ${house(r.ketu.house)}` });
  out.push({ key: 'rahu', text: `Rahu: ${r.rahu.sign}, ${house(r.rahu.house)}` });
  return out;
}

/** The answers the brief is written from, and the ones that are deliberately not used to read the chart. */
export function answerLines(a: FunnelAnswers, lang: Lang): BriefLine[] {
  const hi = lang === 'hi';
  const out: BriefLine[] = [];
  const focus = a.focus_area && a.focus_area in FOCUS_LABEL ? FOCUS_LABEL[a.focus_area as FocusArea][lang] : null;
  if (focus) out.push({ key: 'focus', text: hi ? `Aapka area: ${focus}` : `Your area: ${focus}` });

  const worries = realProblems(splitCodes(a.problems));
  if (worries.length) {
    const names = worries.map((p) => problemLabel(p.value, lang)).join('; ');
    out.push({ key: 'problems', text: hi ? `Aapki mushkilein: ${names}` : `What is hardest: ${names}` });
  }
  const weighs = a.mind_focus ? findProblem(a.mind_focus) : undefined;
  if (weighs) out.push({ key: 'weighs', text: hi ? `Sabse bhaari: ${weighs.label.hi}` : `Weighs most: ${weighs.label.en}` });

  const bothered = splitCodes(a.frustration).filter((c) => c !== 'nothing' && c !== 'new');
  if (bothered.length) {
    out.push({
      key: 'frustration',
      text: hi ? `Astrology se ${bothered.length} shikayatein dhyan mein rakhi` : `${bothered.length} thing${bothered.length === 1 ? '' : 's'} that bothered you about astrology, kept in mind`,
    });
  }

  const goal = a.goal_12m && GOAL_LABEL[a.goal_12m] ? GOAL_LABEL[a.goal_12m][lang] : null;
  if (goal) out.push({ key: 'goal', text: hi ? `Agle 12 mahine ka lakshya: ${goal}` : `Your goal for 12 months: ${goal}` });

  const words = mindWords(a);
  if (words) {
    const n = wordCount(words);
    out.push({ key: 'words', text: hi ? `Aapke apne shabd (${n} shabd), jaise likhe waise` : `Your own words (${n} word${n === 1 ? '' : 's'}), as you wrote them` });
  }

  if (a.picture || a.self_role) {
    const both = Boolean(a.picture && a.self_role);
    out.push({
      key: 'compare',
      text: hi
        ? both
          ? 'Aapki chuni tasveer aur role se chart nahi padha jaata. Role ko sirf chart se milaya jaata hai.'
          : a.self_role
            ? 'Aapke chune role se chart nahi padha jaata. Use sirf chart se milaya jaata hai.'
            : 'Aapki chuni tasveer se chart nahi padha jaata.'
        : both
          ? 'Your image and role picks are never used to read your chart. The role is only compared with it.'
          : a.self_role
            ? 'Your role pick is never used to read your chart. It is only compared with it.'
            : 'Your image pick is never used to read your chart.',
    });
  }
  return out;
}
