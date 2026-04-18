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
 * SCRIPTURE_CORPUS and re-run to backfill. For loading full books later, extend
 * this script to read from markdown/PDF chunks rather than the in-code array.
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
  // Parse the TS module as text and eval the exported array. Cheap & cheerful —
  // avoids a TS build step for a one-shot seed script.
  const file = readFileSync(resolve('src/lib/rag/scriptures.ts'), 'utf8');
  const m = file.match(/export const SCRIPTURE_CORPUS:[^=]*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('Could not locate SCRIPTURE_CORPUS in scriptures.ts');
  // Strip type annotations from the literal — the array is plain JSON-ish with string/keywords arrays.
  const literal = m[1];
  // Use Function() to evaluate the array literal in a sandbox-lite.
  // Safe because this is our own source file that we vendored.
  const corpus = Function(`"use strict"; return (${literal});`)();
  if (!Array.isArray(corpus)) throw new Error('Parsed corpus is not an array');
  return corpus;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const corpus = await loadCorpus();
  console.log(`[embed-scriptures] ${corpus.length} entries to embed`);

  let okCount = 0;
  let failCount = 0;

  for (const entry of corpus) {
    const textForEmbedding = `${entry.topic}\n\n${entry.text}`;
    try {
      const vector = await embed(textForEmbedding);
      const { error } = await supabase
        .from('jyotish_scriptures')
        .upsert(
          {
            id: entry.id,
            topic: entry.topic,
            source: entry.source,
            chapter: entry.chapter ?? null,
            text: entry.text,
            keywords: entry.keywords ?? [],
            embedding: vector,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
      if (error) {
        console.error(`[embed-scriptures] upsert failed for ${entry.id}:`, error.message);
        failCount++;
      } else {
        okCount++;
        console.log(`[embed-scriptures] ok: ${entry.id} (${entry.topic})`);
      }
    } catch (err) {
      console.error(`[embed-scriptures] embedding failed for ${entry.id}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n[embed-scriptures] done: ${okCount} succeeded, ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[embed-scriptures] fatal:', err);
  process.exit(1);
});
