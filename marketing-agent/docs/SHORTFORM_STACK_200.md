# VedicHour — $200/month best-in-class short-form stack (Aug 2026)

> **Launch-night override:** follow `launch-deliverables/TONIGHT_MARKETING_LOOP.md`. Do **not** buy Post Bridge or a Hetzner VPS tonight. Post from the native IG / YouTube / GBP apps until you are shipping **>1 approved Reel/day**. This file is the month-1 stack once *posting* (not ideation) is the bottleneck. Machine-readable split: `config/stack-budget.json`.

**Control plane:** this `marketing-agent/` (CLI brains, SQLite memory, policy linter, approval queue, fal.ai render, Sarvam VO, ffmpeg assembly).
**Founder job:** review/approve Reels. Nothing else.
**Hard cap:** **$200/month** for every paid tool in this document (AI APIs, TTS, video gen, scheduling, captions). CLI subscriptions the founder already pays (Gemini / Codex / optional Claude Code) are **sunk** and not counted.

Prices below are **list prices as of 16 Aug 2026**, read from vendor pages or the agent's own audited `PRICE_TABLE`. **Verify tonight before paying** — several vendors run two pricing pages at once.

---

## 0. Verdict (read this, then execute §7)

Do **not** buy a new video SaaS. The agent already has the 2026 quality path: photoreal Veo presenter + real VedicHour UI + gold/navy captions + one Indian male voice. Buying Creatify / Hedra / Submagic / ElevenLabs would spend the budget on a *look* the feed already punishes as AI slop.

Spend the $200 on three things only:

1. **More finished presenter Reels** (fal.ai) — this is the product.
2. **A posting rail that fires after Approve** (Post Bridge API) — this is the reach.
3. **A box that stays on** (Hetzner) — this is the uptime the Windows Task Scheduler cannot give.

Everything else in the 2026 catalog is either already built here for $0, or it is a premium-looking trap.

**Cadence the budget actually buys (quality-first, not spam):**

| Asset | Volume | Platforms | Why |
|---|---|---|---|
| Presenter-led hero Reel | **4 / week** (16–18 / month) | YouTube Shorts + IG Reels + FB Reels | Retention + trust. Same file, three networks. |
| Product-proof Short (Playwright screencap + Sarvam `shubh`) | **3 / week**, YouTube-only | YouTube Shorts | Search + volume. India lives on YT. Cost ≈ $0. |
| Hindi dub of a *winner only* | **4 / month** | YT + IG | NRI/Hindi belt. Sarvam Dubbing API, not sync.so. |
| Google Business Profile post | **3 / week**, image + CTA | Maps (IN cities + UAE) | Free reach next to “astrology near me”. |

TikTok is **banned in India**. Use it only for UAE, and only if a slot is free. Do not buy any SKU “for TikTok.”

---

## 1. Ranked stack (buy in this order)

