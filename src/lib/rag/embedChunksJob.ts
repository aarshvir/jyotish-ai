/**
 * Batch-embed scripture chunks from `data/scriptures/_chunks.json` (see scripts/chunk-scriptures.mjs).
 * Used by Inngest cron and optional CLI (`npm run embed:chunks`).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createServiceClient } from '@/lib/supabase/admin';
import { embedText } from '@/lib/rag/vectorSearch';

export type ScriptureChunk = {
  id: string;
  topic: string;
  source: string;
  chapter?: string | null;
  verse_range?: string | null;
  text: string;
  keywords?: string[];
  content_hash: string;
};

function chunksPath(): string {
  return path.join(process.cwd(), 'data', 'scriptures', '_chunks.json');
}

export function loadScriptureChunks(): ScriptureChunk[] {
  const p = chunksPath();
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, 'utf8');
  const data = JSON.parse(raw) as ScriptureChunk[];
  return Array.isArray(data) ? data : [];
}

export async function runScriptureEmbedRefresh(
  maxProcess = 200,
): Promise<{ embedded: number; skipped: number; error?: string }> {
  const chunks = loadScriptureChunks();
  if (!chunks.length) {
    return { embedded: 0, skipped: 0, error: 'no_chunks_file' };
  }

  const db = createServiceClient();
  let embedded = 0;
  let skipped = 0;

  for (const ch of chunks.slice(0, maxProcess)) {
    const { data: existing } = await db
      .from('jyotish_scriptures')
      .select('id')
      .eq('id', ch.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const textForEmbedding = `${ch.topic}\n\n${ch.text}`;
    const vector = await embedText(textForEmbedding);
    if (!vector) {
      console.warn('[embedChunksJob] skip (no embedding):', ch.id);
      continue;
    }

    const { error } = await db.from('jyotish_scriptures').upsert(
      {
        id: ch.id,
        topic: ch.topic,
        source: ch.source,
        chapter: ch.chapter ?? null,
        text: ch.text,
        keywords: ch.keywords ?? [],
        embedding: vector,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.error('[embedChunksJob] upsert failed', ch.id, error.message);
      return { embedded, skipped, error: error.message };
    }
    embedded++;
  }

  return { embedded, skipped };
}
