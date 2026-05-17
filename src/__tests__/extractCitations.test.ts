import { describe, it, expect } from 'vitest';
import {
  extractCitations,
  replaceCitationsWithFootnotes,
  stripCitations,
  formatCitationLine,
} from '@/lib/reports/postProcess/extractCitations';

describe('extractCitations — all three citation forms', () => {
  it('accepts source-only form [[BPHS]]', () => {
    const citations = extractCitations('Per ancient texts [[BPHS]], this is so.');
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      marker: '[[BPHS]]',
      source: 'BPHS',
      sourceName: 'Brihat Parashara Hora Shastra',
      chapter: '',
      verse: '',
      footnoteIndex: 1,
    });
  });

  it('accepts source+chapter form [[BPHS:34]]', () => {
    const citations = extractCitations('Per ancient texts [[BPHS:34]], this is so.');
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      marker: '[[BPHS:34]]',
      chapter: '34',
      verse: '',
    });
  });

  it('accepts full source+chapter+verse form [[BPHS:34:12]]', () => {
    const citations = extractCitations('Per ancient texts [[BPHS:34:12]], this is so.');
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      marker: '[[BPHS:34:12]]',
      chapter: '34',
      verse: '12',
    });
  });

  it('mixes all three forms in a single string and dedupes by marker', () => {
    const text = 'A [[BPHS]] B [[BPHS:34]] C [[BPHS:34:12]] D [[BPHS]] E';
    const citations = extractCitations(text);
    expect(citations).toHaveLength(3);
    expect(citations.map((c) => c.marker)).toEqual([
      '[[BPHS]]',
      '[[BPHS:34]]',
      '[[BPHS:34:12]]',
    ]);
    expect(citations.map((c) => c.footnoteIndex)).toEqual([1, 2, 3]);
  });

  it('accepts all four registered source codes', () => {
    const text = '[[BPHS]] [[PHAL:6]] [[JAIMINI:1:15]] [[UPADESHA]]';
    const citations = extractCitations(text);
    expect(citations).toHaveLength(4);
    expect(citations.map((c) => c.sourceName)).toEqual([
      'Brihat Parashara Hora Shastra',
      'Phaladeepika',
      'Jaimini Sutras',
      'Upadesha Sutras',
    ]);
  });

  it('rejects unknown source codes silently', () => {
    const citations = extractCitations('[[BOGUS:1:2]] and [[SHRUTI]] should not match');
    expect(citations).toHaveLength(0);
  });
});

describe('replaceCitationsWithFootnotes', () => {
  it('replaces all three forms with bracket indices', () => {
    const { text, citations } = replaceCitationsWithFootnotes(
      'Jupiter is auspicious [[BPHS:36:4]] and Saturn brings discipline [[BPHS]] and Venus inspires art [[PHAL:6]].'
    );
    expect(text).toBe(
      'Jupiter is auspicious [1] and Saturn brings discipline [2] and Venus inspires art [3].'
    );
    expect(citations).toHaveLength(3);
  });

  it('returns text unchanged when no citations present', () => {
    const { text, citations } = replaceCitationsWithFootnotes('No citations here.');
    expect(text).toBe('No citations here.');
    expect(citations).toEqual([]);
  });

  it('reuses the same footnote index for repeated markers', () => {
    const { text, citations } = replaceCitationsWithFootnotes(
      '[[BPHS]] then [[BPHS:34]] then [[BPHS]] again.'
    );
    expect(text).toBe('[1] then [2] then [1] again.');
    expect(citations).toHaveLength(2);
  });
});

describe('stripCitations', () => {
  it('removes all three forms', () => {
    expect(stripCitations('a [[BPHS]] b [[BPHS:34]] c [[BPHS:34:12]] d')).toBe(
      'a  b  c  d'
    );
  });
});

describe('formatCitationLine', () => {
  it('formats source-only as just "[N] SourceName"', () => {
    expect(
      formatCitationLine({
        marker: '[[BPHS]]',
        source: 'BPHS',
        sourceName: 'Brihat Parashara Hora Shastra',
        chapter: '',
        verse: '',
        footnoteIndex: 1,
      })
    ).toBe('[1] Brihat Parashara Hora Shastra');
  });

  it('formats source+chapter as "[N] SourceName, Ch. K"', () => {
    expect(
      formatCitationLine({
        marker: '[[BPHS:34]]',
        source: 'BPHS',
        sourceName: 'Brihat Parashara Hora Shastra',
        chapter: '34',
        verse: '',
        footnoteIndex: 1,
      })
    ).toBe('[1] Brihat Parashara Hora Shastra, Ch. 34');
  });

  it('formats full form as "[N] SourceName, Ch. K, v. V"', () => {
    expect(
      formatCitationLine({
        marker: '[[BPHS:34:12]]',
        source: 'BPHS',
        sourceName: 'Brihat Parashara Hora Shastra',
        chapter: '34',
        verse: '12',
        footnoteIndex: 1,
      })
    ).toBe('[1] Brihat Parashara Hora Shastra, Ch. 34, v. 12');
  });
});
