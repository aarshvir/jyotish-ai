# End-to-end prompt: build the VedicHour marketing agent LOCALLY, powered by your subscriptions (no n8n, no API keys)

**This supersedes the n8n version.** Same nine loops, same `<10%` autonomy design (in `AUTONOMOUS-MARKETING-BLUEPRINT.html` and `BUILD-MARKETING-MACHINE-claude-code.md`) — but the engine changes: instead of n8n + paid LLM APIs, it's a **local loop on your Mac that calls Claude Code, Gemini CLI and Codex CLI, each authenticated to your subscription.** Reasoning cost ≈ $0.

### Why this works (the facts Claude Code should rely on)
- **`claude -p "…"`** = headless Claude Code; on a Max plan it draws from a monthly **Agent SDK credit** (separate from interactive use). Schedulable via **launchd**, **`/schedule`**, the **Agent SDK CronCreate**, or **Claude Code Routines** (runs in Anthropic's cloud — laptop can be closed).
- **`gemini -p "…"`** = Gemini CLI, **free** with a Google login (~**1,000 req/day, 60/min**, no API key) — the bulk workhorse.
- **`codex exec "…"`** = Codex CLI via **Sign in with ChatGPT** (subscription, no API key); one-time `codex login --device-auth` for headless.
- Non-LLM actions (post to YouTube/IG, run ads, send email) use the platforms' **free OAuth APIs** — you only ever pay actual ad spend.

---

PASTE FROM HERE ↓

---

Build me a **local, autonomous marketing agent** for **VedicHour** (vedichour.com) that runs on my Mac and costs ~$0/month to operate by using my existing subscriptions, not paid APIs. Three products: **Hour-by-Hour Forecast** (premium), **Deep Kundali**, **Matchmaking**.

**Read these first for the architecture and the nine loops, then build:** `launch-deliverables/AUTONOMOUS-MARKETING-BLUEPRINT.html` and `launch-deliverables/BUILD-MARKETING-MACHINE-claude-code.md`. Keep their nine loops, the policy-linter, the trust-ladder, and the `<10%`-weekly-approval design **unchanged**. Only the execution substrate changes to what's below.

### Core principle: the brain is my CLIs, on my subscriptions
Do **not** use n8n and do **not** use paid LLM API keys. Build a local orchestrator that does all reasoning by shelling out to three CLIs, each already logged into my subscription:
- `gemini -p "<prompt>"` — **default for bulk** (drafting, captions, classification, the policy-linter). Free, ~1,000 calls/day.
- `claude -p "<prompt>" --output-format json` — **high-value reasoning** (daily planning, creative judgement, the weekly synthesis). Uses my Max Agent-SDK credit.
- `codex exec "<prompt>"` — **third lane / parallelism / overflow** and any code generation.

Build a single **`brain()` router module** so the model is chosen in one place:
```
brain(task, {tier: "bulk"|"smart"|"code", maxTokens}) →
  picks gemini (bulk) / claude (smart) / codex (code|overflow),
  spreads load across the three to respect each subscription's limits,
  retries on failure, falls back to the next CLI, logs which model + rough usage.
```
Throttle so we stay within interactive-style volumes (this is fair-use of subscriptions, not an API). Make the routing table a config file I can edit.

### What to build (local, no cloud bill)
1. **Orchestrator** — a TypeScript (Node) project in `marketing-agent/` that Claude Code writes and maintains. A deterministic controller runs the loops; LLM steps go through `brain()`. State in **SQLite** (`content_library, performance, attribution, consent_log, approval_queue, trust_ledger`) + a `media/` folder.
2. **Scheduler** — macOS **launchd** plists for each loop's cadence (daily/hourly). Add a `caffeinate` wrapper and a heartbeat file so I can see it's alive. Also wire an optional **Claude Code Routines** path so the LLM-planning jobs can run in Anthropic's cloud when my Mac is closed. Provide a `runCLAUDErun`-style fallback note.
3. **Policy-linter** — runs on `gemini -p` (free): checks every ad creative + outbound message for banned claims ("guaranteed/miracle", health/financial/relationship promises, "you suffer from X" targeting) → `pass | flag | block`. Block = never send; flag = escalate to my weekly queue; pass = proceed.
4. **The nine loops** (build in the phase order from the build-spec doc): L1 blog, L2 faceless video factory, L3 publish, L4 tech SEO, L5 paid ads, L6 optimizer, L7 outbound, L8 lifecycle, L9 creative director.
5. **Cockpit** — a single local HTML dashboard (read SQLite) showing the scoreboard, the approval queue, the guardrail panel, and a **kill-switch** file every spending/sending loop checks first. I review this once a week.

### Free media + free platform actions (no paid tools)
- **Video (faceless):** assemble from free **Pexels/Pixabay** stock (API) + free TTS (**edge-tts**) + **ffmpeg**; scripts/captions written via `brain()`. Generative video only if I explicitly approve.
- **Images/posters:** Gemini image generation via the CLI/free tier, or local Stable Diffusion, or **Canva free** templates.
- **Publish:** self-host **Postiz** (free) or call YouTube/Instagram Graph/Facebook APIs directly (free OAuth). Respect caps: IG ~100 posts/24h, YouTube ~6 uploads/day, TikTok needs app audit.
- **Email:** **Brevo** free (300/day). **WhatsApp:** Meta Cloud API, opt-in only. **Ads rules:** implement pause/scale logic in the orchestrator + Meta native automated rules + free Google Ads scripts. **Analytics:** GA4 + PostHog + Search Console (all free).

### Autonomy = `<10%` weekly (build exactly this)
Policy-linter + trust-ladder per the docs: weeks 1–2 I approve new ad creatives while the linter logs agreement; from week 3, linter-`pass` creatives auto-publish and only `flag`s escalate. Red lines are never built (no bot engagement, no cold SMS, no cold WhatsApp blasts). Guardrails: hard daily ad-spend cap + global kill-switch + no send without a `consent_log` row + auto-pause on anomalies.

### Build order — stop after each phase, prove it runs, then continue
- **Phase 0:** the `marketing-agent/` project, SQLite schema, the `brain()` router (wire + smoke-test all three CLIs), the policy-linter, launchd + heartbeat, the cockpit + kill-switch.
- **Phase 1:** L8 lifecycle (Brevo + WhatsApp, opt-in) + L1 daily blog. Prove a signup triggers a sequence and a blog post publishes unattended.
- **Phase 2:** L9 + L2 (faceless video) + L3 publish — 3–4 reels/day end-to-end, no touch.
- **Phase 3:** L5 ads + L6 optimizer + L4 tech SEO — auto-optimize, only flagged creatives escalate.
- **Phase 4 (optional):** L7 capped B2B outreach.

### Tell me what you need (one-time; you can't do these)
Confirm the three CLIs are installed and logged in (`gemini` Google login; `codex login --device-auth`; `claude` logged into Max). Ask me for: OAuth for YouTube/Meta/Google Ads/Search Console/GA4 and the free-tool keys (Pexels, Brevo, PostHog); the daily ad-spend cap; the banned-claims word-list; markets to suppress (start EU/Germany). Tell me to start Meta + TikTok app review now (multi-week).

### Definition of done
`brain()` routes across all three CLIs and survives one being rate-limited; the agent runs from launchd with a heartbeat; Phase 1 runs unattended; the weekly queue holds `<20` items; the kill-switch halts everything; **operating cost (excl. ad spend) is ~$0** because all reasoning is on my subscriptions. Report which CLI handled what after each phase.

Start with Phase 0. First, verify my three CLIs work headless (`gemini -p "ping"`, `claude -p "ping"`, `codex exec "ping"`), then show me the plan and what you need from me.

---

↑ PASTE TO HERE

## How your subscriptions map (the whole point)
- **Claude Max** → builds + maintains the agent (Claude Code), and is the "smart" brain via `claude -p` (Agent SDK credit).
- **Google / Gemini** → the free bulk brain via Gemini CLI (~1,000 calls/day), plus free Google tools (Search Console, GA4, YouTube, Looker).
- **OpenAI / ChatGPT** → the third reasoning lane + code via `codex exec` (Sign in with ChatGPT).

## The honest limits (so it's robust, not fragile)
- **Uptime:** launchd needs the Mac awake — use `caffeinate`, or a cheap always-on Mac mini, or push the LLM-planning jobs to **Claude Code Routines** (cloud) so the laptop can be closed.
- **Fair use:** these are subscriptions, not metered APIs — the router throttles and spreads load across all three so no single plan gets hammered; if one hits a limit, it falls back to the others.
- **One-time logins** per CLI (device-code where needed); sessions occasionally need re-auth — the heartbeat alerts you if a CLI logs out.
- **Platform actions** (posting, ads, email) still use the platforms' own free APIs + the app-review lead times — that part is unchanged and unavoidable.

**Net:** reasoning runs on the subscriptions you already pay for, the infrastructure is free/self-hosted, and your only real spend is the ad budget.
