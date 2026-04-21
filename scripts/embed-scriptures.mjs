#!/usr/bin/env node
/**
 * Pillar 2 — Embed & upsert the Jyotish scripture corpus into Supabase pgvector.
 *
 * Usage (one-time after applying the 20260418_jyotish_rag_pgvector.sql migration):
 *   node scripts/embed-scriptures.mjs
 *
 * Required env (pulled from .env.local automatically if run via `npm run ...`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * What it does:
 *   1. Reads SCRIPTURE_CORPUS from src/lib/rag/scriptures.ts
 *   2. Embeds each entry's topic + text using OpenAI text-embedding-3-small (1536 dims)
 *   3. Upserts into the `jyotish_scriptures` table
 *
 * Re-running is safe — it's an idempotent upsert keyed by `id`. Add new rows to
 * SCRIPTURE_CORPUS and re-run to backfill.
 *
 * For markdown books: run `node scripts/chunk-scriptures.mjs` then `npm run embed:chunks`
 * (see `data/scriptures/README.md` and Inngest `refresh-scripture-embeddings`).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local manually (dotenv may not be installed standalone)
try {
  const envContent = readFileSync(resolve('.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local may not exist in CI — rely on existing env vars
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
      dimensions: EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

async function loadCorpus() {
  const chunksPath = resolve('data/scriptures/_chunks.json');
  try {
    const chunksData = readFileSync(chunksPath, 'utf8');
    const chunks = JSON.parse(chunksData);
    if (Array.isArray(chunks) && chunks.length > 0) {
      console.log(`[embed-scriptures] Loaded ${chunks.length} chunks from _chunks.json`);
      return chunks;
    }
  } catch {
    console.log('[embed-scriptures] Could not load _chunks.json, falling back to scriptures.ts...');
  }

  // Parse the TS module as text and eval the exported array.
  const file = readFileSync(resolve('src/lib/rag/scriptures.ts'), 'utf8');
  const m = file.match(/export const SCRIPTURE_CORPUS:[^=]*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('Could not locate SCRIPTURE_CORPUS in scriptures.ts');
  const literal = m[1];
  const corpus = Function(`"use strict"; return (${literal});`)();
  if (!Array.isArray(corpus)) throw new Error('Parsed corpus is not an array');
  
  // Add fallback content_hash for static corpus
  return corpus.map((c) => ({
    ...c,
    content_hash: c.content_hash || `${c.id}-legacy`,
  }));
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const corpus = await loadCorpus();
  console.log(`[embed-scriptures] ${corpus.length} entries to process`);

  // Fetch existing hashes
  const { data: existingRows, error: fetchErr } = await supabase
    .from('jyotish_scriptures')
    .select('*')
    .limit(1);

  if (fetchErr) {
    console.error('[embed-scriptures] Failed to connect to jyotish_scriptures:', fetchErr.message);
    process.exit(1);
  }

  const columns = existingRows && existingRows[0] ? Object.keys(existingRows[0]) : [];
  const hasHashCol = columns.includes('content_hash');
  const hasVerseCol = columns.includes('verse_range');

  console.log(`[embed-scriptures] schema detect: content_hash=${hasHashCol}, verse_range=${hasVerseCol}`);

  const existingHashMap = new Map();
  if (hasHashCol) {
    const { data: hashRows } = await supabase.from('jyotish_scriptures').select('id, content_hash');
    for (const row of hashRows || []) {
      existingHashMap.set(row.id, row.content_hash);
    }
  }

  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;

  if (isDryRun) {
    for (const entry of corpus) {
      const existingHash = existingHashMap.get(entry.id);
      const isUnchanged = existingHash && existingHash === entry.content_hash;
      if (isUnchanged) {
        skipCount++;
      } else {
        okCount++;
      }
    }
    console.log(`[embed-scriptures] Would embed ${okCount} chunks. Skipped ${skipCount} (unchanged).`);
    process.exit(0);
  }

  for (const entry of corpus) {
    const existingHash = existingHashMap.get(entry.id);
    const isUnchanged = existingHash && existingHash === entry.content_hash;

    if (isUnchanged) {
      skipCount++;
      continue;
    }

    const textForEmbedding = `${entry.topic || ''}\n\n${entry.text || ''}`;
    try {
      const vector = await embed(textForEmbedding);
      const payload = {
        id: entry.id,
        topic: entry.topic || null,
        source: entry.source || null,
        chapter: entry.chapter || null,
        text: entry.text || null,
        keywords: entry.keywords || [],
        embedding: vector,
        updated_at: new Date().toISOString(),
      };

      if (hasHashCol) payload.content_hash = entry.content_hash || null;
      if (hasVerseCol) payload.verse_range = entry.verse_range || null;

      const { error } = await supabase
        .from('jyotish_scriptures')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error(`[embed-scriptures] upsert failed for ${entry.id}:`, error.message);
        failCount++;
      } else {
        okCount++;
        console.log(`[embed-scriptures] embedded: ${entry.id}`);
      }
    } catch (err) {
      console.error(`[embed-scriptures] embedding failed for ${entry.id}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n[embed-scriptures] done: Embedded ${okCount} chunks. Skipped ${skipCount} (unchanged). ${failCount} failed.`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[embed-scriptures] fatal:', err);
  process.exit(1);
});
