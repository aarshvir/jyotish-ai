# Build the VedicHour Autonomous Marketing Machine — spec for Claude Code

**Hand this whole file to Claude Code.** It builds the system (the n8n instance, all nine loop-workflows, the policy gate, the dashboards, the database). Aarsh never opens n8n. Architecture rationale lives in `AUTONOMOUS-MARKETING-BLUEPRINT.html` — this file is the *build order*.

**Target:** human approval touches **< 10% of all actions**, batched into **one ~30-min weekly session**, with no ban/legal exposure.

---

## 0. The key idea: earn autonomy, don't assume it

"Less than 10% approval" is not "approve fewer risky things." It's: **automate the policy judgment that a human would otherwise make**, and escalate only the exceptions. The human moves from *in the loop* (gating every action) to *on the loop* (auditing weekly).

Every automated action falls in one of three lanes:

| Lane | What's in it | Human role |
|---|---|---|
| **A · Auto** (~90% of actions) | Blog posts, organic reels/posts to your own channels, SEO pages, lifecycle email/WhatsApp to **opted-in** users, ad pause/scale **within rules**, dashboard refreshes | None |
| **B · Auto + policy gate** (~8%) | New ad creative/copy, cold B2B email | A **machine** checks it (the policy-linter). Human sees only what the linter flags as uncertain |
| **C · Escalate** (the < 10%, usually < 5%) | Linter-flagged creative, ad breaching a CPA/spend threshold, WhatsApp quality-rating drop, EU/India edge cases, anything novel | Batched into the weekly queue |

**Red lines are excluded by design, not approved** — the system simply never does them, so they cost zero approvals: no bot likes/follows/DMs, no cold SMS, no cold WhatsApp blasts, no "guaranteed/miracle" claims.

### The trust ladder (how approvals fall toward ~2–5%)
- **Weeks 1–2:** a human approves every net-new ad creative (lane B → C). The linter runs in parallel and logs whether it *would* have agreed.
- **Week 3+:** once the linter has matched the human's decision on N creatives, creatives that the linter passes **auto-publish**; only linter-flagged ones escalate. Approvals drop from ~20% to single digits.
- The ladder is per-channel and reversible — one rejected ad resets that channel to manual for a week.

---

## 1. Division of labor (be honest with Aarsh up front)

**Claude Code builds (no human needed):** the n8n server config + all workflow JSON, the policy-linter service, the Postgres schema (memory / consent / attribution), the cockpit dashboard, the exception queue, every integration node, and the per-loop code.

**Aarsh must do once (Claude Code cannot — external/OAuth/funding):**
- Create the server (DigitalOcean/Hetzner) — or approve Claude Code provisioning it via CLI with his token.
- Create developer apps + click OAuth consent: Meta (Instagram/Facebook/WhatsApp), Google (YouTube/Ads/Search Console/GA4), TikTok. **Start Meta + TikTok app review now — multi-week lead time.**
- Fund Google Ads + Meta Ads accounts and set the billing cap.
- Point a dedicated sending subdomain (e.g. `mail.vedichour.com`) and let warmup run 4–6 weeks before L7 sends at volume.
- Paste API keys into the secrets vault (list in §2).

These are **setup-once, not weekly.** After this, the weekly touch is the cockpit only.

---

## 2. Prerequisites — secrets the build needs

Claude Code: create a `.env`/secrets store and stop to request any that are missing.
```
ANTHROPIC_API_KEY            # the reasoning brain
ELEVENLABS_API_KEY           # voice (MCP)
FAL_KEY                      # Veo 3.1 video + Flux images
HEYGEN_API_KEY               # avatar video (optional)
IDEOGRAM_API_KEY             # text-in-image posters
POSTIZ_URL / POSTIZ_TOKEN    # self-hosted publisher
YOUTUBE_OAUTH / META_OAUTH / TIKTOK_OAUTH
GOOGLE_ADS_DEVTOKEN + OAUTH / META_MARKETING_TOKEN
APOLLO_API_KEY / SMARTLEAD_API_KEY
BREVO_API_KEY                # lifecycle email
WHATSAPP_CLOUD_TOKEN + PHONE_ID
GA4_PROPERTY / SEARCH_CONSOLE_OAUTH / POSTHOG_KEY
SUPABASE_URL + SERVICE_KEY   # reuse the app DB or a new project for marketing memory
```

---

## 3. The build, phase by phase

> Build in this order. Each phase is shippable and useful alone. Do **not** start a paid loop before its tracking + policy gate exist.

### Phase 0 — Foundations (the brain, memory, gate, cockpit)
**Claude Code generates:**
1. **n8n** running on the server (Docker), reachable, secrets wired, MCP client enabled.
2. **Marketing DB** (Postgres/Supabase) with tables:
   - `content_library` (asset, type, script_source, status, perf_score)
   - `performance` (entity_id, channel, metric, value, ts)
   - `attribution` (sale_id, first_touch, last_touch, creative_id)
   - `consent_log` (contact, channel, opted_in_at, source, suppressed)
   - `approval_queue` (item, lane, linter_verdict, status, ts)
   - `trust_ledger` (channel, linter_vs_human matches, auto_publish flag)
3. **Policy-linter service** (a small API the loops call before anything publishes/sends): banned-claims word-list + a Claude classifier ("does this imply a guaranteed outcome, health/financial/relationship promise, or personal-attribute targeting?") + image check. Returns `pass | flag | block` with a reason. **Block = never publish; flag = escalate; pass = continue.**
4. **Cockpit**: a Looker Studio (or lightweight web) dashboard reading `performance` + a rendered `approval_queue`, plus a **global kill-switch** flag the loops check before any spend/send.

