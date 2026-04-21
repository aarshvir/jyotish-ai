# Scripture corpus (Pillar 2)

Place **lawfully sourced** markdown here, for example:

- `bphs/` — Brihat Parashara Hora Shastra (public-domain translation, chapter files).
- `phaladeepika/`, `jaimini/` — optional expansions.

Each `.md` file may start with YAML front-matter:

```yaml
---
source: Brihat Parashara Hora Shastra
chapter: "1"
chapter_title: Planetary characters
---
```

## Pipeline

1. Add or edit markdown under this directory (see `docs/plans/pillar-2.md` for sourcing options).
2. Run `node scripts/chunk-scriptures.mjs` — produces `_chunks.json` (gitignored if you prefer; committed small samples are fine for CI smoke tests).
3. Run `npm run embed:chunks` — upserts vectors into Supabase `jyotish_scriptures` (requires `OPENAI_API_KEY`, Supabase service URL + key).
4. Nightly: Inngest cron `refresh-scripture-embeddings` calls the same embed job server-side when chunks exist on the deployment artifact.

The in-repo `src/lib/rag/scriptures.ts` corpus remains the **offline fallback** when pgvector is empty.
