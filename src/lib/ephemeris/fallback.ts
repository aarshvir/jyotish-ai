/**
 * Pure-TypeScript ephemeris fallback.
 *
 * Computes daily-grid data (18 slots, hora, choghadiya, Rahu Kaal, score)
 * without the Python/Swiss Ephemeris service.  Used when the service is
 * unreachable so the report still generates meaningful scores rather than
 * 50/100 placeholders across the board.
 *
 * Sunrise/sunset: NOAA solar position algorithm (accurate ≈ ±2 min).
 * Hora / choghadiya / Rahu Kaal: exact Vedic calendar arithmetic.
 * Transit lagna: approximated from local sidereal time (~±1 sign accuracy).
 * Panchang (tithi/nakshatra/yoga): uses override table for known dates,
 * otherwise leaves fields empty so the scoring engine skips those modifiers.
 */

// ── Constants shared with Python service ───────────────────────────────────

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// Chaldean order: Sun=0, Venus=1, Mercury=2, Moon=3, Saturn=4, Jupiter=5, Mars=6
const HORA_RULERS = ['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];

// Day rulers (Sun=0 for Sunday, Mon=1, … Sat=6) in JS getDay() order
const DAY_RULERS  = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

// Rahu Kaal 1-indexed parts: Sunday=8, Monday=2, Tuesday=7, …
// Key: JS getDay() value
const RAHU_KAAL_PARTS: Record<number, number> = {
  0: 8, // Sunday
  1: 2, // Monday
  2: 7, // Tuesday
  3: 5, // Wednesday
  4: 6, // Thursday
  5: 4, // Friday
  6: 3, // Saturday
};

// Choghadiya day sequences keyed by (day_index % 7) where index maps
// Python's `(weekday()+1)%7`. Python weekday(): Mon=0…Sun=6.
// Converted: JS getDay(): Sun=0, Mon=1, … Sat=6.
// Python's cur_idx = (date_obj.weekday()+1)%7 = Sun→0,Mon→1,Tue→2,Wed→3,Thu→4,Fri→5,Sat→6
//                                                  (same as JS getDay())
const CHOGHADIYA_DAY: Record<number, string[]> = {
  0: ['Udveg','Chal','Labh','Amrit','Kaal','Shubh','Rog','Udveg'],   // Sun
  1: ['Amrit','Kaal','Shubh','Rog','Udveg','Chal','Labh','Amrit'],   // Mon
  2: ['Rog','Udveg','Chal','Labh','Amrit','Kaal','Shubh','Rog'],     // Tue
  3: ['Labh','Amrit','Kaal','Shubh','Rog','Udveg','Chal','Labh'],    // Wed
  4: ['Shubh','Rog','Udveg','Chal','Labh','Amrit','Kaal','Shubh'],   // Thu
  5: ['Chal','Labh','Amrit','Kaal','Shubh','Rog','Udveg','Chal'],    // Fri
  6: ['Kaal','Shubh','Rog','Udveg','Chal','Labh','Amrit','Kaal'],    // Sat
};

// Panchang overrides: exact tithi/nakshatra/yoga for known dates.
// Copied from the Python service's PANCHANG_OVERRIDES table.
const PANCHANG_OVERRIDES: Record<string, { nakshatra?: string; yoga?: string; tithi?: string; moon_house?: number }> = {
  '2026-03-06': { nakshatra: 'Chitra',           yoga: 'Shoola',      tithi: 'Krishna Chaturthi' },
  '2026-03-07': { nakshatra: 'Swati',             yoga: 'Ganda',       tithi: 'Krishna Panchami' },
  '2026-03-08': { nakshatra: 'Vishakha',          yoga: 'Vriddhi',     tithi: 'Krishna Shashthi' },
  '2026-03-09': { nakshatra: 'Anuradha',          yoga: 'Vyaghata',    tithi: 'Krishna Saptami' },
  '2026-03-10': { nakshatra: 'Anuradha',          yoga: 'Harshana',    tithi: 'Krishna Ashtami' },
  '2026-03-18': { nakshatra: 'Shatabhisha',       yoga: 'Vajra',       tithi: 'Amavasya' },
  '2026-03-19': { nakshatra: 'Purva Bhadrapada',  yoga: 'Siddhi',      tithi: 'Shukla Pratipada' },
  '2026-03-20': { nakshatra: 'Uttara Bhadrapada', yoga: 'Variyan',     tithi: 'Shukla Dwitiya' },
  '2026-03-21': { nakshatra: 'Revati',            yoga: 'Parigha',     tithi: 'Shukla Tritiya' },
  '2026-03-22': { nakshatra: 'Ashwini',           yoga: 'Shiva',       tithi: 'Shukla Chaturthi' },
  '2026-03-23': { nakshatra: 'Krittika',          yoga: 'Vishkambha',  tithi: 'Shukla Panchami',   moon_house: 12 },
  '2026-03-24': { nakshatra: 'Rohini',            yoga: 'Priti',       tithi: 'Shukla Shashthi' },
  '2026-03-25': { nakshatra: 'Mrigashira',        yoga: 'Ayushman',    tithi: 'Shukla Saptami' },
  '2026-03-26': { nakshatra: 'Ardra',             yoga: 'Saubhagya',   tithi: 'Shukla Ashtami' },
  '2026-03-27': { nakshatra: 'Pushya',            yoga: 'Sukarma',     tithi: 'Shukla Navami' },
  '2026-03-28': { nakshatra: 'Ashlesha',          yoga: 'Dhriti',      tithi: 'Shukla Dashami' },
  '2026-03-29': { nakshatra: 'Magha',             yoga: 'Shoola',      tithi: 'Shukla Ekadashi' },
  '2026-03-30': { nakshatra: 'Purva Phalguni',    yoga: 'Ganda',       tithi: 'Shukla Dwadashi' },
  '2026-03-31': { nakshatra: 'Uttara Phalguni',   yoga: 'Vriddhi',     tithi: 'Shukla Trayodashi' },
  '2026-04-01': { nakshatra: 'Hasta',             yoga: 'Dhruva',      tithi: 'Shukla Chaturdashi' },
  '2026-04-02': { nakshatra: 'Chitra',            yoga: 'Vyaghata',    tithi: 'Purnima' },
};

// ── NOAA Sunrise/Sunset algorithm ──────────────────────────────────────────

function toRad(deg: number) { return deg * Math.PI / 180; }
function toDeg(rad: number) { return rad * 180 / Math.PI; }

/**
 * Compute sunrise and sunset times for a given date and location.
 * Returns UTC Date objects.  Accuracy: ≈ ±2 minutes for mid-latitudes.
 *
 * Based on NOAA Solar Calculator / Spencer (1971) / Meeus approximation.
 */
function computeSunriseSunset(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } {
  const jd = date.getTime() / 86400000 + 2440587.5; // Julian day at midnight UTC
  const n = Math.floor(jd - 2451545.0 + 0.0008);

  // Mean solar noon in fractional Julian day (0 = midnight UTC)
  const Jstar = n - lng / 360;

  // Solar mean anomaly (degrees)
  const M = (357.5291 + 0.98560028 * Jstar) % 360;

  // Equation of centre
  const C = 1.9148 * Math.sin(toRad(M))
          + 0.0200 * Math.sin(toRad(2 * M))
          + 0.0003 * Math.sin(toRad(3 * M));

  // Ecliptic longitude of sun
  const lambda = (M + C + 180 + 102.9372) % 360;

  // Solar transit (Julian day)
  const Jtransit = 2451545.0 + Jstar
    + 0.0053 * Math.sin(toRad(M))
    - 0.0069 * Math.sin(toRad(2 * lambda));

  // Declination
  const sinDec = Math.sin(toRad(lambda)) * Math.sin(toRad(23.4397));
  const dec = toDeg(Math.asin(sinDec));

  // Hour angle for sunrise/sunset (solar elevation = -0.833° for atmospheric refraction)
  const cosW0 = (Math.sin(toRad(-0.833)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec)))
               / (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));

  // Default to 6 AM / 6 PM if sun never rises/sets (polar regions)
  let W0 = 90;
  if (cosW0 >= -1 && cosW0 <= 1) {
    W0 = toDeg(Math.acos(cosW0));
  }

  const Jrise = Jtransit - W0 / 360;
  const Jset  = Jtransit + W0 / 360;

  // Convert Julian day to Date (ms since Unix epoch)
  const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;

  return {
    sunrise: new Date(jdToMs(Jrise)),
    sunset:  new Date(jdToMs(Jset)),
  };
}

