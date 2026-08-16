# VedicHour Autonomous Marketing Agent

A local, subscription-powered marketing engine for VedicHour. It shells out to CLI
subscriptions for reasoning (cost ≈ $0), stores everything in a local SQLite "memory",
checks every outbound action against a policy-linter, and can be halted instantly with a
kill-switch. Built to scale from foundations → daily content → paid ads with `<10%`
weekly human approval.

> **Status: Phase 0 (Foundations) — complete and verified on Windows.**
> The brain router, memory, policy-linter, scheduler, kill-switch and cockpit all work.
> Phases 1–7 (lifecycle, content, ads, …) plug into this foundation as their external
> credentials/app-reviews land. See **Roadmap** below.

---

## The engine model

Reasoning runs on **CLI subscriptions**, not paid API keys, so the marginal cost of
"thinking" is ~$0. A single `brain(prompt, {tier})` router spreads load across them,
throttles, enforces daily caps, and falls back if one is rate-limited.

| CLI | Tier it serves | Status on this machine |
|---|---|---|
| `gemini` (`gemini-2.5-flash`) | **bulk** — drafts, captions, classification, the linter | ✅ working |
| `codex` (`codex exec`) | **code / overflow / fallback** | ✅ working |
| `claude` (`claude -p --output-format json`) | **smart** — planning, judgement, synthesis | ⚪ optional — auto-detected when installed (`npm i -g @anthropic-ai/claude-code`) |

The router reads `config/routing.json` on every call, so you can re-tier, change models,
or disable a CLI with no restart.

## Quickstart

```powershell
# from marketing-agent/
npm install            # one-time (better-sqlite3 + tsx)
npm run doctor         # env + DB + kill-switch status
npm run brain "Draft a 1-line hook about timing your week" --tier bulk
npm run linter "We guarantee you will get rich"     # -> block
npm run loop:blog      # L1: draft + lint + stage an SEO article
npm run blog:promote <slug>   # publish a staged post into the live site (src/content/blog)
npm run loop:creative         # L4: ideate -> 6 variants/idea -> adversarial audit -> tournament
                              #     [--count N ideas] [--tier] [--dry] -> output/creative/
npm run loop:reel [slug]      # L2: render a faceless 9:16 reel (edge-tts + ffmpeg) -> media/reels/
npm run loop:render [slug]    # L2b: PRESENTER-LED AI reel (fal.ai + ffmpeg) -> output/reels/<slug>/
                              #      --dry stubs only the paid calls (default when FAL_KEY is absent)
                              #      --estimate prices the reel and stops
                              #      --languages hi,ta,te  real DUBBED variants (winners only)
npm run render:budget         # caps, spend so far, and the audited fal.ai price table
npm run loop:publish          # L3: package rendered reels into per-platform posts + UTM
npm run loop:social           # L3: generate IG/X/FB/LinkedIn posts -> output/social/
npm run loop:lifecycle        # L8: generate email/WhatsApp sequence copy -> output/lifecycle/ (no send)
npm run loop:outreach         # L7: B2B cold-email + Reddit/Quora value bank -> output/outreach/ (no send)
npm run loop:consent   # L8: sync Supabase signups -> consent ledger (reads prod; sends nothing)
npm run loop:sense     # free trend sensing (Google Trends RSS + Reddit Atom + YouTube) -> state/sense.json
npm run perf           # the exact per-tag performance brief the creative prompts receive
npm run playbook       # print the craft principles the prompts are currently reading
npm run playbook:review# re-examine each principle against observed evidence -> proposals (never auto-edits)
npm run loop:demo      # kill-aware brain heartbeat
npm run cockpit        # dashboard at http://localhost:4317 (scoreboard, content bank, approval queue)
npm run kill "reason"  # engage kill-switch   |   npm run revive

# Everything generates LOCALLY and policy-linted. Nothing posts/sends — publishing is the
# OAuth/Brevo/WhatsApp-gated step. Review staged output in output/ and media/reels/, then ship.
```

## Layout

