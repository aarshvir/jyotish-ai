/**
 * Rahu Kaal windows must advise restraint. LLMs sometimes still use initiation
 * verbs ("sign", "commit", "launch") even when the prompt says not to.
 * Strip those recommendations after generation so paid reports never tell a
 * seeker to start something new during Rahu Kaal.
 */

const INITIATION_WORDS =
  /\b(start|launch|sign|commit|initiate|begin new|open new|negotiate|act on|push important|seize)\b/i;

const CAUTION_OPENER =
  'RAHU KAAL — avoid starting anything new in this window. Finish existing work, review, and wait. Do not sign, commit, or launch.';

function hasPrecedingNegation(text: string, matchIndex: number): boolean {
  const window = text.slice(Math.max(0, matchIndex - 36), matchIndex);
  return /\b(do not|don't|dont|avoid|never|stop|not|no)\b/i.test(window);
}

/** True when commentary recommends initiation during Rahu Kaal without a nearby negation. */
export function rahuKaalRecommendsInitiation(commentary: string): boolean {
  const text = commentary ?? '';
  const re = new RegExp(INITIATION_WORDS.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (!hasPrecedingNegation(text, match.index)) return true;
  }
  return false;
}

/**
 * If this is a Rahu Kaal slot and the prose still recommends initiation,
 * prepend a hard caution and leave the rest (minus a duplicate RAHU KAAL opener).
 */
export function sanitizeRahuKaalCommentary(commentary: string, isRahuKaal: boolean): string {
  const body = (commentary ?? '').trim();
  if (!isRahuKaal) return body;
  if (!body) return CAUTION_OPENER;
  if (!rahuKaalRecommendsInitiation(body)) {
    if (!/^rahu kaal/i.test(body)) return `${CAUTION_OPENER}\n\n${body}`;
    return body;
  }
  const stripped = body.replace(/^RAHU KAAL\s*[—–-]\s*/i, '').trim();
  return `${CAUTION_OPENER}\n\n${stripped}`;
}
