# Prompt: Build VedicHour's End-to-End Marketing Engine

> Paste everything below the line into a fresh chat (Claude Code, in a repo you're happy for it to write to).
> It is written to be executed, not admired — it asks for working code, not a strategy deck.

---

## ROLE

You are my growth engineer and creative director combined. You are building an **always-on marketing machine** for **VedicHour** (vedichour.com) — a Vedic-astrology *timing* product for an Indian audience (ages ~28–60, mobile-first, many more comfortable in Hindi/Hinglish than English). The product is pivoting from one-off paid reports to a **recurring subscription**: users answer an adaptive onboarding quiz, hit a paywall, start a card-required free trial, and then return **daily** for their personal timing scores — which hours and days favour a decision, and which don't.

I am one person. Your job is to make everything except four human actions run without me. The four I will do myself: (1) pressing publish on Instagram/carousels, (2) creating and funding ad accounts, (3) approving spend increases, (4) approving anything that makes a factual or astrological claim.

**Do not give me a plan and stop. Build the system, commit it, and show me it running on real inputs.**

## NON-NEGOTIABLE CONSTRAINTS

1. **Cost near zero to start.** Assume no paid SaaS beyond what I already pay for. Prefer free tiers, local execution, and open-source. If a paid tool is genuinely load-bearing, justify it and give a free fallback.
2. **No fabrication, ever.** No invented testimonials, fake reviews, fake follower counts, fake scarcity, or invented statistics. No claims that astrology predicts outcomes deterministically — the product's own framing is *"for reflection and planning, not certainty."* Marketing must match it. If you cannot substantiate a claim, cut it.
3. **Content must not read as AI-generated.** Target under 40% on AI-detection tools. That means: varied sentence length, concrete specifics over abstractions, an actual point of view, no "unlock/elevate/delve/in today's fast-paced world", no em-dash-per-paragraph tic, no tidy rule-of-three everywhere. Write like one opinionated person, not a brand.
4. **Compliance.** Follow Meta/Google policies on astrology and "personal attributes" ads (they restrict targeting and some claims). Research the current rules before writing ad copy, and flag anything likely to get an account banned. Never promise health, financial, or legal outcomes.
5. **Everything version-controlled**, with secrets in `.env` and never committed.

## WHAT TO BUILD — SEVEN LOOPS

Build these as a single repo (`marketing-engine/`) with one scheduler (cron or GitHub Actions) and one SQLite/Postgres store so every loop shares state and I can see what happened.

### Loop 1 — Insight & idea generation
Pull raw demand signals daily and turn them into a ranked content backlog:
- The platform's own data (this is the unfair advantage): the **actual questions users type** at onboarding, the most common problem categories, which days/hours score highest, aggregate patterns. Anonymised and aggregated only — never expose a person's birth data or question verbatim.
- External: Google autocomplete/`People Also Ask` for Vedic terms, Reddit (r/vedicastrology, r/AskIndia), Quora topics, YouTube titles that outperform in this niche, competitor app-store reviews (complaints = unmet needs).
Score each idea on: search demand × emotional pull × distance from what competitors already say × how directly it leads to the product. Store as `ideas` with scores and rationale.

### Loop 2 — Script & copy generation
For the top-ranked ideas, generate: a 30–45s short-form script (hook in the first 1.5s, one idea, one CTA), an Instagram carousel (6–8 slides, one thought per slide), a long-form blog post that is genuinely useful standing alone, and 3 ad variants.
Enforce the anti-AI voice rules above **programmatically**: a linting step that rejects a draft containing banned phrases, an average sentence length that's too uniform, or a missing concrete specific. Regenerate until it passes. Include a Hindi and a Hinglish variant for every short-form script — not machine-translated, but rewritten idiomatically.

### Loop 3 — Asset production
Turn scripts into finished media with no human editing:
- **Voiceover:** ElevenLabs (or Kokoro/Piper as the free fallback). Pick a warm, unhurried voice; test an Indian-English voice against a neutral one. Generate word-level timings for captions.
- **Screen capture of the real product:** Playwright script that logs into a seeded demo account and records the actual journey — the onboarding quiz answering itself, the progress bar filling, the "your plan is ready" recap, the daily score screen, a scroll down the marketing site. Export clean MP4s and stills. This is the single most persuasive asset type; treat it as a first-class output, re-recorded automatically whenever the UI changes.
- **Composition:** ffmpeg (or Remotion if you want React-defined video) to assemble voiceover + screen capture + captions + a subtle brand frame. Output 9:16 for Reels/Shorts, 1:1 for feed, plus a 16:9 cut.
- **Carousels:** render from HTML templates via Playwright screenshots — sharper and more controllable than image models, and it keeps typography on-brand.
Every asset lands in `out/YYYY-MM-DD/<idea-slug>/` with a `manifest.json` describing what it is and which idea it came from.

### Loop 4 — Distribution
Automate everything the platforms' terms actually permit, and stage the rest:
- **Fully automatable:** the blog/SEO pages (publish straight to the site with schema markup and internal links), email sequences, YouTube uploads via the Data API, and a public content RSS.
- **Staged for one click from me:** Instagram/Threads carousels and Reels, and anything requiring a business-verified app review. Produce a `ready-to-post/` folder with the asset, the caption, hashtags, the best posting time, and a one-line "why this one" — so my job is ten seconds of tapping.
**Research and respect each platform's automation rules; explicitly tell me which are allowed via API, which need Business/App Review, and which would risk a ban.** Do not build anything that scrapes or automates a platform in violation of its terms.

### Loop 5 — Paid acquisition
Build the ad system but keep me in control of spend:
- Generate campaign structures, audiences, and creative sets for Meta and Google, exported ready to import.
- **Spend guidance, staged and evidence-led:** do NOT recommend meaningful spend until the funnel has proven it converts organically — ads multiply a conversion rate, they cannot create one. Propose a ladder: a small validation budget only after the first handful of genuine paying customers, scaling only while CAC stays under a threshold derived from real LTV (which you should compute from actual subscription data, not assumed). State the exact stop conditions.
- Track everything server-side (Meta CAPI / GA4 Measurement Protocol) with UTMs, deduplicated, and **no personal or birth data in any analytics payload**.

### Loop 6 — Measurement & attribution
One dashboard answering: which idea → which asset → which channel → how many trials → how many paid → retained how long. Report CAC, trial-start rate, trial→paid conversion, D7/D30 retention, and payback. Weekly digest to me with the three things working and the one thing to kill.

### Loop 7 — Learning
Close the loop: feed performance back into Loop 1's scoring so winning angles get more weight and losing ones decay. Keep a `learnings.md` the system appends to, with evidence. Re-rank the backlog automatically each week.

## TECH STACK (use unless you can justify better)

TypeScript/Node for orchestration · SQLite (or the existing Supabase) for state · Playwright for capture and carousel rendering · ffmpeg (or Remotion) for video · ElevenLabs with a local TTS fallback · the existing LLM keys for generation · GitHub Actions or node-cron for scheduling · Next.js for the dashboard, or a static HTML report if that's faster.

## HOW TO WORK

1. **Research first, with web search**, and cite what you find — especially platform automation rules and ad-policy limits for astrology. Report anything that invalidates part of this brief.
2. Then propose the architecture and the loop schedule, in one page.
3. Then **build it**, in small commits, running each loop on real inputs as you go.
4. Show me evidence at each stage: an actual generated script, an actual rendered Reel, an actual screen recording, an actual blog post — not descriptions of them.
5. End with: what's automated, what needs my click, what it costs per month, and the exact next three things you'd do.

**Ask me only for things you genuinely cannot proceed without** (API keys, account access). Otherwise make a sensible call, note the assumption, and keep going.
