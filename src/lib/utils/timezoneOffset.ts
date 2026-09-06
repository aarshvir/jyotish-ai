/**
 * Fixed-offset timezone helpers for forecast timing grids.
 *
 * Hourly windows are civil-time at the seeker's *timed* location (current city if
 * set, otherwise birth city). They must NOT silently use the browser's timezone —
 * a Dubai traveler buying a Delhi-timed report would otherwise shift every slot.
 */

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
  london: 0,
  'new york': -300,
};

function lngFallbackMinutes(lng: number): number {
  // Nearest 30-minute civil offset from longitude (crude but better than browser TZ).
  return Math.round(((lng / 15) * 60) / 30) * 30;
}

/** Estimate UTC offset minutes from a city label and/or longitude. */
export function estimateTimezoneOffsetMinutes(opts: {
  city?: string | null;
  lng?: number | null;
}): number | null {
  const city = (opts.city ?? '').trim().toLowerCase();
  if (city) {
    for (const [key, val] of Object.entries(KNOWN_CITY_TZ_MINUTES)) {
      if (city.includes(key)) return val;
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
}): number {
  const client = parseClientOffset(opts.clientOffset);
  const currentCity = (opts.currentCity ?? '').trim();
  if (currentCity) {
    return (
      estimateTimezoneOffsetMinutes({ city: currentCity, lng: opts.currentLng }) ??
      client ??
      0
    );
  }
  return (
    estimateTimezoneOffsetMinutes({ city: opts.birthCity, lng: opts.birthLng }) ??
    client ??
    0
  );
}

/** YYYY-MM-DD for `now` in a fixed UTC offset (minutes east of UTC). */
export function localDateStringForOffset(now: Date, tzMinutes: number): string {
  const shifted = new Date(now.getTime() + tzMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}
