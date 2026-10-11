/**
 * "Check this against any free kundli": the numbers a person can compare with another site,
 * and the method behind them, all read from the chart engine's reply. Turning an unprovable
 * word ("accurate") into something anyone can test is the point. Where the birth time limits
 * a value, the card says so instead of printing a figure that would not match.
 */

import { ordinal } from './reveal/astro';
import type { RevealData } from './reveal/compute';
import type { Lang } from './screens';

export interface CheckRow {
  key: string;
  label: string;
  value: string;
}

export interface CrossCheck {
  title: string;
  intro: string;
  rows: CheckRow[];
  method: string;
  caution: string;
}

/** 19.06 degrees inside a sign becomes 19°04′. */
export function dms(deg: number): string {
  const total = Math.min(Math.round(deg * 60), 30 * 60 - 1);
  const d = Math.floor(total / 60);
  const m = total % 60;
  return `${d}°${String(m).padStart(2, '0')}′`;
}

export function crossCheck(r: RevealData, lang: Lang): CrossCheck {
  const hi = lang === 'hi';
  const rows: CheckRow[] = [];

  if (r.lagna && r.degrees.lagna !== null) {
    rows.push({ key: 'lagna', label: hi ? 'Lagna' : 'Rising sign', value: `${r.lagna} ${dms(r.degrees.lagna)}` });
  } else {
    rows.push({ key: 'lagna', label: hi ? 'Lagna' : 'Rising sign', value: hi ? 'Janm ka samay chahiye' : 'Needs your birth time' });
  }

  const moonMoves = r.precision === 'unknown' && r.spread && (r.spread.moonSigns.length > 1 || r.spread.moonNakshatras.length > 1);
  if (moonMoves) {
    rows.push({ key: 'moon', label: hi ? 'Chandrama' : 'Moon', value: hi ? 'Din bhar badalta hai. Samay chahiye.' : 'Moves during the day. Needs your birth time.' });
  } else if (r.degrees.moon !== null) {
    const pada = r.moonPada ? (hi ? `, charan ${r.moonPada}` : `, pada ${r.moonPada}`) : '';
    rows.push({ key: 'moon', label: hi ? 'Chandrama' : 'Moon', value: `${r.moonSign} ${dms(r.degrees.moon)}${r.moonNakshatra ? `, ${r.moonNakshatra}${pada}` : ''}` });
  }

  if (r.degrees.rahu !== null) rows.push({ key: 'rahu', label: 'Rahu', value: `${r.rahu.sign} ${dms(r.degrees.rahu)}, ${ordinal(r.rahu.house)} ${hi ? 'ghar' : 'house'}` });
  if (r.degrees.ketu !== null) rows.push({ key: 'ketu', label: 'Ketu', value: `${r.ketu.sign} ${dms(r.degrees.ketu)}, ${ordinal(r.ketu.house)} ${hi ? 'ghar' : 'house'}` });

  return {
    title: hi ? 'Kisi bhi free kundli se milaakar dekhein' : 'Check this against any free kundli',
    intro: hi
      ? 'Koi bhi free kundli site kholein aur yeh aankde milayein. Agar Lagna ek degree se zyada alag ho, toh humein likhein.'
      : 'Open any free kundli site and compare these numbers. If your rising sign differs by more than a degree, write to us.',
    rows,
    method: hi
      ? 'Tareeka: Swiss Ephemeris, Lahiri ayanamsa, whole-sign ghar. Ghar aapke Lagna se ginte hain, ya Chandra se jab samay nahi hai.'
      : 'Method: Swiss Ephemeris, Lahiri ayanamsa, whole-sign houses. Houses are counted from your rising sign, or from your Moon when there is no birth time.',
    caution: hi
      ? 'Dekh lein ki doosri site ne aapka asli janm ka samay liya ho. Kuch sites samay na dene par 12:00 AM maan leti hain.'
      : 'Check that the other site used your real birth time. Some sites fill in 12:00 AM when none is given.',
  };
}
