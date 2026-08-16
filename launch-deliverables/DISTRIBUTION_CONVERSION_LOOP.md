# VedicHour — DISTRIBUTION + CONVERSION Loop

**Budget:** $200/month · **Funnel:** Free Kundli → signup → preview → NEWUSER30 → Ziina · **Promo:** `NEWUSER30` only  
**Owners:** `agent` = marketing-agent / Claude / automation · `founder` = paste, post, DM, spend, decide  
**Canonical domain:** `https://www.vedichour.com`  
**Truth sources:** `/admin/today` · `/admin/acquisition` · `/admin/campaigns/utm` · `/admin/revenue` · `/admin/crm` · Resend digest  

> **Hard rules:** Never send every Reel to `/`. Never claim 50%+ free→paid from cold traffic. Never put `ADMIN100` in public. Every public URL carries UTMs. Sell timing awareness, never fate.

---

## 0. One-page operating system

| Layer | Job | Primary URL | North-star metric |
|---|---|---|---|
| **Attract** | Reach people with a concrete moment | Content → SEO destination (not homepage) | Link clicks / day |
| **Capture** | Force identity before the “aha” | `/free-kundli` → signup → preview | Free previews completed / day |
| **Convert** | Monetize the preview gap | `/onboard?plan=7day&promo=NEWUSER30` · `/pricing` · `/kundali` · `/synastry` | Paid orders / day · preview→paid % |
| **Recover** | Harvest intent that didn’t buy | Email nurture · WhatsApp · Meta retarget | Recovered revenue / week |
| **Compound** | Rank + reuse winners | Blog + calculators + winning hooks | Organic sessions · revenue / `utm_source` |

**Realistic blended math (cold + warm + nurture — not a fantasy):**

```
10,000 short-form views
 → 100–200 site clicks          (1–2%)
 → 40–80 free Kundli starts     (40%)
 → 25–55 previews completed     (60–70%)
 → 2–6 paid (cold only, 4–8%)
 → 4–10 paid with nurture+WA+pixel (8–15% of completed previews)
```

**Warm/outreach alone:** 15–30% of people who finish a free preview.  
**Claiming 50%+ free→paid from Reels/ads = lying.** Design for **8–15% cold**, **15–30% warm**, blended **10–18%** after Day 7 nurture.

**Prices (fact-checked against Ziina):** Free preview · 7-Day $9.99 · Monthly $19.99 · Annual $49.99 · Deep Kundali $9.99 · Synastry $9.99. With NEWUSER30, first paid ≈ **$7**.

---

## 1. Honest $200/month budget (ads vs production)

### 1.1 The math that kills “just run ads”

| Channel | What $200 buys | Expected CPA to *paid* (cold) | Verdict |
|---|---|---|---|
| Google Search (`free kundli`, `gun milan`) | ~400–800 clicks @ $0.25–$0.50 CPC | $25–$80+ before nurture | Only high-intent keywords can clear |
| Meta cold Traffic | ~2k–8k clicks, mostly tire-kickers | Often **>$100** to a paid order | Burns budget with no audience |
| Meta **retarget** (preview viewers) | Cheap if pixel has 500+ visitors | Can be **$8–$25** CPA | Worth it *after* traffic exists |
| Boosting a winning organic Reel | 1–2 winners × $20–40 | Variable; only if organic already converts | Conditional |

**Month-1 ROAS reality:** cold Meta to strangers on $200 usually loses money. Google Search on `gun milan` / `kundli matching` can break even on $9.99 tickets *if* you land on `/synastry` and nurture. Organic + recovery is where margin lives.

### 1.2 Allocation (owner + metric)

| # | Line item | $ | Owner | URL / tool | Success metric |
|---|---|---:|---|---|---|
| 1.2.1 | **Canva Pro** (Magic Resize + Brand Kit) | **13** | founder | https://www.canva.com | 7 days of assets batched in <45 min |
| 1.2.2 | **Google Search test** (Days 4–30, only after 5+ organic posts) | **70** (~$2.50–3.50/day) | founder | https://ads.google.com → Expert Mode | ≥1 free-Kundli start per $3 spend · pause if 0 starts after $25 |
| 1.2.3 | **Meta retarget only** (after ≥300 unique visitors + pixel live) | **40** (~$2–3/day from Day 8+) | founder | Meta Ads Manager | CPA to checkout_start ≤ $15 |
| 1.2.4 | **Boost 1–2 winning organic Reels** (leads, not vanity views) | **40** | founder | IG → Boost → destination UTM | Cost per free-Kundli start ≤ $4 |
| 1.2.5 | **Reserve / kill fund** | **37** | founder | — | Unspent until a winner is proven in `/admin` |
| | **TOTAL** | **200** | | | |