```
marketing-agent/
  config/
    routing.json         # brain() tiers, models, caps, throttles (edit freely)
    banned-claims.json   # policy-linter word-list (block / flag / categories)
    creative-seeds.json  # L4 value prop, audience, idea families, hard rules (edit freely)
    playbook.json        # THE LIVING PLAYBOOK — craft principles with source + verifiedOn (edit freely)
  src/
    taxonomy.ts          # hook taxonomy: the join key between a creative's SHAPE and its results
    performance.ts       # marketing_assets x marketing_stats -> per-tag brief injected into prompts
    playbook.ts          # loads the playbook into prompts; `review` proposes updates, never edits
    brain/index.ts       # the router: tier -> CLI, throttle, daily cap, fallback, logging
    brain/clis.ts        # gemini / codex / claude adapters (Windows-safe, stdin-fed)
    db/index.ts          # SQLite singleton + helpers (logRun, enqueueApproval)
    db/schema.sql        # 7-table memory schema
    policy/linter.ts     # pass | flag | block  (deterministic word-list + brain classifier)
    safety/killswitch.ts # the data/KILL file every spend/send loop must check
    scheduler/heartbeat.ts
    loops/demo.ts        # Phase-0 dummy loop (proves the chain)
    loops/creative.ts    # L4 creative engine: ideate -> variants -> audit -> tournament
    loops/sense.ts       # L-sense: free trend sensing every 6h -> state/sense.json (never Instagram)
    cockpit/server.ts    # local HTML dashboard (scoreboard, queue, usage, runs, kill toggle)
    cli.ts               # command dispatch
  scripts/
    register-tasks.ps1   # Windows Task Scheduler (the launchd replacement)
  data/                  # marketing.db, KILL, heartbeat.json   (git-ignored)
  logs/                  # scheduled-run logs                   (git-ignored)
```

## Memory (SQLite, `data/marketing.db`)

`content_library` · `performance` · `attribution` · `consent_log` · `approval_queue` ·
`trust_ledger` · `runs_log` · `creative_variants` · `lessons`. Every brain call and loop logs to
`runs_log`; the cockpit and the daily-cap logic read from it. `creative_variants` also carries the
hook taxonomy (`hook_family`, `decision_domain`, `emotional_register`, `duration_target_sec`,
`explore`) — additive columns applied automatically by `migrate()` in `src/db/index.ts`.

## L4 — the creative engine (`npm run loop:creative`)

The cheap, high-frequency half of the video pipeline. Text is nearly free to generate and
video is not, so this loop over-produces scripts and then tries hard to kill its own work,
and only survivors reach the paid render stage.

0. **Learn** — before a word is written the loop gathers everything it knows: the per-tag
   performance brief (`src/performance.ts`), the least-tested tag combinations, the trend
   digest (`state/sense.json`) and the playbook (`config/playbook.json`). All $0, all
   degrade to nothing rather than failing the run. See "The closed learning loop" below.
1. **Ideate** — 8-12 candidate hooks, grounded in `config/creative-seeds.json` (what the
   product actually does, who it talks to, what it may never say). Angles already used in
   recent batches are excluded, so a loop running every 2 hours stops repeating itself.
   Every idea is TAGGED (`src/taxonomy.ts`), and ~30% of the slots that advance to scripting
   are reserved for under-tested tag combinations.
2. **Script** — 6 structured variants per idea: a hook that lands in under 1.0s (Meta's
   early-retention signal), a 22-32s Hinglish spoken script in Latin script, a 3-5 shot list
   with cinematic prompts, burned-in captions, CTA, hashtags, and YouTube copy.
3. **Audit** — adversarial. Deterministic gates (Latin script, hook length, shot shape,
   presenter opener) → `lint()` → a `brain()` call cast as a hostile reviewer paid to reject.
   Scores hookStrength / specificity / credibility / brandSafety / producibility.
   **Any brand-safety failure is a hard reject, whatever else it scored.**
4. **Tournament** — survivors go head-to-head in small brackets on one question: would a
   scrolling Indian viewer watch this to the end? Top 3 are kept.
5. **Persist** — winners land in `creative_variants` and `content_library` as
   `ready_to_render`, plus a `.json` and a readable `.md` in `output/creative/`. Losers are
   stored with the exact reason they died, so the next batch can learn from them.