| Rank | Layer | Tool / SKU | Why it wins per dollar | Status |
|---:|---|---|---|---|
| 1 | Brain | `gemini` CLI (bulk) + `codex` CLI (fallback) + optional `claude` CLI | Marginal cost ≈ $0. The whole over-produce-then-kill engine depends on this. | **Keep** |
| 2 | Video gateway | **fal.ai** prepaid credits. Endpoints already in `src/render/providers.ts` | One key, one invoice, Veo + Kling + Wan. Pay per second, no $99 seat. | **Keep + fund** |
| 3 | Presenter | **Google Veo 3.1 Fast** via `fal-ai/veo3.1/fast` @ **$0.15/s** with audio | Native 9:16 dialogue + lip-sync. The only presenter route that does not look like an avatar. | **Keep** |
| 4 | Hero b-roll | **Kling 3.0 Standard** via `fal-ai/kling-video/v3/standard/text-to-video` @ **$0.084/s audio off** | Cheapest *verified* cinematic second on fal. Audio off on purpose — VO is Sarvam. | **Keep** |
| 5 | Filler b-roll | **Wan 2.7** via `fal-ai/wan/v2.7/text-to-video` @ **$0.10/s** | Native 1080p, flat rate. | **Keep** |
| 6 | Product proof | **Playwright + ffmpeg** screencap (`src/render/screencap.ts`) @ **$0** | Real VedicHour UI. This is what stops the Reel looking like every other AI-jyotish account. | **Keep** |
| 7 | Voice (Hinglish + Hindi) | **Sarvam Bulbul v3**, speaker **`shubh`**, `en-IN` / `hi-IN` @ **₹30 / 10k chars** (beta) | Already measured against the presenter F0. Hindi is native. ~$0.01/Reel. | **Keep** |
| 8 | Captions | **ffmpeg ASS** (Latin) + **headless Chromium plates** (Hindi) | Indic shaping is already solved. Custom gold `#D4AF37` on navy — not karaoke yellow. | **Keep** |
| 9 | Policy / approve | SQLite `approval_queue` + `npm run approve` / cockpit `:4317` | Founder-only gate. Render cannot spend without this. | **Keep** |
| 10 | Publish rail | **Post Bridge — Agent plan $9/mo + API add-on $5/mo = $14/mo** | Smallest agent-native scheduler. Their servers hold the queue so the laptop can sleep. | **Buy tonight** |
| 11 | Uptime | **Hetzner Cloud CX23** (Falkenstein/Helsinki) **$6.49/mo** + IPv4 **~$0.60** ≈ **$8/mo** | 24/7 `cycle` + render-after-approve. Highest-leverage $8 in the stack. | **Buy tonight** |
| 12 | YouTube Shorts | **YouTube Data API v3** — $0, 10,000 quota units/day | Upload ≈ 1,600 units → ~6 uploads/day. India’s #1 discovery surface. | **Enable tonight** |
| 13 | Media URLs | **Cloudflare R2** Standard — **10 GB + egress free** | Post Bridge / YT need a public MP4 URL. Reels are ~8–20 MB. | **Enable tonight** |
| 14 | Local pack | **Google Business Profile Local Posts API** — $0 after access grant | UAE + Indian city Maps. Text+image, not Reels. Apply tonight; approval lags. | **Apply tonight** |
| 15 | Stills / thumbs | **FLUX.1 [schnell]** on fal @ **$0.003/image** | GBP images, YT thumbs, end-card variants. Paid from the fal wallet. | **Keep (same bill)** |
| 16 | Hindi winner dubs | **Sarvam Dubbing API** @ **₹40/min** Starter (`editor_flow: false`) | ~$0.23 per 30s reel. Replaces sync.so’s $19 seat. | **Month 1, winners only** |
| 17 | Backup scheduler | **Buffer Free** — 3 channels, 10 scheduled posts each | Emergency paste-queue if Post Bridge blips. Not a paid line. | **Keep free** |

**Fallback if Post Bridge’s $9 Agent SKU is gone tonight:** **Upload-Post Basic $16/mo** (5 profiles, REST API, 10 free uploads/mo to test first). Do not buy both.

---

## 2. Hard monthly budget (sums to $200)

Prices: **USD, monthly billing, excl. VAT/GST**. fal/Sarvam are usage; the number is a **prepaid cap**, not a hope.