**Verdict:** Do **not** put 100% into production *or* 100% into ads. **~$13 production + ~$150 measured demand + ~$37 reserve.**  
**Days 1–3: $0 ads.** Pixel + creatives first. Cold Meta prospecting: **$0** until retarget pool exists.

| # | Action | Owner | URL | Success metric |
|---|---|---|---|---|
| 1.2.6 | Confirm `NEXT_PUBLIC_META_PIXEL_ID` set; Purchase fires on Ziina complete | agent + founder | site + Meta Events Manager | PageView + Purchase visible in Events Manager |
| 1.2.7 | Confirm GA4 + Search Console | founder | https://search.google.com/search-console | Sitemap submitted; `/free-kundli` indexed |

---

## 2. Conversion architecture (maximize paid without lying)

### 2.1 The real ladder (not homepage → Annual)

```
CONTENT (topic-matched URL)
  → FREE TOOL / FREE KUNDLI
  → SIGNUP (email required)
  → PREVIEW (1 sample day + natal teaser)     ← value drop
  → IN-REPORT UPSELL + EXIT INTENT
  → /onboard?plan=7day&promo=NEWUSER30
  → Ziina checkout
  → RECOVERY: nurture email D1/D3/D7 + abandoned WA + CRM call
  → CROSS-SELL: /kundali · /synastry · monthly/annual
```

| Stage | Realistic rate | Owner | URL | Success metric |
|---|---|---|---|---|
| Click → free start | 30–45% | agent (landing) | `/free-kundli` | Starts ÷ landing sessions |
| Start → signup | ≥60% | agent | `/signup` · `/login` | Signups ÷ starts |
| Signup → preview complete | ≥55% | agent | `/report/[id]` | Completes ÷ signups |
| Preview → paywall view | ≥70% of completes | agent | report upsell / exit intent | `paywall_viewed` |
| Paywall → checkout start | 15–25% | founder CTA copy | `/onboard?plan=7day&promo=NEWUSER30` | Checkout intents |
| Checkout → paid | 40–60% | agent (Ziina) | Ziina hosted | Completed ÷ intents |
| **Preview complete → paid (cold, no nurture)** | **4–8%** | — | — | Paid ÷ completed previews |
| **+ email nurture (live)** | **+3–5 pts** | agent | `src/lib/notify/lifecycle.ts` | Nurture sends · attributed paid |
| **+ WhatsApp (Twilio)** | **+2–4 pts** | founder enable | Twilio + `/admin/crm` | WA replies · paid |
| **+ Meta retarget** | **+1–3 pts** | founder | Meta Ads | Retarget ROAS ≥ 1.5 |
| **Warm DM / call** | **15–30%** of engaged free | founder | `/admin/crm` | Paid from call list |

### 2.2 Capture stack (non-negotiable)

| # | Mechanism | Owner | URL / system | Success metric |
|---|---|---|---|---|
| 2.2.1 | Free Kundli requires account before full preview | agent | `/free-kundli` | Email captured before report complete |
| 2.2.2 | Preview = natal + **one** sample day only (paywall at source) | agent | orchestrator / report page | Zero paid sections leaked |
| 2.2.3 | In-report upsell + exit intent → `NEWUSER30` | agent | `/report/[id]` | Upsell CTR ≥ 8% of preview views |
| 2.2.4 | Preview nurture D1 / D3 / D7 | agent | Resend via `runPreviewNurture` | ≥3 emails/user window; ≥15% open |
| 2.2.5 | Abandoned Ziina → email + WhatsApp | agent | `runAbandonedCheckoutRecovery` | ≥20% of abandoned recover or reply |
| 2.2.6 | Phone on onboard → Call list | founder uses | `/admin/crm` | ≥5 founder touches/day Week 1 |
| 2.2.7 | Meta Pixel PageView + Purchase | agent + founder | `MetaPixel.tsx` | Events match Ziina completes ±10% |
| 2.2.8 | First-touch UTM persisted | agent | FirstTouch / RefCapture | Paying users have `utm_source` ≠ unknown |

