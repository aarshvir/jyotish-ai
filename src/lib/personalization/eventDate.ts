/**
 * Finds the date in what someone typed about an upcoming decision ("interview on 12
 * November", "signing a lease on 3/10", "shop opening next month").
 *
 * Only an explicit day-and-month, or a clear relative phrase, counts. Anything vaguer
 * ("sometime in March") returns null and the report treats the event as undated rather
 * than guessing a day. Numeric dates read day first, as in India.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

function addDays(base: string, n: number): string {
  const dt = new Date(`${base}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** The next occurrence of day/month on or after `today` (a date that already passed means next year). */
function nextOccurrence(m: number, d: number, today: string): string | null {
  const y = Number(today.slice(0, 4));
  const thisYear = iso(y, m, d);
  if (thisYear && thisYear >= today) return thisYear;
  return iso(y + 1, m, d);
}

/** @param today ISO date (YYYY-MM-DD) in the person's timezone. */
export function parseEventDate(text: string | null | undefined, today: string): string | null {
  const t = (text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // 2026-11-12
  let m = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));

  // 12/11/2026, 12-11-26, 12.11.2026 (day first)
  m = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return iso(y, Number(m[2]), Number(m[1]));
  }

  // 12 november (2026) / 12th nov / 12 of november
  m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MONTH_RE}\\b(?:,? (20\\d{2}))?`));
  if (m) {
    const mon = MONTHS[m[2]];
    if (m[3]) return iso(Number(m[3]), mon, Number(m[1]));
    return nextOccurrence(mon, Number(m[1]), today);
  }

  // november 12 / nov 12th (2026)
  m = t.match(new RegExp(`\\b${MONTH_RE} (\\d{1,2})(?:st|nd|rd|th)?\\b(?:,? (20\\d{2}))?`));
  if (m) {
    const mon = MONTHS[m[1]];
    if (m[3]) return iso(Number(m[3]), mon, Number(m[2]));
    return nextOccurrence(mon, Number(m[2]), today);
  }

  // 12/11 (day/month, no year)
  m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m && Number(m[2]) <= 12 && Number(m[1]) <= 31) return nextOccurrence(Number(m[2]), Number(m[1]), today);

  // Relative phrases.
  if (/\btoday\b/.test(t)) return today;
  if (/\btomorrow\b/.test(t)) return addDays(today, 1);
  if (/\bnext week\b/.test(t)) return addDays(today, 7);
  if (/\bnext month\b/.test(t)) return addDays(today, 30);
  m = t.match(/\bin (\d{1,3}) (day|week|month)s?\b/);
  if (m) return addDays(today, Number(m[1]) * (m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30));
  return null;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export { addDays };
