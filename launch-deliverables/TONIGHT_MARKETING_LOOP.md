# VedicHour — Tonight’s marketing loop (best-in-class, $200/mo)

This is the operating system, not a mood board. The marketing-agent in this repo already has the control plane (sense → ideate → 6 variants → adversarial audit → tournament → human approve → fal.ai presenter render → PUBLISH.md). The job tonight is to **run that machine**, not to buy a new stack that looks expensive and ships generic faces.

**Founder job after tonight:** open the cockpit, tap Approve or Reject. That is the only human step in the content path.

---

## 0. Honest conversion math (read this first)

“50% of free users pay” is **not** a cold-traffic number. Treat it as a **qualified-preview** number.

| Stage | Realistic (cold IG/SEO) | Stretch (warm + preview seen) |
|---|---|---|
| Visitor → started Kundli | 25–40% | 40–60% |
| Started Kundli → account (email) | 15–30% | 40–60% |
| Account → paid (saw their own hours teaser) | 8–15% | **30–50%** |
| Visitor → paid (blended) | **0.4–1.5%** | 3–8% |

The product work in this PR exists to make the stretch column possible: calculator results no longer dead-end, birth details survive into `/onboard`, every finished reading cross-sells the other two products, paid nativity cannot ship a 159-character stub.

If you promise 50% of *all visitors*, the ads will look like a scam and the refund rate will eat you. Promise 50% of people who **saw their own chart + one real day**. That is the conversion architecture.

Hero offer everywhere (already in `marketing-agent/src/brand.ts`):

> Free Vedic Kundli in minutes — then unlock hour-by-hour windows. 30% off with `NEWUSER30`. 24-hour money-back.

---

## 1. $200/month stack — buy this, not that

The agent already bills video through **one key (`FAL_KEY`)** and TTS through **Sarvam Bulbul v3 (`shubh`)**, chosen by measured F0 match to the late-20s male presenter. Do not replace that with ElevenLabs because a thread said so.

| Line | Monthly | What it buys |
|---|---|---|
| fal.ai (Veo 3.1 Fast presenter + Kling b-roll + Wan filler) | **$140** | Already capped at `$35/week` in `marketing-agent/src/render/budget.ts`. ~8–12 *winner* reels/month. Ideation is $0 (Claude/Codex CLIs). |
| Sarvam Bulbul v3 | **$5** | Hinglish + Hindi voice. ₹30 / 10k chars. ~$0.01/reel. |
| sync.so lipsync (Hindi winners only) | **$15** | Optional. 2–3 dubbed winners/month at $0.05/s. Skip until an English reel actually wins. |
| Posting / scheduling | **$0** | `PUBLISH.md` + native IG/YouTube apps. Add Blotato/Upload-Post (~$29) only after you are posting daily and the tap is the bottleneck. |
| YouTube Data API + Google Business Profile | **$0** | Stats + GBP posts. |
| Buffer / leftover | **$40** | fal overrun + one test Meta Advantage+ burst **after** 5 organic winners, not before. |
| **Total** | **$200** | |

### Do not buy (they look premium and waste this budget)

- **ElevenLabs Creator ($5–22)** — duplicates Sarvam; a second voice is exactly the quality bug the owner already caught (“the woman’s voice… looks very AI”).
- **Runway / Kling direct / Luma / Hedra / Arcads / Creatify** — second video bill, random faces, no presenter continuity. fal.ai already routes Veo + Kling.
- **Captions.ai / Submagic** — everyone in D2C astrology uses the same pop captions. Your ffmpeg karaoke + Cormorant/DM Sans is the brand.
- **ChatGPT Plus / Claude API for ideation** — `brain()` is already $0 via CLI.
- **Canva Pro for video** — static carousels maybe; video templates look like Canva.
- **Meta ads on day 1** — at $12–16 AOV you need 3× ROAS. Spend the $40 leftover only after organic creative has a winner.

---

## 2. What already exists (do not rebuild)

| Loop | Command | Spend | Human? |
|---|---|---|---|
| Trend sense (Google Trends IN, Reddit, YouTube) | `npm run loop:sense` | $0 | No |
| Ideate → 6 variants → audit → tournament | `npm run loop:creative` | $0 | No |
| Adversarial review (11 lenses) | `npm run loop:review` | $0 CLI | No |
| Approval queue | `npm run cockpit` / `approvals` | $0 | **Yes — only tap** |
| Presenter render (Veo + product screencap + Sarvam + end card) | `npm run loop:render <slug>` | fal + Sarvam | No (after approve) |
| Per-platform pack + UTM | `npm run loop:publish` | $0 | No |
| IG/X/FB/LinkedIn captions | `npm run loop:social` | $0 | Review in cockpit |
| Email/WhatsApp sequences | `npm run loop:lifecycle` | $0 until Resend/Twilio | Review |
| Kill switch | `npm run kill "reason"` | — | Instant halt |

