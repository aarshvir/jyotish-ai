/**
 * The "first look": a few values from the person's own chart, shown BEFORE we ask for an
 * email, so what they are asked to save is already something true about them. Pure; every
 * row is computed from the chart engine's reply, and every row says when the birth time
 * limits it. There is no score, no percentage and no accuracy figure.
 */

import { DIGNITY_PHRASE, ordinal, type Dignity } from './reveal/astro';
import type { RevealData } from './reveal/compute';
import { precisionLabel, precisionNotes } from './precision';
import { FOCUS_LABEL, type Lang } from './screens';

export interface LookRow {
  key: 'rising' | 'moon' | 'period' | 'focus';
  label: string;
  value: string;
}

export interface FirstLook {
  rows: LookRow[];
  precision: string;
  notes: string[];
  footer: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 Dec 2028", or "Dec 2028" when only the month is safe to state. */
export function dayLabel(iso: string, monthOnly = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  return monthOnly ? `${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]} ${y}`;
}

const PLANET_HI: Record<string, string> = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal', Mercury: 'Budh', Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
};
const DIGNITY_HI: Record<Dignity, string> = {
  exalted: 'uchch ka',
  own: 'apni rashi mein',
  friend: 'mitra ki rashi mein',
  neutral: 'sam rashi mein',
  enemy: 'ek mushkil rashi mein',
  debilitated: 'neech ka',
};

const planet = (p: string, lang: Lang) => (lang === 'hi' ? (PLANET_HI[p] ?? p) : p);

export function firstLook(r: RevealData, lang: Lang): FirstLook {
  const hi = lang === 'hi';
  const s = r.spread;
  const rows: LookRow[] = [];

  // Rising sign
  let rising: string;
  if (r.precision === 'unknown' || !r.lagna) rising = hi ? 'Iske liye janm ka samay chahiye' : 'Needs your birth time';
  else if (r.precision === 'approx' && s && s.lagnas.length > 1) {
    const others = s.lagnas.filter((x) => x !== r.lagna).join(hi ? ' ya ' : ' or ');
    rising = hi ? `${r.lagna} (${others} bhi ho sakta hai)` : `${r.lagna} (could be ${others})`;
  } else rising = r.lagna;
  rows.push({ key: 'rising', label: hi ? 'Lagna' : 'Rising sign', value: rising });

  // Moon
  let moon: string;
  if (r.precision === 'unknown' && s && (s.moonSigns.length > 1 || s.moonNakshatras.length > 1)) {
    const where = s.moonSigns.length > 1 ? s.moonSigns.join(hi ? ' phir ' : ' then ') : s.moonSigns[0] ?? r.moonSign;
    const naks = s.moonNakshatras.length > 1 ? `${s.moonNakshatras[0]} ${hi ? 'se' : 'to'} ${s.moonNakshatras[s.moonNakshatras.length - 1]}` : s.moonNakshatras[0] ?? r.moonNakshatra;
    moon = hi ? `${where}, ${naks} nakshatra (din bhar badalta hai)` : `${where}, ${naks} nakshatra (it moves during the day)`;
  } else {
    const pada = r.moonPada ? (hi ? `, charan ${r.moonPada}` : `, pada ${r.moonPada}`) : '';
    moon = `${r.moonSign}${r.moonNakshatra ? `, ${r.moonNakshatra} nakshatra${pada}` : ''}`;
  }
  rows.push({ key: 'moon', label: hi ? 'Chandrama' : 'Moon', value: moon });

  // Running period
  const per = r.period;
  if (per) {
    const movable = r.precision === 'unknown' || (r.precision === 'approx' && Boolean(s && s.moonNakshatras.length > 1));
    let value: string;
    if (movable) value = hi ? 'Iske liye pakka janm ka samay chahiye' : 'Needs your exact birth time';
    else if (r.precision === 'approx')
      value = hi
        ? `${planet(per.mahadasha, lang)} / ${planet(per.antardasha, lang)}, lagbhag ${dayLabel(per.antardashaEnds, true)} tak`
        : `${per.mahadasha} / ${per.antardasha}, until about ${dayLabel(per.antardashaEnds, true)}`;
    else
      value = hi
        ? `${planet(per.mahadasha, lang)} / ${planet(per.antardasha, lang)}, ${dayLabel(per.antardashaEnds)} tak`
        : `${per.mahadasha} / ${per.antardasha}, until ${dayLabel(per.antardashaEnds)}`;
    rows.push({ key: 'period', label: hi ? 'Chal rahi dasha' : 'Running period', value });
  }

  // The house for their area
  const f = r.focusLook;
  if (f) {
    const area = FOCUS_LABEL[f.focus][lang];
    const from = r.reference === 'moon' ? (hi ? ' (Chandra se ginkar)' : ' (counted from your Moon)') : '';
    const value = hi
      ? `${ordinal(f.house)} ghar ${f.sign} hai, uska swami ${planet(f.lord, lang)} aapke ${ordinal(f.lordHouse)} ghar mein hai, ${DIGNITY_HI[f.dignity]}.${from}`
      : `The ${ordinal(f.house)} house is ${f.sign}, ruled by ${f.lord}, which sits in your ${ordinal(f.lordHouse)} house, ${DIGNITY_PHRASE[f.dignity]}.${from}`;
    rows.push({ key: 'focus', label: hi ? `${area} ke liye` : `For ${area.toLowerCase()}`, value });
  }

  return {
    rows,
    precision: precisionLabel(r, lang),
    notes: precisionNotes(r, lang),
    footer: hi
      ? 'Yeh pehli jhalak hai. Aapki Rahu–Ketu reading isi chart se banti hai.'
      : 'This is a first look. Your Rahu–Ketu reading is worked out from the same chart.',
  };
}
