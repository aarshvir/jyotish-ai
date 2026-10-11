/**
 * Plain sentences about how far a result could move if the birth time is not exactly what
 * was entered. Everything here is read from `RevealData.spread` (the chart engine run at the
 * edges of the uncertainty), so the caveats are measured, not boilerplate: a rough time that
 * keeps the same rising sign is told so, and one that does not is told that too.
 */

import { signIndex } from './reveal/astro';
import type { RevealData } from './reveal/compute';
import type { Lang } from './screens';

const list = (xs: string[], lang: Lang) => xs.join(lang === 'hi' ? ' ya ' : ' or ');

export function precisionLabel(r: Pick<RevealData, 'precision'>, lang: Lang): string {
  const hi = lang === 'hi';
  if (r.precision === 'exact') return hi ? 'Janm ka samay: pakka' : 'Birth time: exact';
  if (r.precision === 'approx') return hi ? 'Janm ka samay: lagbhag' : 'Birth time: approximate';
  return hi ? 'Janm ka samay: pata nahi' : 'Birth time: not known';
}

export function precisionNotes(r: RevealData, lang: Lang): string[] {
  const hi = lang === 'hi';
  const out: string[] = [];
  const s = r.spread;

  if (r.precision === 'unknown') {
    out.push(
      hi
        ? `Aapne janm ka samay nahi diya, isliye yahan rising sign nahi hai. Ghar aapke Chandra (${r.moonSign}) se ginte hain, jo aapki janm tareekh par dopahar mein wahin tha.`
        : `You did not give a birth time, so there is no rising sign here. Houses are counted from your Moon, which was in ${r.moonSign} at midday on your birth date.`,
    );
    if (s && s.moonSigns.length > 1) {
      const other = s.moonSigns.find((x) => x !== r.moonSign) ?? s.moonSigns[1];
      const after = (signIndex(other) - signIndex(r.moonSign) + 12) % 12 === 1;
      out.push(
        hi
          ? `Aapki janm tareekh par Chandra ne rashi badli (${list(s.moonSigns, 'hi')}), isliye bina samay ke hum nahi bata sakte ki aapka kaunsa tha. Agar ${other} tha, toh har ghar ka number ek ${after ? 'kam' : 'zyada'} hoga (1 aur 12 ghoom jaate hain).`
          : `Your Moon changed sign on your birth date (${s.moonSigns.join(', then ')}), so without a time we cannot say which one is yours. If it was ${other}, every house number here would be one ${after ? 'lower' : 'higher'}, with 1 and 12 wrapping round.`,
      );
    } else if (s) {
      out.push(
        hi
          ? `Aapki janm tareekh par Chandra poora din ${r.moonSign} mein rehta hai, isliye usse ginne par ghar samay par nirbhar nahi karte.`
          : `Your Moon stays in ${r.moonSign} through your whole birth date, so houses counted from it do not depend on the time.`,
      );
    }
    if (s && s.moonNakshatras.length > 1) {
      const first = s.moonNakshatras[0];
      const last = s.moonNakshatras[s.moonNakshatras.length - 1];
      out.push(
        hi
          ? `Aapka Chandra nakshatra din ke shuru mein ${first} aur baad mein ${last} hai, isliye wo bhi samay par nirbhar hai.`
          : `Your Moon nakshatra is ${first} early in the day and ${last} late, so it also depends on the time.`,
      );
    }
    return out;
  }

  if (r.precision === 'approx') {
    if (s && s.lagnas.length > 1 && r.lagna) {
      const others = s.lagnas.filter((x) => x !== r.lagna);
      out.push(
        hi
          ? `Aapka janm ka samay lagbhag hai. Diye hue samay par rising sign ${r.lagna} hai. Do ghante idhar-udhar hone par yeh ${list(others, 'hi')} bhi ho sakta hai. Ghar ${r.lagna} se ginte hain.`
          : `Your birth time is approximate. Your rising sign is ${r.lagna} at the time you gave, and could be ${list(others, 'en')} if it is two hours off. Houses here are counted from ${r.lagna}.`,
      );
    } else if (s && r.lagna) {
      out.push(
        hi
          ? `Aapka janm ka samay lagbhag hai. Do ghante idhar-udhar tak bhi rising sign ${r.lagna} hi rehta hai, isliye yahan ke ghar tikte hain.`
          : `Your birth time is approximate. Your rising sign stays ${r.lagna} for two hours either side of it, so the houses here hold.`,
      );
    } else {
      out.push(
        hi
          ? 'Aapka janm ka samay lagbhag hai. Agar asli samay ek-do ghante alag hua, toh rising sign aur ghar badal sakte hain.'
          : 'Your birth time is approximate. If the real time is an hour or two off, the rising sign and houses could differ.',
      );
    }
    if (s && s.moonSigns.length > 1) {
      out.push(
        hi
          ? `Chandra ki rashi bhi ${list(s.moonSigns, 'hi')} ho sakti hai.`
          : `Your Moon sign could also be ${list(s.moonSigns, 'en')}.`,
      );
    }
    if (s && s.moonNakshatras.length > 1) {
      out.push(
        hi
          ? `Chandra nakshatra ${list(s.moonNakshatras, 'hi')} ho sakta hai, isliye chal rahi dasha bhi alag ho sakti hai.`
          : `Your Moon nakshatra could be ${list(s.moonNakshatras, 'en')}, so the running period could differ too.`,
      );
    }
  }
  return out;
}