// ── Hora helpers ───────────────────────────────────────────────────────────

function horaRulerAt(ms: number, prevSunset: Date, sunrise: Date, sunset: Date, nextSunrise: Date, dateJsDay: number): string {
  // Day hora: 12 equal parts from sunrise→sunset, ruler from daytime sequence
  const curBase = HORA_RULERS.indexOf(DAY_RULERS[dateJsDay]);

  if (ms >= sunrise.getTime() && ms < sunset.getTime()) {
    const dayMs = sunset.getTime() - sunrise.getTime();
    const idx = Math.floor((ms - sunrise.getTime()) / (dayMs / 12));
    return HORA_RULERS[(curBase + idx) % 7];
  }

  if (ms >= sunset.getTime() && ms < nextSunrise.getTime()) {
    const nightMs = nextSunrise.getTime() - sunset.getTime();
    const idx = Math.floor((ms - sunset.getTime()) / (nightMs / 12));
    return HORA_RULERS[(curBase + 12 + idx) % 7];
  }

  // Pre-sunrise (previous night's hours)
  const prevJsDay = (dateJsDay + 6) % 7;
  const prevBase = HORA_RULERS.indexOf(DAY_RULERS[prevJsDay]);
  const prevNightMs = sunrise.getTime() - prevSunset.getTime();
  const idx = Math.floor((ms - prevSunset.getTime()) / (prevNightMs / 12));
  return HORA_RULERS[(prevBase + 12 + idx) % 7];
}

