import { describe, expect, it } from 'vitest';
import { parseCoord, resolveTimingCoords } from '@/lib/utils/coords';

describe('parseCoord', () => {
  it('preserves real zero (equator / prime meridian)', () => {
    expect(parseCoord(0)).toBe(0);
    expect(parseCoord('0')).toBe(0);
    expect(parseCoord('0.0')).toBe(0);
  });

  it('returns null for missing / non-numeric input', () => {
    expect(parseCoord(null)).toBeNull();
    expect(parseCoord(undefined)).toBeNull();
    expect(parseCoord('')).toBeNull();
    expect(parseCoord('abc')).toBeNull();
  });
});

describe('resolveTimingCoords', () => {
  it('prefers a real current city over birth', () => {
    expect(
      resolveTimingCoords({
        current_lat: 12.97,
        current_lng: 77.59,
        birth_lat: 28.61,
        birth_lng: 77.21,
      }),
    ).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it('falls back to birth when current is unset', () => {
    expect(
      resolveTimingCoords({
        current_lat: null,
        current_lng: null,
        birth_lat: 28.61,
        birth_lng: 77.21,
      }),
    ).toEqual({ lat: 28.61, lng: 77.21 });
  });

  it('treats stored Null Island (0,0) as missing and uses birth', () => {
    // Historical kickOff/start pollution: unset current city was coerced to 0.
    expect(
      resolveTimingCoords({
        current_lat: 0,
        current_lng: 0,
        birth_lat: 28.61,
        birth_lng: 77.21,
      }),
    ).toEqual({ lat: 28.61, lng: 77.21 });
  });

  it('keeps a real equatorial birth (lat=0, lng≠0)', () => {
    expect(
      resolveTimingCoords({
        current_lat: null,
        current_lng: null,
        birth_lat: 0,
        birth_lng: -78.5,
      }),
    ).toEqual({ lat: 0, lng: -78.5 });
  });

  it('keeps a real prime-meridian current city (lng=0, lat≠0)', () => {
    expect(
      resolveTimingCoords({
        current_lat: 51.5,
        current_lng: 0,
        birth_lat: 28.61,
        birth_lng: 77.21,
      }),
    ).toEqual({ lat: 51.5, lng: 0 });
  });

  it('returns null when no usable coords exist', () => {
    expect(resolveTimingCoords({ current_lat: 0, current_lng: 0 })).toBeNull();
    expect(resolveTimingCoords({})).toBeNull();
  });
});