### 2.3 Offer rules

| # | Rule | Owner | URL | Success metric |
|---|---|---|---|---|
| 2.3.1 | Public code = `NEWUSER30` only | founder | `/pricing` · captions | 0 public mentions of ADMIN100 |
| 2.3.2 | Lead cold traffic to **7-Day or Deep Kundali / Synastry**, never Annual first | founder | `/onboard?plan=7day&promo=NEWUSER30` | ≥70% first paid are ≤$9.99 tier |
| 2.3.3 | Matchmaking content → `/synastry` (free score → paid unlock) | founder | `/synastry` | Synastry revenue share ≥20% of paid |

---

## 3. SEO compounding — destination URLs (NOT homepage)

**Rule:** Hook topic = landing page topic. Homepage only for brand/trust explainers.

| Content topic | Destination path | Why |
|---|---|---|
| Free Kundli / birth chart | `/free-kundli` | Primary magnet |
| Hour-by-hour / horas / “day is not one mood” | `/hora` or `/pricing` (product proof) then soft to free | Differentiator |
| Shubh muhurat / auspicious time | `/muhurat` | Intent match |
| Rahu Kaal / caution window | `/hora` or blog + CTA `/free-kundli` | Tool > homepage |
| Nakshatra / birth star | `/nakshatra-finder` or `/nakshatra/[name]` | Calculator → signup |
| Dasha / life chapters | `/vimshottari-dasha-calculator` or `/dasha/[planet]` | High curiosity |
| Manglik | `/manglik-dosha-calculator` | Marriage intent |
| Sade Sati | `/sade-sati-calculator` | High search |
| Kaal Sarp | `/kaal-sarp-dosha-calculator` | Fear → calm tool |
| Lagna / rising | `/lagna-calculator` | Chart literacy |
| Moon sign | `/moon-sign-calculator` | Easy entry |
| Gun Milan / matching | `/synastry` | Direct monetization |
| Deep Kundli / full reading | `/kundali` | Direct monetization |
| Pricing / plans / NEWUSER30 | `/pricing` | Warm traffic only |
| Educational long-form | `/blog/[slug]` → tool CTA | SEO compound |
| Transit news | `/transit/[planet]/[sign]` | Timely SEO |
| Daily sign curiosity | `/horoscope/[sign]` | Volume → free Kundli CTA |

| # | Action | Owner | URL | Success metric |
|---|---|---|---|---|
| 3.1 | Every Reel/Short description uses topic URL + UTM | founder | table above | ≥80% of posts land off-homepage |
| 3.2 | Blog CTAs point to matching tool | agent | `/blog/[slug]` | Tool CTR from blog ≥ 5% |
| 3.3 | GSC: submit `https://www.vedichour.com/sitemap.xml` | founder | Search Console | Impressions ↑ week-over-week |
| 3.4 | Rank landing pages by **paid**, not vanity visits | founder | `/admin/acquisition` | Top 5 landings by paid customers |

---

## 4. UTM scheme (canonical)

**Format (matches `marketing-agent/src/brand.ts` `utm()`):**

```
https://www.vedichour.com{PATH}?utm_source={SOURCE}&utm_medium={MEDIUM}&utm_campaign={CAMPAIGN}&utm_content={SLUG}
```

| Param | Values |
|---|---|
| `utm_source` | `instagram` `youtube` `reddit` `quora` `pinterest` `whatsapp` `telegram` `google_business` `google_ads` `meta_ads` `partner` `email` `share` |
| `utm_medium` | `reel` `short` `longform` `post` `pin` `status` `dm` `comment` `search` `paid_social` `retarget` `bio` `story` |
| `utm_campaign` | `launch` · `m{YYYYMM}` · `matchmaking` · `deepkundli` · `hora` |
| `utm_content` | reel/script slug e.g. `day-not-one-mood` |