function choghadiyaAt(ms: number, prevSunset: Date, sunrise: Date, sunset: Date, nextSunrise: Date, dateJsDay: number): string {
  const curSeq  = CHOGHADIYA_DAY[dateJsDay];
  const prevDay = (dateJsDay + 6) % 7;
  const prevSeq = CHOGHADIYA_DAY[prevDay];
  // Night sequence rotates prev seq left by 1
  const prevNightSeq = [...prevSeq.slice(1), prevSeq[0]];
  const curNightSeq  = [...curSeq.slice(1), curSeq[0]];

  if (ms >= sunrise.getTime() && ms < sunset.getTime()) {
    const dayMs = sunset.getTime() - sunrise.getTime();
    const idx = Math.floor((ms - sunrise.getTime()) / (dayMs / 8));
    return curSeq[Math.min(idx, 7)];
  }

  if (ms >= sunset.getTime() && ms < nextSunrise.getTime()) {
    const nightMs = nextSunrise.getTime() - sunset.getTime();
    const idx = Math.floor((ms - sunset.getTime()) / (nightMs / 8));
    return curNightSeq[Math.min(idx, 7)];
  }

  // Pre-sunrise: previous night
  const prevNightMs = sunrise.getTime() - prevSunset.getTime();
  const idx = Math.floor((ms - prevSunset.getTime()) / (prevNightMs / 8));
  return prevNightSeq[Math.min(idx, 7)];
}

// ── Transit lagna approximation ────────────────────────────────────────────

/**
 * Very rough approximation: the ascendant (lagna) completes a full 12-sign
 * rotation per sidereal day (~23h 56m).  Each sign rises for ~2 hours on average
 * (more accurate at equator, varies with latitude and season).
 *
 * We estimate the sign rising at sunrise as (sun's approximate sign − 6 signs)
 * then advance by 1 sign per ~2 hours.
 *
 * This is NOT astronomically accurate but gives a plausible cycle rather than
 * a constant, so transit-house modifiers vary across the day.
 */
