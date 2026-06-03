# VedicHour — 48-Hour Launch Playbook (→ $5,000)

> Honest framing first, then the aggressive plan to maximize your odds.

---

## 0. The honest math (read this before anything)

$5,000 in 48 hours from a cold start is a **stretch goal**, not a default outcome. It is a *traffic-and-audience* problem, not a product problem — the product is now launch-ready. Here is the arithmetic so you can steer with your eyes open.

**Blended average order value (AOV):** with Monthly ("Recommended") as the hero and `NEWUSER30` (30% off) running:
- 7-Day ₹799 → ~₹559 after promo (~$6.70)
- Monthly ₹1,499 → ~₹1,049 after promo (~$12.60)
- Annual ₹3,999 → ~₹2,799 after promo (~$33.60)
- Realistic blended net AOV ≈ **$12–16** (₹1,000–1,350).

**Orders needed for $5,000:** at $14 AOV → **~360 paid orders** in 48h (~180/day).

**Traffic needed** (free-Kundli → paid conversion):
| Visitor→paid rate | Visitors needed |
|---|---|
| 1% (cold ads) | ~36,000 |
| 3% (warm/targeted) | ~12,000 |
| 6% (hot audience + email) | ~6,000 |

**Translation:** to hit $5k you need either (a) a sizable warm audience you can mobilize, or (b) meaningful paid spend with a creative that converts, or (c) one viral post. Plan for **three scenarios**:

| Scenario | 48h revenue | What it takes |
|---|---|---|
| **Conservative** | $500–1,200 | Your own network + 2–3 community posts + organic Reels. No ad spend. |
| **Likely (with effort)** | $1,500–3,000 | Above + $300–600 Meta/Google spend dialed to Indian astrology interest + 2 micro-influencer shoutouts. |
| **Stretch ($5k)** | $5,000+ | Above + a post that pops (Reddit/IG/X) OR an email list of 3k+ OR $1k+ ad spend at ≥3× ROAS. |

Bank on **Likely**, build for **Stretch**, and treat $5k as the ceiling you're sprinting at — not a floor you're owed.

---

## 1. The single biggest risk: free-Kundli LLM cost (set caps NOW)

Every **free** Kundli still runs the full AI pipeline on your servers — it costs real money (~$0.50–2.00 in LLM spend each) even though the visitor pays nothing. If a viral post sends 3,000 people to generate free Kundlis, that's **$1,500–6,000 of cost before a single sale** and could erase your profit.

**Do these before you drive traffic (non-negotiable):**
1. **Set hard monthly spend caps at every LLM provider**: Anthropic Console → Billing → spend limit; OpenAI → Limits → monthly budget; Google AI Studio → quota. Set each to a number you can survive (e.g. $300–500 total). This is your circuit breaker.
2. **Confirm rate limiting is live** (Upstash env vars set in prod) so one user can't spam generations.
3. **Watch the meters** hourly on launch day. If free volume spikes, that's good (interest) and dangerous (cost) — be ready to flip free to "join waitlist" if spend runs hot.
4. *(Post-launch follow-up, not for the 48h window):* make the free tier generate **nativity-only** instead of the full 7-day pipeline. Today free *displays* only the chart + one sample day, but still *generates* the full report. Cutting generation depth for free is the real fix — flagged for after launch.

---

## 2. The funnel you're driving (and why it converts)

```
Free Kundli (lead magnet) → account (email captured) → chart + 1 sample day shown
        → "Unlock hour-by-hour" upsell → NEWUSER30 → Ziina checkout (geo currency)
        → 3–8 min generation → full report + PDF → 24h money-back guarantee
```

Why it now converts: prices match what's charged in every currency; claims are truthful (no fake stats to erode trust); the free Kundli gives *real* value (their actual chart + a live sample day) which earns the upsell; and the 30% launch code + 24h guarantee remove the two biggest objections (price, risk).

**Hero offer to lead with everywhere:** *"Free Vedic Kundli in minutes — then unlock your hour-by-hour forecast. 30% off launch week with code NEWUSER30. 24-hour money-back guarantee."*

---

## 3. Channels, ranked by ROI for THIS product