### 4.1 Ready links by content type

| Content type | Destination | Full example |
|---|---|---|
| IG Reel (hora) | `/hora` | `…/hora?utm_source=instagram&utm_medium=reel&utm_campaign=launch&utm_content=day-not-one-mood` |
| IG Reel (free Kundli) | `/free-kundli` | `…/free-kundli?utm_source=instagram&utm_medium=reel&utm_campaign=launch&utm_content=free-kundli-hook` |
| IG bio | `/free-kundli` | `…/free-kundli?utm_source=instagram&utm_medium=bio&utm_campaign=launch` |
| YT Short | `/free-kundli` | `…/free-kundli?utm_source=youtube&utm_medium=short&utm_campaign=launch&utm_content=SLUG` |
| YT long-form | `/blog/SLUG` or `/free-kundli` | `…/blog/SLUG?utm_source=youtube&utm_medium=longform&utm_campaign=launch` |
| Google Business post | `/muhurat` or `/free-kundli` | `…/free-kundli?utm_source=google_business&utm_medium=post&utm_campaign=launch` |
| Reddit answer | tool URL (value-first) | `…/manglik-dosha-calculator?utm_source=reddit&utm_medium=comment&utm_campaign=launch&utm_content=THREAD` |
| Quora answer | tool URL | `…/synastry?utm_source=quora&utm_medium=comment&utm_campaign=launch` |
| Pinterest pin | matching tool | `…/nakshatra-finder?utm_source=pinterest&utm_medium=pin&utm_campaign=launch` |
| WhatsApp status / DM | `/free-kundli` | `…/free-kundli?utm_source=whatsapp&utm_medium=status&utm_campaign=launch` |
| Telegram channel | `/free-kundli` | `…/free-kundli?utm_source=telegram&utm_medium=post&utm_campaign=launch` |
| Google Ads — free | `/free-kundli` | `…/free-kundli?utm_source=google_ads&utm_medium=search&utm_campaign=free_kundli` |
| Google Ads — matching | `/synastry` | `…/synastry?utm_source=google_ads&utm_medium=search&utm_campaign=matching` |
| Google Ads — deep | `/kundali` | `…/kundali?utm_source=google_ads&utm_medium=search&utm_campaign=deep_kundli` |
| Meta retarget | `/onboard?plan=7day&promo=NEWUSER30` | `…/onboard?plan=7day&promo=NEWUSER30&utm_source=meta_ads&utm_medium=retarget&utm_campaign=launch` |
| Email nurture | onboard | `…/onboard?plan=7day&promo=NEWUSER30&utm_source=email&utm_medium=nurture&utm_campaign=launch&utm_content=s1` |
| Partner | `/free-kundli` | `…/free-kundli?utm_source=partner&utm_medium=creator&utm_campaign=launch&utm_content=NAME` |

| # | Action | Owner | URL | Success metric |
|---|---|---|---|---|
| 4.1 | Paste block into Notes; never post naked domain | founder | this section | <10% sessions `utm_source` unknown |
| 4.2 | Dub.co optional shorteners → same UTMs | founder | https://dub.co | Click map matches `/admin/campaigns/utm` |
| 4.3 | Agent reels ship with UTM via `utm()` | agent | `marketing-agent/src/brand.ts` | PUBLISH.md links always tagged |

---

## 5. Organic distribution (channel SOP)

**Priority order on $200/mo:** IG Reels + YT Shorts (same file) → YT long-form → Reddit/Quora → Pinterest → Google Business → WhatsApp/Telegram. Do not “be everywhere equally.”

### 5.1 Instagram Reels

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.1.1 | Pro account `vedichour`; bio → IG bio UTM | founder | https://www.instagram.com · bio link | Profile → site CTR ≥ 2% |
| 5.1.2 | 1–2 Reels/day; mute-first captions; ≤15–25s bias | agent scripts · founder post | Meta Business Suite | Completion ≥ 40% on winners |
| 5.1.3 | Pin comment = destination UTM (not homepage) | founder | Reel | ≥5 link taps / 1k views on winners |
| 5.1.4 | Reply all comments <60 min | founder | IG | Saves + shares rising on top 3 hooks |

