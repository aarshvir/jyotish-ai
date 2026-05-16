/**
 * extractCitations.ts — Post-processor for AI-generated Jyotish commentary.
 *
 * Parses [[SOURCE]] / [[SOURCE:CHAPTER]] / [[SOURCE:CHAPTER:VERSE]] citation
 * markers from LLM output into structured citation objects, enabling the
 * report UI to render footnotes and superscript references rather than raw
 * bracket markers.
 *
 * Three accepted forms (most-specific to least-specific):
 *   [[BPHS:34:12]]   → source + chapter + verse (verse metadata available)
 *   [[BPHS:34]]      → source + chapter (chapter known, verse not in chunk)
 *   [[BPHS]]         → source only (chunk lacked structured chapter metadata)
 *
 * Rationale: requiring chapter+verse let the model invent scholarly-sounding
 * numbers when the retrieved chunk only had source-level metadata. Accepting
 * source-only is the safer truth posture for launch.
 */

const CITATION_RE = /\[\[(BPHS|PHAL|JAIMINI|UPADESHA)(?::(\d+))?(?::(\d+))?\]\]/g;

export interface Citation {
  /** The full original marker, e.g. [[BPHS:34:12]] or [[BPHS]] */
  marker: string;
  /** Short source code: BPHS | PHAL | JAIMINI | UPADESHA */
  source: string;
  /** Human-readable source name */
  sourceName: string;
  /** Chapter number as string, or empty if not provided */
  chapter: string;
  /** Verse number as string, or empty if not provided */
  verse: string;
  /** Footnote index (1-based, assigned in order of first appearance) */
  footnoteIndex: number;
}

const SOURCE_NAMES: Record<string, string> = {
  BPHS: 'Brihat Parashara Hora Shastra',
  PHAL: 'Phaladeepika',
  JAIMINI: 'Jaimini Sutras',
  UPADESHA: 'Upadesha Sutras',
};

/**
 * Extract all unique citations from a text string.
 * Returns citations in order of first appearance, each with a footnote index.
 */
export function extractCitations(text: string): Citation[] {
  const seen = new Map<string, Citation>();
  let footnoteIndex = 1;

  for (const match of Array.from(text.matchAll(new RegExp(CITATION_RE.source, 'g')))) {
    const [marker, source, chapter, verse] = match;
    const key = marker;
    if (!seen.has(key)) {
      seen.set(key, {
        marker,
        source,
        sourceName: SOURCE_NAMES[source] ?? source,
        chapter: chapter ?? '',
        verse: verse ?? '',
        footnoteIndex: footnoteIndex++,
      });
    }
  }

  return Array.from(seen.values());
}

/**
 * Replace citation markers in text with superscript footnote numbers.
 * Returns both the transformed text and the citation list.
 *
 * Accepts all three forms: [[BPHS:34:12]], [[BPHS:34]], [[BPHS]].
 */
export function replaceCitationsWithFootnotes(text: string): {
  text: string;
  citations: Citation[];
} {
  const citations = extractCitations(text);

  if (citations.length === 0) {
    return { text, citations: [] };
  }

  const lookup = new Map<string, number>(
    citations.map((c) => [c.marker, c.footnoteIndex])
  );

  const transformed = text.replace(
    /\[\[(BPHS|PHAL|JAIMINI|UPADESHA)(?::\d+)?(?::\d+)?\]\]/g,
    (marker) => {
      const idx = lookup.get(marker);
      return idx != null ? `[${idx}]` : marker;
    }
  );

  return { text: transformed, citations };
}

/**
 * Strip all citation markers from text entirely (for plain-text contexts like PDF).
 */
export function stripCitations(text: string): string {
  return text.replace(
    /\[\[(BPHS|PHAL|JAIMINI|UPADESHA)(?::\d+)?(?::\d+)?\]\]/g,
    ''
  );
}

/**
 * Build a human-readable citation reference line.
 *   Source + chapter + verse:  "[1] Brihat Parashara Hora Shastra, Ch. 34, v. 12"
 *   Source + chapter:          "[1] Brihat Parashara Hora Shastra, Ch. 34"
 *   Source only:               "[1] Brihat Parashara Hora Shastra"
 */
export function formatCitationLine(citation: Citation): string {
  const parts = [citation.sourceName];
  if (citation.chapter) {
    parts.push(`Ch. ${citation.chapter}`);
    if (citation.verse) {
      parts.push(`v. ${citation.verse}`);
    }
  }
  return `[${citation.footnoteIndex}] ${parts.join(', ')}`;
}
