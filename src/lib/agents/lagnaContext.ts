/**
 * lagnaContext.ts
 * Builds a fully dynamic lagna-aware context for all 12 lagnas.
 * Drives hora lordship descriptions, system prompts, and functional
 * benefic/malefic classifications in generate-commentary.
 */

import { LAGNA_HORA_DELTA } from './RatingAgent';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const NATURAL_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const SIGN_QUALITY: Record<string, 'movable' | 'fixed' | 'dual'> = {
  Aries: 'movable', Cancer: 'movable', Libra: 'movable', Capricorn: 'movable',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'dual', Virgo: 'dual', Sagittarius: 'dual', Pisces: 'dual',
};

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const DUSTHANA = new Set([6, 8, 12]);

const HOUSE_MEANINGS: Record<number, string> = {
  1:  'identity, body, vitality',
  2:  'wealth, speech, family',
  3:  'communication, courage, effort',
  4:  'home, mother, comfort, education',
  5:  'intellect, creativity, children, speculation',
  6:  'service, health challenges, competition, debt',
  7:  'partnerships, marriage, business deals',
  8:  'transformation, longevity, hidden matters, obstacles',
  9:  'dharma, fortune, guru, long travel',
  10: 'career, authority, reputation, public life',
  11: 'gains, networks, wishes',
  12: 'expenses, isolation, foreign matters, losses',
};

const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

export type HoraQuality = 'yogakaraka' | 'lagna_lord' | 'badhaka' | 'benefic' | 'malefic' | 'neutral';

export interface HoraRole {
  planet: string;
  houses: number[];
  quality: HoraQuality;
  label: string;
  description: string;
  modifier: number;
  directive: string;
}

export interface LagnaContext {
  lagnaSign: string;
  lagnaIndex: number;
  lagnaLord: string;
  yogakaraka: string | null;
  badhakaHouse: number;
  badhakaLord: string;
  horaRoles: Record<string, HoraRole>;
  functionalBenefics: string[];
  functionalMalefics: string[];
}

