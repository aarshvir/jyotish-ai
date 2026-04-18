# Pillar 2 — Authority via Jyotish RAG (BPHS / Phaladeepika / Jaimini)

**Status:** blocked on Pillar 1 (uses Inngest phases to run embedding refresh without timing out).

---

## Goal

Every AI-generated sentence in a VedicHour report is traceable to a classical sutra retrieved via pgvector semantic search — not Claude's pre-trained guess. A user reading their report sees inline citations like *"(Brihat Parashara Hora Shastra, ch. 34 v. 12)"* next to specific yoga analyses.

**Acceptance:**

1. `jyotish_scriptures` has ≥ 2,000 rows (chunked from full BPHS + Phaladeepika + Jaimini Sutras + Upadesha Sutras), each with a non-null `embedding` of dim 1536.
2. `NativityAgent` passes detected yoga names (non-empty array) into `buildScriptureContextHybrid`; the prompt block "CLASSICAL SCRIPTURE REFERENCES" is present and non-empty in 100% of production runs (log assertion).
3. `ForecastAgent` and every commentary route in `src/lib/llm/routeCompletion.ts` receive injected RAG context keyed on active transits (transit planet + sign + aspected house).
4. An Inngest cron refreshes embeddings nightly if the corpus changes (hash-based); no manual re-embed needed.
5. Regression: generate a report for a chart with **Hamsa Mahapurusha Yoga** — the output must cite BPHS verse identifying Hamsa yoga (Jupiter in own/exaltation in kendra).

---

## Files Cursor will change / create

### Corpus

- `data/scriptures/bphs/` — one `.md` per chapter (Cursor will generate from a public-domain English translation source; see "You do" step 1 for provenance). Each file front-matter: `source`, `chapter`, `chapter_title`.
- `data/scriptures/phaladeepika/` — same structure.
- `data/scriptures/jaimini-sutras/` — same.
- `data/scriptures/upadesha-sutras/` — same.
- `scripts/chunk-scriptures.mjs` — new. Walks `data/scriptures/**/*.md`, chunks to ~400-token windows with 60-token overlap, emits `data/scriptures/_chunks.json` with `{source, chapter, verse_range, text, tags}`.
- `scripts/embed-scriptures.mjs` — extend to read `_chunks.json` instead of only the in-code corpus; compute content hash per chunk; skip unchanged rows.

### Retrieval

- `src/lib/rag/scriptures.ts` — keep hand-curated excerpts as a fallback corpus; export a `STATIC_CORPUS` constant.
- `src/lib/rag/vectorSearch.ts` — no schema change; add `searchByYogas(yogaNames: string[], lagna: string, limit?: number)` and `searchByTransits(transits: TransitDescriptor[], limit?: number)` helpers, each calling `match_jyotish_scriptures` with a synthetic query string.
- `src/lib/rag/yogaDetection.ts` — new. Given a `NatalChartData`, return detected yoga names (Hamsa, Malavya, Sasa, Ruchaka, Bhadra, Gaja-Kesari, Neech Bhanga, Viparita Raja, Chandra-Mangala, etc. — start with the 20 most-cited classical yogas). Pure function, no LLM.
- `src/lib/agents/NativityAgent.ts` — call `detectYogas(natalChart)` before `buildScriptureContextHybrid`; pass the real list (not `[]`).
- `src/lib/agents/ForecastAgent.ts` — inject RAG block built from active transits; plumb the context into the prompt the same way NativityAgent does.
- `src/lib/llm/routeCompletion.ts` — accept an optional `ragContext?: string` in the request body; when present, prepend to the system prompt. Every caller in `src/lib/reports/phases/*.ts` (from Pillar 1) passes the relevant context.

### Operations

- `src/app/api/cron/refresh-embeddings/route.ts` — new. Triggered by Inngest cron; diffs chunk content hashes vs `jyotish_scriptures`; re-embeds only changed rows in batches of 50. Uses `OPENAI_API_KEY`.
- `src/lib/inngest/functions.ts` — add `refreshEmbeddingsCron` function with `cron: '0 3 * * *'`.
- `supabase/migrations/<new>_jyotish_scriptures_content_hash.sql` — add `content_hash text` column + unique index on `(source, chapter, verse_range)`.

### Report UI — citations

- `src/components/report/NativityCard.tsx` — when commentary includes markers like `[[BPHS:34:12]]`, render as superscript footnote numbers.
- `src/components/report/ScriptureFootnotes.tsx` — new. Renders the citation table at the bottom of each section.
- `src/lib/reports/postProcess/extractCitations.ts` — new. Parses `[[SOURCE:CH:V]]` markers out of AI output into a `citations[]` array.

---

## Cursor does (ordered)

1. Write the content-hash migration; apply via Supabase CLI or SQL editor ("You do" step 2).
2. Build `src/lib/rag/yogaDetection.ts` with unit tests under `src/lib/rag/__tests__/yogaDetection.test.ts` covering the 20 starter yogas against known charts (use birth data from the Grandmaster reference PDF).
3. Extend `scripts/chunk-scriptures.mjs`; run it locally against the seed corpus directory to produce `_chunks.json`.
4. Extend `scripts/embed-scriptures.mjs` to be hash-aware and resumable (so 2k rows × $0.02/1M tokens finishes within free tier).
5. Wire `NativityAgent.ts`: detect yogas → pass to `buildScriptureContextHybrid(yogaNames, lagna)`.
6. Wire `ForecastAgent.ts`: compute active transits for the forecast window → `searchByTransits(...)` → inject into prompt.
7. Route all commentary callers through `routeCompletion` with `ragContext` populated from the relevant phase's data.
8. Add prompt instruction: *"Cite classical sources inline using the format `[[SOURCE:CH:V]]` — e.g. `[[BPHS:34:12]]`. Only cite references provided in the CLASSICAL SCRIPTURE REFERENCES block above; never invent verse numbers."*
9. Add `extractCitations.ts` post-processor that runs after each phase and stores `citations` JSON on the report row.
10. Update `NativityCard.tsx` + add `ScriptureFootnotes.tsx`.
11. Add `refreshEmbeddingsCron` Inngest function + API route.
12. Run `npx tsc --noEmit` and the yoga detection unit tests.