| # | Vendor | Exact SKU | List price | This stack | Notes |
|---|---|---|---:|---:|---|
| A | fal.ai | Prepaid credits (no seat). Spend against `PRICE_TABLE` | $0.15/s Veo 3.1 Fast w/ audio; $0.084/s Kling 3.0 Std audio-off; $0.10/s Wan 2.7; $0.003/img Flux schnell | **$140** | ~20 finished hero Reels + 30% shot retries + hook A/B + thumbs. **Verify** live model pages — Kling Std was $0.084/s in the July 2026 audit; some Kling 3.0 *Pro* pages now quote $0.112/s audio-off. This stack stays on **Standard, audio off**. |
| B | Post Bridge | **Agent** + **API add-on** | **$9 + $5 = $14/mo** | **$14** | **Verify** on the *agent* pricing page, not the $29 Creator page. Both were live in Aug 2026. |
| C | Hetzner Cloud | **CX23** EU + IPv4 | **$6.49 + ~$0.60** (post 15 Jun 2026 adjustment) | **$8** | Singapore is 20–40% more; do **not** pick SG. Render is outbound to fal, not viewer-facing. |
| D | Sarvam AI | Pay-as-you-go: Bulbul v3 **₹30/10k chars**; Translate **₹20/10k**; Dubbing **₹40/min** Starter | New accounts **₹100 free credit** | **$6** | At ₹87/USD (agent default): 18 hero VOs ≈ $0.40; 4 Hindi dubs ≈ $1.80; rest is headroom when beta rates move. |
| E | Cloudflare R2 | Standard storage free tier | **$0** (10 GB-mo, 1M Class A, egress $0) | **$0** | Stay under 10 GB. Delete posted MP4s after 30 days. |
| F | YouTube Data API | Default quota | **$0** | **$0** | Google Cloud project with billing linked; quota itself is free. |
| G | GBP Local Posts | Access request, then $0 | **$0** | **$0** | Needs a GBP verified **≥60 days** + website. If blocked, Buffer Free can post GBP manually. |
| H | Buffer | **Free** | **$0** | **$0** | 3 channels × 10 posts. Backup only. |
| I | Reserve | fal top-up / INR-USD / one failed-week rerun | — | **$32** | Untouched unless `npm run render:budget` shows the week cap will miss a winner. |
| | **TOTAL** | | | **$200** | |

### What $140 of fal actually buys

Reference hero (already in `src/render/budget.ts`): 8s Veo + 5s Kling + 5s Wan + 6s Veo ≈ **$3.02**. Product screencap is $0.

| | Math |
|---|---|
| First-take hero | $3.02 |
| With 30% shot retries | **$3.93** finished |
| 18 finished heroes / month | 18 × $3.93 = **$70.74** |
| Hook A/B (extra 8s Veo opener on 10 of them) | 10 × $1.20 = **$12.00** |
| Flux thumbs / GBP stills (200 imgs) | $0.60 |
| Seedance fallback (do not plan for it) | $0.2419/s — resiliency only |
| **Left inside the $140 line** | **~$56** for a breakout week or a Veo face-lock reroll |

Do **not** raise volume to spend the leftover. Spend leftover on **retries of Reels the founder almost approved**.

### Caps to put in `.env` tonight

```
VIDEO_BUDGET_RUN_USD=4.0
VIDEO_BUDGET_DAY_USD=8.0
VIDEO_BUDGET_WEEK_USD=32.0
INR_PER_USD=87
```

`$32/week × 4.33 ≈ $138` of fal, leaving ~$2 inside line A for Flux. The current defaults (`$4 / $6 / $35`) let video eat Buffer/Post Bridge. **Lower the weekly cap to $32.** Raise the daily cap to $8 so two heroes can render the same day after a batch Approve.

Machine-readable copy: `config/stack-budget.json`.

---

## 3. Channel math (reach per dollar)

| Surface | Cost to post | Audience fit | Priority |
|---|---|---|---|
| **YouTube Shorts** | $0 API | India + NRI search (“hora today”, “kundli online”). Best long-tail. | **P0 — native API** |
| **Instagram Reels** | $0 Graph *or* $14 Post Bridge | UAE + urban IN + NRI. Trust/brand. Needs FB Page + IG Business. | **P0 — Post Bridge until Meta app review** |
| **Facebook Reels** | same IG rail | Older IN + Gulf family graph. Same file as IG. | **P0 — piggyback** |
| **Google Business Profile** | $0 | Dubai / Abu Dhabi / Indian metros Maps pack. | **P1 — apply, post 3×/week** |
| **LinkedIn** | included in Post Bridge | NRI professionals. 1 hero/week max, recut caption. | **P2** |
| **TikTok** | included | **UAE only.** India is banned. | **P3** |
| **WhatsApp Status** | no API | Huge in IN. Founder-only if ever. | **Do not automate** |

