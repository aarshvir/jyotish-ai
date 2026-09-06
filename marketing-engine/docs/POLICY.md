# Policy research — what the brief got wrong, and the rules we encode

Researched 2026-09-06. Official pages first; secondary sources labelled as such.

## What this invalidates in the original brief

### 1. Reddit as a daily scrape — do not build

[Reddit Data API Terms](https://redditinc.com/policies/data-api-terms) require a **separate agreement** for commercial use. [Developer Terms §4.1](https://redditinc.com/policies/developer-terms) forbid using Reddit data "by or on behalf of a business or as part of a service or product that is monetized" without written approval. Unauthenticated `.json` scraping is blocked and is a terms violation.

**Engine behaviour:** Loop 1 skips Reddit unless `REDDIT_COMMERCIAL_LICENSE=1` and OAuth credentials exist. We do not hit `reddit.com/r/…/hot.json`.

### 2. Google autocomplete / People Also Ask scrape — do not build

There is no public Google Autocomplete or PAA API for commercial content mining. Scraping google.com search or suggest endpoints violates Google's ToS and will get the project blocked.

**Engine behaviour:** relative demand from [Google Trends RSS](https://trends.google.com/trending/rss?geo=IN) (public feed), [Wikipedia OpenSearch](https://www.mediawiki.org/wiki/API:Opensearch), iTunes Search + review RSS (Apple's public feeds), and first-party category share. Keyword Planner is staged for when a Google Ads account exists — never fake a volume number.

### 3. Quora topic scrape — do not build

No official bulk API for topic harvesting. Skip.

### 4. Screen-recording onboarding + "scroll the marketing site" — do not ship as ads

Owner law 2026-07-26 and `CLAUDE.md`: product shots show **the report and its hour slots**, never pricing/checkout/onboard. The first failed ads scrolled `/pricing`. The sample-report page itself contains a `/pricing` footer CTA — the capture step **strips those nodes** before any pixel is written.

Internal Playwright can still walk the quiz for QA. Those recordings are not distribution assets.

### 5. Auto-posting Instagram from day one — not actually one click-free

Official path: [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing). Images, Reels, carousels are allowed via Graph API. Limits: 100 API-published posts / 24h. **Advanced Access needs Meta App Review + Business verification** if anyone other than app-role users is posting. Until that is done, shipping a "fully automatic IG poster" either stays in dev-mode (only you) or uses unofficial private APIs — the latter is how accounts get banned.

**Engine behaviour:** `ready-to-post/` with asset + caption + hashtags + best time + one-line why. A Graph API client exists but is **disabled** until tokens + `IG_PUBLISH_ENABLED=1`. No Selenium, no unofficial IG bots.

### 6. YouTube public uploads from a new API project

[videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert): projects created after 28 July 2020 are restricted to **private** until a YouTube API Services audit. Default `videos.insert` bucket is ~100 calls/day (separate from the 10k unit pool).

**Engine behaviour:** if OAuth is present, upload as **private**. Public is a manual step in Studio after the audit.

### 7. "ElevenLabs or bust"

ElevenLabs is metered. Standing law: do not spend before a $0 gate, and never a synthetic female narrator. Default is local Windows SAPI / Piper, male, unhurried. ElevenLabs only with `ELEVENLABS_ENABLED=1` + a male `ELEVENLABS_VOICE_ID`. Missing TTS → asset is marked `DO_NOT_PUBLISH`, not silently shipped.

---

## Ads — astrology is not banned, lying is

### Meta

- **Personal attributes** ([Advertising Standards — privacy / personal attributes](https://transparency.meta.com/en-gb/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)): ads must not assert or imply attributes of the viewer. Copy that says "struggling in your marriage?" or "we know you are…" is a ban-level pattern. First-person stories about the man on camera are a different grammatical person and are the product's actual market — the linter distinguishes them.
- **Unacceptable business practices** ([policy](https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/)): no deceptive/exaggerated success claims, no fake health benefits, no bait with a famous face.
- There is **no current named "occult ban"** in the Advertising Standards index we retrieved. Enforcement still kills astrology ads via misleading claims, personal attributes, and landing-page mismatch. Treat Meta review as hostile: product on the ad = product on the landing page (`/sample-report` or `/onboard?plan=free`, never a bait-and-switch).
- 2026 secondary reporting (not an official policy page): AI-generated audio/visuals may need an Ads Manager "AI-generated" disclosure. **Flag for you at export time.** Confirm in Ads Manager before the first live ad.
- Landing page is reviewed with the ad. If the ad talks about hour slots, the landing page must show hour slots.

**Likely to get an account banned if we shipped it:** "Get your ex back", "guaranteed job this week", "remove your curse", "we know your chart says you are unlucky", fake review screenshots, scraped IG posting, ads that open on `/pricing` while the creative shows a free chart.

### Google Ads

- **Unreliable claims** ([policy](https://support.google.com/adspolicy/answer/15936857)): no inaccurate claims or copy that entices an improbable result as the likely outcome, even if that result is possible. No health-miracle, no get-rich, no "this muhurat will land the offer".
- **Children:** [Ad-serving protections](https://support.google.com/adspolicy/answer/14170968) restrict astrology/occult/paranormal ads from serving to children globally.
- **Sensitive category** "Astrology & esoteric" exists in AdMob/AdSense taxonomies ([AdMob sensitive categories](https://support.google.com/admob/answer/3150953)). Expect limited inventory and extra review, not a hard advertiser ban.
- YouTube/Discover extra rules against exaggerated claims and fear-urgency ([policy](https://support.google.com/adspolicy/answer/10249050)).

### India (ASCI + law)

- [ASCI Code](https://www.ascionline.in/the-asci-code/): ads must be truthful and substantiable. No claim so exaggerated it causes "grave or widespread disappointment".
- ASCI CEO (Storyboard18, 2025 reporting): astrology apps must not use **"100% guarantee"**; past-performance claims need data; disclaimers must be visible.
- Consumer Protection Act 2019 §2(47) misleading ads: CCPA penalties (reported up to ₹10 lakh first offence).
- Cable Television Networks Rules, 1994 Rule 7(5) / MIB advisories: do not encourage superstition as programme-disguised advertising. We are a software timing grid, not a baba. Copy stays in that frame.

**Product framing we match:** "For reflection and planning, not certainty." Never health, legal, or financial outcomes.

---

## Distribution matrix

| Channel | Official automation | What we build | Ban risk if we cheated |
|---|---|---|---|
| Site blog + schema | Our repo / CMS | Write `engine-*.ts` + RSS. Promote with `AUTO_PUBLISH_BLOG=1` | None |
| Email sequences | Resend/API | Stage HTML; send only if `RESEND_API_KEY` + explicit flag | Spam if we bought lists — we do not |
| YouTube Data API | Allowed; public needs audit | Private upload stub; otherwise ready-to-post | Unofficial scrape-upload tools |
| Public RSS | Allowed | `out/feed.xml` | None |
| Instagram Graph API | Allowed after App Review / roles | Staged pack; optional publish flag | Unofficial mobile API / Selenium login |
| Threads API | [Official posts API](https://developers.facebook.com/documentation/threads/posts) (~250 posts/24h, Tech Provider verification) | Staged; same click as IG | Same as IG unofficial |
| Meta Ads | Ads Manager + Marketing API | CSV/JSON import. No auto-spend | Personal-attribute copy, fake social proof |
| Google Ads | Editor / API | RSA CSV. No auto-spend | Unreliable claims, child-directed |
| TikTok unofficial | Not used | Not built | High |

---

## Analytics

Server-side Meta CAPI and GA4 Measurement Protocol are allowed. **Payloads may not include birth date, birth time, place, name, email as user data we do not need, or `personal_context`.** Event names: `trial_start`, `subscribe`, `page_view`. Dedup with `event_id`. UTM on every public link.

---

## Spend ladder (Loop 5 — encoded, not a suggestion)

1. **Hold** while paying customers < 5. Ads multiply a conversion rate; they cannot invent one.
2. **Validate** after 5 genuine paying customers and at least one organic paid conversion: cap small (see `src/loops/paid.ts`). Stop if CAC > 0.5 × observed LTV, or 3 policy disapprovals, or CTR collapse with frequency > 3.
3. **Scale** only while CAC < 0.3 × observed LTV for 14 days, +20% weekly.
4. LTV is computed from **actual** `ziina_payments` / subscription rows. If the product is still one-off reports, LTV = mean paid amount. We do not assume a 12-month subscription life.
