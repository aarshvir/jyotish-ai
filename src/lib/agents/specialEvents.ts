/**
 * Special-event day-score modifiers — a faithful TS port of the Python engine
 * (ephemeris-service/main.py: SPECIAL_EVENT_MOD, SPECIAL_EVENTS_CALENDAR,
 * get_special_events_for_date, and the tier-stacking + Pushya logic inside
 * compute_dq). Keep this in lockstep with main.py: a divergence means the same
 * chart on the same festival/eclipse day scores differently depending on which
 * engine ran (Python primary vs the TS fallback / ForecastAgent path).
 */

// = Python SPECIAL_EVENT_MOD
export const SPECIAL_EVENT_MOD: Record<string, number> = {
  jupiter_direct: 10,
  jupiter_enters_cancer: 18,
  jupiter_retrograde: -6,
  mercury_direct: 6,
  mercury_retrograde: -8,
  ekadashi: 5,
  purnima: 4,
  navratri: 5,
  ram_navami: 8,
  ugadi: 10,
  akshaya_tritiya: 18,
  diwali: 10,
  dhan_teras: 8,
  // NOTE: 'pushya_shukla_bonus' is intentionally NOT here. It is applied once via the
  // bespoke Pushya block in specialEventAdj() (8, or 13 on a benefic tithi). Keeping it
  // in this map too would double-apply it through the generic sum loop — the exact
  // compute_dq bug cycle-10 caught in the Python engine.
  eclipse: -25,
  solar_eclipse: -20,
  lunar_eclipse: -18,
  retrograde_station: -8,
  baisakhi: 8,
};

// = Python SPECIAL_EVENTS_CALENDAR
const CAL = {
  mercury_retrograde_periods: [
    ['2026-02-25', '2026-03-20'],
    ['2026-06-18', '2026-07-12'],
    ['2026-10-14', '2026-11-03'],
  ] as Array<[string, string]>,
  jupiter_direct: ['2026-03-10', '2026-03-11'],
  // Bounded periods — never open-ended. Civil dates match trop. station windows
  // (Jupiter Rx ~2026-12-13 → 2027-04-13). Keep in lockstep with main.py.
  jupiter_retrograde_periods: [
    ['2026-12-13', '2027-04-13'],
  ] as Array<[string, string]>,
  jupiter_enters_cancer: ['2026-06-01', '2026-06-02'],
  mercury_direct: ['2026-03-20', '2026-07-12', '2026-11-03'],
  ugadi: ['2026-03-19'],
  ram_navami: ['2026-03-26'],
  navratri_chaitra_start: '2026-03-19',
  navratri_chaitra_end: '2026-03-28',
  akshaya_tritiya: ['2026-04-19'],
  baisakhi: ['2026-04-14'],
  navaratri_sharad_start: '2026-10-02',
  navaratri_sharad_end: '2026-10-11',
  diwali: ['2026-10-20'],
  dhan_teras: ['2026-10-18'],
  ekadashi_dates: [
    '2026-03-13', '2026-03-28', '2026-04-13', '2026-04-27', '2026-05-11', '2026-05-26',
    '2026-06-09', '2026-06-25', '2026-07-09', '2026-07-24', '2026-08-07', '2026-08-23',
    '2026-09-06', '2026-09-21', '2026-10-06', '2026-10-21', '2026-11-05', '2026-11-19',
    '2026-12-04', '2026-12-19',
  ],
  solar_eclipse: ['2026-08-12'],
  lunar_eclipse: ['2026-03-03', '2026-08-28'],
};

// ISO YYYY-MM-DD strings sort chronologically, so string compare is safe for ranges.
function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** = Python get_special_events_for_date(date_str). */
export function getSpecialEventsForDate(dateStr: string): string[] {
  const events: string[] = [];
  if (!isValidDate(dateStr)) return events;

  const isMercuryDirect = CAL.mercury_direct.includes(dateStr);
  // Station-direct days are celebrated as mercury_direct; do not also apply the
  // mercury_retrograde penalty (+tier2 stacking) on the same civil date.
  for (const [start, end] of CAL.mercury_retrograde_periods) {
    if (start <= dateStr && dateStr <= end) {
      if (!isMercuryDirect) events.push('mercury_retrograde');
      break;
    }
  }
  if (CAL.jupiter_direct.includes(dateStr)) events.push('jupiter_direct');
  if (CAL.jupiter_enters_cancer.includes(dateStr)) events.push('jupiter_enters_cancer');
  if (isMercuryDirect) events.push('mercury_direct');
  if (CAL.ugadi.includes(dateStr)) events.push('ugadi');
  if (CAL.ram_navami.includes(dateStr)) events.push('ram_navami');
  if (CAL.akshaya_tritiya.includes(dateStr)) events.push('akshaya_tritiya');
  if (CAL.baisakhi.includes(dateStr)) events.push('baisakhi');
  if (CAL.diwali.includes(dateStr)) events.push('diwali');
  if (CAL.dhan_teras.includes(dateStr)) events.push('dhan_teras');

  // Navratri: peak bonus from day 3 onward (skip the weak opening days), both windows.
  if (CAL.navratri_chaitra_start <= dateStr && dateStr <= CAL.navratri_chaitra_end &&
      daysBetween(CAL.navratri_chaitra_start, dateStr) >= 2) {
    events.push('navratri');
  }
  if (CAL.navaratri_sharad_start <= dateStr && dateStr <= CAL.navaratri_sharad_end &&
      daysBetween(CAL.navaratri_sharad_start, dateStr) >= 2 && !events.includes('navratri')) {
    events.push('navratri');
  }

  if (CAL.ekadashi_dates.includes(dateStr)) events.push('ekadashi');
  if (CAL.solar_eclipse.includes(dateStr)) events.push('solar_eclipse');
  if (CAL.lunar_eclipse.includes(dateStr)) events.push('lunar_eclipse');
  for (const [start, end] of CAL.jupiter_retrograde_periods) {
    if (start <= dateStr && dateStr <= end) {
      events.push('jupiter_retrograde');
      break;
    }
  }

  return events;
}

const TIER1 = new Set(['ram_navami', 'ugadi', 'akshaya_tritiya', 'diwali', 'jupiter_enters_cancer', 'baisakhi']);
const TIER2 = new Set(['jupiter_direct', 'mercury_direct', 'navratri', 'ekadashi']);

/**
 * Day-score contribution of the special events — the part of Python compute_dq
 * AFTER the base yoga+nakshatra+tithi+moon+weekday sum: per-event SPECIAL_EVENT_MOD,
 * the Pushya-on-Shukla bonus, and tier-1/tier-2 stacking. Returns the additive delta
 * (the caller applies the same final max(-40, min(45, ..)) clamp as Python).
 */
export function specialEventAdj(
  events: string[],
  yogaVal: number,
  tithiVal: number,
  nakshatra: string,
): number {
  let adj = 0;
  for (const e of events) adj += SPECIAL_EVENT_MOD[e] ?? 0;

  if (nakshatra === 'Pushya' && events.includes('pushya_shukla_bonus')) {
    adj += tithiVal >= 0 ? 13 : 8;
  }

  const hasT1 = events.some((e) => TIER1.has(e));
  const hasT2 = events.some((e) => TIER2.has(e));
  if (hasT1) {
    adj += yogaVal < -3 ? 8 : 15;
  } else if (hasT2 && yogaVal >= 0) {
    adj += yogaVal >= 6 ? 12 : 8;
  }
  return adj;
}
