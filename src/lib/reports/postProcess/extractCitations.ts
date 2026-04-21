/**
 * extractCitations.ts — Post-processor for AI-generated Jyotish commentary.
 *
 * Parses [[SOURCE:CH:V]] citation markers from LLM output into structured
 * citation objects, enabling the report UI to render footnotes and
 * superscript references rather than raw bracket markers.
 *
 * Citation format: [[SOURCE:CHAPTER:VERSE]]
 * Examples:
 *   [[BPHS:34:12]]         → BPHS, Chapter 34, Verse 12
 *   [[PHAL:6:3]]           → Phaladeepika, Chapter 6, Verse 3
 *   [[JAIMINI:1:15]]       → Jaimini Sutras, Adhyaya 1, Sutra 15
 *   [[UPADESHA:2:7]]       → Upadesha Sutras, Pada 2, Sutra 7
 */

const CITATION_RE = /\[\[(BPHS|PHAL|JAIMINI|UPADESHA):(\d+):(\d+)\]\]/g;

export interface Citation {
  /** The full original marker, e.g. [[BPHS:34:12]] */
  marker: string;
  /** Short source code: BPHS | PHAL | JAIMINI | UPADESHA */
  source: string;
  /** Human-readable source name */
  sourceName: string;
  /** Chapter number as string */
  chapter: string;
  /** Verse number as string */
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
        chapter,
        verse,
        footnoteIndex: footnoteIndex++,
      });
    }
  }

  return Array.from(seen.values());
}

/**
 * Replace [[SOURCE:CH:V]] markers in text with superscript footnote numbers.
 * Returns both the transformed text and the citation list.
 *
 * Example:
 *   Input:  "Jupiter in Kendra is auspicious [[BPHS:36:4]]"
 *   Output: text = "Jupiter in Kendra is auspicious¹", citations = [{...}]
 */
export function replaceCitationsWithFootnotes(text: string): {
  text: string;
  citations: Citation[];
} {
  const citations = extractCitations(text);

  if (citations.length === 0) {
    return { text, citations: [] };
  }

  // Build a lookup: marker → footnote index
  const lookup = new Map<string, number>(
    citations.map((c) => [c.marker, c.footnoteIndex])
  );

  // Replace each marker with a placeholder the UI can style as superscript.
  // We use a special delimiter that React can detect.
  const transformed = text.replace(/\[\[(BPHS|PHAL|JAIMINI|UPADESHA):\d+:\d+\]\]/g, (marker) => {
    const idx = lookup.get(marker);
    return idx != null ? `[${idx}]` : marker;
  });

  return { text: transformed, citations };
}

/**
 * Strip all citation markers from text entirely (for plain-text contexts like PDF).
 */
export function stripCitations(text: string): string {
  return text.replace(/\[\[(BPHS|PHAL|JAIMINI|UPADESHA):\d+:\d+\]\]/g, '');
}

/**
 * Build a human-readable citation reference line.
 * e.g. "[1] Brihat Parashara Hora Shastra, Ch. 34, v. 12"
 */
export function formatCitationLine(citation: Citation): string {
  return `[${citation.footnoteIndex}] ${citation.sourceName}, Ch. ${citation.chapter}, v. ${citation.verse}`;
}
