/**
 * Explicit RAG mode for A/B testing and degraded environments.
 * - hybrid: pgvector + keyword fallback (default production behavior)
 * - keyword: scriptures.ts keyword search only (no embeddings)
 * - off: no scripture context injected
 *
 * Request body `jyotishRagMode` overrides `JYOTISH_RAG_MODE` and `DISABLE_RAG`.
 */

export type JyotishRagMode = 'off' | 'keyword' | 'hybrid';

const MODES: Set<string> = new Set(['off', 'keyword', 'hybrid']);

function normalizeRaw(raw: string | undefined | null): string {
  return (raw ?? '').trim().toLowerCase();
}

/** Parse a single mode string; invalid → null */
export function parseJyotishRagMode(raw: string | undefined | null): JyotishRagMode | null {
  const s = normalizeRaw(raw);
  if (!s) return null;
  if (s === 'none' || s === 'false' || s === '0') return 'off';
  if (s === 'kw') return 'keyword';
  if (MODES.has(s)) return s as JyotishRagMode;
  return null;
}

/**
 * Effective mode for a server request.
 * Priority: explicit override → JYOTISH_RAG_MODE → DISABLE_RAG → default hybrid.
 */
export function resolveJyotishRagMode(override?: string | null): JyotishRagMode {
  const parsed = parseJyotishRagMode(override);
  if (parsed) return parsed;

  const fromEnv = parseJyotishRagMode(process.env.JYOTISH_RAG_MODE);
  if (fromEnv) return fromEnv;

  if (process.env.DISABLE_RAG === 'true') return 'off';

  return 'hybrid';
}