---

## You do (exact click-by-click)

### 1. Source the corpus (legal + logistics)

The AI cannot generate a 2,000-verse corpus from thin air without hallucinating. You need a lawful source.

**Option A (fastest, cleanest):**

1. Go to https://archive.org/ and search for "Brihat Parashara Hora Shastra Santhanam" (public-domain English translation by R. Santhanam, vols 1 & 2). Download the PDFs.
2. Go to https://archive.org/details/PhalaDeepikaByVaidyanathaDikshitaEnglish — download the Phaladeepika PDF.
3. Go to https://sanskritdocuments.org/ → search "Jaimini Sutras Sanjay Rath" or use the public-domain Iyer translation from archive.org.
4. Drop all four PDFs into `data/scriptures/_raw/` in the repo (you drag them from Explorer into VS Code). Commit them with `git lfs track "*.pdf"` if they exceed 50 MB — or keep them out of git and let Cursor generate the `.md` files from them locally, committing only the `.md`.

**Option B (if you want a vetted licensed dataset):**

1. Email https://jyotisha.github.io/ or https://www.vedicastrologer.org/ — both have indicated corpus access in the past. Pay if asked; this is worth ~$500 to skip weeks of OCR cleanup.
2. When you receive a `.zip` of cleaned `.md` files, extract into `data/scriptures/<source>/`.

**Option C (budget):**

1. Use Anthropic's Claude Sonnet via the **Claude console** (https://console.anthropic.com/) to OCR and clean the PDFs chapter-by-chapter. Ask it to output markdown with verse anchors. Paste results manually. This is what Cursor cannot do headlessly because it requires reviewing every page for OCR errors.

**Tell Cursor in chat which option you picked** so it knows whether to expect files at `data/scriptures/_raw/` or `data/scriptures/<source>/*.md`.

### 2. Supabase — apply hash-column migration

1. https://supabase.com/dashboard → project → **SQL Editor** → **New query**.
2. Paste contents of `supabase/migrations/<new>_jyotish_scriptures_content_hash.sql`. Run.
3. Sidebar: **Database → Extensions** → confirm `vector` is enabled (it should be from the Pillar 2 existing migration).

### 3. OpenAI — confirm embedding key has budget

1. Go to https://platform.openai.com/ → **Billing**. Confirm at least **$5** of credit is available. Estimated cost to embed 2,000 chunks via `text-embedding-3-small` at ~500 tokens each = 1M tokens × $0.02 = **$0.02**. The $5 cushion is for re-runs and future expansion.
2. Go to **API Keys** → confirm your existing key has `model.request` + `embeddings.create` scopes (default keys do). If you use a restricted key, generate a new one scoped to `embeddings` only and replace `OPENAI_API_KEY` in Vercel.

### 4. Run the embed script (first time)

After Cursor has committed the `.md` files and the chunker:

1. In the repo root PowerShell:
   ```powershell
   $env:OPENAI_API_KEY = "sk-..."          # from step 3
   $env:NEXT_PUBLIC_SUPABASE_URL = "..."    # from Supabase dashboard → Project Settings → API
   $env:SUPABASE_SERVICE_ROLE_KEY = "..."   # same page, scroll down
   node scripts/chunk-scriptures.mjs
   node scripts/embed-scriptures.mjs
   ```
2. Expect output like `Embedded 2041 chunks in 312s. Skipped 0 (unchanged).` On re-run with no content changes, expect `Skipped 2041`.
3. Go to Supabase → **Table Editor → jyotish_scriptures** → confirm row count ≈ 2,000 and spot-check that `embedding` is populated (should show `[0.012, -0.034, ...]`, not `null`).

### 5. Vercel — nothing to add

All env vars already exist from Pillar 1 (`OPENAI_API_KEY`, `INNGEST_EVENT_KEY`). Just wait for Cursor's PR to auto-deploy.

### 6. Post-deploy verification

1. Open https://www.vedichour.com, generate a new 7-day report with a birth data that triggers **Hamsa yoga** (Jupiter in Cancer/Sagittarius/Pisces in a kendra). Use your own chart or any known chart from the Grandmaster reference PDF.
2. Open the completed report → Nativity section → confirm at least one inline citation like `[[BPHS:34:12]]` rendered as a superscript number, and the footnotes table at the bottom shows the verse text.
3. Inngest dashboard → confirm the nightly `refresh-embeddings` cron is scheduled (next run visible on the function page).

### 7. Rollback

- If RAG is degrading output quality, set Vercel env `RAG_ENABLED=false` (Cursor will honor this flag at the retrieval layer). Redeploy. Takes 2 minutes to roll back cleanly.
- If embeddings are corrupted: `delete from jyotish_scriptures;` in SQL editor; re-run step 4.

---

## Acceptance check

```powershell
npx tsc --noEmit
node scripts/embed-scriptures.mjs --dry-run    # should print "Would embed 0 chunks (all up to date)"
```

Manual: open a production report, view source — search for `[[BPHS:` marker in the raw HTML before client renders it. Must appear ≥ 1 time per nativity.

---

## Out of scope for Pillar 2

- UX changes beyond footnote rendering (Pillar 3).
- Any pricing / upsell work (Pillar 4).
