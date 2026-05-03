import { describe, expect, it } from 'vitest';
import { buildScriptureContext, getSearchableScriptureCorpus, searchScriptures } from '@/lib/rag/scriptures';
import {
  assertRequiredScriptureGrounding,
  summarizeScriptureGrounding,
} from '@/lib/rag/sourceValidation';

describe('Jyotish RAG grounding', () => {
  it('loads the expanded BPHS chunk corpus for keyword fallback', () => {
    const corpus = getSearchableScriptureCorpus();
    const bphsCount = corpus.filter((entry) => /BPHS|Brihat\s+Parashara|Brihat\s+Parasara/i.test(entry.source)).length;

    expect(corpus.length).toBeGreaterThan(1000);
    expect(bphsCount).toBeGreaterThan(1000);
  });

  it('retrieves BPHS/Parashara material for core report topics', () => {
    const hits = searchScriptures('Vimshottari Dasha System Jupiter Transit Rahu Kaal', 8);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((entry) => /BPHS|Brihat\s+Parashara|Brihat\s+Parasara/i.test(entry.source))).toBe(true);
  });

  it('builds a context block that passes paid-report grounding checks', () => {
    const context = buildScriptureContext(['Vimshottari Dasha System', 'Jupiter Transit'], 'Cancer');
    const summary = summarizeScriptureGrounding(context);

    expect(summary.hasContext).toBe(true);
    expect(summary.hasBphs).toBe(true);
    expect(() => assertRequiredScriptureGrounding(context, 'test-step')).not.toThrow();
  });

  it('rejects empty or non-BPHS contexts when strict grounding is required', () => {
    expect(() => assertRequiredScriptureGrounding('', 'test-step')).toThrow(/missing classical scripture/i);
    expect(() =>
      assertRequiredScriptureGrounding('[Some Blog - timing]\nUnverified text', 'test-step'),
    ).toThrow(/does not include BPHS/i);
  });
});
