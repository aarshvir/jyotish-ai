/**
 * Ashtakoot / Guna Milan — 8 kootas, 36 points max.
 * Uses Moon nakshatra indices 0..26 (Ashwini=0 … Revati=26).
 * Classical groupings follow common North-Indian parashari tables used in software kundli.
 */

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const;

/** 0 Deva, 1 Manushya, 2 Rakshasa */
const GANA: number[] = [
  0, 1, 2, 1, 0, 2, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
];

/** 0 Vata, 1 Pitta, 2 Kapha (simplified nadi groups) */
const NADI: number[] = [
  0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 1,
];

const YONI_MAP: number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8,
];

export interface KootaLine {
  name: string;
  max: number;
  score: number;
  note: string;
}

export interface AshtakootResult {
  total: number;
  max: number;
  breakdown: KootaLine[];
}

function scoreVarna(sunOrMoonSignA: number, sunOrMoonSignB: number): KootaLine {
  const va = sunOrMoonSignA % 3;
  const vb = sunOrMoonSignB % 3;
  const ok = va === vb || (va + vb) % 3 !== 0;
  const score = ok ? 1 : 0;
  return {
    name: 'Varna',
    max: 1,
    score,
    note: ok ? 'Temperament class compatible' : 'Temperament class friction',
  };
}

function scoreVashya(signA: number, signB: number): KootaLine {
  const groups = [
    [0, 1, 6, 7, 8, 11],
    [2, 3, 4, 5, 9, 10],
  ];
  const ga = groups[0].includes(signA % 12) ? 0 : 1;
  const gb = groups[0].includes(signB % 12) ? 0 : 1;
  const score = ga === gb ? 2 : ga === 0 && gb === 1 ? 2 : 0;
  return {
    name: 'Vashya',
    max: 2,
    score,
    note: score > 0 ? 'Magnetic affinity present' : 'Weaker mutual control',
  };
}

function scoreTara(nakA: number, nakB: number): KootaLine {
  const t = (nakB - nakA + 27) % 27;
  const good = [0, 3, 5, 7, 10, 12, 13, 16, 18, 21, 24];
  const medium = [1, 4, 6, 9, 11, 14, 17, 19, 22, 25];
  let score = 0;
  if (good.includes(t)) score = 3;
  else if (medium.includes(t)) score = 1.5;
  return {
    name: 'Tara',
    max: 3,
    score,
    note: `Tara count ${t + 1} of 27`,
  };
}

function scoreYoni(nakA: number, nakB: number): KootaLine {
  const ya = YONI_MAP[nakA] ?? 0;
  const yb = YONI_MAP[nakB] ?? 0;
  const score = ya === yb ? 4 : Math.abs(ya - yb) === 1 ? 2 : 0;
  return {
    name: 'Yoni',
    max: 4,
    score,
    note: ya === yb ? 'Same yoni animal' : 'Different instincts',
  };
}

function scoreGrahaMaitri(nakA: number, nakB: number): KootaLine {
  const ga = GANA[nakA] ?? 0;
  const gb = GANA[nakB] ?? 0;
  let score = 0;
  if (ga === gb) score = 5;
  else if ((ga === 0 && gb === 1) || (ga === 1 && gb === 0)) score = 4;
  else if ((ga === 0 && gb === 2) || (ga === 2 && gb === 0)) score = 1;
  else score = 3;
  return {
    name: 'Graha Maitri',
    max: 5,
    score,
    note: 'Friendship of lunar constellations (gana)',
  };
}

function scoreGana(nakA: number, nakB: number): KootaLine {
  const ga = GANA[nakA] ?? 0;
  const gb = GANA[nakB] ?? 0;
  const score = ga === gb ? 6 : ga === 1 || gb === 1 ? 3 : 0;
  return {
    name: 'Gana',
    max: 6,
    score,
    note: ga === gb ? 'Same gana' : 'Mixed temperament',
  };
}

function scoreBhakoot(signA: number, signB: number): KootaLine {
  const diff = (signB - signA + 12) % 12;
  const bad = [6, 8];
  const score = bad.includes(diff) ? 0 : 7;
  return {
    name: 'Bhakoot',
    max: 7,
    score,
    note: score === 7 ? 'Rashi relationship supportive' : 'Bhakoot dosha risk (2/12, 5/12, 6/8)',
  };
}

function scoreNadi(nakA: number, nakB: number): KootaLine {
  const na = NADI[nakA] ?? 0;
  const nb = NADI[nakB] ?? 0;
  const score = na !== nb ? 8 : 0;
  return {
    name: 'Nadi',
    max: 8,
    score,
    note: na === nb ? 'Same nāḍi — classical 0' : 'Different nāḍi — full points',
  };
}

/**
 * @param moonNakshatraIndexA — 0..26 for partner A (male tradition uses male moon first; we label neutrally)
 */
export function computeAshtakoot(params: {
  moonNakshatraIndexA: number;
  moonNakshatraIndexB: number;
  moonSignIndexA: number;
  moonSignIndexB: number;
}): AshtakootResult {
  const a = ((params.moonNakshatraIndexA % 27) + 27) % 27;
  const b = ((params.moonNakshatraIndexB % 27) + 27) % 27;
  const sa = ((params.moonSignIndexA % 12) + 12) % 12;
  const sb = ((params.moonSignIndexB % 12) + 12) % 12;

  const breakdown: KootaLine[] = [
    scoreVarna(sa, sb),
    scoreVashya(sa, sb),
    scoreTara(a, b),
    scoreYoni(a, b),
    scoreGrahaMaitri(a, b),
    scoreGana(a, b),
    scoreBhakoot(sa, sb),
    scoreNadi(a, b),
  ];

  const total = breakdown.reduce((s, k) => s + k.score, 0);
  return {
    total: Math.round(total * 10) / 10,
    max: 36,
    breakdown,
  };
}

/** Moon longitude 0..360° → nakshatra index 0..26 */
export function longitudeToNakshatraIndex(lonDeg: number): number {
  const x = ((lonDeg % 360) + 360) % 360;
  const nk = Math.floor(x / (360 / 27));
  return Math.min(26, Math.max(0, nk));
}
