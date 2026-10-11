/**
 * Birth date and time entry, as pure functions (the fields are in components/funnel).
 *
 * Why numeric boxes and no default: scroll wheels and calendars that open on today cost the
 * 28–60 audience a long scroll (the competitor teardown measured six taps and a long list
 * for a 1991 date), and a time field that starts at 12:00 AM lets a wrong chart through
 * unnoticed. So the person types day, month and year, sees the date echoed back with its
 * weekday (a mixed-up day and month shows at once), and the time has no default at all.
 */

import type { Lang } from './screens';

export type DateError = 'incomplete' | 'invalid' | 'year' | 'future';

export function parseDate(d: string, m: string, y: string, now = new Date()): { iso: string } | { error: DateError } {
  const day = d.trim();
  const month = m.trim();
  const year = y.trim();
  if (!day || !month || !year) return { error: 'incomplete' };
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return { error: 'invalid' };
  const dd = Number(day);
  const mm = Number(month);
  const yy = Number(year);
  if (yy < 1900) return { error: 'year' };
  const probe = new Date(Date.UTC(yy, mm - 1, dd));
  if (mm < 1 || mm > 12 || dd < 1 || probe.getUTCFullYear() !== yy || probe.getUTCMonth() !== mm - 1 || probe.getUTCDate() !== dd) return { error: 'invalid' };
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (probe.getTime() > today) return { error: 'future' };
  return { iso: `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}` };
}

export function splitIso(iso: string | undefined): { d: string; m: string; y: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? { d: String(Number(m[3])), m: String(Number(m[2])), y: m[1] } : { d: '', m: '', y: '' };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_HI = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'];

/** "15 Jul 1991, Monday" (English) or "15 Jul 1991, Somvar" (Hinglish). */
export function dateEcho(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${d} ${MONTHS[m - 1]} ${y}, ${(lang === 'hi' ? WEEKDAY_HI : WEEKDAY_EN)[wd]}`;
}

export const DATE_ERROR: Record<DateError, { en: string; hi: string }> = {
  incomplete: { en: 'Please fill in the day, month and year.', hi: 'Din, mahina aur saal teeno likhein.' },
  invalid: { en: 'That date does not exist. Please check the day and month.', hi: 'Yeh tareekh sahi nahi hai. Din aur mahina dobara dekhein.' },
  year: { en: 'Please check the year. It should be four digits, 1900 or later.', hi: 'Saal dobara dekhein. Chaar ank ka hona chahiye, 1900 ya uske baad.' },
  future: { en: 'That date is in the future.', hi: 'Yeh tareekh abhi aayi nahi hai.' },
};

// ── time ─────────────────────────────────────────────────────────────────────

export type Meridiem = 'am' | 'pm';
export type TimeError = 'incomplete' | 'invalid' | 'meridiem';

/**
 * Hour 1–12 needs AM or PM and has no default. Hour 13–23 is read as a 24-hour time and
 * needs no AM/PM; 0 is midnight. Minutes 00–59.
 */
export function parseTime(h: string, m: string, ap: Meridiem | null): { hhmm: string } | { error: TimeError } {
  const hh = h.trim();
  const mm = m.trim();
  if (!hh || !mm) return { error: 'incomplete' };
  if (!/^\d{1,2}$/.test(hh) || !/^\d{1,2}$/.test(mm)) return { error: 'invalid' };
  let hour = Number(hh);
  const minute = Number(mm);
  if (hour > 23 || minute > 59) return { error: 'invalid' };
  if (hour >= 1 && hour <= 12) {
    if (!ap) return { error: 'meridiem' };
    hour = ap === 'am' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  }
  return { hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export function splitTime(hhmm: string | undefined): { h: string; m: string; ap: Meridiem | null } {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return { h: '', m: '', ap: null };
  const hour = Number(m[1]);
  const ap: Meridiem = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { h: String(h12), m: m[2], ap };
}

/** Subah 4–11, dopahar 12–3 pm, shaam 4–7 pm, raat 8 pm to 3 am. */
export function dayPart(hhmm: string, lang: Lang): string {
  const hour = Number(hhmm.slice(0, 2));
  const part = hour >= 4 && hour < 12 ? 0 : hour >= 12 && hour < 16 ? 1 : hour >= 16 && hour < 20 ? 2 : 3;
  return (lang === 'hi' ? ['subah', 'dopahar', 'shaam', 'raat'] : ['morning', 'afternoon', 'evening', 'night'])[part];
}

/** "6:30 AM, morning" — read back so a wrong AM/PM is caught before it becomes a wrong chart. */
export function timeEcho(hhmm: string, lang: Lang): string {
  const { h, m, ap } = splitTime(hhmm);
  return `${h}:${m} ${ap === 'pm' ? 'PM' : 'AM'}, ${dayPart(hhmm, lang)}`;
}

export const TIME_ERROR: Record<TimeError, { en: string; hi: string }> = {
  incomplete: { en: 'Please fill in the hour and minutes.', hi: 'Ghanta aur minute dono likhein.' },
  invalid: { en: 'Please check the time: hour 1 to 12, minutes 00 to 59.', hi: 'Samay dobara dekhein: ghanta 1 se 12, minute 00 se 59.' },
  meridiem: { en: 'Please choose AM or PM.', hi: 'AM ya PM chunein.' },
};

/** Shift a naive local date and time by whole minutes (no time zone involved), for spread checks. */
export function shiftLocal(date: string, hhmm: string, minutes: number): { date: string; time: string } {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi) + minutes * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`, time: `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}` };
}
