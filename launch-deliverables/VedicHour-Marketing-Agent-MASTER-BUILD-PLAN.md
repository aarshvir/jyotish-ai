# VedicHour Autonomous Marketing Agent — Master Build Plan (Phases 0–7)

**What this is:** the single, comprehensive document to hand to **Claude Code**. It builds a local, subscription-powered marketing agent for VedicHour and scales it from nothing to a self-optimizing, near-hands-off growth machine — in phases, each with a clear "definition of done" gate.

**How Claude Code should use it:** execute **one phase at a time, in order**. Do not start a phase until the previous phase's **Exit Gate** passes. At the end of each phase, report what was built, what it cost to run, and which CLI handled what. Stop and ask for anything in that phase's **"Need from Aarsh"** before proceeding.

**Companion docs (read once for architecture rationale, then follow THIS plan):**
`launch-deliverables/AUTONOMOUS-MARKETING-BLUEPRINT.html` (the why + the nine loops) and `BUILD-MARKETING-MACHINE-claude-code.md` (loop detail). This master plan supersedes the earlier n8n prompt.

---

## 0. The non-negotiables (apply to every phase)

**Mission.** Market three products autonomously: **Hour-by-Hour Forecast** (premium, 7-day/Monthly/Annual), **Deep Kundali**, **Matchmaking** — so Aarsh reviews it ~30 min/week.

**The engine = my subscriptions, via CLIs (cost of reasoning ≈ $0).** No n8n, no paid LLM API keys. A local orchestrator shells out to three CLIs, each logged into a subscription:
| Call | Use for | Why |
|---|---|---|
| `gemini -p "…"` | **bulk default** — drafting, captions, classification, the policy-linter | Free, ~1,000 calls/day |
| `claude -p "…" --output-format json` | **high-value** — daily planning, creative judgement, weekly synthesis | Max plan Agent-SDK credit |
| `codex exec "…"` | **overflow / parallelism / code** | ChatGPT plan (Sign in with ChatGPT) |

Build a **`brain(task, {tier})` router** (one module) that picks the CLI, spreads load across all three to respect each plan's fair-use, throttles, retries, falls back to the next CLI if one is rate-limited, and logs model + rough usage. Routing lives in an editable config.

**Media = free by default; premium is opt-in.**
- Voice → **edge-tts** (free). Optional upgrade: ElevenLabs.
- Video → **Pexels/Pixabay stock + edge-tts + ffmpeg** (faceless). Optional upgrade: HeyGen (avatar) / Veo (AI b-roll).
- Image → **Gemini image gen** (Google sub) / **Canva free** templates / local Stable Diffusion. Optional: Ideogram.
> Build the free path first. Surface ElevenLabs/HeyGen as a one-line config flag Aarsh can flip later — never on by default.

**Platform actions = free OAuth APIs.** Posting, ads, email use the platforms' own free APIs; the only real money is **ad spend** (+ tiny WhatsApp per-message fees).

**Autonomy model (target `<10%` human approval, weekly).**
1. **Policy-linter** (runs on free `gemini -p`) checks every ad creative + outbound message for banned claims ("guaranteed/miracle", health/financial/relationship promises, "you suffer from X" targeting) → `pass | flag | block`. Block = never send; flag = escalate to the weekly queue; pass = proceed.
2. **Trust-ladder:** weeks 1–2 a human approves new ad creatives while the linter logs whether it agreed; from week 3, linter-`pass` creatives auto-publish and only `flag`s escalate. Stored per channel in `trust_ledger`, reversible on any miss.
3. **Red lines are never built** (cost zero approvals): no bot likes/follows/DMs, no cold SMS, no cold WhatsApp blasts.

**Guardrails (every phase respects these).** Hard daily ad-spend cap; a global **kill-switch** file every spending/sending loop checks first; **no send without a `consent_log` row**; auto-pause on spend/CPA/quality anomalies; everything logged.

---

## 1. Roadmap at a glance

| Phase | Goal | Timeline | Autonomy | New running cost |
|---|---|---|---|---|
| **0 · Foundations** | The brain, memory, safety rails | Week 1 | infra | $0 |
| **1 · Capture & lifecycle** | Monetize existing traffic | Week 2 | full-auto (opt-in) | $0 |
| **2 · Organic content engine** | Daily reels flywheel | Weeks 3–4 | full-auto (organic) | $0 |
| **3 · Paid + optimizer** | Amplify proven winners | Weeks 5–6 | `<10%` weekly | ad budget |
| **4 · Outbound & partnerships** | B2B + referrals | Week 7+ | capped/gated | low |
| **5 · Scale & multi-channel** | 10× volume, more platforms/languages | Month 2–3 | same gates, more volume | media/domains (opt) |
| **6 · Self-optimizing intelligence** | The system runs its own experiments | Month 3–4 | higher (approve guardrails) | marginal |
| **7 · Governance & hands-off ops** | Bulletproof; weekly → monthly | Month 4+ | ~95% | stable |

