import { parseCoord } from '@/lib/utils/coords';

/**
 * Coordinates for one report run.
 *
 * `reports.birth_lat` and the other location columns are Postgres NUMERIC, so
 * PostgREST returns them as strings. `Number.isFinite("40.71")` is false, which
 * made the pipeline treat a real current city as missing: the 30-day grid was
 * scored at the birthplace, and the upsert wrote those columns back as null.
 */
export interface CoercedPipelineCoords {
  /** Natal-chart latitude. Missing becomes 0, matching the previous pipeline. */
  lat: number;
  lng: number;
  /** Where the hourly grid is scored: current city when that axis parsed, else birth. */
  currentLat: number;
  currentLng: number;
  /** Persistable values. A numeric string is kept; a missing value stays null. */
  storedBirthLat: number | null;
  storedBirthLng: number | null;
  storedCurrentLat: number | null;
  storedCurrentLng: number | null;
}

export function coercePipelineCoords(input: {
  lat: unknown;
  lng: unknown;
  currentLat: unknown;
  currentLng: unknown;
}): CoercedPipelineCoords {
  const lat = parseCoord(input.lat);
  const lng = parseCoord(input.lng);
  const currentLat = parseCoord(input.currentLat);
  const currentLng = parseCoord(input.currentLng);
  return {
    lat: lat ?? 0,
    lng: lng ?? 0,
    currentLat: currentLat ?? lat ?? 0,
    currentLng: currentLng ?? lng ?? 0,
    storedBirthLat: lat,
    storedBirthLng: lng,
    storedCurrentLat: currentLat,
    storedCurrentLng: currentLng,
  };
}
