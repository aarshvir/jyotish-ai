-- Pillar 2: skip unchanged scripture rows during nightly re-embed

ALTER TABLE public.jyotish_scriptures
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_jyotish_scriptures_content_hash
  ON public.jyotish_scriptures (content_hash);

COMMENT ON COLUMN public.jyotish_scriptures.content_hash IS 'SHA-256 of chunk text; when unchanged, embed refresh can skip';