---

## 2. The nine loops (compact reference)

L1 Daily blog/SEO · L2 Faceless video factory · L3 Multi-platform publish · L4 Technical SEO + programmatic pages · L5 Paid ads (create/monitor/pause/scale) · L6 Optimizer (attribution → decisions → weekly summary) · L7 Outbound (B2B cold email) · L8 Lifecycle (email/WhatsApp to opt-ins) · L9 Creative Director (judge library → regenerate scripts). Full spec in the build-spec doc; phases below say when each is built.

---

# PHASE 0 — Foundations & the Brain
**Goal:** a local agent that can think (via CLIs), remember, schedule itself, and be stopped instantly.

**Build:**
- A Node/TypeScript project `marketing-agent/` in the repo (kept separate from the web app).
- **`brain()` router** — wraps the three CLIs; smoke-tested end-to-end.
- **SQLite** schema: `content_library, performance, attribution, consent_log, approval_queue, trust_ledger, runs_log` + a `media/` folder.
- **Policy-linter** service (free model) returning `pass|flag|block` with a reason.
- **Scheduler** — macOS **launchd** plists per loop; a `caffeinate` wrapper; a **heartbeat** file + alert if a CLI logs out. Wire an optional **Claude Code Routines** path so LLM-planning jobs can run in Anthropic's cloud with the laptop closed.
- **Cockpit** — one local HTML dashboard (reads SQLite): scoreboard, approval queue, guardrail panel, and a **kill-switch** toggle.

**Autonomy:** infrastructure only. **Running cost:** $0.
**Need from Aarsh:** confirm `gemini`, `claude`, `codex` are installed and logged in.
**Exit Gate:** `brain()` answers via all three CLIs and survives one being rate-limited; a dummy loop fires from launchd and writes a heartbeat; the kill-switch halts it; the cockpit renders.

---

# PHASE 1 — Capture & Lifecycle + Daily Blog
**Goal:** make money from the traffic you already have. Zero ban risk, fastest ROI.

**Build:**
- **L8 Lifecycle:** on free-Kundli email/WhatsApp capture → write `consent_log` → Brevo welcome + value sequence → cart-abandon nudge → post-purchase cross-sell to the other two products → weekly "your timing this week" broadcast (opt-in only, WhatsApp Cloud approved templates).
- **L1 Daily blog:** 6am → pick a striking-distance keyword from Search Console + your Content Pack → `brain(smart)` drafts a 1,200–1,800-word article in your blog voice → free hero image (Gemini/Canva) → publish via the site's content path → IndexNow ping. Policy-linter checks claims before publish.

**Autonomy:** full-auto (Lane A). **Running cost:** $0.
**Need from Aarsh:** Brevo key + sender domain; WhatsApp Cloud number + approved templates; blog publish method (API/markdown path); Search Console + GA4 OAuth.
**Exit Gate:** a test signup runs the full sequence; a fresh blog post publishes unattended two days running; every contacted user has a consent row.

---

# PHASE 2 — Organic Content Engine (the reels flywheel)
**Goal:** 3–4 faceless short videos a day, produced and posted with no human touch — your #1 free growth lever.

**Build:**
- **L9 Creative Director:** weekly + on L6 signal → read `content_library` + performance → score assets, mark winners "remix" → for tired/thin themes, `brain(smart)` writes new scripts + image/video prompts → policy-linter → enqueue to L2.
- **L2 Faceless video factory:** take 3–4 queued scripts → `brain` writes VO script + captions → **edge-tts** voice → **Pexels/Pixabay** b-roll matched to beats → **ffmpeg** assembles 9:16 + captions + your brand background → store "ready".
- **L3 Publish:** post "ready" assets to YouTube Shorts + Instagram Reels + Facebook (TikTok after audit) via **Postiz** (self-host) or native APIs; `brain` writes per-platform captions + hashtag sets; attach the tracked bio/landing link; spread across optimal slots. Respect caps (IG ~100/24h, YouTube ~6 uploads/day).

**Autonomy:** full-auto (organic posting is Lane A). **Running cost:** $0 (free media path).
**Need from Aarsh:** YouTube + Meta (IG/FB) OAuth + Business accounts; Pexels key; brand assets (already in Drive/site). **Start Meta + TikTok app review now — multi-week.**
**Exit Gate:** scripts → rendered reels → scheduled posts run end-to-end with no touch for 5 straight days; assets + results logged.

---

# PHASE 3 — Paid Amplification + The Optimizer
**Goal:** put budget behind organic winners and close the data → decision loop. This is where `<10%` autonomy goes live.

