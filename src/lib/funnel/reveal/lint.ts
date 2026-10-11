/**
 * H5 lint: banned deterministic-fear terms (VEDICHOUR_QUIZ_SPEC §2 H5). Applied to every
 * reveal sentence in tests and to the generated report later (Phase 4). Word-boundary
 * matches, so "studies" or "diet" never trip "die".
 */

const BANNED: { term: string; re: RegExp }[] = [
  ['death', /\bdeaths?\b/i],
  ['die / dying / dead', /\b(die|dies|died|dying|dead)\b/i],
  ['illness diagnosis', /\b(illness|disease|diagnos\w*|cancer of|terminal)\b/i],
  ['curse', /\bcurse[sd]?\b/i],
  ['divorce', /\bdivorc\w*/i],
  ['you will lose', /\byou will lose\b/i],
  ['danger', /\bdanger\w*/i],
  ['black magic', /\bblack magic\b/i],
  ['lifespan', /\b(life ?span|longevity|age at death)\b/i],
  ['number of children', /\bnumber of (children|kids|sons|daughters)\b/i],
  ['pregnancy outcome', /\b(pregnan\w*|miscarr\w*)\b/i],
  ["child's sex", /\b(child'?s (sex|gender)|boy or (a )?girl|son or (a )?daughter)\b/i],
  ['fatal / doom', /\b(fatal|doom\w*)\b/i],
].map(([term, re]) => ({ term: term as string, re: re as RegExp }));

/** Returns the banned terms found in `text` (empty array = clean). */
export function h5Hits(text: string): string[] {
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.term);
}
