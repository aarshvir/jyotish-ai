/**
 * Timezone helpers for forecast timing grids.
 *
 * Hourly windows are civil-time at the seeker's *timed* location (current city if
 * set, otherwise birth city). They must NOT silently use the browser's timezone —
 * a Dubai traveler buying a Delhi-timed report would otherwise shift every slot.
 *
 * City labels are matched as whole tokens (so "India" ≠ "Indiana") and DST-observing
 * cities resolve through IANA so August in New York is EDT, not a year-round EST
 * constant. #198's `includes()` + fixed offsets did both of those wrong.
 */

const KNOWN_CITY_IANA: Record<string, string> = {
  london: 'Europe/London',
  'new york': 'America/New_York',
  indianapolis: 'America/Indiana/Indianapolis',
  indiana: 'America/Indiana/Indianapolis',
};

/** Year-round offsets (these places do not observe DST). */
const KNOWN_CITY_TZ_MINUTES: Record<string, number> = {
  dubai: 240,
  uae: 240,
  'abu dhabi': 240,
  sharjah: 240,
  india: 330,
  mumbai: 330,
  delhi: 330,
  bangalore: 330,
  singapore: 480,
  'hong kong': 480,
};

function cityTokens(city: string): string[] {
  return city
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Whole-token match so "india" does not steal Indianapolis / Indiana. */
export function cityMentionsKey(city: string, key: string): boolean {
  const tokens = cityTokens(city);
  const parts = key.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.length === 1) return tokens.includes(parts[0]!);
  for (let i = 0; i <= tokens.length - parts.length; i++) {
    if (parts.every((p, j) => tokens[i + j] === p)) return true;
  }
  return false;
}

/**
 * Minutes east of UTC for `timeZone` at `at`.
 * Interprets the zone's wall clock as UTC and subtracts the instant.
 */
export function offsetMinutesInTimeZone(timeZone: string, at: Date): number | null {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    if (!Number.isFinite(asUtc)) return null;
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return null;
  }
}

function lngFallbackMinutes(lng: number): number {
  // Nearest 30-minute civil offset from longitude (crude but better than browser TZ).
  return Math.round(((lng / 15) * 60) / 30) * 30;
}

/** Estimate UTC offset minutes from a city label and/or longitude. */
export function estimateTimezoneOffsetMinutes(opts: {
  city?: string | null;
  lng?: number | null;
  /** Instant used for IANA/DST cities. Defaults to now. */
  at?: Date;
}): number | null {
  const city = (opts.city ?? '').trim();
  const at = opts.at ?? new Date();
  if (city) {
    for (const [key, zone] of Object.entries(KNOWN_CITY_IANA)) {
      if (cityMentionsKey(city, key)) {
        const mins = offsetMinutesInTimeZone(zone, at);
        if (mins != null) return mins;
      }
    }
    for (const [key, val] of Object.entries(KNOWN_CITY_TZ_MINUTES)) {
      if (cityMentionsKey(city, key)) return val;
    }
  }
  const lng = opts.lng;
  if (typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180) {
    return lngFallbackMinutes(lng);
  }
  return null;
}

function parseClientOffset(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Resolve the timezone offset that should be persisted / used for daily grids.
 * Prefers an estimate from the timed location over a client-supplied value, which
 * is often the browser offset when "current city" was left blank.
 */
export function resolveReportTimezoneOffset(opts: {
  clientOffset?: unknown;
  birthCity?: string | null;
  birthLng?: number | null;
  currentCity?: string | null;
  currentLng?: number | null;
  at?: Date;
}): number {
  const client = parseClientOffset(opts.clientOffset);
  const currentCity = (opts.currentCity ?? '').trim();
  const estimated = currentCity
    ? estimateTimezoneOffsetMinutes({ city: currentCity, lng: opts.currentLng, at: opts.at })
    : estimateTimezoneOffsetMinutes({ city: opts.birthCity, lng: opts.birthLng, at: opts.at });
  return estimated ?? client ?? 0;
}

/** YYYY-MM-DD for `now` in a fixed UTC offset (minutes east of UTC). */
export function localDateStringForOffset(now: Date, tzMinutes: number): string {
  const shifted = new Date(now.getTime() + tzMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}