**Build:**
- **L5 Paid ads:** build Google Search + Meta/IG campaigns from the best-performing organic hooks; attach UTM-tracked landing links per product. **New creative → policy-linter → trust-ladder.** Rules engine (in the orchestrator + Meta native rules + Google Ads scripts): pause an ad/keyword if CPA > target or CTR < floor after enough data; shift budget ≤20%/change to winners; on fatigue, request fresh creative from L9. **Hard daily spend cap + kill-switch enforced.**
- **L6 Optimizer:** nightly → pull all metrics (views, CTR, sessions, signups, sales, CPA, ROAS) → attribute sales to creatives/keywords → decide scale/kill → tell L9 what to make more of → write the **weekly cockpit summary**. Needs 3–7 days of data before acting on a verdict.
- **L4 Tech SEO:** weekly Search Console crawl/index fixes; sitemap refresh; programmatic per-nakshatra/sign/dosha pages from your chart engine (rate-limited for quality).

**Autonomy:** `<10%` weekly (only flagged creatives + threshold breaches escalate). **Running cost:** ad budget begins.
**Need from Aarsh:** Google Ads + Meta Ads accounts funded; the **daily spend cap** number; the **banned-claims word-list**; markets to suppress (start EU/Germany).
**Exit Gate:** an ad auto-pauses on a breached rule; budget auto-shifts to a winner; the optimizer posts a weekly summary; the weekly queue holds < 20 items.

---

# PHASE 4 — Outbound & Partnerships
**Goal:** B2B growth (astrologers, wedding planners, content affiliates) + a referral engine.

**Build:**
- **L7 Outbound:** Apollo (free tier) finds relevant partners → `brain` personalises a short, honest pitch → send via a warmed sending domain (Brevo or own SMTP) → auto follow-up → replies into the CRM. **CAN-SPAM compliant** (physical address + 1-click unsubscribe), ≤40/mailbox/day on domains warmed 4–6 weeks, auto-suppress unsubscribes + Germany/EU.
- **Referral/affiliate automation:** unique links, attribution in the warehouse, automated payout/credit triggers, a creator outreach sequence.

**Autonomy:** capped + policy-gated. **Running cost:** low.
**Need from Aarsh:** a dedicated sending subdomain (start warmup early); Apollo login; referral commission terms.
**Exit Gate:** a compliant sequence sends and replies land in the CRM; the referral program issues and tracks a test referral end-to-end.

---

# PHASE 5 — Scale & Multi-Channel Expansion
**Goal:** 10× the surface area and volume without breaking deliverability or quality.

**Build:**
- **More platforms:** TikTok (once audited), Pinterest, X, LinkedIn (for B2B/partners), and YouTube **long-form** (repurpose top Shorts into 5–8 min explainers).
- **More languages/markets:** Hindi-first variants + diaspora targeting (US/UAE/UK/Canada/Singapore); `brain` localizes scripts, captions and landing copy; per-market posting schedules and currency-aware links.
- **Volume:** raise posting cadence; scale email via **multiple warmed domains/mailboxes** (not more per inbox); content-calendar planning loop that batches a week ahead.
- **Optional premium media (flip the flags):** ElevenLabs voice for hero pieces, HeyGen/Veo for avatar/AI b-roll on top performers only — gated by an ROI check so spend follows winners.
- **Localized programmatic SEO** at scale (more page templates from the engine).

**Autonomy:** same gates, much higher volume; `brain` load-balanced across all three CLIs to stay in fair-use; auto-scale workers.
**Running cost:** scales only with optional premium media + extra sending domains.
**Need from Aarsh:** approve the premium-media budget cap (if any); confirm target languages/markets.
**Exit Gate:** N posts/day across ≥4 platforms in ≥2 languages, deliverability healthy (spam-rate < 0.1%, WhatsApp quality "High"), with the weekly queue still < 20 items.

---

# PHASE 6 — Self-Optimizing Intelligence
**Goal:** the system stops just executing and starts **experimenting and reallocating** on its own.

**Build:**
- **Autonomous experimentation framework:** continuous A/B/n on hooks, thumbnails, first-3-seconds, ad copy, and landing-page variants; auto-promote winners, retire losers.
- **Budget as a multi-armed bandit:** allocate ad spend across products/channels/creatives by live ROAS rather than fixed splits, within the hard cap.
- **Hypothesis loop:** weekly, `brain(smart)` reads the warehouse and **proposes its own experiments + content themes** ("Sade Sati content converts 2× for 30–40yr women — test 5 variants"), runs the approved ones.
- **Predictive guards:** creative-fatigue prediction (refresh before decay), churn/LTV-aware spend (chase high-LTV cohorts), anomaly detection on every metric.
- **Cross-product intelligence:** lifecycle sequences that route a Kundali buyer → Matchmaking → Forecast based on behavior.

