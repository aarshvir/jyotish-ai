/**
 * Birth-coordinate validation. Uses finite + range checks rather than truthiness
 * so legitimate zero coordinates are accepted: latitude 0 (the equator) and
 * longitude 0 (the prime meridian) are real, geocodable birthplaces.
 */

function inRange(v: unknown, max: number): boolean {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max;
}

/** Valid latitude in [-90, 90]. 0 (equator) is valid. */
export function isValidLat(v: unknown): boolean {
  return inRange(v, 90);
}

/** Valid longitude in [-180, 180]. 0 (prime meridian) is valid. */
export function isValidLng(v: unknown): boolean {
  return inRange(v, 180);
}

/** True when both birth coordinates are present, numeric, and in range. */
export function hasValidBirthCoords(
  p?: { birth_lat?: unknown; birth_lng?: unknown } | null,
): boolean {
  return !!p && isValidLat(p.birth_lat) && isValidLng(p.birth_lng);
}

/**
 * Parse a coordinate from form/URL/JSON input. Distinguishes missing (`null`)
 * from a real zero (equator / prime meridian) — unlike `parseFloat(x) || 0`.
 */
export function parseCoord(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the lat/lng used for timing grids (daily scores, teaser curve, /api/now).
 *
 * Prefer the seeker's current city when present; otherwise birth. The pair
 * `(0, 0)` (Null Island) is treated as missing — no geocoder in this product
 * returns that ocean point, but several submit paths historically wrote `0`
 * when current city was unset, which silently scored every day at GMT/Null Island.
 * A real equatorial birth (lat=0, lng≠0) or prime-meridian birth (lng=0, lat≠0)
 * still wins.
 */
export function resolveTimingCoords(row: {
  current_lat?: unknown;
  current_lng?: unknown;
  birth_lat?: unknown;
  birth_lng?: unknown;
}): { lat: number; lng: number } | null {
  const cLat = parseCoord(row.current_lat);
  const cLng = parseCoord(row.current_lng);
  if (cLat != null && cLng != null && isValidLat(cLat) && isValidLng(cLng)) {
    if (!(cLat === 0 && cLng === 0)) {
      return { lat: cLat, lng: cLng };
    }
  }
  const bLat = parseCoord(row.birth_lat);
  const bLng = parseCoord(row.birth_lng);
  if (bLat != null && bLng != null && isValidLat(bLat) && isValidLng(bLng)) {
    return { lat: bLat, lng: bLng };
  }
  return null;
}