### Tier 1 — Warm & free (do first, highest conversion)
- **Your own network**: WhatsApp broadcast, personal IG/FB/LinkedIn, family/friends. A personal "I built this, here's your free Kundli" link converts 5–10×. Send the free link, not the pricing page.
- **WhatsApp/Telegram astrology groups** you're already in. Share your *own* generated report as proof, then the free link.
- **Existing followers / email** (if any): a 2-email sequence (launch + "last hours of 30% off").

### Tier 2 — Astrology communities (free, high-intent)
- **Reddit**: r/vedicastrology, r/astrology, r/hinduism (read each sub's self-promo rules — lead with value, not a naked link). Post your *methodology* (Swiss Ephemeris + Lahiri + 18 hourly windows) and offer free Kundlis. A "I built an AI that scores every hour of your day by Jyotish — free, try it" post can pop.
- **Facebook groups**: Vedic astrology / Jyotish / Kundli groups (huge Indian membership). Same value-first approach.
- **Quora**: answer "best Kundli software / free Janam Kundali online" questions with a genuine answer + link.
- **Discord** astrology servers.

### Tier 3 — Organic short-form (free, scalable, slow-burn but can spike)
- **Instagram Reels / YouTube Shorts / TikTok**: 15–30s "Your most auspicious hour today by Vedic astrology" content. Hook → show the hourly grid → "get yours free." Post 3–5×/day during launch.
- **X/Twitter**: a build-in-public thread ("I built a Vedic AI that decodes your day hour-by-hour") + free links in replies.

### Tier 4 — Paid (fastest to scale, needs a budget & a watchful eye)
- **Meta (IG/FB) Advantage+ or interest-targeted**: interests = Vedic astrology, Jyotish, Kundli, Astrology, + India/UAE/US-NRI geos. Start **$50–100/day**, 3–4 creatives, kill losers after ~$15 spend each, scale winners. Optimize for **purchase** if you have pixel data, else **lead** (free signup) first day then retarget.
- **Google Search**: exact/phrase keywords "free kundli online", "janam kundali", "ai astrology report", "muhurta calculator". High intent. Start $30–50/day.
- **Retargeting**: anyone who generated a free Kundli but didn't buy → "Your forecast is waiting — 30% off ends tonight."

### Tier 5 — Launch surfaces (one-time spikes)
- **Product Hunt** (tech-curious, mostly US — good for the AI angle).
- **BetaList / Indie Hackers / r/SideProject** (the "I built this" crowd).

---

## 4. The 48-hour timeline

**T-12h (pre-launch, the night before)**
- Set LLM spend caps (Section 1). Verify Ziina live keys, webhook secret, Upstash, env vars (`npm run verify:report-env`).
- Generate **your own** report on all 3 paid tiers — screenshot them for social proof ("here's mine").
- Pre-write all posts/DMs/ads (templates in Section 5). Queue Reels.
- Soft-test checkout in each currency (USD/INR/AED) with a real card or Ziina test.

**Day 1 — 0:00–6:00 (morning IST, your core India audience)**
- Fire Tier 1 (network, WhatsApp) — personal messages first.
- Post to 3–4 Reddit/FB communities (value-first).
- Launch 2–3 organic Reels.
- Turn on paid ads at **low budget** ($50–100/day) to start learning.

**Day 1 — 6:00–18:00**
- Reply to every comment/DM fast (speed = trust on launch day).
- Watch the funnel: free signups, free→paid rate, spend. Double down on whatever channel is converting.
- Post 2–3 more Reels; A/B two ad creatives.

**Day 1 — 18:00–24:00 (evening, second India peak + US morning)**
- Scale the winning ad creative 2×. Launch Product Hunt / Indie Hackers if doing it.
- First "urgency" nudge to free-but-didn't-buy users (retargeting + email): *"30% off ends tomorrow night."*

**Day 2 — repeat the winners, cut the losers.**
- Kill any ad/channel below break-even ROAS; pour budget into winners.
- Mid-day: "Last 12 hours of launch pricing" everywhere.
- Final-hours push: countdown in stories, DMs to warm leads, last email.

---

## 5. Copy & creative templates (steal these)

**WhatsApp / DM (warm):**
> Hey [name] — I just launched VedicHour, an AI that builds your Vedic Kundli and scores every hour of your day (best/avoid windows, Rahu Kaal, dasha). Made you a free one: [link]. If you like it there's 30% off this week with NEWUSER30 🙏

**Reddit / FB (value-first):**
> I built an AI Jyotish tool that computes your chart with Swiss Ephemeris + Lahiri ayanamsa and rates all 18 daily hora windows 0–100 with commentary. Free Kundli, no card: [link]. Feedback welcome — happy to explain the scoring.

**Instagram Reel script (15s):**
> Hook: "There's a wrong hour to send that important message today." → show the hourly grid lighting up green/red → "Vedic astrology has scored every hour for 5,000 years. I put it in an AI." → "Free Kundli, link in bio."

**Meta ad primary text:**
> Your free Vedic Kundli — in minutes. Then see your day decoded hour by hour: the windows to act, and the ones to wait. Swiss Ephemeris precision, classical Jyotish. 30% off launch week. 24-hour money-back guarantee. → Get your free Kundli

**Email subject lines:**
> "Your Vedic Kundli is ready (free)" · "30% off ends tonight ⏳" · "The one hour today you shouldn't waste"

**Headlines that match the product's truth (no fake proof):**
> "Your Life, Decoded Hour by Hour." · "18 Vedic windows a day, scored and explained." · "Swiss Ephemeris precision. Classical Jyotish. AI clarity."

---

## 6. Pricing & currency strategy

- **Currency auto-detects** by country (INR/AED/USD) and the user can switch — display now equals what Ziina charges, in every path. India sees ₹, Gulf sees AED, rest sees $. This kills the #1 trust-killer (price mismatch).
- **Anchor with Annual.** The ₹3,999 Annual makes ₹1,499 Monthly feel reasonable. Keep "Recommended" on Monthly (highest margin you'll actually convert).
- **`NEWUSER30`** is your blanket launch lever (30% off, unlimited). The banner auto-applies it. Push it with deadline urgency ("launch week only").
- **Don't discount deeper than 30%** publicly — protects AOV. Use `FRIENDTESTING` (80%) only for private testers, never in public copy. `ADMIN100` is yours only.
- **Upsell path exists**: 7-Day buyers can upgrade to Monthly for the discounted delta — surface it post-purchase.

---

## 7. Measure these (and act on them hourly)

| Metric | Healthy | If it's off |
|---|---|---|
| Free signups | climbing | weak top-of-funnel → more/better creative |
| Free → paid % | 3%+ | low → fix offer/urgency, retarget, check report quality |
| Checkout start → paid % | 70%+ | low → payment friction; check Ziina, currency, errors |
| LLM spend vs revenue | spend < 25% of rev | spend hot → cap free, pause ads |
| Refund rate | < 5% | high → a claim/quality mismatch slipped through |
| Report success rate | > 95% | failures → check Inngest/Railway/Anthropic health (`/api/health`) |

Keep `/api/health` and your provider dashboards open all day.

---

## 8. Support & trust during launch

- **Staff your inbox.** support@vedichour.com should answer paid users within ~2h, free within ~8h (you have a runbook for this in `docs/runbook/launch-day-support.md`).
- **Honor the 24h guarantee instantly and cheerfully** — a fast refund earns a future customer and prevents chargebacks (which threaten your Ziina account).
- **Keep 5 canned replies ready** (in the support runbook): "where's my report", "refund please", "wrong birth time", "how accurate", "can I gift it".
- **A delighted refund > a fought chargeback.** Always.

---

## 9. Pre-launch go/no-go checklist

- [ ] LLM provider spend caps set (Anthropic / OpenAI / Google).
- [ ] Ziina **live** keys + webhook secret in prod env; test a real ₹/$/AED charge.
- [ ] `NEWUSER30` promo active in DB (migration `20260418_seed_promo_codes.sql` applied).
- [ ] Upstash rate-limit env vars set in prod.
- [ ] `/api/health` returns healthy in prod.
- [ ] You generated your own report on all 3 paid tiers (screenshots for proof).
- [ ] Checkout works in USD, INR, AED (display == charge).
- [ ] Support inbox monitored; canned replies ready.
- [ ] All launch posts/DMs/ads written and queued.
- [ ] Refund SOP open (`docs/runbook/refund-sop.md`).

---

### The one-sentence version
Drive your warmest audience to the **free Kundli** first, let the real chart + sample day earn the upsell, close with **NEWUSER30 + 24h guarantee + deadline urgency**, pour budget into whatever channel converts in the first 6 hours — and watch your LLM spend like a hawk so a viral free-Kundli wave doesn't cost more than it earns.