Each winner's `.json` satisfies the `CreativeScript` contract in `src/render/types.ts`, so
the render pipeline consumes it directly. `--dry` skips all writes; `--count N` sets how many
ideas advance to scripting. Every call is $0 (CLI subscriptions, not APIs).

## The closed learning loop

The engine used to learn only from REJECTIONS — owner rulings and audit findings became rows in
`lessons` that are injected into the next prompt. It could not learn from RESULTS: `loop:stats`
collected views into `marketing_stats`, but those were keyed by asset SLUG, and a slug says
nothing about the SHAPE of a creative, so "which hooks actually perform?" had no join key.

Four pieces close that loop, all $0:

| piece | command | what it does |
| --- | --- | --- |
| **Hook taxonomy** (`src/taxonomy.ts`) | — | Tags every variant at creation: `hookFamily` · `decisionDomain` · `emotionalRegister` · `durationTargetSec`. Tags travel creative JSON → `creative_variants` → `marketing_assets` (migration `20260726`). This is the join key. |
| **Performance feedback** (`src/performance.ts`) | `npm run perf` | Joins `marketing_assets` × `marketing_stats`, computes peak views / views@24h / engagement / retention proxy per asset, aggregates BY TAG, and renders an honest brief that is injected into the ideate + script prompts. |
| **Trend sensing** (`src/loops/sense.ts`) | `npm run loop:sense` | Google Trends RSS + Reddit public Atom feeds + YouTube `search.list` (≤6 calls/run) → `state/sense.json`, digested into the ideate prompt. Instagram is never scraped. |
| **Living playbook** (`config/playbook.json`) | `npm run playbook` / `npm run playbook:review` | Craft research as versioned, sourced, dated data instead of a prompt string. The review command PROPOSES updates to the approval queue; it never edits the playbook itself. |

**The honesty rules are the point.** `performanceBrief()` never asserts a comparison with fewer
than 3 samples on either side, labels every number with its `n`, and when the evidence is thin it
says so in those words. A confident brief built on two data points would collapse the engine onto
one format permanently, on noise — worse than no brief at all.

**Explore/exploit.** Roughly 30% of the ideas that advance to scripting are reserved for
under-tested tag combinations, enforced deterministically in `selectForScripting()` against the
engine's OWN counts of what has been written and posted — never against the model's self-declared
`"explore": true`. If no candidate idea lands in an under-tested combination, the run says the
quota went unmet rather than mislabelling an exploit idea, which would poison the coverage counts.

## L2b — AI video render pipeline (`src/render/`)

Turns a winning `output/creative/*.json` into a finished, presenter-led 9:16 reel.

**House rule:** every reel must OPEN on a photoreal human presenter speaking to camera in
Roman-script Hinglish. Instagram deprioritises pure AI-generated content with no visible human
layer; AI-*assisted* content with a presenter does not get that treatment. `validateCreative()`
rejects a creative whose first shot isn't a `presenter`, and rejects non-Latin dialogue (it
breaks Veo's lip-sync).

**One key, one bill:** all four video models are reached through **fal.ai** (`FAL_KEY`).
Sora 2 is deliberately not used — its API sunsets September 2026.

| Role | Model | fal endpoint | Rate |
|---|---|---|---|
| presenter / close | Veo 3.1 Fast (native dialogue + lip-sync) | `fal-ai/veo3.1/fast` | $0.15/s |
| hero b-roll | Kling 3.0 Standard (audio off) | `fal-ai/kling-video/v3/standard/text-to-video` | $0.084/s |
| filler b-roll | Wan 2.7 (native 1080p) | `fal-ai/wan/v2.7/text-to-video` | $0.10/s |
| fallback | Seedance 2.0 Fast | `bytedance/seedance-2.0/fast/text-to-video` | $0.2419/s |
| product shot | Playwright + ffmpeg pan | local | **$0.00** |

The full table with sources lives in `PRICE_TABLE` (`src/render/providers.ts`) — nothing else
may hardcode a per-second price. Rows fal wouldn't serve are flagged `priceVerified: false` and
budgeted at the higher sibling rate, because under-estimating is the dangerous direction.

**Budget guard (`src/render/budget.ts`) is authoritative.** Per-run / rolling-24h / rolling-7d
caps ($4 / $6 / $35 by default, `VIDEO_BUDGET_*_USD`) backed by the `video_spend` table, checked
before the reel AND again before every individual shot. It refuses rather than truncates.

