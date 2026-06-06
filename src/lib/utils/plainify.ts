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
  [/\bRahu Kaal\b/gi, 'the challenging hour (Rahu Kaal)'],
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

/** Known dev-only fallback sentinel strings that must never reach users. */
const DEV_FALLBACK_SENTINELS = [
  'Fallback weekly overview',
  'Use daily scores and hourly table as primary guidance',
  'Commentary service temporarily degraded',
  'rely on daily scores and hourly tables as primary guidance',
];

/**
 * Returns true if the string is a stored dev-fallback (internal scaffolding
 * that was never meant to be user-facing).
 */
export function isDevFallback(text: string | undefined): boolean {
  if (!text) return false;
  return DEV_FALLBACK_SENTINELS.some((s) => text.includes(s));
}