function approximateTransitLagna(
  slotMidpointMs: number,
  sunriseMs: number,
  natalLagnaSignIdx: number,
  dateStr: string,
): { sign: string; house: number } {
  // Rough sun longitude from date (sidereal, Lahiri): sun enters Capricorn ~Jan 14
  // Each month ~= 1 sign. Approximate offset from Capricorn start.
  const [, mm, dd] = dateStr.split('-').map(Number);
  // Days since Jan 14 (Capricorn ingress in sidereal zodiac)
  const dayOfYear = (mm - 1) * 30.44 + dd;
  const daysSinceCapricorn = ((dayOfYear - 14) + 365) % 365;
  const sunSignIdx = Math.floor(daysSinceCapricorn / 30.44) % 12; // Capricorn=9

  // Ascendant at sunrise is approximately (sunSignIdx - 6 + 12) % 12
  // (eastern horizon is roughly opposite the sun at sunrise)
  const lagnaAtSunriseIdx = (sunSignIdx - 6 + 12) % 12;

  // Each sign rises for ~2 hours (rough average)
  const hoursAfterSunrise = (slotMidpointMs - sunriseMs) / 3_600_000;
  const signsElapsed = Math.floor(hoursAfterSunrise / 2);
  const transitSignIdx = (lagnaAtSunriseIdx + signsElapsed + 12) % 12;
  const transitSign = SIGNS[transitSignIdx];
  const house = ((transitSignIdx - natalLagnaSignIdx) + 12) % 12 + 1;

  return { sign: transitSign, house };
}

// ── Scoring constants (mirrors RatingAgent.ts) ─────────────────────────────

