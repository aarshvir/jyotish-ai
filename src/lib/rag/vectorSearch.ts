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
 */

import { createServiceClient } from '@/lib/supabase/admin';
import { searchScriptures, type ScriptureEntry } from './scriptures';

// text-embedding-3-small: 1536 dims, ~5x cheaper than -large, good enough for
// topical Jyotish retrieval. Switch to -large if you see recall issues on obscure yogas.
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;

// Hard 8s timeout on the OpenAI embed call — must never block the nativity agent.
const EMBED_TIMEOUT_MS = 8_000;

export async function embedText(input: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input,
        dimensions: EMBED_DIMS,
      }),
    });
    if (!res.ok) {
      console.error('[rag/embed] openai non-200:', res.status);
      return null;
    }
    const json = (await res.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    const vec = json.data?.[0]?.embedding;
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
  topN = 3,
): Promise<ScriptureEntry[]> {
  const vectorHits = await searchScripturesVector(query, topN);
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
const RAG_TOTAL_TIMEOUT_MS = 15_000;

async function buildScriptureContextHybridInner(
  yogaNames: string[],
  lagnaSign?: string,
): Promise<string> {
  if (!yogaNames.length && !lagnaSign) return '';

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

  // Per-yoga semantic search in parallel.
  const perYoga = await Promise.all(
    yogaNames.map((y) => searchScripturesHybrid(y, 2)),
  );
  perYoga.forEach(pushUnique);

  if (lagnaSign) {
    const lagnaHits = await searchScripturesHybrid(`${lagnaSign} lagna ascendant`, 2);
    pushUnique(lagnaHits);
  }

  if (!entries.length) return '';

  const blocks = entries
    .map(
      (e) =>
        `[${e.source}${e.chapter ? `, ${e.chapter}` : ''} — ${e.topic}]\n${e.text}`,
    )
    .join('\n\n');

  return `\n\nCLASSICAL SCRIPTURE REFERENCES (use these to ground your analysis in authoritative texts):\n\n${blocks}\n`;
}

export async function buildScriptureContextHybrid(
  yogaNames: string[],
  lagnaSign?: string,
): Promise<string> {
  try {
    return await Promise.race([
      buildScriptureContextHybridInner(yogaNames, lagnaSign),
      new Promise<string>((resolve) =>
        setTimeout(() => {
          console.warn('[rag] buildScriptureContextHybrid total timeout — using empty context');
          resolve('');
        }, RAG_TOTAL_TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    console.error('[rag] buildScriptureContextHybrid threw:', err);
    return '';
  }
}
