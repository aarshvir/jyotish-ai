/**
 * Choghadiya (Vedic time-quality system) — plain English labels.
 * Choghadiya divides the day into 8 periods, each ruled by a planet,
 * each with a quality label in Sanskrit. We show the plain quality
 * and keep the Sanskrit as a native title-tooltip for enthusiasts.
 */
export const CHOGHADIYA_PLAIN: Record<string, { label: string; quality: 'excellent' | 'good' | 'neutral' | 'avoid' }> = {
  Amrit:   { label: 'Excellent',   quality: 'excellent' },
  Shubh:   { label: 'Auspicious',  quality: 'good' },
  Labh:    { label: 'Gainful',     quality: 'good' },
  Char:    { label: 'Variable',    quality: 'neutral' },
  Chal:    { label: 'Moving',      quality: 'neutral' },
  Rog:     { label: 'Difficult',   quality: 'avoid' },
  Kaal:    { label: 'Challenging', quality: 'avoid' },
  Udveg:   { label: 'Anxious',     quality: 'avoid' },
};

/** Plain label for a choghadiya value, falling back to the raw value. */
export function choghadiyaLabel(raw: string | undefined): string {
  if (!raw) return '';
  return CHOGHADIYA_PLAIN[raw]?.label ?? raw;
}

/**
 * Panchang (daily almanac) field labels — plain English for each key.
 * These replace the Sanskrit field names in the daily panchang chip strip.
 */
export const PANCHANG_FIELD_LABELS: Record<string, { label: string; tooltip: string }> = {
  tithi:     { label: 'Moon phase',    tooltip: 'The lunar day (1-30) — indicates the phase of the Moon' },
  nakshatra: { label: 'Birth star',    tooltip: 'The lunar mansion where the Moon is placed today (one of 27 nakshatras)' },
  yoga:      { label: 'Day quality',   tooltip: 'Combined Sun-Moon energy that shapes the overall tone of the day' },
  karana:    { label: 'Half-day',      tooltip: 'The half-lunar-day energy (changes twice daily)' },
  moon_sign: { label: 'Moon in',       tooltip: 'The zodiac sign where the Moon is transiting today' },
};

/**
 * plainify — presentation-layer plain-language guard.
 *
 * The report hero and synthesis are the most prominent surfaces. This function
 * ensures raw LLM scaffold text (ALL-CAPS section headers) and Sanskrit/technical
 * jargon never reach the user — without touching the stored data.
 *
 * Used by: ForecastSnapshot, PeriodSynthesis, WeeklyAnalysis.
 */

/** Common Sanskrit/technical terms → plain English replacements. */
const JARGON_MAP: [RegExp, string][] = [
  [/\bbenefics?\b/gi, 'favourable'],
  [/\bmalefics?\b/gi, 'challenging'],
  [/\bmahadasha\b/gi, 'main life-period'],
  [/\bantardasha\b/gi, 'sub-period'],
  [/\bpratyantardasha\b/gi, 'micro-period'],
  [/\bdasha period\b/gi, 'life-period'],
  [/\bdashas?\b/gi, 'life-period'],
  [/\bhoras\b/gi, 'planetary hours'],
  [/\bhora\b/gi, 'planetary hour'],
  [/\blagnas?\b/gi, 'rising sign'],
  [/\bnakshatras?\b/gi, 'birth star'],
  [/\bgrahas?\b/gi, 'planet'],
  [/\brashis?\b/gi, 'sign'],
  [/\brasis?\b/gi, 'sign'],
  [/\bgochar\b/gi, 'transit'],
  [/\bRahu Kaal\b/gi, 'the challenging window'],
  [/\bH(\d+)\b/g, 'house $1'],
  [/\bgrahas?\b/gi, 'planet'],
  [/\bchoghadiya\b/gi, 'time quality'],
];

/**
 * Strip a leading ALL-CAPS "section header" sentence if one exists.
 * These are LLM-generated scaffolding lines like
 * "MARS-RAHU PERIOD SYNTHESIS FOR CANCER LAGNA - DASHA THEMES AND ACTION AXIS."
 * that should never be user-facing.
 */
function stripScaffoldHeader(text: string): string {
  const stop = text.search(/[.!?]/);
  if (stop > 10) {
    const head = text.slice(0, stop);
    const letters = head.replace(/[^a-zA-Z]/g, '');
    const upper = head.replace(/[^A-Z]/g, '');
    if (letters.length > 8 && upper.length / letters.length > 0.6) {
      return text.slice(stop + 1).trim();
    }
  }
  return text;
}

/**
 * Normalise and plain-ify a text string:
 * 1. Strip leading ALL-CAPS scaffold header.
 * 2. Replace known Sanskrit/technical terms with plain English equivalents.
 */
export function plainify(text: string | undefined): string {
  if (!text) return '';
  let t = String(text).replace(/\s+/g, ' ').trim();
  t = stripScaffoldHeader(t);
  for (const [re, rep] of JARGON_MAP) t = t.replace(re, rep);
  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Strip "Strategy:" / "BEST ACTION:" / "PHASE LINE" section headers from
 * day overviews and month commentaries. These are LLM template artefacts that
 * turn a personal reading into a chatbot response. The bullet content below the
 * header is kept (with "- " prefix removed) so no information is lost.
 */
export function stripTemplateSections(text: string): string {
  if (!text) return '';
  // Remove "Strategy:" section header line (keep bullets below it)
  let t = text.replace(/^Strategy:\s*\n?/gim, '');
  // Remove "BEST ACTION:" section header
  t = t.replace(/^BEST ACTION:\s*/gim, '');
  // Remove "PHASE LINE —" prefix (orchestrator scaffold)
  t = t.replace(/^PHASE LINE\s*[—\-]+\s*/gim, '');
  return t;
}

/** Known dev-only fallback sentinel strings that must never reach users. */
const DEV_FALLBACK_SENTINELS = [
  'Fallback weekly overview',
  'Use daily scores and hourly table as primary guidance',
  'Commentary service temporarily degraded',
  'rely on daily scores and hourly tables as primary guidance',
  'FALLBACK DAY',
  'USE HOURLY TABLE',
  'STRATEGY: Use peak hora windows',
  "native's fundamental disposition",
  'benefic horas for important actions',
  'PHASE LINE',
  'Fallback monthly theme',
];

/**
 * Returns true if the string is a stored dev-fallback (internal scaffolding
 * that was never meant to be user-facing).
 */
export function isDevFallback(text: string | undefined): boolean {
  if (!text) return false;
  return DEV_FALLBACK_SENTINELS.some((s) => text.includes(s));
}
