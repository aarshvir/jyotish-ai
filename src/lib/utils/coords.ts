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
