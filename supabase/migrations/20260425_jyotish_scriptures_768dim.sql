-- Switch jyotish_scriptures from 1536-dim (OpenAI) to 768-dim (Google text-embedding-004).
-- Run this migration BEFORE re-running scripts/embed-scriptures.mjs with --provider=google.
-- After re-embedding, run: reindex index idx_jyotish_scriptures_embedding;

-- Drop the old IVFFlat index (tied to 1536-dim)
drop index if exists idx_jyotish_scriptures_embedding;

-- Change the embedding column to 768-dim
alter table jyotish_scriptures
  alter column embedding type vector(768)
  using null; -- reset embeddings; they'll be repopulated by the embed script

-- Recreate the IVFFlat index for 768-dim
create index if not exists idx_jyotish_scriptures_embedding
  on jyotish_scriptures
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Update the match RPC to use 768-dim
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

comment on function match_jyotish_scriptures is
  'Semantic search over the Jyotish scripture corpus via pgvector cosine distance (768-dim, Google text-embedding-004). Returns rows ordered by similarity (highest first), filtered by min_similarity.';
