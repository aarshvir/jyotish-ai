/**
 * Pillar 2: pgvector semantic search over the Jyotish scripture corpus.
 *
 * Falls back to keyword search (src/lib/rag/scriptures.ts) if:
 *   - The corpus has not been embedded yet (migration not applied or seeds not run)
 *   - OPENAI_API_KEY is missing so we cannot embed the query
 *   - The RPC call fails for any reason
 *
 * This guarantees Jyotish RAG keeps working on dev boxes and in degraded prod
 * while still giving us true semantic retrieval when the infra is in place.
 *
 * Modes (see ragMode.ts): JYOTISH_RAG_MODE=hybrid|keyword|off, or per-request
 * jyotishRagMode on the report pipeline / agent routes for A/B tests.
 */

import { createServiceClient } from '@/lib/supabase/admin';
import { buildScriptureContext, searchScriptures, type ScriptureEntry } from './scriptures';
import type { JyotishRagMode } from './ragMode';
import { resolveJyotishRagMode } from './ragMode';

// gemini-embedding-2: supports outputDimensionality=1536, matching our pgvector schema
// exactly — no DDL migration needed. Free tier available via GEMINI_API_KEY.
const GOOGLE_EMBED_MODEL = 'gemini-embedding-2';
const EMBED_DIMS = 1536;

// Hard 15s timeout on the embed call
const EMBED_TIMEOUT_MS = 15_000;

/**
 * Embed text using Google's gemini-embedding-2 model with outputDimensionality=1536.
 * This matches the existing pgvector(1536) column schema exactly.
 * Falls back gracefully to null (triggering keyword search) on any failure.
 */
