import { beforeEach, describe, expect, it } from 'vitest';
import { makeChartResult } from './chart';
import { syntheticNatal } from './test-fixtures';
import { CALCULATOR_STORAGE_KEY, CALCULATOR_TTL_MS, clearCalculator, readCalculator, saveCalculator } from './storage';

const data = new Map<string, string>();
const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
const draft = { birth_date: '2000-01-01', birth_time: '06:30:00', birth_time_accuracy: 'known' as const, birth_city: 'London, UK', birth_lat: 51.5, birth_lng: 0 };
beforeEach(() => data.clear());
describe('bounded local-only calculator persistence', () => {
  it('saves and restores minimal draft and result, stripping identifying extras', () => {
    expect(saveCalculator(storage, { ...draft, name: 'Private Person', email: 'private@example.test' } as typeof draft, makeChartResult(syntheticNatal), 100)).toBe(true);
    expect(data.get(CALCULATOR_STORAGE_KEY)).not.toMatch(/Private Person|private@example/);
    expect(readCalculator(storage, 200)).toMatchObject({ draft, result: { lagna: 'Gemini' } });
  });
  it('expires and removes data at the seven-day boundary', () => {
    saveCalculator(storage, draft, null, 100);
    expect(readCalculator(storage, 100 + CALCULATOR_TTL_MS - 1)).not.toBeNull();
    expect(readCalculator(storage, 100 + CALCULATOR_TTL_MS)).toBeNull();
    expect(data.size).toBe(0);
  });
  it('clears only its own data, leaving account/unrelated drafts untouched', () => {
    data.set('account', 'preserved');
    saveCalculator(storage, draft, null, 100);
    expect(clearCalculator(storage)).toBe(true);
    expect(readCalculator(storage, 200)).toBeNull();
    expect(data.get('account')).toBe('preserved');
  });
  it('persists edits without stale results', () => {
    saveCalculator(storage, draft, makeChartResult(syntheticNatal), 100);
    saveCalculator(storage, { ...draft, birth_time: '07:30:00' }, null, 200);
    expect(readCalculator(storage, 300)).toMatchObject({ draft: { birth_time: '07:30:00' }, result: null });
  });
  it('allows incomplete drafts without fictional zero coordinates or time', () => {
    expect(saveCalculator(storage, { ...draft, birth_time: '', birth_lat: null, birth_lng: null }, null, 100)).toBe(true);
    expect(readCalculator(storage, 200)?.draft.birth_lat).toBeNull();
  });
  it('degrades gracefully when browser storage is denied', () => {
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
    expect(readCalculator(denied)).toBeNull();
    expect(saveCalculator(denied, draft, null)).toBe(false);
    expect(clearCalculator(denied)).toBe(false);
  });
  it.each(['not json', '{}', JSON.stringify({ version: 99 }), JSON.stringify({ version: 1, savedAt: 500, draft, result: null })])('rejects corrupt or future-dated saves', raw => {
    data.set(CALCULATOR_STORAGE_KEY, raw);
    expect(readCalculator(storage, 200)).toBeNull();
  });
});