const HORA_BASE: Record<string, number> = {
  Sun: 78, Moon: 68, Mars: 48, Mercury: 72, Jupiter: 85, Venus: 82, Saturn: 45,
};
const CHOG_SCORE: Record<string, number> = {
  Amrit: 18, Shubh: 12, Labh: 10, Chal: 2, Rog: -6, Kaal: -8, Udveg: -10,
};
const TRANSIT_HOUSE: Record<number, number> = {
  1: 6, 2: 2, 3: -2, 4: 2, 5: 10, 6: -4,
  7: 2, 8: -12, 9: 8, 10: 14, 11: 10, 12: -8,
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function computeScore(hora: string, chog: string, house: number, isRahuKaal: boolean, panchangAdj: number): number {
  const base     = HORA_BASE[hora] ?? 60;
  const chogMod  = CHOG_SCORE[chog] ?? 0;
  const houseMod = TRANSIT_HOUSE[house] ?? 0;
  const rkPen    = isRahuKaal ? -30 : 0;
  const raw = base + chogMod + houseMod + panchangAdj + rkPen;
  return clamp(Math.round(raw), 5, 98);
}

// ── Panchang adjustment from overrides ────────────────────────────────────

const YOGA_ADJ: Record<string, number> = {
  Amrit: 8, Siddhi: 6, Shubh: 5, Labha: 5, Pushkara: 5, Brahma: 4,
  Indra: 4, Priti: 3, Ayushman: 3, Sukarma: 3, Dhruva: 3, Vriddhi: 2,
  Variyan: 2, Harshana: 2, Dhriti: 2, Soma: 2, Sukla: 1, Sadhya: 1,
  Sobhana: 1, Attiganda: -2, Shoola: -3, Ganda: -4, Vishkambha: -4,
  Atiganda: -4, Vyaghata: -5, Vajra: -6, Siddha: 3, Parigha: -3, Shiva: 3,
};
const TITHI_ADJ: Record<string, number> = {
  Purnima: 8, 'Shukla Ekadashi': 5, 'Krishna Ekadashi': 5, 'Shukla Panchami': 3,
  'Shukla Saptami': 2, 'Shukla Navami': 3, 'Shukla Tritiya': 2, 'Shukla Dwitiya': 2,
  'Shukla Shashthi': 1, 'Shukla Ashtami': -2, 'Shukla Chaturdashi': -2,
  'Krishna Saptami': -1, 'Krishna Ashtami': -2, 'Krishna Chaturdashi': -4,
  Amavasya: -6, 'Shukla Chaturthi': 0, 'Shukla Dashami': 2, 'Shukla Dwadashi': 3,
  'Shukla Trayodashi': 1, 'Krishna Chaturthi': -1, 'Krishna Panchami': -1,
  'Krishna Shashthi': -1,
};

function getPanchangAdj(dateStr: string): number {
  const ov = PANCHANG_OVERRIDES[dateStr];
  if (!ov) return 0;
  return (YOGA_ADJ[ov.yoga ?? ''] ?? 0) + (TITHI_ADJ[ov.tithi ?? ''] ?? 0);
}

// ── Main export ────────────────────────────────────────────────────────────

export interface FallbackSlot {
  slot_index:           number;
  display_label:        string;
  start_iso:            string;
  end_iso:              string;
  midpoint_iso:         string;
  dominant_hora:        string;
  dominant_choghadiya:  string;
  transit_lagna:        string;
  transit_lagna_house:  number;
  is_rahu_kaal:         boolean;
  score:                number;
}

export interface FallbackDayData {
  date:            string;
  panchang:        Record<string, string | number>;
  rahu_kaal:       { start: string; end: string };
  day_score:       number;
  slots:           FallbackSlot[];
}

export function computeFallbackDayData(
  dateStr: string,
  currentLat: number,
  currentLng: number,
  timezoneOffsetMinutes: number,
  natalLagnaSignIndex: number,
): FallbackDayData {
  // Parse date in UTC then offset to local "midnight"
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateUtc = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dateUtc.getUTCDay(); // 0=Sun…6=Sat

  const { sunrise, sunset } = computeSunriseSunset(dateUtc, currentLat, currentLng);
  const prevDateUtc = new Date(Date.UTC(y, m - 1, d - 1));
  const { sunset: prevSunset } = computeSunriseSunset(prevDateUtc, currentLat, currentLng);
  const nextDateUtc = new Date(Date.UTC(y, m - 1, d + 1));
  const { sunrise: nextSunrise } = computeSunriseSunset(nextDateUtc, currentLat, currentLng);

  // Rahu Kaal window
  const daySec = (sunset.getTime() - sunrise.getTime()) / 1000;
  const rkPart = RAHU_KAAL_PARTS[jsDay];
  const rkStartMs = sunrise.getTime() + (rkPart - 1) * (daySec / 8) * 1000;
  const rkEndMs   = sunrise.getTime() + rkPart * (daySec / 8) * 1000;
  const rkStart = new Date(rkStartMs);
  const rkEnd   = new Date(rkEndMs);

  // Local midnight in UTC (for building slot timestamps)
  const localMidnightUtc = new Date(dateUtc.getTime() - timezoneOffsetMinutes * 60_000);

  const panchangAdj = getPanchangAdj(dateStr);
  const ov = PANCHANG_OVERRIDES[dateStr] ?? {};

  const slots: FallbackSlot[] = [];
  for (let i = 0; i < 18; i++) {
    const slotStartMs = localMidnightUtc.getTime() + (6 + i) * 3_600_000;
    const slotEndMs   = slotStartMs + 3_600_000;
    const midMs       = slotStartMs + 1_800_000;

    const hora = horaRulerAt(midMs, prevSunset, sunrise, sunset, nextSunrise, jsDay);
    const chog = choghadiyaAt(midMs, prevSunset, sunrise, sunset, nextSunrise, jsDay);

    // Rahu Kaal: overlap ≥ 30 min (1800 s) triggers the flag
    const rkOverlapMs = Math.max(0,
      Math.min(slotEndMs, rkEndMs) - Math.max(slotStartMs, rkStartMs)
    );
    const isRahuKaal = rkOverlapMs >= 1_800_000;

    const { sign: transitSign, house: transitHouse } = approximateTransitLagna(
      midMs, sunrise.getTime(), natalLagnaSignIndex, dateStr
    );

    const score = computeScore(hora, chog, transitHouse, isRahuKaal, panchangAdj);
    const hour    = 6 + i;
    const endHour = hour + 1;

    slots.push({
      slot_index:          i,
      display_label:       `${String(hour).padStart(2,'0')}:00\u2013${String(endHour).padStart(2,'0')}:00`,
      start_iso:           new Date(slotStartMs).toISOString().replace('.000Z','Z'),
      end_iso:             new Date(slotEndMs).toISOString().replace('.000Z','Z'),
      midpoint_iso:        new Date(midMs).toISOString().replace('.000Z','Z'),
      dominant_hora:       hora,
      dominant_choghadiya: chog,
      transit_lagna:       transitSign,
      transit_lagna_house: transitHouse,
      is_rahu_kaal:        isRahuKaal,
      score,
    });
  }

  const dayScore = Math.round(slots.reduce((sum, s) => sum + s.score, 0) / slots.length);

  return {
    date: dateStr,
    panchang: {
      yoga:      ov.yoga      ?? '',
      nakshatra: ov.nakshatra ?? '',
      tithi:     ov.tithi     ?? '',
    },
    rahu_kaal: {
      start: rkStart.toISOString(),
      end:   rkEnd.toISOString(),
    },
    day_score: dayScore,
    slots,
  };
}
