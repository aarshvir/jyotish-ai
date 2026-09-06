# End-to-end prompt: build the VedicHour Autonomous Marketing Machine (low-cost)

**How to use:** paste everything below the line into Claude Code, running in `C:\Users\aarsh\Downloads\jyotish-ai`. Claude Code itself runs on your **Claude Max subscription** (no API bill to build). The *running* system uses **free API tiers** (Gemini Flash) so monthly cost stays near zero.

> **Read this first — the one hard truth about subscriptions.** Your Claude/ChatGPT/Gemini *chat* subscriptions are interactive apps, **not APIs** — an unattended automation cannot call them ([ChatGPT Plus ≠ API](https://chatai.guide/api/chatgpt-plus-api-access/)). So: **Claude Code (your subscription) BUILDS the machine; the machine RUNS on the Gemini API free tier** ([1,500 requests/day, no card](https://usagebox.com/articles/gemini-api-billing-free-tier-confusion)), with an ultra-cheap paid model as overflow. Don't try to wire a chat subscription into n8n — it can't be done reliably and risks your account.

---

PASTE FROM HERE ↓

---

You are building an autonomous marketing system for **VedicHour** (vedichour.com), a Vedic-astrology web app with three products: the **Hour-by-Hour Forecast** (premium, 7-day/Monthly/Annual), the **Deep Kundali** report, and **Matchmaking**. Work in this repo. Two design docs already exist — **read them first** for full context, then build:
- `launch-deliverables/AUTONOMOUS-MARKETING-BLUEPRINT.html` — the architecture (the "why" + the nine loops).
- `launch-deliverables/BUILD-MARKETING-MACHINE-claude-code.md` — the detailed build order, DB schema, policy-gate and phase definitions. **Follow its phases and "definition of done" exactly.**

## Hard constraints (cost — this overrides tool choices in the docs)
Spend as close to $0/month as possible. Use this **free/cheap stack**; only suggest a paid tool if there is genuinely no free path, and ask me first.

| Layer | Use this (free/cheap) | Not this |
|---|---|---|
| **Runtime LLM brain** | **Gemini 2.5/3 Flash — free tier** (default for all loops). Overflow/quality: **DeepSeek-V3 API** (~pennies) or a local **Ollama** model (Qwen/Llama) for classification + the policy-linter | Anthropic/OpenAI paid API (avoid; only if I approve) |
| Orchestration | **n8n self-hosted** (Docker) | n8n Cloud, Make, Zapier |
| Publishing | **Postiz self-hosted** | Ayrshare, Buffer paid |
| Faceless video | **Pexels/Pixabay stock API (free) + free TTS + ffmpeg** assembly | Veo/HeyGen/Synthesia unless I ask |
| Voice | **Microsoft edge-tts (free)** or Google Cloud TTS free tier; ElevenLabs free 10k/mo for hero clips | ElevenLabs paid |
| Image/poster | **Gemini Flash image API (cheap)** / Ideogram free daily credits / **Canva free** templates / local SD | Midjourney, Firefly |
| Email | **Brevo free (300/day)** | paid ESP |
| WhatsApp | **Meta WhatsApp Cloud API** (free service-convo tier; opt-in only) | paid BSP |
| Ads rules | **n8n logic + Meta native automated rules + Google Ads scripts (free)** | Revealbot, Smartly |
| SEO/analytics | **Search Console + GA4 + PostHog + Looker Studio** (all free) | Ahrefs/Semrush paid |
| Outreach (later) | **Apollo free tier + Brevo** | Smartlead/Instantly until volume justifies |

**LLM routing rule to implement:** cheap/bulk tasks (drafting, captions, classification, the policy-linter) → Gemini Flash free tier or local Ollama; only escalate to a stronger model when a task fails quality checks, and log it so I can see spend. Build a single `llm_router` node so the model is swappable in one place.

## Autonomy target (build this exactly)
Human approval must touch **< 10% of actions**, batched into one weekly ~30-min review. Achieve it the way the build spec describes:
1. **Policy-linter** (runs on Gemini Flash/local) checks every ad creative + outbound message for banned claims ("guaranteed/miracle", health/financial promises, "you suffer from X" targeting) → returns `pass | flag | block`. **Block = never send; flag = escalate; pass = proceed.**
2. **Trust ladder:** weeks 1–2 a human approves new ad creatives while the linter logs whether it agreed; from week 3, linter-`pass` creatives auto-publish, only `flag` escalates. Store this in a `trust_ledger` table, per channel, reversible on any miss.
3. **Red lines are never built** (so they cost zero approvals): no bot likes/follows/DMs, no cold SMS, no cold WhatsApp blasts.
4. **Guardrails:** hard daily ad-spend cap + a global kill-switch every spending/sending loop checks first; send nothing without a `consent_log` row; auto-pause on spend/CPA anomalies.

## Build order (stop after each phase, show me it works, then continue)
- **Phase 0 — Foundations:** n8n on a server (or my always-on Mac), the marketing Postgres schema (`content_library, performance, attribution, consent_log, approval_queue, trust_ledger`), the `llm_router`, the policy-linter, the Looker/PostHog cockpit + kill-switch.
- **Phase 1 — Capture & daily blog (Lane A, zero risk):** lifecycle email/WhatsApp to opted-in users (Brevo + WhatsApp Cloud) + the daily SEO blog loop. This monetizes existing traffic first.
- **Phase 2 — Content engine:** creative-director loop (judge library, regenerate scripts) → faceless video factory (stock + free TTS + ffmpeg) → multi-platform publish (Postiz) with hashtags + tracked links. Respect API caps (IG ~100/24h, YouTube ~6/day, TikTok needs audit).
- **Phase 3 — Paid + optimizer:** Google/Meta campaigns from winning organic hooks with UTM links; rules engine to pause/scale; nightly optimizer that attributes sales and writes my weekly summary; programmatic SEO pages.
- **Phase 4 — Outbound (optional):** capped, CAN-SPAM-compliant B2B partner email via Apollo + Brevo.

## What to ask me for (you cannot do these — request them when a phase needs them)
- Server access (or permission to provision one), and the **Gemini API key** (free tier, from Google AI Studio).
- OAuth consent + developer apps for Meta (IG/FB/WhatsApp), Google (YouTube/Ads/Search Console/GA4), TikTok. **Tell me to start Meta + TikTok app review immediately — multi-week lead time.**
- Ad-account funding + the daily spend cap number; the banned-claims word-list; markets to suppress (start: EU/Germany).
- Keys for any free-tier tool you wire (Pexels, Brevo, PostHog, etc.).

## Definition of done
n8n + DB + llm_router + policy-linter + cockpit live (P0); capture + blog run unattended (P1); scripts→reels→posts daily with no touch (P2); ads auto-optimize with only flagged creatives escalated (P3); the weekly queue holds < 20 items; the kill-switch halts all spend. Monthly tooling cost stays under ~$15 excluding ad spend. Report the running cost after each phase.

Begin with Phase 0. Confirm the plan and list exactly what you need from me before provisioning anything.

---

↑ PASTE TO HERE

## What each of your subscriptions actually does here
- **Claude (Max):** powers **Claude Code** to build and maintain the whole system — no API bill. Also your tool for any manual creative work.
- **Google:** the **Gemini API free tier** is the system's runtime brain (free); plus free Google tools do your SEO, analytics, publishing (Search Console, GA4, Looker, YouTube).
- **OpenAI (ChatGPT Plus):** can't drive the automation (no API), but keep it for your own manual ideation. If you ever want OpenAI *in* the loop, it's cheap pay-as-you-go — optional, not required.

**Realistic monthly cost: ~$6–15 (server + tiny overflow credits) + your ad budget.** Everything else runs on free tiers.
