# VedicHour Content Ops SOP — founder tap = Approve

**Goal:** every Reel is audited before any paid render, looks best-in-class (not cheap), and the founder only taps **Approve** once.

**Model:** over-produce text ($0) → kill most of it → approve the survivor → spend on render → package → learn.

## Pipeline

| # | Step | Command | Cadence | $ |
|---|---|---|---|---|
| 1 | Sense trends | `npm run loop:sense` | 6h | $0 |
| 2 | Ideate hooks | `npm run loop:creative` | 2h | $0 |
| 3 | Script 6 variants | same | with #2 | $0 |
| 4 | Adversarial self-audit | same + `npm run preflight -- <slug>` | with #2 | $0 |
| 5 | Tournament (1 winner) | same (`WINNERS_KEPT=1`) | with #2 | $0 |
| 6 | Human Approve | `npm run approve <slug>` / cockpit | as needed | $0 |
| 7 | Render | `npm run loop:render` | after Approve | ~$1–4 |
| 8 | Package | `npm run loop:package` | after review | $0 |
| 9 | Schedule / publish | manual OAuth | after package | $0 |
| 10 | Perf → playbook | `loop:stats` → `perf` → `playbook:review` | hourly/nightly | $0 |

**Free orchestrator:** `npm run loop:content-ops` (never spends fal.ai). Kill switch: `npm run kill`.

## Tonight checklist

```bash
cd marketing-agent
npm run doctor && npm run revive
npm run loop:content-ops
npm run cockpit   # localhost:4317
npm run approvals
npm run approve <slug>          # ONE tap unlocks paid render
npm run loop:render -- <slug>
npm run loop:review -- <slug>   # machine gate; ship keeps Approve (no second tap)
npm run loop:package -- <slug>
# paste PUBLISH.md / packages/* into IG + YT
```

Reject → lesson: `npm run reject <slug> "why"`.

## Per-step kill / artifacts / anti-cheap

### 1 Sense — `loop:sense` → `state/sense.json`
Kill: IG scrape, prompt-injection. Anti-cheap: trends are data not hooks; hooks stay concrete decision moments.

### 2 Ideate — creative stage 1
Kill: generic sun-sign slogans, competitor mockery. Anti-cheap: ≤8 words, named moment, lands in **0.8s**.

### 3 Script 6 variants
Kill: non-Latin, no presenter opener, no screencap, missing spoken VedicHour.com. Anti-cheap: brand-face presenter; **no mandala/lotus/galaxy spam**; mute-first captions.

### 4 Adversarial audit — judge + `preflight`
Kill: banned-claims block, brandSafety&lt;80, fake testimonials, best/worst hour, checkout captures, edge-tts, jargon, cheap tropes. Artifacts: scores, `preflight_runs`.

### 5 Tournament — 1 winner → `awaiting_approval`
Kill: runners-up never `ready_to_render`. Artifacts: `output/creative/<slug>.{json,md}`.

### 6 Approve — cockpit / `approve`
Unlocks `ready_to_render`. Founder taste only.

### 7 Render — fal.ai + end card `vedichour.com`
Kill: wrong status, budget, second voice, payment surface. Artifacts: `output/reels/<slug>/`.

### 8 Package — IG Reels, YT Shorts, YT 8–12m outline, GBP, IG carousel → `packages/`

### 9 Publish — manual until OAuth; `canPublish(slug)` required.

### 10 Learn — stats → perf brief → playbook proposals (never auto-edit playbook).

## Anti-cheap craft card
1. Hook ≤8 words / 0.8s  2. Presenter-led, one voice  3. Gold on deep night, not purple glow
4. No mandala spam  5. No fake testimonials  6. Show REPORT not checkout
7. Say VedicHour.com out loud + end card  8. No Swiss Ephemeris jargon in ads
9. clearer/heavier not best/worst  10. One decision, one proof, one CTA

Configs: `config/playbook.json`, `creative-seeds.json`, `banned-claims.json`.
