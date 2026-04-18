-- Pillar 2: Jyotish RAG via pgvector.
-- Stores embedded classical scripture excerpts (BPHS, Phaladeepika, Jaimini, etc.)
-- so the NativityAgent can retrieve topically-relevant passages to ground its
-- commentary in authoritative texts rather than Claude's general training data.

create extension if not exists vector;

create table if not exists jyotish_scriptures (
  id          text primary key,                 -- stable slug, matches the in-code corpus ids
  topic       text not null,
  source      text not null,
  chapter     text,
  text        text not null,
  keywords    text[] not null default '{}'::text[],
  -- OpenAI text-embedding-3-small produces 1536-dim vectors.
  -- If you switch embedding providers, bump the dimensionality and re-embed.
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cosine similarity index (IVFFlat). Recompute lists after bulk inserts with
-- `reindex index idx_jyotish_scriptures_embedding;` for best recall.
create index if not exists idx_jyotish_scriptures_embedding
  on jyotish_scriptures
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

create index if not exists idx_jyotish_scriptures_topic
  on jyotish_scriptures (topic);

-- RLS: corpus is world-readable (it's public philosophical text) but only
-- service_role can write. Never lets user-submitted text pollute the corpus.
alter table jyotish_scriptures enable row level security;

drop policy if exists "jyotish_scriptures_public_read" on jyotish_scriptures;
create policy "jyotish_scriptures_public_read"
  on jyotish_scriptures for select
  to anon, authenticated
  using (true);

-- Match RPC: returns the top-N scripture entries by cosine similarity.
-- Used by src/lib/rag/vectorSearch.ts.
create or replace function match_jyotish_scriptures(
  query_embedding vector(1536),
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
  'Semantic search over the Jyotish scripture corpus via pgvector cosine distance. Returns rows ordered by similarity (highest first), filtered by min_similarity.';
