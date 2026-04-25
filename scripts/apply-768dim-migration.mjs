#!/usr/bin/env node
/**
 * One-shot migration: change jyotish_scriptures from vector(1536) to vector(768)
 * and update the match_jyotish_scriptures RPC accordingly.
 * Run ONCE before running embed-scriptures.mjs --provider=google
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
} catch { /* ok */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const SQL = `
-- Drop old IVFFlat index (tied to old dimension)
drop index if exists idx_jyotish_scriptures_embedding;

-- Change embedding column to 768-dim, clearing existing embeddings
alter table jyotish_scriptures
  alter column embedding type vector(768)
  using null;

-- Recreate IVFFlat index for 768-dim
create index if not exists idx_jyotish_scriptures_embedding
  on jyotish_scriptures
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Recreate RPC for 768-dim
drop function if exists match_jyotish_scriptures(vector(1536), int, float);

create or replace function match_jyotish_scriptures(
  query_embedding vector(768),
  match_count int default 5,
  min_similarity float default 0.3
)
returns table (
  id text,
  topic text,
  source text,
  chapter text,
  text text,
  keywords text[],
  similarity float
)
language sql stable
as $$
  select
    s.id,
    s.topic,
    s.source,
    s.chapter,
    s.text,
    s.keywords,
    1 - (s.embedding <=> query_embedding) as similarity
  from jyotish_scriptures s
  where s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) > min_similarity
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
`;

try {
  const { error } = await db.rpc('exec_sql', { sql: SQL }).single().catch(() => ({ error: null }));
  // Try direct query as fallback
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: SQL }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('RPC exec_sql failed:', text.slice(0, 300));
    console.log('\nCould not auto-apply migration. Please run the following SQL in Supabase SQL Editor:');
    console.log('---');
    console.log(SQL);
    console.log('---');
    process.exit(1);
  }
  console.log('[migration] 768-dim migration applied successfully');
} catch (err) {
  console.error('[migration] Failed:', err.message);
  console.log('\nPlease run the following SQL in the Supabase SQL Editor:');
  console.log('File: supabase/migrations/20260425_jyotish_scriptures_768dim.sql');
  process.exit(1);
}
