# Architecture (one page)

## Shape

One Node/TypeScript process, one SQLite file (`data/engine.db`), one CLI (`npm run tick`). Loops share rows, not files dumped on disk. Secrets stay in `.env` / parent `.env.local`.

```
public signals + first-party aggregates
        │
        ▼
   ideas (scored)
        │
        ▼
   drafts (lint must pass)
        │
        ▼
   assets (out/YYYY-MM-DD/slug)
        │
        ├─► ready-to-post/     (Instagram, Reels — you tap)
        ├─► blog + RSS         (automatable)
        ├─► ads/*.csv          (you import; spend gated)
        └─► dashboard.html     (which idea → asset → channel → trial → paid)
                │
                ▼
           learnings.md + idea.weight
```

## Schedule (Asia/Kolkata)

| When | What |
|---|---|
| Daily 05:30 | insight → copy (top 2 ideas) → assets (top 1 that passed lint) → distribute (stage) → measure |
| Monday 06:00 | learn (re-rank, append learnings, weekly digest staged) |
| Manual only | paid (export). Never auto-launches spend. |
| On UI change | assets re-captures `/sample-report` |

GitHub Action: `.github/workflows/marketing-engine.yml`. Local daemon: `npm run daemon`.

## Scoring (Loop 1)

`score = weight * (0.30 search + 0.25 emotion + 0.20 uniqueness + 0.25 product_fit)`

- **search** is *relative* (Trends rank, iTunes review volume, first-party share). Absolute volumes are never invented.
- **emotion** is how close the angle sits to a real decision (job mail, telling parents, signing a lease), not "spiritual growth".
- **uniqueness** falls if competitor reviews already complain in those words; it rises for the 18-hour personal grid, which they do not ship.
- **product_fit** is how directly the idea lands on a daily timing score, not a one-off kundli PDF.
- **weight** starts at 1.0 and is moved by Loop 7 from real performance. No performance → no boost.

## Generation

1. `claude` CLI (subscription, $0 extra)  
2. Anthropic / OpenAI / Gemini API keys if present  
3. Category fallback packs that already pass the voice lint — used only when 1–2 fail, and the run log says so

Copy that fails the linter is regenerated (max 4 times), then dropped. It never ships.

## Money gates (CLAUDE.md law)

Before ElevenLabs, YouTube upload, Meta CAPI test events that could cost, or any ad import marked `validate`/`scale`:

- voice plan is male, one timbre, approved id or local SAPI/Piper
- capture URL is `/sample-report` (or another allowlisted report URL)
- jargon list is clean in ad context
- words-per-shot ≤ seconds × 2.3
- banned-claims list is clean
- active lessons are injected

Failure is a throw, not a warning.

## What the brief asked for that we will not build

Documented with citations in `docs/POLICY.md`. Reddit JSON, Google autocomplete, Quora scrape, unofficial Instagram, auto-public YouTube, and pricing-page screen recordings are **invalidated**. The engine still hits the brief's outcomes using first-party data, Google Trends RSS, Wikipedia API, iTunes RSS, YouTube Data API (if keyed), and the live sample report.
