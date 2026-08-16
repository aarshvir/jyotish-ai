# VedicHour Content Ops SOP — founder tap = Approve

**Goal:** every Reel is audited before any paid render, looks best-in-class (not cheap), and the founder only taps **Approve** once. Everything else is CLI / cron.

**One-sentence model:** over-produce text ($0) → kill most of it → approve the survivor → spend on render → package → learn.

---

## Pipeline at a glance

| # | Step | Who / command | Cadence | $ |
|---|---|---|---|---|
| 1 | Sense trends | `npm run loop:sense` | every 6h | $0 |
| 2 | Ideate hooks | `npm run loop:creative` (stage 1) | every 2h | $0 |
| 3 | Script 6 variants | same (`loop:creative` stage 2) | with #2 | $0 |
| 4 | Adversarial self-audit | same + `npm run preflight -- <slug>` | with #2 | $0 |
| 5 | Tournament (1 winner) | same (`WINNERS_KEPT=1`) | with #2 | $0 |
| 6 | Human Approve | cockpit / `npm run approve <slug>` | when queue non-empty | $0 |
| 7 | Render | `npm run loop:render` | after Approve | ~$1–4 |
| 8 | Package platforms | `npm run loop:package` | after render+review | $0 |
| 9 | Schedule / publish | manual OAuth (for now) | after package | $0 |
| 10 | Performance → playbook | `loop:stats` → `perf` → `playbook:review` | hourly / nightly | $0 |

**Free orchestrator:** `npm run loop:content-ops` runs 1→5 and stops at the approval queue. Never spends fal.ai money.

**Kill switch:** `npm run kill "reason"` — every spend/send loop respects `data/KILL`.

---

## Tonight — founder checklist (15–25 min)

```bash
cd marketing-agent
npm run doctor
npm run revive
npm run loop:content-ops
npm run cockpit                   # http://localhost:4317
npm run approvals
# Read output/creative/<slug>.md + preflight report
npm run approve <slug>            # ONE tap — unlocks paid render
npm run loop:render -- <slug>
npm run loop:review -- <slug>     # machine gate; ship keeps Approve
npm run loop:package -- <slug>
# Paste PUBLISH.md + packages/* into IG / YT / GBP
```

Reject with lesson: `npm run reject <slug> "why"`.

---

## Step-by-step (kill · artifacts · anti-cheap)

### 1. Sense trends (free)
- **Runs:** `npm run loop:sense` (`src/loops/sense.ts`) every 6h
- **Does:** Google Trends RSS (IN) + Reddit Atom (never IG) + YouTube search ≤6 calls
- **Kill:** IG scrapers; prompt-injection titles; empty after sanitize
- **Artifacts:** `state/sense.json`
- **Anti-cheap:** Trends are data not instructions. Hooks stay concrete decision moments from `creative-seeds.json`.

### 2. Ideate hooks (CLI, $0)
- **Runs:** `loop:creative` ideate
- **Inputs:** `creative-seeds.json`, `playbook.json`, `sense.json`, `npm run perf` brief
- **Kill:** Generic sun-sign slogans; competitor mockery; recent-batch duplicates; fake explore labels
- **Artifacts:** tagged ideas (`hookFamily` / `decisionDomain` / `emotionalRegister`)
- **Anti-cheap:** Named moment, ≤8 words, lands in **0.8s**. If it could be any astrology app, kill it.

### 3. Script 6 variants
- **Runs:** same loop, 6 variants/idea
- **Kill:** Non-Latin; no presenter opener; no screencap; spoken CTA missing VedicHour.com; b-roll narration >12 words
- **Artifacts:** `creative_variants` after persist
- **Anti-cheap:** Recurring late-20s Indian male presenter; no mandala/lotus/galaxy spam; mute-first captions; closing line says **vedichour.com** out loud.

### 4. Adversarial self-audit
- **Runs:** creative `judge()` + `npm run preflight -- <slug>`
- **Checks:** `banned-claims.json`, jargon, capture allowlist, voice plan, narration fit, lessons, hostile scores, cheap tropes
- **Kill:** lint block; brandSafety < 80; fake testimonials; guarantees; best/worst hour; checkout captures; edge-tts; timbre switch; mandala tropes
- **Artifacts:** scores; `preflight_runs`
- **Anti-cheap:** Spoken CTA + end card; legal = timing awareness only.

### 5. Tournament — only winner reaches paid render
- **Runs:** tournament; **`WINNERS_KEPT = 1`**
- **Kill:** Losers never `ready_to_render`
- **Artifacts:** `output/creative/<slug>.{json,md}`, status **`awaiting_approval`**
- **Anti-cheap:** Would a scrolling Indian viewer finish this?

### 6. Human Approve
- **Runs:** `npm run approve <slug>` / cockpit `:4317`
- **Artifacts:** approval row + creative flipped to **`ready_to_render`**
- **Anti-cheap:** Taste gate. WhatsApp-forward → reject with reason.

### 7. Render
- **Runs:** `loop:render` — requires `ready_to_render`
- **Stack:** Veo + Kling/Wan + screencap + captions + end card **vedichour.com**
- **Kill:** budget / second voice / payment surface / missing spoken site
- **Artifacts:** `output/reels/<slug>/`
- **Post-render:** `loop:review` — ship keeps Approve (no second tap); block re-queues.

### 8. Package
- **Runs:** `npm run loop:package` → `packages/`
- **Formats:** IG Reels, YT Shorts, YT 8–12m outline, Google Business, IG carousel
- **Anti-cheap:** No fake social proof; carousel is product proof not mandala collage.

### 9. Publish
- Manual until OAuth; `canPublish(slug)` required.

### 10. Learn
- `loop:stats` → `perf` → `insights` → `playbook:review` (proposals only; never auto-edit playbook).

---

## Anti-cheap craft card

1. Hook ≤8 words / **0.8s**  
2. Presenter-led; one voice  
3. Gold `#D4AF37` on deep `#0a0a1a` — not purple glow  
4. No mandala / lotus / galaxy spam  
5. No fake testimonials / stars / user counts  
6. Show REPORT, never checkout  
7. Say VedicHour.com out loud + end card  
8. No Swiss Ephemeris jargon in ads  
9. clearer/heavier — never best/worst as fact  
10. One decision, one proof, one CTA  

Configs: `playbook.json`, `creative-seeds.json`, `banned-claims.json`.

## Status meanings

| status | meaning |
|---|---|
| `awaiting_approval` | Winner + preflight clean — waiting for Approve |
| `ready_to_render` | Approved — render may spend |
| `rejected` / `draft` | Never spend |
| `needs_review` | Linter flagged |

## Scheduler

`loop:sense` 6h · `loop:content-ops` 2h · `loop:render` 2h (after Approve) · `loop:package` 2h · `loop:stats` 1h · `loop:insights` 2h