export async function embedText(input: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBED_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GOOGLE_EMBED_MODEL}`,
          content: { parts: [{ text: input }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBED_DIMS,
        }),
      },
    );
    if (!res.ok) {
      console.error('[rag/embed] google non-200:', res.status);
      return null;
    }
    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    const vec = json.embedding?.values;
    return vec && vec.length === EMBED_DIMS ? vec : null;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[rag/embed] timed out after', EMBED_TIMEOUT_MS, 'ms — falling back to keyword search');
    } else {
      console.error('[rag/embed] failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Semantic search via pgvector. Returns empty array on any failure —
 * callers should fall back to keyword search.
 */
export async function searchScripturesVector(
  query: string,
  topN = 3,
  minSimilarity = 0.3,
): Promise<ScriptureEntry[]> {
  const queryEmbedding = await embedText(query);
  if (!queryEmbedding) return [];

  try {
    const db = createServiceClient();
    const rpcPromise = db.rpc('match_jyotish_scriptures', {
      query_embedding: queryEmbedding,
      match_count: topN,
      min_similarity: minSimilarity,
    });
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('RPC timeout') }), 5000),
    );
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
    if (error) {
      console.error('[rag/vectorSearch] rpc error:', error.message);
      return [];
    }
    if (!Array.isArray(data)) return [];
    return data.map((row) => ({
      id: row.id,
      topic: row.topic,
      source: row.source,
      chapter: row.chapter ?? undefined,
      text: row.text,
      keywords: row.keywords ?? [],
    }));
  } catch (err) {
    console.error('[rag/vectorSearch] threw:', err);
    return [];
  }
}

/**
 * Hybrid retrieval: try pgvector first, fall back to keyword matching.
 * This is the public API the NativityAgent should call.
 */
export async function searchScripturesHybrid(
  query: string,
  topN = 6,
): Promise<ScriptureEntry[]> {
  // Lower similarity threshold for real BPHS chunks (OCR-cleaned text embeds at slightly
  // lower cosine similarity than tightly curated summaries)
  const vectorHits = await searchScripturesVector(query, topN, 0.25);
  if (vectorHits.length >= Math.min(topN, 2)) {
    return vectorHits;
  }

  // Fill remaining slots with keyword hits (deduped by id).
  const keywordHits = searchScriptures(query, topN);
  const seen = new Set(vectorHits.map((h) => h.id));
  for (const kh of keywordHits) {
    if (seen.has(kh.id)) continue;
    vectorHits.push(kh);
    seen.add(kh.id);
    if (vectorHits.length >= topN) break;
  }
  return vectorHits.slice(0, topN);
}

/**
 * Build a RAG context block for a set of detected yogas and planetary conditions,
 * using hybrid retrieval. Async counterpart to buildScriptureContext in scriptures.ts.
 * Inject the return value into the LLM prompt as grounding.
 */
// Total budget for the whole hybrid RAG lookup (embed + DB RPC + keyword fallback).
// Must be well under the nativity agent's 90s orchestrator timeout.

async function buildScriptureContextHybridInner(
  yogaNames: string[],
  lagnaSign?: string,
): Promise<string> {
  // 1. Collect all terms
  const allTerms = [...yogaNames];
  if (lagnaSign) allTerms.push(`${lagnaSign} lagna ascendant`);
  if (!allTerms.length) return '';

  const entries: ScriptureEntry[] = [];
  const seen = new Set<string>();

  const pushUnique = (arr: ScriptureEntry[]) => {
    for (const e of arr) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        entries.push(e);
      }
    }
  };

  // 2. Search all in parallel
  const results = await Promise.all(
    allTerms.map((t) => searchScripturesHybrid(t, 3))
  );

  results.forEach(pushUnique);

  if (!entries.length) return '';

  const blocks = entries
    .map(
      (e) =>
        `[${e.source}${e.chapter ? `, ${e.chapter}` : ''} — ${e.topic}]\n${e.text}`,
    )
    .join('\n\n');

  return `\n\nCLASSICAL SCRIPTURE REFERENCES (use these to ground your analysis in authoritative texts):\n\n${blocks}\n`;
}

/**
 * @param modeOverride - per-request override (e.g. from report pipeline); falls back to env.
 */
export async function buildScriptureContextHybrid(
  yogaNames: string[],
  lagnaSign?: string,
  modeOverride?: JyotishRagMode | null,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  const mode = modeOverride ?? resolveJyotishRagMode();
  if (mode === 'off') return '';
  if (mode === 'keyword') {
    return buildScriptureContext(yogaNames, lagnaSign);
  }

  // Use a longer base timeout for the whole hybrid phase
  const timeoutMs = options.timeoutMs ?? (Number(process.env.RAG_TOTAL_TIMEOUT_MS) || 120_000);

  try {
    return await Promise.race([
      buildScriptureContextHybridInner(yogaNames, lagnaSign),
      new Promise<string>((resolve) =>
        setTimeout(() => {
          console.warn(`[rag] buildScriptureContextHybrid total timeout (${timeoutMs}ms) — falling back to keyword search`);
          resolve(buildScriptureContext(yogaNames, lagnaSign));
        }, timeoutMs),
      ),
    ]);
  } catch (err) {
    console.error('[rag] buildScriptureContextHybrid threw:', err);
    return '';
  }
}

/**
 * Specifically search for Gochara (transit) results from Phaladeepika and BPHS.
 */
export async function searchByTransits(
  planets: string[],
  topN = 4,
  mode: JyotishRagMode = 'hybrid',
): Promise<ScriptureEntry[]> {
  if (!planets.length) return [];

  const query = `Gochara transits of ${planets.join(', ')}`;
  if (mode === 'off') return [];
  if (mode === 'keyword') {
    return searchScriptures(query, topN);
  }
  return searchScripturesHybrid(query, topN);
}

/**
 * Builds context for the ForecastAgent grounded in transit scriptures.
 */
export async function buildForecastRAGContext(
  activeTransits: string[],
  modeOverride?: JyotishRagMode | null,
): Promise<string> {
  const mode = modeOverride ?? resolveJyotishRagMode();
  if (mode === 'off' || !activeTransits.length) return '';

  const entries = await searchByTransits(activeTransits, 4, mode);
  if (!entries.length) return '';

  const blocks = entries
    .map(
      (e) =>
        `[${e.source}${e.chapter ? `, ${e.chapter}` : ''} — ${e.topic}]\n${e.text}`
    )
    .join('\n\n');

  return `\n\nCLASSICAL GOCHARA (TRANSIT) REFERENCES:\n\n${blocks}\n`;
}