### 5.2 YouTube Shorts

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.2.1 | Re-upload every IG Reel as Short same day | founder | YouTube Studio | Shorts views ≥ 50% of IG views by Day 7 |
| 5.2.2 | Description line 1 = YT Short UTM | founder | description | `utm_source=youtube` sessions in `/admin` |

### 5.3 YouTube long-form (2× / week max)

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.3.1 | Screen-record free tool + talk blog script | founder | `/blog/[slug]` → video | ≥8 min watch avg on winners |
| 5.3.2 | Cards/end screen → free Kundli UTM | founder | YT | ≥3% CTR to site |

### 5.4 Google Business Profile posts

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.4.1 | Service-area profile; 3 posts/week (muhurat, hora tip, free Kundli) | founder | https://business.google.com | Posts → GBP clicks ≥ 20/week |

### 5.5 Reddit

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.5.1 | Value-first answers in r/vedicastrology, r/astrology, India marriage subs; link only when it helps | founder | tool UTM | 0 bans; ≥1 thread/week drives sessions |
| 5.5.2 | Never spam homepage; use calculator URLs | founder | §3 table | Reddit → signup ≥ 10% of Reddit sessions |

### 5.6 Quora

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.6.1 | 5 answers/week on kundli/matching/muhurat | founder | Quora → tool UTM | Quora sessions in `/admin` |

### 5.7 Pinterest

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.7.1 | 4 boards; 1 pin/day from Canva; claim site | founder | Pinterest Business | Pin saves ≥ 2%; traffic to calculators |

### 5.8 WhatsApp status + Telegram

| # | Item | Owner | URL | Success metric |
|---|---|---|---|---|
| 5.8.1 | Daily status to warm list (screenshot of hora grid, not hard sell) | founder | WA status UTM | Status → ≥5 free starts/week |
| 5.8.2 | Telegram channel: 1 tip + 1 link/day | founder | Telegram UTM | Telegram sessions tracked |
| 5.8.3 | Enable Twilio WA for abandoned + CRM | founder | env + `/admin/crm` | Abandoned WA send > 0 |

---

## 6. Paid (execution gates)

| # | Gate | Owner | URL | Success metric |
|---|---|---|---|---|
| 6.1 | **No ads Days 1–3** | founder | — | Pixel + 5 creatives live |
| 6.2 | Google Search from Day 4: ad groups Matching→`/synastry`, Free→`/free-kundli`, Deep→`/kundali` | founder | ads.google.com | ≥1 start / $3 |
| 6.3 | Kill ad if $25 spend + 0 free starts | founder | Ads + `/admin` | Zero zombie spend |
| 6.4 | Meta cold prospecting = **OFF** | founder | — | $0 cold Meta |
| 6.5 | Meta retarget Day 8+: viewers of `/free-kundli` + `/report/*` → onboard NEWUSER30 | founder | Meta Ads | ROAS ≥ 1.5 or pause |
| 6.6 | Boost only creatives that already produced a free start organically | founder | IG Boost | Cost/start ≤ $4 |

**Ad-safe line:** `Not another horoscope — a personal Vedic timing grid.`  
**Disclaimer:** `For reflection and planning only. Not medical, legal, financial, or emergency advice.`

---

## 7. Seven-day content calendar (launch night → Day 7)

Scripts/captions: `MARKETING_CONTENT_PACK.md` + `marketing-agent` reel output. Founder posts; agent generates.

### Night 0 — Launch night (T-0)

| # | Ship | Dest UTM | Owner | Success metric |
|---|---|---|---|---|
| N0.1 | Reel: “Your day is not one mood” (18 horas) | `/hora` IG reel UTM | founder | Posted + pinned comment link |
| N0.2 | Same file → YT Short + FB Reel | YT/FB UTMs | founder | 3 platforms live |
| N0.3 | Story: free Kundli sticker | IG bio UTM | founder | Story exits to site |
| N0.4 | WA status to personal warm list (20–50) | WA status UTM | founder | ≥5 clicks |
| N0.5 | Telegram “we’re live” + free Kundli | Telegram UTM | founder | Posted |
| N0.6 | Confirm NEWUSER30 + digest + pixel | `/pricing` · `/admin` | founder | Test cart 30% off; abandon |