**Done when:** n8n runs, the DB exists, the linter returns verdicts on a test string, the dashboard renders, the kill-switch halts a test workflow.

### Phase 1 — Capture & lifecycle (fastest revenue, zero ban risk) — **Lane A**
**Build:** L8 (lifecycle) + L1 (daily blog).
- L8: on free-Kundli email/WhatsApp capture → write `consent_log` → Brevo welcome + value sequence → cart-abandon nudge → post-purchase cross-sell to the other two products → weekly "your timing this week" broadcast (opted-in only).
- L1: daily 6am → pick a striking-distance keyword (Search Console) → Claude drafts article → Ideogram hero image → publish to the blog → IndexNow ping. Linter checks claims before publish.
**Done when:** a test signup triggers the sequence and a blog post publishes end-to-end unattended.

### Phase 2 — Content engine (the daily reels flywheel) — **Lane A + B**
**Build:** L9 (creative director) → L2 (video factory) → L3 (publish).
- L9: weekly, read `content_library` + `performance` → score assets → mark winners "remix", write fresh scripts + image/video prompts for tired themes → linter-check → enqueue to L2.
- L2: daily, take 3–4 queued scripts → ElevenLabs VO → Veo 3.1 (fal) / HeyGen → captions + brand bg → render 9:16 → store "ready".
- L3: post "ready" assets to YouTube Shorts + IG Reels + FB (TikTok after audit) with per-platform captions, hashtag sets, tracked link. Respect caps (IG ~100/24h, YT ~6/day).
**Autonomy:** organic posting is Lane A (auto). **Done when:** scripts → rendered reels → scheduled posts run with no human touch for 3 days.

### Phase 3 — Paid + optimizer (amplify winners) — **Lane B/C + trust ladder**
**Build:** L5 (ads) + L6 (optimizer) + L4 (tech SEO).
- L5: build Google Search + Meta campaigns from winning organic hooks, attach UTM links. **New creative → policy-linter → trust ladder** (human approves wks 1–2, auto-publish once linter is proven). Rules engine: auto-pause on CPA>target / CTR<floor after enough data; shift budget ≤20%/change to winners; on fatigue, request fresh creative from L9. **Hard daily spend cap + kill-switch enforced.**
- L6: nightly pull all metrics → attribution → decide scale/kill → tell L9 what to make more of → write the weekly cockpit summary.
- L4: weekly Search Console crawl/index fixes, sitemap refresh, programmatic per-nakshatra/sign/dosha pages (rate-limited).
**Done when:** an ad auto-pauses on a breached rule, budget auto-shifts to a winner, and the optimizer posts a weekly summary — with only flagged creatives in the queue.

### Phase 4 — Outbound (optional, B2B partners) — **Lane B, capped**
**Build:** L7. Apollo → Clay enrich → Claude personalises → Smartlead send (warmed) → CRM. **CAN-SPAM only** (address + 1-click unsub), ≤40/mailbox/day, auto-suppress unsubscribes + Germany/EU. This targets astrologers/wedding-planners/affiliates — your D2C buyers come from L1–L5.
**Done when:** a throttled, compliant sequence sends and replies land in the CRM.

---

## 4. The weekly cockpit (what "< 10%, once a week" actually is)

Of ~200–400 automated actions/week, the human reviews **fewer than ~20** (and after the trust ladder, ~5–10):
1. **Scoreboard (5 min):** sessions, signups, sales, CPA, ROAS vs last week.
2. **Approval queue (10–15 min):** thumbs-up/down only the **escalated** items — flagged creatives + exceptions. Rejections route back to L9.
3. **Guardrail panel (5 min):** spend-cap usage, WhatsApp quality rating, email spam-rate, platform warnings.
4. **Optional steer (2 min):** "push matchmaking this week."

Everything else already executed. The kill-switch pauses all spend + sending instantly.

---

## 5. Guardrails that make near-hands-off safe (build these, not optional)
- **Hard daily ad-spend cap** + **global kill-switch** every spending loop checks first.
- **Policy-linter** blocks the red-line claims automatically; platform ad review is the second net.
- **Suppression + consent enforcement** on every send (no message without a `consent_log` row).
- **Auto-pause on anomaly** (spend spike, CPA blowout, quality-rating drop).
- **Trust ledger** so auto-publish is *earned*, per channel, and reverts on any miss.

---

## 6. Honest limits — tell Aarsh
- **App review lead times** (Meta/TikTok publishing, WhatsApp) are external — weeks. Start them day one; until approved, L3 uses a manual-post fallback.
- **Claude Code can't create accounts or click OAuth/funding** — that one-time setup is Aarsh's (~a few hours).
- **The one residual risk** of < 10% approval: a policy-violating ad creative could auto-publish past the linter. Bounded by: the linter escalating when unsure, the hard spend cap, auto-pause, the platform's own review, and the trust ladder (auto-publish only after the linter is proven). This is the safe way to reach single-digit approval — earned over ~3 weeks, not switched on day one.

---

## Definition of done
✅ n8n + DB + linter + cockpit live (P0) · ✅ capture + blog running unattended (P1) · ✅ scripts→reels→posts daily, no touch (P2) · ✅ ads auto-optimize with only flagged creative escalated (P3) · ✅ weekly queue holds < 20 items and the kill-switch works.

When those are true, VedicHour markets itself and Aarsh reviews it once a week in ~30 minutes.
