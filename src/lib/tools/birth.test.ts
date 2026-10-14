import { describe, expect, it } from 'vitest';
import { cityCandidates, isRealDate, normalizeTime, validateBirth } from './birth';

const birth = { birth_date: '2000-02-29', birth_time: '06:30', birth_city: 'London, UK', birth_lat: 51.5, birth_lng: 0 };

describe('deliberate, valid birth details', () => {
  it.each(['2000-02-29', '2024-02-29', '1990-01-01'])('accepts a real date %s', date => expect(isRealDate(date)).toBe(true));
  it.each(['1900-02-29', '2023-02-29', '2024-02-30', '2024-13-01', '2024-00-01', '2024-01-00', '2024-04-31', '0000-01-01', '24-01-01', 'garbage'])('rejects impossible date %s', date => expect(isRealDate(date)).toBe(false));
  it.each(['00:00', '12:00:00', '23:59:59'])('accepts deliberate valid time %s', time => expect(normalizeTime(time)).not.toBeNull());
  it.each(['', '24:00', '23:60', '06:30:60', '6:30', '06:30junk', 'noon'])('rejects missing or invalid time %s', time => expect(normalizeTime(time)).toBeNull());
  it('normalizes a supplied legacy time without adding a default', () => expect(validateBirth(birth, '2026-10-15')).toMatchObject({ ok: true, person: { birth_time: '06:30:00', birth_time_accuracy: 'known' } }));
  it.each(['', undefined, null])('does not manufacture missing time %s', time => expect(validateBirth({ ...birth, birth_time: time }).ok).toBe(false));
  it('rejects future birth dates and accepts today', () => {
    expect(validateBirth({ ...birth, birth_date: '2026-10-16' }, '2026-10-15').ok).toBe(false);
    expect(validateBirth({ ...birth, birth_date: '2026-10-15' }, '2026-10-15').ok).toBe(true);
  });
  it('refuses unknown time even when a caller sends a nominal noon', () => expect(validateBirth({ ...birth, birth_time: '12:00:00', birth_time_accuracy: 'unknown' })).toMatchObject({ ok: false, code: 'UNKNOWN_TIME' }));
  it('keeps approximate time explicitly provisional', () => expect(validateBirth({ ...birth, birth_time_accuracy: 'approximate' })).toMatchObject({ ok: true, person: { birth_time_accuracy: 'approximate' } }));
  it.each([[0, -78.5], [51.5, 0], [-90, 180], [90, -180]])('accepts real zero and boundary coordinates %s %s', (lat, lng) => expect(validateBirth({ ...birth, birth_lat: lat, birth_lng: lng }).ok).toBe(true));
  it.each([[0, 0], [null, 12], [false, 12], ['', 12], ['51.5', 0], [NaN, 0], [91, 0], [50, 181]])('rejects unlocated/non-numeric coordinates %s %s', (lat, lng) => expect(validateBirth({ ...birth, birth_lat: lat, birth_lng: lng }).ok).toBe(false));
  it.each([undefined, null, [], true, 42, 'birth'])('handles malformed runtime payload %s', raw => expect(validateBirth(raw).ok).toBe(false));
  it('strips names, emails and unrelated data from validated requests', () => {
    const result = validateBirth({ ...birth, name: 'Private Person', email: 'private@example.test', secret: 'secret' });
    expect(JSON.stringify(result)).not.toMatch(/Private Person|private@example|secret/);
  });
});

describe('city candidates', () => {
  it('returns multiple full labels, without selecting the first', () => {
    const matches = cityCandidates([{ lat: '0', lon: '-78.5', display_name: 'Town, Ecuador' }, { lat: '51.5', lon: '0', display_name: 'Town, UK' }]);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ lat: 0, lon: -78.5, display_name: 'Town, Ecuador' });
  });
  it('rejects malformed and private provider fields', () => {
    const matches = cityCandidates([{ lat: '', lon: '1', display_name: 'Missing' }, { lat: '1junk', lon: '2', display_name: 'Invalid' }, { lat: 1, lon: 2, display_name: 'Valid', private: 'provider secret' }]);
    expect(matches).toEqual([{ lat: 1, lon: 2, display_name: 'Valid' }]);
    expect(cityCandidates({ error: 'secret' })).toEqual([]);
  });
  it('deduplicates and limits choices', () => {
    const matches = Array.from({ length: 10 }, (_, i) => ({ lat: i + 1, lon: 10, display_name: `City ${i}` }));
    expect(cityCandidates([...matches, matches[0]])).toHaveLength(5);
  });
});