Daily scheduler entrypoint `npm run cycle` now runs **sense → creative → blog → social → publish-prep**. It no longer auto-renders faceless edge-tts reels (those look cheap next to the presenter pipeline).

---

## 3. The 10-step machine (run in this order, forever)

### 1. Sense (06:00 IST, $0)
`cd marketing-agent && npm run loop:sense`  
Kill if digest is empty — still ideate from `creative-seeds.json`. Never scrape Instagram.

### 2. Ideate (06:10, $0)
`npm run loop:creative`  
10 hooks, 3 scripted, 6 variants each. 30% of slots reserved for untested hook families. First on-screen line ≤ 8 words. Concrete moment, never “discover your cosmic timing”.

### 3. Self-audit (inside creative + `loop:review`)
Hard reject if any of these fire:

- Medical / legal / financial / marriage-saving claims (`config/banned-claims.json`)
- Price comparison vs other apps
- Jargon in ad copy: Swiss Ephemeris, Lahiri, yogakaraka
- First shot is not a visible human presenter
- Product screencap of pricing/checkout (must be the **report hourly grid**)
- Hook > 10 words
- Spoken CTA missing `vedichour.com`
- Second voice / female narrator on an ad reel

### 4. Tournament
Only top 3 `ready_to_render` leave the batch. Everything else dies on disk.

### 5. Human approve (your only job, ~8 minutes)
`npm run cockpit` → watch the 3 winners → Approve / Reject.  
Reject reasons that matter: uncanny face, gibberish on a screen, wrong product shot, cheap urgency.

### 6. Render (only approved slugs)
`npm run loop:render <slug>`  
Then `npm run loop:render <slug> -- --estimate` first if you want the dollar printout.  
Resume paid shots with `--resume` if a mid-reel fal 422 killed shot 2.

Caps (do not raise tonight): **$4 / reel, $6 / rolling 24h, $35 / rolling 7d**.

### 7. Package
`npm run loop:publish` writes `output/reels/<slug>/PUBLISH.md` with:

- IG Reel caption + 5 hashtags + UTM
- YouTube Short title/description
- YouTube 8–12 min outline (only if the idea earned it — most should stay ≤ 20s)
- Google Business post (plain text, no hashtags)

### 8. Post (still you, 5 minutes × 3 platforms)
Native apps beat a $29 scheduler until volume > 1/day.

| Asset | Destination URL (never dump everything on `/`) |
|---|---|
| “What’s my lagna / moon / manglik” | `https://www.vedichour.com/free-kundli?utm_source=instagram&utm_medium=reel&utm_campaign=launch&utm_content=<slug>` |
| Hour-by-hour / “11am or 4pm” | `/onboard?plan=7day&promo=NEWUSER30&utm_…` |
| Gun Milan / marriage | `/synastry?utm_…` |
| Deep life areas | `/kundali?utm_…` |
| Trust / sample | `/sample-report?utm_…` |

Link in bio = `/free-kundli` (SEO magnet). Stories sticker = `/onboard?plan=7day`.

### 9. Localize winners only
After an English reel is clearly the week’s winner:  
`npm run loop:render <slug> -- --languages hi`  
Tamil/Telugu wait until Hindi pays back. Fonts: Indic captions are Chromium plates, not libass.

### 10. Learn
`npm run loop:stats` then `npm run loop:insights` then `npm run playbook:review`.  
The playbook file is never auto-edited. You accept or reject proposed principles.

---

## 4. Visual craft (so it does not look like $9 AI)

Encoded in `config/playbook.json` + `src/brand.ts`. Non-negotiable:

1. **One face.** Late-20s Indian man, same clothes, same time of day, every shot. B-roll that recasts him as a stranger is a reject.
2. **Presenter opens.** First frame is a human, speaking Roman-script Hinglish, mute-readable caption in Cormorant.
3. **Night canvas only in video.** `#0a0a1a` / `#0d0d2b` / gold `#D4AF37`. No purple nebula stock, no rotating mandala spam, no floating Devanagari particles.
4. **Product proof is the hourly grid**, panning, 3–4 seconds. Never checkout.
5. **No generated screens with text.** Phone screens out of focus; real UI comes from Playwright capture.
6. **15–20s bias for tests; 22–32s only when the story needs the extra beat.** Completion is the ranking signal.
7. **End card (2s):** `vedichour.com` spoken + on screen + “Free Kundli — no card”. Not “Buy now”.
8. **Music:** one licensed/bed track in `media/music`, ducked −18 dB under VO. If no bed, silence is more premium than epidemic-sound “mystic flute”.
9. **Never:** fake testimonials, star-chart holograms, “I manifested 10L”, countdown timers, other people’s faces.

12-shot ceiling (most winners use 4–6):

| # | Role | Seconds | Must show |
|---|---|---|---|
| 1 | presenter | 4–6 | Face + hook in <1s |
| 2 | product | 4 | Live hourly grid |
| 3 | b-roll | 3–5 | Same person, decision moment (office / auto / kitchen) |
| 4 | presenter_close | 3 | Verdict in plain English |
| 5 | end card | 2 | vedichour.com |

