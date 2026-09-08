# Platform policy — what each channel actually permits, and what the engine therefore does

Researched 2026-09-06 by the parallel `marketing-engine` build; adopted into this engine
2026-09-06 when the two were merged into one. Official pages are cited first; anything secondary
is labelled as such. Where the parallel build's *own* behaviour differed from this engine's, the
"Engine behaviour" line below describes **this** engine — the citations are unchanged, the
conclusions are re-stated against the code that actually ships.

This document is law in the same sense `CLAUDE.md` is. If a loop wants to do something this file
says we do not do, the loop is wrong.

---

## 1. Reddit — gated OFF, and this is the change that cost us a source

[Reddit Data API Terms](https://redditinc.com/policies/data-api-terms) require a **separate
written agreement** for commercial use. [Developer Terms §4.1](https://redditinc.com/policies/developer-terms)
forbid using Reddit data "by or on behalf of a business or as part of a service or product that is
monetized" without written approval.

VedicHour is a monetised product. The marketing engine exists to sell it. That is squarely the
case §4.1 describes, and no amount of "it's only public data" or "it's only four subreddits"
changes which side of that line we are on.

Note carefully what this is *not* about. The engine had already stopped using `/hot.json` when it
began answering 403, and moved to the per-subreddit public Atom feed, which returns 200 to an
honest User-Agent. That was a fix for an access problem. It was never a fix for the terms problem,
and the two got quietly conflated: a feed being *reachable* is not a licence to use it
commercially. (Reddit also answered HTTP 429 to the Atom feed on 2026-09-08, which is the practical
half of the same message.)

**Engine behaviour:** `src/loops/sense.ts` skips Reddit entirely unless
`REDDIT_COMMERCIAL_LICENSE=1` is set in `marketing-agent/.env`. Default is OFF. That flag is an
assertion by the owner that a written commercial agreement with Reddit exists — it is not a
"try it anyway" switch, and nobody should set it because a run looked empty. With the flag off,
the source reports itself as skipped-by-policy rather than failing, so a missing Reddit is never
mistaken for a broken loop.

What we lose: real questions in the audience's own words. What replaces it: **first-party demand**
(`src/sources/firstparty.ts`) — aggregate category counts from our own users' free text, which is
a strictly better signal because those people are our actual market, and which we are
unambiguously entitled to use.

## 2. Google autocomplete / People Also Ask — do not build

There is no public Google Autocomplete or PAA API for commercial content mining. Scraping
google.com search or the suggest endpoints violates Google's ToS.

**Engine behaviour:** relative demand comes from the public
[Google Trends RSS](https://trends.google.com/trending/rss?geo=IN) feed, the keyed
[YouTube Data API](https://developers.google.com/youtube/v3/docs/search/list) (hard-capped at 6
`search.list` calls per run — 100 quota units each against a 10,000/day free tier, so this loop may
never be the reason the stats loop runs dry), and first-party category share. Keyword Planner is
staged for the day a Google Ads account exists. We never fake a volume number.

## 3. Quora topic scrape — do not build

No official bulk API for topic harvesting. Skipped.

## 4. Instagram — never scraped, in either direction

Reading: Instagram's ToS forbids scraping and the realistic penalty is the brand account, which is
worth vastly more than any trend signal. There is no flag to turn that on and there should not be.

Writing: the official path is
[Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing).
Images, Reels and carousels are all publishable via the Graph API, limit 100 API-published posts
per 24h. **Advanced Access requires Meta App Review plus Business verification** if anyone other
than app-role users posts. Until that is done, a "fully automatic IG poster" either stays in dev
mode (only the owner) or uses unofficial private APIs — which is how accounts get banned.

**Engine behaviour:** `npm run loop:package` and `npm run loop:carousel` produce a ready-to-post
pack — the asset, the caption, the hashtags, the link. A person posts it. No Selenium, no
unofficial IG client. And per `CLAUDE.md` §5 nothing reaches a platform without explicit owner
approval anyway.

## 5. YouTube uploads

[videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert): projects created
after 28 July 2020 are restricted to **private** uploads until a YouTube API Services audit. The
default `videos.insert` bucket is roughly 100 calls/day, separate from the 10,000-unit pool.

**Engine behaviour:** if OAuth is ever present, upload private. Public is a manual step in Studio
after the audit.

## 6. Product capture — the report, never the checkout

Owner ruling 2026-07-26 and `CLAUDE.md` §1: product shots show **the report and its hour slots**.
The first failed ads scrolled `/pricing`. Preflight hard-blocks any capture URL matching
`/pricing|checkout|payment|onboard`, and the sample-report page's own pricing footer CTA is
stripped before a pixel is written.

Internal Playwright walkthroughs for QA are fine. They are not distribution assets.

## 7. Voice

Standing law (`CLAUDE.md` §2): the presenter's **Veo native in-shot voice is free and is the
quality bar**, so scripts are written for the presenter to say the lines on camera. Where
narration is genuinely unavoidable, the best available Indic voice (Sarvam Bulbul v3, male,
matched to the presenter, ~$0.01/reel). Never `edge-tts` / `en-IN-NeerjaNeural` in an ad — the
owner rejected it as audibly synthetic, and it is filed as a lesson.

This is the one place the parallel build's conclusion is explicitly **not** adopted. It defaulted
to local Windows SAPI ("Microsoft David") over a screen recording, on the reasoning that local is
free. Free is not the constraint; quality is never the variable we cut. A cheaper synthetic
narrator is the exact defect the owner already rejected once.

Missing TTS marks the asset `DO_NOT_PUBLISH`. It is never silently downgraded.

---

## Ads — astrology is not banned; lying is

### Meta

- **Personal attributes**
  ([Advertising Standards — privacy / personal attributes](https://transparency.meta.com/en-gb/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)):
  an ad must not assert or imply attributes of the viewer. "Struggling in your marriage?" is a
  ban-level pattern. A first-person story told by the man on camera is a different grammatical
  person, and is the product's actual market — the linter distinguishes the two.
- **Unacceptable business practices**
  ([policy](https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/)):
  no deceptive or exaggerated success claims, no fake health benefits, no famous-face bait.
- There is **no current named "occult ban"** in the Advertising Standards index retrieved on
  2026-09-06. Enforcement still kills astrology ads — via misleading claims, personal attributes,
  and landing-page mismatch. Treat review as hostile: the product in the ad must be the product on
  the landing page.
- 2026 secondary reporting (**not** an official policy page): AI-generated audio or visuals may
  require an Ads Manager "AI-generated" disclosure. The export flags this for the owner to confirm
  in Ads Manager before the first live ad.
- The landing page is reviewed alongside the ad. If the ad talks about hour slots, the landing page
  must show hour slots.

**Would plausibly get the account banned if we shipped it:** "get your ex back", "guaranteed job
this week", "remove your curse", "we know your chart says you are unlucky", fabricated review
screenshots, scraped IG posting, or an ad that opens on `/pricing` while the creative showed a free
chart.

### Google Ads

- **Unreliable claims** ([policy](https://support.google.com/adspolicy/answer/15936857)): no
  inaccurate claims, and no copy enticing an improbable result as the likely outcome — even when
  that outcome is possible. No health miracle, no get-rich, no "this muhurat will land the offer".
- **Children** ([ad-serving protections](https://support.google.com/adspolicy/answer/14170968)):
  astrology / occult / paranormal ads are restricted from serving to children globally.
- "Astrology & esoteric" is a **sensitive category** in the AdMob/AdSense taxonomies
  ([reference](https://support.google.com/admob/answer/3150953)). Expect limited inventory and
  extra review, not a hard advertiser ban.
- YouTube and Discover carry extra rules against exaggerated claims and fear-urgency
  ([policy](https://support.google.com/adspolicy/answer/10249050)).

### India (ASCI + statute)

- [ASCI Code](https://www.ascionline.in/the-asci-code/): advertising must be truthful and
  substantiable; no claim so exaggerated as to cause "grave or widespread disappointment".
- ASCI CEO, via Storyboard18 (2025 reporting, secondary): astrology apps must not claim
  "100% guarantee"; past-performance claims need data; disclaimers must be visible.
- Consumer Protection Act 2019 §2(47) on misleading advertisements; CCPA penalties reported up to
  ₹10 lakh for a first offence.
- Cable Television Networks Rules 1994, Rule 7(5) and MIB advisories: do not encourage superstition
  as programme-disguised advertising. We are a software timing grid, not a baba, and the copy stays
  inside that frame.

**The framing we match everywhere:** *For reflection and planning, not certainty.* Never health,
legal, or financial outcomes.

---

## Distribution matrix

| Channel | Official automation | What this engine builds | Risk if we cheated |
|---|---|---|---|
| Site blog + schema | Our own repo | `loop:blog` writes and stages; promote explicitly | None |
| Email | Resend API | Staged; sends only with a key and an explicit flag | Spam, if we bought lists — we do not |
| YouTube Data API | Allowed; public needs audit | Private upload only; otherwise ready-to-post | Unofficial upload tools |
| Instagram Graph API | Allowed after App Review | `loop:package` / `loop:carousel` staged pack | Unofficial mobile API, Selenium login |
| Threads API | [Official posts API](https://developers.facebook.com/documentation/threads/posts) (~250/24h, Tech Provider verification) | Staged, same as IG | Same as IG |
| Meta Ads | Ads Manager + Marketing API | CSV/JSON export only, **no auto-spend** | Personal-attribute copy, fake social proof |
| Google Ads | Editor / API | RSA CSV export only, **no auto-spend** | Unreliable claims, child-directed serving |
| Reddit | Requires a written commercial agreement | **Nothing, unless `REDDIT_COMMERCIAL_LICENSE=1`** | Terms violation under Developer Terms §4.1 |
| Google Trends RSS | Public feed | `loop:sense` reads it | None |
| TikTok unofficial | Not used | Not built | High |

---

## Analytics

Server-side Meta CAPI and the GA4 Measurement Protocol are permitted. Payloads may **never**
include birth date, birth time, birth place, name, `personal_context`, or any user data we do not
need. Event names: `page_view`, `trial_start`, `subscribe`. Deduplicate with `event_id`. Every
public link carries UTM.

---

## Spend ladder (encoded in `src/loops/paid.ts`, not a suggestion)

1. **HOLD** while genuine paying customers < 5. Ads multiply a conversion rate; they cannot invent
   one. *This is where we are today: zero completed payments.*
2. **VALIDATE** after 5 genuine paying customers: two or three creatives, one landing page, a daily
   cap the owner sets by hand. Stop if CAC exceeds 0.5 × observed LTV.
3. **SCALE** only while CAC stays under 0.3 × observed LTV, at most +20% per week.
4. LTV is computed from **actual** `ziina_payments` rows with `status='completed'`. The product
   sells one-off reports and has no subscriptions table, so LTV is the mean an actual paying
   customer has actually paid. A 12-month subscription life is never assumed.

The engine holds no ad-platform token. It writes files; a human spends money.