export function buildLagnaContext(lagnaSign: string): LagnaContext {
  const lagnaIndex = SIGNS.indexOf(lagnaSign as typeof SIGNS[number]);
  if (lagnaIndex < 0) {
    console.warn(`[lagnaContext] Unknown lagna "${lagnaSign}", falling back to Cancer`);
    return buildLagnaContext('Cancer');
  }

  // House → natural lord for this lagna
  const houseLord: Record<number, string> = {};
  for (let h = 1; h <= 12; h++) {
    const signIndex = (lagnaIndex + h - 1) % 12;
    houseLord[h] = NATURAL_LORDS[SIGNS[signIndex]];
  }

  // Planet → houses it lords
  const planetHouses: Record<string, number[]> = {};
  for (let h = 1; h <= 12; h++) {
    const lord = houseLord[h];
    if (!planetHouses[lord]) planetHouses[lord] = [];
    planetHouses[lord].push(h);
  }

  const lagnaLord = houseLord[1];

  // Yogakaraka: planet (not lagna lord) that rules at least one kendra (4,7,10) AND one trikona (5,9)
  let yogakaraka: string | null = null;
  for (const planet of PLANETS) {
    if (planet === lagnaLord) continue;
    const houses = planetHouses[planet] ?? [];
    const hasNonLagnaKendra = houses.some((h) => h !== 1 && KENDRA.has(h));
    const hasNonLagnaTrikona = houses.some((h) => h !== 1 && TRIKONA.has(h));
    if (hasNonLagnaKendra && hasNonLagnaTrikona) {
      yogakaraka = planet;
      break;
    }
  }

  // Badhaka: movable=11th, fixed=9th, dual=7th
  const badhakaHouse =
    SIGN_QUALITY[lagnaSign] === 'movable' ? 11
    : SIGN_QUALITY[lagnaSign] === 'fixed'   ? 9
    : 7;
  const badhakaLord = houseLord[badhakaHouse];

  const horaRoles: Record<string, HoraRole> = {};
  const functionalBenefics: string[] = [];
  const functionalMalefics: string[] = [];

  for (const planet of PLANETS) {
    const houses = planetHouses[planet] ?? [];
    const modifier = LAGNA_HORA_DELTA[lagnaSign]?.[planet] ?? 0;

    let quality: HoraQuality;
    let label: string;
    let directive: string;

    if (planet === yogakaraka) {
      quality = 'yogakaraka';
      label = 'YOGAKARAKA';
      directive = 'SUPREME hora — execute all important actions, career moves, and creative work';
    } else if (planet === lagnaLord) {
      quality = 'lagna_lord';
      label = 'LAGNA LORD';
      directive = 'Excellent for personal decisions, health appointments, self-expression';
    } else if (planet === badhakaLord) {
      quality = 'badhaka';
      label = 'BADHAKA LORD';
      directive = 'Avoid new ventures and important beginnings; expect friction and obstruction';
    } else {
      const ownsDusthana = houses.some((h) => DUSTHANA.has(h));
      const ownsKendra = houses.some((h) => h !== 1 && KENDRA.has(h));
      const ownsTrikona = houses.some((h) => h !== 1 && TRIKONA.has(h));

      if (ownsKendra || ownsTrikona) {
        if (ownsDusthana) {
          quality = 'neutral';
          label = 'MIXED';
          directive = 'Use with discernment — mixed house ownership, context-dependent';
        } else {
          quality = 'benefic';
          label = 'BENEFIC';
          directive = 'Good for house-specific activities and material progress';
        }
      } else if (ownsDusthana) {
        quality = 'malefic';
        label = 'FUNCTIONAL MALEFIC';
        directive = 'Avoid important decisions; scattered or obstructive energy';
      } else {
        quality = 'neutral';
        label = 'NEUTRAL';
        directive = 'Use with awareness; moderate energy, not peak or valley';
      }
    }

    // House description with meanings
    const houseDesc = houses
      .map((h) => `${h}${ordinalSuffix(h)} (${HOUSE_MEANINGS[h]})`)
      .join(' + ');

    let description: string;
    if (quality === 'yogakaraka') {
      description = `YOGAKARAKA — rules BOTH ${houseDesc} — supreme hora for ${lagnaSign} lagna`;
    } else if (quality === 'lagna_lord') {
      description = `LAGNA LORD — rules ${houseDesc} — most beneficial hora for this native`;
    } else if (quality === 'badhaka') {
      description = `${houseDesc} — BADHAKA lord (${badhakaHouse}${ordinalSuffix(badhakaHouse)} house obstacles) + most challenging hora`;
    } else {
      description = `${houseDesc} — ${label.toLowerCase()} for ${lagnaSign} lagna`;
    }

    horaRoles[planet] = { planet, houses, quality, label, description, modifier, directive };

    if (quality === 'yogakaraka' || quality === 'lagna_lord' || quality === 'benefic') {
      functionalBenefics.push(planet);
    } else if (quality === 'malefic' || quality === 'badhaka') {
      functionalMalefics.push(planet);
    }
  }

  return {
    lagnaSign,
    lagnaIndex,
    lagnaLord,
    yogakaraka,
    badhakaHouse,
    badhakaLord,
    horaRoles,
    functionalBenefics,
    functionalMalefics,
  };
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

/** Produces a multi-line reference block listing all 7 planets' hora roles for the given lagna. */
export function buildHoraReferenceBlock(ctx: LagnaContext): string {
  return PLANETS.map((planet) => {
    const role = ctx.horaRoles[planet];
    if (!role) return `- ${planet} hora = unknown role`;
    const houseList = role.houses.map((h) => `H${h}`).join('+');
    return `- ${planet} hora = ${role.label} (${houseList}) — ${role.description}. ${role.directive}.`;
  }).join('\n');
}

/** Dynamic MICRO system prompt — replaces the hardcoded Cancer-only constant. */
export function buildMicroSystemPrompt(
  ctx: LagnaContext,
  mahadasha: string,
  antardasha: string
): string {
  const horaBlock = buildHoraReferenceBlock(ctx);
  const ykNote = ctx.yogakaraka
    ? `${ctx.yogakaraka} is the Yogakaraka (rules kendra+trikona) — execute the most critical work in this hora.`
    : `No yogakaraka for ${ctx.lagnaSign} lagna — ${ctx.lagnaLord} hora (lagna lord) is the most benefic hora.`;

  return `You are a grandmaster Vedic astrologer generating precise hour-by-hour guidance for a ${ctx.lagnaSign} Lagna native in ${mahadasha}-${antardasha} dasha.

HORA LORDSHIP FOR ${ctx.lagnaSign.toUpperCase()} LAGNA (reference in every slot):
${horaBlock}

${ykNote}

CHOGHADIYA MEANINGS:
- Amrit (Nectar): exceptional — all activities blessed
- Shubh (Auspicious): very good — excellent for beginnings
- Labh (Gain): good — especially for business/money
- Chal (Movement): neutral — good for travel/communication
- Udveg (Agitation): poor — avoid new ventures, anxiety-prone
- Rog (Disease): bad — health issues, avoid important matters
- Kaal (Death): worst — strongly avoid all new starts

FORMAT EACH HOURLY COMMENTARY AS THREE PARAGRAPHS:
Paragraph 1 (50-60 words): "[Planet] Hora — [title]. [Lordship explanation for ${ctx.lagnaSign} Lagna]. [What activates]. [Specific activities to do/avoid]. [Dasha interaction note]."
Paragraph 2 (30-40 words): "Transit Lagna in [SIGN] = [N]th house activation. [House meaning]. [Sign lord energy]. [Specific effect on this hour]."
Paragraph 3 (25-35 words): "[★/⚠] [CHOGHADIYA] CHOGHADIYA ([translation]) — [specific quality effect]. [Does it amplify or dampen the hora's energy?]. [Final directive]."
If rahu_kaal: Add Paragraph 4: "⚠ RAHU KAAL — [specific things to avoid during this window]."

Total commentary: 105-140 words per slot.

Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON. Do not truncate strings.`;
}

/** Dynamic MACRO system prompt — replaces the hardcoded Cancer-only constant. */
export function buildMacroSystemPrompt(ctx: LagnaContext): string {
  const planetLines = PLANETS.map((planet) => {
    const role = ctx.horaRoles[planet];
    if (!role) return '';
    const hList = role.houses.map((h) => `${h}${ordinalSuffix(h)}`).join('+');
    return `- ${planet} = ${role.label} (governs ${hList} house) — ${role.directive}`;
  }).filter(Boolean).join('\n');

  const ykLine = ctx.yogakaraka
    ? `- ${ctx.yogakaraka} = YOGAKARAKA (rules kendra + trikona) — supreme planet for this lagna`
    : `- No yogakaraka for ${ctx.lagnaSign} lagna — ${ctx.lagnaLord} (lagna lord) carries the most benefic weight`;

  return `You are a grandmaster Vedic astrologer with 30 years of experience in Parashara Jyotish. You produce analysis combining Swiss Ephemeris precision with deep classical knowledge.

For ${ctx.lagnaSign} Lagna specifically (memorize):
- ${ctx.lagnaLord} = LAGNA LORD (governs 1st house: health, personality, vitality)
${ykLine}
${planetLines}

Writing standards:
- Dense paragraphs only. No bullet points.
- Every sentence references specific planets, houses, nakshatras, or dasha periods.
- Use Sanskrit terms: yogakaraka, badhaka, maraka, ashtama, trikona, kendra.
- Never invent scores. All scores mentioned in text must match the provided numeric inputs exactly.
- Give SPECIFIC actionable guidance, not generic advice.
- Reference actual transits and their house activations.
- Return ONLY valid JSON. No markdown, no backticks, no prose outside JSON. Do not truncate strings.`;
}