One approved MP4 → YT + IG + FB the same night. That is a 3× reach multiplier at $0 extra generation cost. **Never** render a separate file per network unless a winner is being Hindi-dubbed.

---

## 4. Decision log (every tool you named)

### Voice

| Tool | List | Verdict |
|---|---|---|
| **Sarvam Bulbul v3** | ₹30/10k chars (beta, [docs](https://docs.sarvam.ai/api/getting-started/pricing)) | **Buy (usage).** Only legal ad VO. Speaker `shubh` already matched to the presenter F0. Hindi + Hinglish in one vendor. |
| **edge-tts / en-IN-NeerjaNeural** | $0 | **Banned.** Owner rejected it as synthetic. Preflight already blocks it. Do not turn it back on “to save money.” |
| **ElevenLabs Creator** | **$22/mo** (121k credits; first month **$11**; annual **$18.33/mo**). Starter **$6/mo** / 30k credits. Pro **$99**. | **Do not buy.** Hindi loses to Sarvam. $22 is 11% of the whole stack for a second voice that the hard-rules file will flag as a voice-switch. Revisit **only** if the founder records a 60s clone *and* the presenter is silent — that is a different product. |
| **PlayHT** | Typically **~$31–47/mo** Creator-class (verify play.ht/pricing) | **Do not buy.** Same job as ElevenLabs, weaker Hindi, extra seat. |
| **Sarvam Dubbing API** | ₹40/min Starter | **Use on winners.** Replaces sync.so for Hindi. |

### Video gen

| Tool | List | Verdict |
|---|---|---|
| **fal.ai** (Veo / Kling / Wan / Flux) | Per-second / per-image | **The stack.** |
| **Kling 3.0 Pro** on fal | **$0.112/s** audio-off, **$0.168/s** audio-on (Aug 2026 Pro pages) | **Do not default.** Standard audio-off is the budget route. Pro is a one-off if a hero b-roll looks cheap. |
| **Kling O3 4K** | **$0.42/s** | **Never.** 5× Standard. ffmpeg already upscales to 1080×1920. |
| **Seedance 2.0 Fast** | **$0.2419/s** | Fallback only. Already wired. |
| **Runway** (Gen-4 / Aleph seats) | ~$12–$95/mo seats + gens | **Do not buy.** Second invoice, no Veo, seat tax. |
| **Luma** | Seat + per-gen | **Do not buy.** Same reason. |
| **Hedra Character-3** | Basic **$15**/1,500 cr; Creator **$30**/5,400 cr; Pro **$75**/14,400 cr. Character-3 = **6 credits/s** → Creator ≈ 900s/mo | **Do not buy.** Unit price looks great. The *look* is the 2026 talking-portrait tell. Fights the locked Veo brand face. |
| **Creatify** | ~**$39/mo** Starter / **$99** Pro (annual lower; verify) | **Do not buy.** UGC-ad factory. Wrong category for a premium Jyotish product. |
| **Arcads** | ~**$110/mo** for 10 videos | **Do not buy.** Half the stack for ten clips of stock AI actors. |
| **Sora 2** | — | **Do not build.** API sunset Sep 2026. Already excluded in `providers.ts`. |

### Captions / edit

| Tool | List | Verdict |
|---|---|---|
| **ffmpeg + Chromium plates** | $0 | **The stack.** Hindi conjuncts already verified against Chromium. |
| **CapCut API** | — | **Does not exist** as a third-party render API you can call from this agent. CapCut for Business is a team editor. Do not wait for it. |
| **Submagic Business + API** | **$69/mo** billed yearly / **$120/mo** monthly; 100 API minutes on that tier | **Do not buy.** Karaoke captions are the #1 AI-slop tell. Hindi shaping is worse than the plates you already have. |
| **Captions.ai Max** | **$24.99/mo** (iOS-listed; Scale from **$69.99**) | **Do not buy.** Phone app, credit bundle, no serious agent API. |
| **Remotion** | Self-render $0 infra; **company license** required above their free-revenue threshold ([remotion.dev/license](https://www.remotion.dev/license) — **verify**) | **Do not buy month 1.** ffmpeg already emits 9:16. Revisit only if a kinetic-type test beats ASS captions on retention. A license could blow the reserve. |

### Scheduling / social APIs

| Tool | List | Verdict |
|---|---|---|
| **Post Bridge Agent + API** | **$9 + $5 = $14** | **Buy.** Smallest bill that holds a schedule while the VPS sleeps between loops. |
| **Upload-Post Basic** | **$16/mo** / 5 profiles (free tier 10 uploads/mo) | **Fallback** if Agent SKU vanished. |
| **Blotato Starter** | **$29/mo** / 20 accounts, API included | **Do not buy.** You would pay $29 for AI writing/video you already generate. |
| **Buffer Essentials** | **$6 per channel** ($5/ch annual). 5 channels = **$30/mo** | **Do not buy.** The API exists, but $30 is 15% of the stack to duplicate Post Bridge. Keep **Buffer Free** as backup. |
| **Later Starter** | **$25/mo** ($18.75 annual) per social set | **Do not buy.** Weak agent API, Instagram-shaped, eats a Creatify-sized hole. |
| **YouTube Data API** | $0 | **Enable.** |
| **Instagram Graph (`instagram_content_publish`)** | $0 + Meta app review (days–weeks) | **Start the app tonight, do not block on it.** Post Bridge is the IG rail until Advanced Access lands. Publishing cap is in the 25–100 posts/24h range depending which Meta doc is current — **verify**; either number is far above 4 Reels/week. |
| **GBP Local Posts** | $0 after access | **Apply.** |
| **Canva Pro** | ~**$15/mo** Pro; **Connect API** is free to call but Autofill/Enterprise is the real automation SKU | **Do not buy.** Founder does not design. Reels are ffmpeg. Connect will not assemble presenter shots. |

### Lip-sync (Hindi)

| Tool | List | Verdict |
|---|---|---|
| **sync.so Creator** | **$19/mo + $0.05/s** lipsync-2. Hobbyist **$5/mo** still **watermarked**. | **Do not buy month 1.** $19 is a Buffer-sized hole. Pipeline already degrades to dub-over without `SYNC_API_KEY`. |
| **Sarvam Dubbing API** | ₹40/min | **Use instead.** |

---

## 5. Do-not-buy list (premium-looking budget waste)

Pay none of these while the cap is $200:

1. **ElevenLabs Creator $22** — second voice, worse Hindi, fights `hardrules.ts`.
2. **PlayHT** — ElevenLabs clone at a worse price.
3. **Hedra $15–$75** — cheap seconds, avatar-shaped slop.
4. **Creatify $39–$99** — UGC ads for a brand that must look like a product, not a dropshipper.
5. **Arcads ~$110** — one SKU = half the stack.
6. **Runway / Luma seats** — duplicate fal, lose Veo.
7. **Kling O3 4K $0.42/s** and **Seedance as default**.
8. **Submagic API $69–$120** and **Captions.ai $25+** — they make the Reel look cheaper.
9. **CapCut API** — not a real agent product.
10. **Blotato $29**, **Buffer Essentials $30**, **Later $25** — scheduling twice.
11. **Canva Pro $15** — founder is not in Canva.
12. **Remotion company license** until captions lose a retention test.
13. **sync.so Creator $19** until a Hindi-dubbed winner clearly loses because the mouth is wrong.
14. **TikTok-only tools** — India cannot see them.
15. **Ayrshare ~$149** — agency tax.

---

## 6. How the pieces click (control plane)

```
sense (Trends/Reddit/YT, $0)
    → creative (6 variants, adversarial audit, tournament, $0)
        → approval_queue          ← FOUNDER TAP: npm run approve <slug>
            → loop:render         ← fal + Sarvam + ffmpeg  (THE $ spend)
                → loop:review     ← $0 machine gate
                    → R2 upload
                        → Post Bridge schedule (IG/FB[/TikTok-UAE/LinkedIn])
                        → YouTube Data API insert (Shorts)
                        → GBP Local Post (image + CTA, 3×/week)
                            → loop:stats → perf brief → next creative
```

**Law already encoded (do not regress):**

- Shot 1 = photoreal presenter, Latin-script Hinglish, Veo native audio.
- Off-camera VO = Sarvam `shubh` only. Missing key → fail loud, never edge-tts.
- Real product screencap in the graph.
- `data/KILL` stops every paid loop.
- Nothing publishes without `npm run approve`.

---

## 7. Tonight — execute in order (≈ 3 hours)

Laptop is fine for signups. After step 7 the VPS is the always-on box; the laptop is the Approve surface (cockpit).

### T0 — Keys you must have in `marketing-agent/.env`

```
FAL_KEY=...
SARVAM_API_KEY=...
VIDEO_BUDGET_RUN_USD=4.0
VIDEO_BUDGET_DAY_USD=8.0
VIDEO_BUDGET_WEEK_USD=32.0
INR_PER_USD=87
# add after T2/T3:
POSTBRIDGE_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=vedichour-reels
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

Do **not** add `SYNC_API_KEY` tonight.

```bash
cd marketing-agent
npm run doctor
npm run render:budget
```

If `FAL_KEY` or `SARVAM_API_KEY` is missing, stop and create them first (sarvam.ai ₹100 trial; fal.ai prepaid **$140** — start with **$40** tonight if you want to feel a Reel before wiring the rest, then top up).

### T1 — fal wallet (20 min)

1. [fal.ai/dashboard/billing](https://fal.ai/dashboard) → add **$40** now, calendar a **$100** top-up after the first approved Reel looks right (month total still $140).
2. Confirm endpoints still price as in `src/render/providers.ts`. If Kling Standard audio-off moved, **edit `PRICE_TABLE` the same night** so the guard cannot under-estimate.
3. Dry-run: `npm run loop:render -- <slug> --estimate` on any `output/creative/*.json` winner. `--estimate` is a boolean and may sit before or after the slug.

### T2 — Post Bridge (25 min)

1. Open the **Agent** page (not `/pricing` Creator $29). Confirm **$9/mo**. If it is gone, skip to Upload-Post Basic $16 and use that key name instead.
2. Enable **API add-on $5**. Copy the key.
3. Connect: Instagram Business, Facebook Page, YouTube (even if you will later post YT natively), optional LinkedIn, optional TikTok **UAE**.
4. Note account IDs. You will paste them into a tiny publisher module (T8). Until that ships, Post Bridge’s dashboard can take a public R2 URL — still better than phone uploads.

### T3 — Cloudflare R2 (15 min)

1. Cloudflare dashboard → R2 → Create bucket `vedichour-reels`.
2. Enable public access **or** a custom domain `reels.vedichour.com`.
3. Create an API token (Object Read & Write). Put keys in `.env`.
4. Tonight you can also `npx wrangler r2 object put` one `final.mp4` to prove a URL plays in an incognito tab.

### T4 — YouTube Data API (30 min)

1. Google Cloud Console → new project `vedichour-marketing` → enable **YouTube Data API v3**.
2. OAuth client (Desktop) → scopes `youtube.upload`.
3. Run a one-time local OAuth; save `YOUTUBE_REFRESH_TOKEN`.
4. Upload one private Short as a smoke test. Quota is free; do not enable paid quota.

### T5 — GBP access request (10 min, then wait)

1. Confirm `vedichour` GBP is verified and **≥60 days** old. If not, skip automation; Buffer Free / UI posts until it is.
2. Cloud Console → Business Profile APIs → quota request. Use case: “post updates for our own listing, vedichour.com.”
3. Meanwhile: 3 image posts/week by hand is allowed. Flux stills are $0.003.

### T6 — Hetzner CX23 (25 min)

1. Console → CX23, **Falkenstein or Helsinki**, Ubuntu 24.04, IPv4 on. **~$8/mo.**
2. Install: `git`, Node 22, `ffmpeg`, `python3`, Chromium deps (for Hindi plates + Playwright).
3. Clone the repo, `cd marketing-agent && npm install`.
4. Copy `.env`. **Never** commit it.
5. Cron (example):

```
*/30 * * * * cd /opt/vedichour/marketing-agent && npm run cycle >> /var/log/vh-cycle.log 2>&1
5 3 * * *   cd /opt/vedichour/marketing-agent && npm run loop:stats
```

Render must **not** be on this cron. Render runs only after Approve (T9).

6. SSH tunnel or tailscale to `cockpit` `:4317` from the founder laptop. Do not expose cockpit to the public internet.

### T7 — Instagram / Meta (15 min, non-blocking)

1. IG account = **Business**, linked to a Facebook Page.
2. Create a Meta app, request `instagram_content_publish` when you have a screencast. Expect delay.
3. Until then, Post Bridge is the IG/FB publisher. **Do not** scrape Instagram (`loop:sense` already forbids it).

### T8 — One approved Reel tonight (the point)

On the laptop (or SSH to the VPS):

```bash
cd marketing-agent
npm run revive
npm run loop:creative -- --count 3
npm run cockpit          # http://localhost:4317
npm run approvals
# read output/creative/<slug>.md — kill anything with lotus/galaxy/“best hour”
npm run approve <slug>
npm run loop:render -- <slug>
npm run render:budget
```

Watch the first 6 seconds: presenter must be speaking **in-shot**. If a second narrator appears, **reject** and do not publish — that is the exact failure the owner already recorded.

If the file is good:

```bash
npm run loop:publish     # packages captions + UTM (existing)
# until publisher code lands: upload final.mp4 to R2, paste URL into Post Bridge
# YouTube: upload as Short, first line of description = spoken hook, link = /free-kundli UTM
```

**Tonight’s human work after Approve:** one R2 upload + one Post Bridge schedule (IG+FB, 18:30 IST) + one YT Short (19:00 IST) + one GBP photo if the API is not granted. That is the last manual night. After T9, Approve is the last tap.

### T9 — Wire publish-after-approve (90 min of code, or first thing tomorrow)

New loop, name it `loop:ship` (do not overload `loop:publish`, which only *packages*):

1. Gate: `publish_approvals.status = approved` AND `output/reels/<slug>/final.mp4` exists AND review pass.
2. Upload MP4 to R2 → public URL.
3. POST Post Bridge schedule: IG Reel + FB Reel, `scheduledTime` in IST (weeknights 18:30–21:00 IST; UAE 19:00–22:00 GST Friday/Saturday).
4. YouTube `videos.insert` privacy=public, `shorts` in title or 9:16, description first line = hook, URL = `utm(..., 'youtube', 'short', slug)`.
5. Write the Post Bridge / YT ids into SQLite `attribution`.
6. First comment on IG (link-in-bio reminder) via Post Bridge `firstComment` if the field exists on your plan — **verify**.

Until this ships, the founder still pastes. The stack is still valid; reach is just slower.

### T10 — Kill criteria for the first week

Reject (and `npm run reject <slug> "reason"`) if any of:

- Opening face looks like a different person than the locked late-20s Indian male brand face.
- edge-tts / Neural voice / two voices.
- Stock mandala / lotus / rotating galaxy b-roll.
- Caption style looks like Submagic (word-by-word pop, yellow, 3D bounce).
- Spoken CTA missing **vedichour.com**.
- Luck / best-hour / guarantee language (linter should have caught it).

---

## 8. Week-1 operating rhythm (founder = Approve only)

| When | Who | Command / action |
|---|---|---|
| Every 30 min (VPS) | agent | `npm run cycle` — sense, creative, blog, social, package. **$0.** |
| When cockpit shows pending | **founder** | Watch `final.mp4` (or the creative MD if pre-render). `approve` or `reject "reason"`. |
| On approve | agent | `loop:render` → review → R2 → Post Bridge + YT. |
| Hourly / nightly | agent | `loop:stats` → `npm run perf` feeds the next ideate. |
| Sunday 20 min | **founder** | Glance `npm run render:budget` and Post Bridge calendar. If week fal > $32, stop rendering. |

Target: **4 Approve taps/week**, not 4/day. Instagram rewards the Reel that holds; YouTube can take the 3 extra screencap Shorts without another Veo bill.

---

## 9. Anti-slop craft (this is how $200 looks expensive)

The tools do not make it premium. These rules do — they are already in the playbook / preflight; keep them funded:

1. **Same presenter identity** every hero. Recurring late-20s Indian man, warm, not a new face per Reel.
2. **Veo speaks the hook.** Never open on B-roll + VO.
3. **Real app UI** in the middle (screencap). Free Kundli → hour grid is the demo, not a mystic montage.
4. **Typography:** Cormorant Garamond / DM Sans, gold `#D4AF37`, navy `#0a0a1a`. Mute-first captions. Hindi = Chromium plates, never libass.
5. **One voice** off-camera: `shubh`.
6. **Specific time, specific decision** (“Kal 11 baje meeting”) — not “your stars today.”
7. **CTA spoken:** vedichour.com + free Kundli. Promo `NEWUSER30` only.
8. **No karaoke caption SaaS.** If a vendor demo looks like every other Reel in the astrology tag, it is not “best-in-class.”

---

## 10. Month-2 spend (only if line I / reserve is intact)

| If this is true | Then spend | Else |
|---|---|---|
| Hindi dubs retain ≥ English on YT | Keep Sarvam Dubbing; still no sync.so | Stop dubbing |
| Mouth-sync on Hindi is the stated reject reason | **sync.so Creator $19** funded from Reserve, cut 3 Veo reels | Stay on dub-over |
| Founder wants to *be* the voice, presenter silent | ElevenLabs **Starter $6** instant clone, test 4 Reels | Do not jump to Creator $22 |
| Kinetic captions beat ASS in a 6-asset test | Remotion, **after** reading the company-license threshold | Stay on ffmpeg |
| Meta app review lands | Drop IG from Post Bridge; keep Post Bridge for FB/LinkedIn/TikTok-UAE | Keep $14 |

Never add a SKU by shrinking fal below **$100**. Seconds of Veo are the product.

---

## 11. Verify-before-pay checklist (print this)

- [ ] fal Kling **Standard** audio-off still **≤ $0.084–0.10/s** ([model page](https://fal.ai/models/fal-ai/kling-video/v3/standard/text-to-video))
- [ ] Veo 3.1 Fast with audio still **$0.15/s** ([model page](https://fal.ai/models/fal-ai/veo3.1/fast))
- [ ] Sarvam Bulbul v3 still **₹30/10k** ([pricing](https://docs.sarvam.ai/api/getting-started/pricing)) — marked **beta**
- [ ] Post Bridge **Agent $9** still sold; else Upload-Post **$16**
- [ ] Hetzner **CX23** EU still **~$6.49** + IPv4 ([price adjustment 15 Jun 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/))
- [ ] R2 free tier still **10 GB + free egress** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/))
- [ ] sync.so Hobbyist still watermarked (if you ever reconsider)
- [ ] ElevenLabs Creator still **$22 / $11 first month** ([elevenlabs.io/pricing](https://elevenlabs.io/pricing)) — still a do-not-buy
- [ ] INR/USD in `.env` within 5 of the real rate (budget ledger)

---

## 12. One-line architecture

**Think** on CLI subscriptions ($0) → **kill** most scripts in SQLite ($0) → **founder Approve** → **spend fal + Sarvam** inside a $32/week guard → **caption with ffmpeg you already own** → **ship via $14 Post Bridge + $0 YouTube API** from an **$8 VPS** → **learn** from stats ($0).

That is the entire $200. Anything with a beautiful marketing page that does one of those jobs again is a cut, not an upgrade.
