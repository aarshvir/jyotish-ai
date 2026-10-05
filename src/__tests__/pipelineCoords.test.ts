import { describe, expect, it } from 'vitest';
import { coercePipelineCoords } from '@/lib/reports/pipelineCoords';

describe('coercePipelineCoords', () => {
  it('keeps a numeric-string current city instead of scoring the birthplace', () => {
    // Postgres NUMERIC arrives from PostgREST as a string. Number.isFinite("40.7128") is false.
    expect(Number.isFinite('40.7128' as unknown as number)).toBe(false);
    const coords = coercePipelineCoords({
      lat: '28.6139',
      lng: '77.2090',
      currentLat: '40.7128',
      currentLng: '-74.0060',
    });
    expect(coords.lat).toBeCloseTo(28.6139);
    expect(coords.lng).toBeCloseTo(77.209);
    expect(coords.currentLat).toBeCloseTo(40.7128);
    expect(coords.currentLng).toBeCloseTo(-74.006);
    expect(coords.storedBirthLat).toBeCloseTo(28.6139);
    expect(coords.storedCurrentLat).toBeCloseTo(40.7128);
    expect(coords.storedCurrentLng).toBeCloseTo(-74.006);
  });

  it('falls back to birth coordinates when the current city was never set', () => {
    const coords = coercePipelineCoords({
      lat: '19.0760',
      lng: '72.8777',
      currentLat: null,
      currentLng: null,
    });
    expect(coords.currentLat).toBeCloseTo(19.076);
    expect(coords.currentLng).toBeCloseTo(72.8777);
    expect(coords.storedCurrentLat).toBeNull();
    expect(coords.storedBirthLat).toBeCloseTo(19.076);
  });

  it('preserves a real zero and does not wipe it to null', () => {
    const coords = coercePipelineCoords({
      lat: '0',
      lng: '-78.5',
      currentLat: 0,
      currentLng: 10,
    });
    expect(coords.lat).toBe(0);
    expect(coords.storedBirthLat).toBe(0);
    expect(coords.storedBirthLng).toBeCloseTo(-78.5);
    expect(coords.currentLat).toBe(0);
    expect(coords.currentLng).toBe(10);
  });

  it('leaves genuinely missing birth coordinates null for storage', () => {
    const coords = coercePipelineCoords({
      lat: null,
      lng: undefined,
      currentLat: '',
      currentLng: 'nope',
    });
    expect(coords.lat).toBe(0);
    expect(coords.lng).toBe(0);
    expect(coords.storedBirthLat).toBeNull();
    expect(coords.storedBirthLng).toBeNull();
    expect(coords.storedCurrentLat).toBeNull();
    expect(coords.storedCurrentLng).toBeNull();
  });
});