Without `FAL_KEY` the loop runs in `--dry` mode: it validates the graph, prints a per-shot cost
estimate, and still renders a **real** end-to-end video using lavfi placeholder footage through
the actual assembly path — only the generation call is stubbed.

### Localization — real dubbed audio (winners only)

`--languages hi,ta,te` produces genuinely dubbed variants, not translated captions:
translate via `brain()` ($0) → **Sarvam Bulbul v3** TTS (₹30/10k chars, `SARVAM_API_KEY`) →
**sync.so lipsync-2** on the presenter shots only ($0.05/s base, `SYNC_API_KEY`) → reassembly.
Missing `SYNC_API_KEY` degrades to dub-over without lip-sync; missing `SARVAM_API_KEY` skips
localization entirely. Output lands in `output/reels/<slug>/<lang>/`.

> **Localized captions bypass ASS/libass.** This ffmpeg's libass does no Indic complex shaping —
> verified against Chromium on the same font: `दिन` renders as `दनि`, reph never lifts, conjuncts
> never ligate. Non-Latin captions are therefore rendered as plates in headless Chromium and
> overlaid as timed PNGs. Re-verify with `npx tsx scripts/verify-localized-captions.ts <slug> hi`.

## Safety (always on)

- **Kill-switch** — `data/KILL` exists → every spending/sending loop halts. Toggle from the
  cockpit or `npm run kill` / `npm run revive`.
- **Policy-linter** — `block` is never published; `flag` escalates to `approval_queue`; `pass`
  proceeds. A banned word short-circuits to `block` with zero CLI cost.
- **Consent** — no message may be sent without a `consent_log` row (enforced as L8 is built).
- **Fair-use caps** — per-CLI daily cap in `routing.json`, counted from `runs_log`.

## Scheduler & uptime (Windows)

`scripts\register-tasks.ps1` registers the loop with **Windows Task Scheduler** (no admin,
current user). It runs only while you're logged in. For 24/7 operation: keep the laptop
awake (`powercfg`), use an always-on box, or push LLM-planning jobs to Claude Code cloud
routines. This is the honest replacement for the plan's macOS `launchd`/`caffeinate`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -IntervalMinutes 30 -RunNow
powershell -ExecutionPolicy Bypass -File scripts\register-tasks.ps1 -Unregister
```

## Roadmap (built in order; don't skip an Exit Gate)

| Phase | Goal | Blocked on (from Aarsh) |
|---|---|---|
| **0 Foundations** | brain, memory, linter, scheduler, kill-switch, cockpit | ✅ done |
| 1 Capture & lifecycle + daily blog | **L1 blog live-capable; L8 consent ledger ready** | email/WhatsApp *sending*: Brevo/Resend + WhatsApp Cloud/Twilio; keyword targeting: Search Console/GA4 OAuth |
| 2 Organic content engine | 3–4 faceless reels/day | YouTube + Meta OAuth, Pexels key (**ffmpeg + edge-tts now installed ✓**) |
| 3 Paid + optimizer | amplify winners, `<10%` weekly | funded Google/Meta Ads, daily spend cap, banned-claims list |
| 4 Outbound & partnerships | B2B + referrals | sending subdomain (warm early), Apollo |
| 5 Scale & multi-channel | 10× volume, more platforms/langs | premium-media budget (opt), target markets |
| 6 Self-optimizing | experiments + bandit budget | experiment budget envelope |
| 7 Governance | self-heal, monthly review | uptime host decision |

**Media path for Phase 2** is free by default (edge-tts + Pexels/Pixabay + ffmpeg);
ElevenLabs/HeyGen are opt-in config flags, never on by default.

**$200/month short-form stack (Aug 2026):** keep this agent as the control plane,
fund fal.ai + Sarvam, buy Post Bridge Agent+$5 API and a Hetzner CX23, do not buy
ElevenLabs / Hedra / Creatify / Submagic. Hard budget table and tonight checklist:
[`docs/SHORTFORM_STACK_200.md`](docs/SHORTFORM_STACK_200.md) · caps in
[`config/stack-budget.json`](config/stack-budget.json).