ffmpeg assembly already grades + karaoke-captions this. Do not send winners through CapCut.

---

## 5. Distribution that actually gets clicks on $0 extra

Ranked by expected clicks per hour of founder time tonight:

1. **Your WhatsApp + 3 family groups** — personal “I built this, here’s *your* free Kundli” with `/onboard?plan=free`. Highest conversion you will see all month.
2. **Instagram Reels** — 3 presenter reels from the queue. First comment = the UTM link (IG starves link clicks in caption).
3. **YouTube Shorts** — same file, different title. YouTube is the compounding library; IG is the spike.
4. **YouTube 8–12 min** — one per week max: “I scored every hour of a Tuesday with Vedic math (here’s the grid)”. SEO, not virality.
5. **Google Business Profile post** — 2/week, photo of the grid (screenshot, not generated), link to `/free-kundli`.
6. **Reddit** r/vedicastrology, r/astrology — methodology post, **no naked link in OP**. Link in comment after value. Read each sub’s rules.
7. **Quora** — “best free janam kundali 2026” answers, one honest paragraph + link.
8. **Pinterest** — 1:1 and 9:16 stills of the grid + “Free Kundli” text. Slow, free, compounds.
9. **Telegram / WhatsApp status** — daily “today’s heavier window is X — not advice, just the math”.

Paid: **$0 tonight.** Pixel + Conversions API on the site (already MetaPixel + GA). Retarget “generated free Kundli, no purchase” only after 50+ pixel events.

---

## 6. Launch-night through day 7

| When (IST) | Agent | Founder |
|---|---|---|
| Tonight T-2h | `npm run loop:sense && npm run loop:creative && npm run loop:review` | — |
| Tonight T-1h | — | Cockpit: approve 3, reject the rest |
| Tonight T-30m | `npm run loop:render <slug>` × approved | Confirm `FAL_KEY` + `SARVAM_API_KEY` + `npm run render:budget` |
| Tonight T-0 | `npm run loop:publish` | Post Reel 1 to IG + Shorts + WhatsApp. Link in first comment. |
| Day 1 08:00 | `npm run cycle` | Approve 1, post 1. GBP post. |
| Day 1 20:00 | — | Personal network blast (the actual revenue). |
| Day 2–3 | cycle + render winners | 1 Reel + 1 Short/day. Quora × 2. |
| Day 4 | `loop:stats` | Kill any hook family with <20% 3s views. |
| Day 5 | Hindi dub of the winner only | Post to IG Hindi. |
| Day 6 | `loop:lifecycle` copy review | Turn on Resend welcome if key is set. |
| Day 7 | `playbook:review` | Keep or reject new principles. Decide if leftover $40 goes to Meta or more fal. |

Volume target: **1 approved presenter reel/day**, not 8 slop reels. Best-in-class accounts in this niche win on *specificity of the first second*, not cadence cosplay.

---

## 7. 10-minute daily dashboard

1. `npm run cockpit` — queue depth, kill-switch, spend vs $35/week.
2. IG Insights: 3s views, completion, profile visits (not vanity likes).
3. GA4: `/free-kundli` sessions → `/onboard` → `/api/ziina/create-intent` (or admin funnel).
4. Vercel: LLM spend. If free Kundli goes viral, **caps in Anthropic/OpenAI/Google consoles are the circuit breaker** (see `LAUNCH_PLAYBOOK.md` §1).
5. One sentence in a note: “What hook family won yesterday?” Feed that to `playbook:review` weekly, not by gut.

---

## 8. Keys to set tonight (nothing else)

```
FAL_KEY=                 # presenter + b-roll
SARVAM_API_KEY=          # the only TTS allowed in ads
# SYNC_API_KEY=          # Hindi winners only, later
YOUTUBE_API_KEY=         # sense + stats, free quota
# RESEND_API_KEY=        # welcome email, already wired
# TWILIO_*               # WhatsApp, later
```

Doctor: `cd marketing-agent && npm run doctor`  
Budget: `npm run render:budget`  
Halt everything: `npm run kill "pause spend"`

---

## 9. Why this is the 0.01% loop (and not a tool shopping list)

Most “AI marketing agencies” generate 30 faceless videos, caption them in Submagic, and spray them. Platforms now downrank that, and it looks like every other Kundli app.

This loop does the opposite:

- **Overproduce text at $0**, kill 90% with adversarial audit.
- **Spend only on a recurring human presenter** whose voice matches measured TTS.
- **Show the real report**, not a generated mandala.
- **Founder is a taste gate, not a production intern.**
- **Hard dollar caps** so a bad weekend cannot empty the card.

That is the same shape as a world-class performance creative team. The tools are already in `marketing-agent/`. Tonight is operations, not architecture.
