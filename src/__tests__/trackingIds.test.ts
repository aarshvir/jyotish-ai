import { describe, it, expect } from 'vitest';
import { metaPixelId, ga4Id } from '@/lib/analytics/trackingIds';

describe('metaPixelId', () => {
  it('recovers the production value that broke the pixel (trailing line break)', () => {
    expect(metaPixelId('1582246613519613\n')).toBe('1582246613519613');
  });

  it.each([
    ['CRLF', '1582246613519613\r\n'],
    ['literal escaped \\n', '1582246613519613\\n'],
    ['surrounding quotes', '"1582246613519613"'],
    ['surrounding whitespace', '   1582246613519613   '],
  ])('cleans %s', (_label, raw) => {
    expect(metaPixelId(raw)).toBe('1582246613519613');
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['non-numeric', 'abc'],
    ['too short', '12345'],
    ['a script injection attempt', "1582246613519613'); alert(1); //"],
  ])('rejects %s so nothing renders', (_label, raw) => {
    expect(metaPixelId(raw)).toBeNull();
  });
});

describe('ga4Id', () => {
  it('cleans a measurement id with a trailing line break', () => {
    expect(ga4Id('G-ABC123XYZ9\n')).toBe('G-ABC123XYZ9');
  });

  it('accepts lower-case input', () => {
    expect(ga4Id('g-abc123xyz9')).toBe('G-ABC123XYZ9');
  });

  it.each([
    ['unset', undefined],
    ['a Universal Analytics id', 'UA-1234567-1'],
    ['an injection attempt', "G-ABC123', {}); alert(1); //"],
  ])('rejects %s', (_label, raw) => {
    expect(ga4Id(raw)).toBeNull();
  });
});