**Autonomy:** higher — Aarsh approves experiment **guardrails** (budget, claim limits), not each test.
**Running cost:** marginal (more reasoning calls, spread across subscriptions).
**Need from Aarsh:** approve the experimentation budget envelope + guardrails.
**Exit Gate:** the system proposes and runs ≥3 experiments/week, auto-applies winners, and shows a downward CAC / upward ROAS trend over 3–4 weeks in the cockpit.

---

# PHASE 7 — Governance, Resilience & Hands-Off Operations
**Goal:** make it bulletproof and reduce the human touch from weekly toward **monthly**.

**Build:**
- **Self-healing:** auto re-auth of CLIs/OAuth, retries with backoff, automatic failover across the three CLIs, and a watchdog that restarts dead loops.
- **Compliance autopilot:** continuous monitoring + auto-remediation of WhatsApp quality rating, email spam-rate, ad-policy disapprovals, and platform warnings — pause + alert before a ban, not after.
- **Redundancy:** optional always-on **Mac mini** (or cloud Mac) so it's not tied to the laptop; backups of SQLite + media + config; a full **audit log** of every action and approval.
- **Cost/usage dashboard** across all three subscriptions (so fair-use is never breached) + the ad-spend ledger.
- **The agent writes the report:** a monthly executive summary (growth, CAC/LTV, what it tested, what it learned, what it recommends) `brain(smart)` drafts for Aarsh.
- **Trust dial mostly auto:** with months of linter-vs-human agreement logged, approvals fall toward the floor — Aarsh sets strategy, the machine runs.

**Autonomy:** ~95%+ — human = monthly review + strategic steering + emergency kill-switch.
**Running cost:** stable.
**Need from Aarsh:** decide laptop vs Mac mini vs cloud Mac for 24/7; approve the move to monthly review.
**Exit Gate:** runs a full month on only a monthly review; auto-recovers from a simulated CLI logout and an ad disapproval; compliance dashboards stay green; the monthly report generates itself.

---

## 3. Execution protocol for Claude Code
1. Build phases **strictly in order**; never skip an Exit Gate.
2. At each phase start, post the plan + the **"Need from Aarsh"** list and wait for what's blocking.
3. At each phase end, report: what was built, the Exit-Gate evidence, the **running cost**, and which CLI handled what (to prove the subscription engine is working and within fair-use).
4. Keep all reasoning on `brain()` (subscriptions); keep media on the free path unless a premium flag is set; never cross a red line; always honor the kill-switch + spend cap + consent log.
5. Everything lives in `marketing-agent/` with a README so Aarsh (or a future you) can run, pause, and roll back any loop.

## 4. Progression gates (don't scale a broken layer)
- Don't start **Phase 3 (paid)** until Phase 2 produces consistent organic winners (you need proven hooks to amplify).
- Don't start **Phase 5 (scale)** until Phase 3's `<10%` weekly loop is stable and deliverability is healthy.
- Don't start **Phase 6 (experiments)** until there's ≥4 weeks of clean attribution data to learn from.

## 5. One-time setup checklist (Aarsh, ~a few hours total)
CLIs logged in (`gemini` Google login · `codex login --device-auth` · `claude` on Max) · Meta Business + Developer app (**start app review**) · Google (YouTube/Ads/Search Console/GA4) OAuth · TikTok developer (**start audit**) · Pexels, Brevo, PostHog keys · ad accounts funded + daily cap set · banned-claims word-list · sending subdomain (start warmup) · choose laptop vs Mac mini for uptime.

## 6. The honest limits (so it's robust, not fragile)
- **Uptime:** launchd needs the Mac awake — use `caffeinate`, a Mac mini, or push LLM-planning jobs to Claude Code Routines (cloud, laptop closed).
- **Fair use:** these are subscriptions, not metered APIs — the router throttles and spreads load; if one CLI hits a limit it falls back to the others. Stay within interactive-style volumes.
- **App-review lead times** (Meta/TikTok/WhatsApp) are external and slow — begin day one; until approved, L3 uses a manual-post fallback.
- **The one residual risk of `<10%` approval** — an off-policy ad creative auto-publishing — is bounded by the linter escalating when unsure, the hard spend cap, auto-pause, the platform's own review, and the earned trust-ladder.

## 7. Definition of done (overall)
The agent runs from your Mac on your subscriptions at ~$0 reasoning cost; produces and publishes daily content; runs and optimizes ads with `<10%` weekly approval; experiments and reallocates on its own; self-heals and stays compliant; and hands Aarsh a monthly report — while a single kill-switch can stop everything instantly.

**Begin with Phase 0.** Verify the three CLIs work headless, then show the plan and what you need.
