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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
  console.error('Missing GEMINI_API_KEY (or GOOGLE_AI_API_KEY) — required for Google text-embedding-004');
  process.exit(1);
}

// gemini-embedding-2: 1536-dim output (matches pgvector schema), free tier via GEMINI_API_KEY.
const GOOGLE_EMBED_MODEL = 'gemini-embedding-2';
const EMBED_DIMS = 1536;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embed(text, retries = 5) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GOOGLE_EMBED_MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBED_DIMS,
        }),
      },
    );
    if (res.ok) {
      const json = await res.json();
      const vec = json.embedding?.values;
      if (!vec || vec.length !== EMBED_DIMS) throw new Error(`Unexpected dims: ${vec?.length}`);
      return vec;
    }
    const body = await res.text();
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
      console.log(`[embed-scriptures] ${res.status} — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${retries})...`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Google embedding API ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('Max retries exceeded for embedding');
}

async function loadCorpus() {
  // Prefer _chunks_clean.json (OCR-filtered) over _chunks.json
  const cleanPath = resolve('data/scriptures/_chunks_clean.json');
  const chunksPath = resolve('data/scriptures/_chunks.json');
  for (const [label, p] of [[`_chunks_clean.json`, cleanPath], [`_chunks.json`, chunksPath]]) {
    try {
      const chunksData = readFileSync(p, 'utf8');
      const chunks = JSON.parse(chunksData);
      if (Array.isArray(chunks) && chunks.length > 0) {
        console.log(`[embed-scriptures] Loaded ${chunks.length} chunks from ${label}`);
        return chunks;
      }
    } catch {
      // continue to next candidate
    }
  }
  console.log('[embed-scriptures] Could not load chunks files, falling back to scriptures.ts...');

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

  // Small inter-request delay to stay under OpenAI RPM limit (500 RPM on tier 1)
  const INTER_REQUEST_DELAY_MS = 150;

  for (let i = 0; i < corpus.length; i++) {
    const entry = corpus[i];
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
        if (okCount % 50 === 0 || okCount === 1) {
          console.log(`[embed-scriptures] progress: ${okCount} embedded, ${skipCount} skipped, ${failCount} failed (${i + 1}/${corpus.length})`);
        }
      }
      // Rate-limit safety: ~7 req/s stays well under 500 RPM limit
      await sleep(INTER_REQUEST_DELAY_MS);
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
