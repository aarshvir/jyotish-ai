#!/usr/bin/env node
/**
 * Apply the vector(1536) → vector(768) migration via direct postgres connection.
 * Uses SUPABASE_DB_PASSWORD + project ref to build the pooler connection string.
 * 
 * Run: node scripts/migrate-768dim.mjs
 */
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

// Extract project ref from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const projRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projRef = projRefMatch?.[1];
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!projRef) {
  console.error('Cannot determine project ref from NEXT_PUBLIC_SUPABASE_URL');
  printManualInstructions();
  process.exit(1);
}

if (!dbPassword) {
  console.error('SUPABASE_DB_PASSWORD not set in .env.local');
  printManualInstructions();
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

const SQL = `
-- Drop old IVFFlat index (tied to 1536-dim)
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

-- Drop old 1536-dim RPC
drop function if exists match_jyotish_scriptures(vector(1536), int, float);

-- Recreate RPC for 768-dim
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
  // Try dynamic import of pg
  const { default: pkg } = await import('pg').catch(() => import('https://esm.sh/pg@8'));
  const { Client } = pkg;
  const client = new Client({ connectionString });
  await client.connect();
  console.log('[migrate] Connected to Supabase');
  await client.query(SQL);
  await client.end();
  console.log('[migrate] Migration applied: jyotish_scriptures is now vector(768)');
} catch (err) {
  console.error('[migrate] Failed:', err.message);
  printManualInstructions();
  process.exit(1);
}

function printManualInstructions() {
  console.log('\n═══ MANUAL MIGRATION REQUIRED ═══');
  console.log('Go to: https://supabase.com/dashboard/project/ytsbrxxiuoludtrieehn/sql/new');
  console.log('Run the SQL in: supabase/migrations/20260425_jyotish_scriptures_768dim.sql');
  console.log('Then run: node scripts/embed-scriptures.mjs');
}