### Day 1 — Magnet

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D1.1 | Reel: Free Kundli in 60s screencap | `/free-kundli` | founder | Free starts ≥ 10 |
| D1.2 | Carousel: What VedicHour is / isn’t | `/free-kundli` | founder | Saves ≥ 20 |
| D1.3 | Reddit: 1 helpful answer (no spam) | calculator UTM | founder | Upvotes > 0 |
| D1.4 | 25 warm WA/IG DMs | WA dm UTM | founder | ≥5 free starts from warm |
| D1.5 | GBP post: free Kundli | GBP UTM | founder | Posted |
| D1.6 | **Ads: still OFF** | — | founder | $0 spend |

### Day 2 — Differentiator

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D2.1 | Reel: clearer vs heavier window (concrete time example) | `/hora` | founder | Completion ≥ 35% |
| D2.2 | YT Short duplicate | YT UTM | founder | Live |
| D2.3 | Quora ×2 (muhurat + kundli) | tool UTMs | founder | 2 answers |
| D2.4 | Pinterest ×3 aesthetic + tool link | pin UTMs | founder | 3 pins |
| D2.5 | Reply all D1 comments; pin best CTA | — | founder | 100% reply rate |
| D2.6 | `/admin/acquisition` read | `/admin/acquisition` | founder | Know top `utm_source` |

### Day 3 — Trust + product proof

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D3.1 | Reel: real report screencap (hours grid only — no checkout UI) | `/free-kundli` | founder | Profile visits ↑ |
| D3.2 | Long-form YT #1 from blog | blog UTM | founder | Published |
| D3.3 | Partner DMs ×15 (wedding planners → synastry) | partner UTM | founder | ≥2 replies |
| D3.4 | WA follow-up to D1 clickers who didn’t finish | WA dm | founder | ≥2 completions |

### Day 4 — Intent + first paid test

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D4.1 | Reel: Gun Milan / 36 points (calm) | `/synastry` | founder | Synastry sessions > 0 |
| D4.2 | Reel: Deep Kundli teaser | `/kundali` | founder | Kundali sessions > 0 |
| D4.3 | **Enable Google Search $3/day** (Matching + Free groups) | ads UTMs | founder | First tracked `google_ads` start |
| D4.4 | Soft offer DM to completed previews | onboard NEWUSER30 | founder | ≥1 checkout start |
| D4.5 | Check nurture emails sending | Resend | founder | S1 sends > 0 |

### Day 5 — Volume on winner

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D5.1 | 3 variations of best Day 1–4 hook | same dest as winner | agent + founder | 3 posts |
| D5.2 | Kill flat hooks (0 link taps) | — | founder | Only winners remain |
| D5.3 | GBP + Pinterest + Telegram daily | UTMs | founder | Posted |
| D5.4 | CRM: call/WA top 5 phones | `/admin/crm` | founder | ≥1 conversation |
| D5.5 | Google: add negatives (job, course, PDF, free download) | Ads | founder | Wasted spend ↓ |

### Day 6 — Convert

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D6.1 | Reel: “Preview vs full — what unlocks” (honest) | `/pricing` or onboard | founder | Checkout starts ↑ |
| D6.2 | Story reminder NEWUSER30 (real code) | onboard UTM | founder | Story link taps |
| D6.3 | Abandoned list human nudge | `/admin/crm` | founder | ≥1 recovered paid |
| D6.4 | If organic Reel produced starts: boost $20 | same UTM | founder | Cost/start ≤ $4 |
| D6.5 | Reddit/Quora batch ×3 | tools | founder | 3 posts |

### Day 7 — Retro + lock the loop

| # | Ship | Dest | Owner | Metric |
|---|---|---|---|---|
| D7.1 | Final Reel: best hook remixed | winner dest | founder | Posted |
| D7.2 | Long-form YT #2 optional | blog | founder | Optional |
| D7.3 | `/admin/revenue` + `/admin/campaigns/utm` retro | admin | founder | Top 3 paying sources written down |
| D7.4 | Allocate remaining budget only to winner (Google group or boost) | ads | founder | Losers paused |
| D7.5 | Write Week-2 = only winning hooks × channels | Notes | founder | Plan ≤ 1 page |
| D7.6 | If ≥300 visitors: prepare Meta retarget (start Day 8) | Meta | founder | Audience size noted |

**Daily floor (every day 1–7):** 1 Reel (+ Short mirror) · 10 outreach touches · 100% comment reply · 10-min metrics (§8).

---

## 8. Founder metrics dashboard (10 minutes/day)

**Order matters. Do not open Ads Manager first.**

| Min | Check | URL | Write down | Kill / scale rule |
|---|---|---|---|---|
| 0–2 | **Today pulse** | `/admin/today` | Signups, reports, paid, errors | If failed reports > 0 → fix Ops before marketing |
| 2–4 | **Revenue** | `/admin/revenue` | $ day · paid count · by plan | Pace: soft target ~$50–100/day Week 1 (inputs matter more than $2k fantasy) |
| 4–6 | **Acquisition** | `/admin/acquisition` | Top channels · top landings | Double content on sources that create **starts**, not just sessions |
| 6–8 | **UTM / campaigns** | `/admin/campaigns/utm` | Top `utm_source` × medium by paid | Kill sources with clicks + 0 starts after meaningful volume |
| 8–9 | **CRM** | `/admin/crm` | 5 people to touch today | Warm conversion is your real edge on $200 |
| 9–10 | **Ads only if live** | Google/Meta + Events Manager | Spend · starts · CPA | Pause if CPA gate failed (§6) |

**Also skim (30s):** founder digest email from `sendFounderDigest` — if numbers disagree with `/admin`, trust `/admin` and flag agent.

### 8.1 Weekly scoreboard (Sunday, 15 min)

| Metric | Target Week 1 | Stretch |
|---|---|---|
| Short-form posts shipped | ≥10 | ≥14 |
| Site clicks (tagged) | ≥150 | ≥300 |
| Free previews completed | ≥40 | ≥80 |
| Preview → paid % | **8–15%** | 18% (warm-heavy) |
| Paid orders | 5–12 | 20+ |
| Revenue | $50–150 | $300+ |
| `% unknown` attribution | <15% | <10% |

> **$2,000 in 7 days on $200 ads + zero audience is a lottery ticket, not a plan.** Hit input KPIs; take upside if a Reel or partner breaks out.

---

## 9. Agent vs founder RACI (ruthless)

| Work | Agent | Founder |
|---|---|---|
| Hooks, scripts, captions, compliance lint | **R** | A (post) |
| Reel render / PUBLISH.md UTMs | **R** | A (upload) |
| Blog / SEO pages / nurture / pixel / paywall | **R** | I |
| Account setup, posting, DMs, Reddit/Quora | C | **R** |
| Ad accounts, spend, boosts, kill decisions | C | **R** |
| CRM calls / WA personal | I | **R** |
| `/admin` 10-min loop | I | **R** |

R=does · A=accountable to ship · C=consulted · I=informed

---

## 10. Loop diagram (close every night)

```
[Agent: scripts + SEO + nurture + pixel]
        ↓
[Founder: post to topic URL + UTM]
        ↓
[/free-kundli → signup → preview]
        ↓
[Upsell + NEWUSER30 → Ziina]
        ↓
[Email D1/D3/D7 + WA abandon + CRM]
        ↓
[/admin 10 min → keep / kill / boost]
        ↓
[Only winners get $ from the $200]
```

**If you remember one line:**  
**Topic-matched URL + identity capture + honest 8–15% math + nurture/WA/pixel + spend only on proven starts.**

---

## References (repo)

- `launch-deliverables/MARKETING_PLAYBOOK.md` — assembly line  
- `launch-deliverables/MARKETING_CONTENT_PACK.md` — copy bank  
- `launch-deliverables/VedicHour_MASTER_PLAYBOOK.md` — long-form (use this loop when it conflicts on free→paid % or cold Meta)  
- `marketing-agent/src/brand.ts` — `utm()`, `NEWUSER30`, paths  
- `marketing-agent/config/playbook.json` — hook/retention principles  
- `src/lib/notify/lifecycle.ts` — digest, nurture, abandoned  
- `src/lib/notify/whatsapp.ts` — Twilio WA  
- `src/components/analytics/MetaPixel.tsx` — retarget prerequisite  
