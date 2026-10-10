# VedicHour pricing research and recommendation

Date: 2026-10-11. All web sources were checked on 2026-10-11. **[U]** marks a figure that is unverified, comes from a secondary source, or conflicts with another source. The code lives in `src/lib/priceBook.ts`, and the tests in `src/__tests__/priceBook.test.ts` and `src/__tests__/pricingConsistency.test.ts` check it. This document contains no user data.

## 1. Summary

- **The live price is far above the market.** ₹3,999 a month is roughly 4–6× what Indian buyers pay for comparable astrology products, about 27× Spotify or YouTube Premium in India, and about 11× the median Indian monthly app subscription. The price was set by multiplying a worst-case cost by 6, not by looking at what buyers pay.
- **The worst-case cost was about 3–4× too high.** The old basis was $6.50 a month, which assumed every model call ran on the most expensive model. We measured a real 30-day forecast: about $1.00 to generate, and at most $1.60 a month if the subscriber opens it every day. Ask-your-report was not measured, so this doc adds $0.40 for it, for a serving cost of **$2.00 a month**.
- **Ziina's fees are higher than our code assumed.** The code used 4.3% + AED 1. A rupee or dollar charge actually costs about **5.3% + AED 1**, because of a 1.2% FX markup we had not counted. The fixed AED 1 (about $0.27) is what hurts small tickets: it takes **23% of a ₹149 sale**.
- **Recommended prices:**

  | | India | Rest of world | UAE |
  |---|---|---|---|
  | Monthly | ₹999 | $14.99 | AED 54.99 |
  | Yearly | ₹9,999 | $119 | AED 429 |

  On the quiz funnel: ₹199 / $4.99 entry report, ₹99 / $1.99 order bump in the same charge, and ₹149 / $3.99 down-sell. All of these clear the new honest cost floor (§5).
- **A $5–7 first-run budget per new subscriber works only at ₹799 and above in India**, and only at ₹999 if you want to spend the full $7. At ₹499, every subscriber who pays once and leaves loses money. The figures are in §5.
- **Nothing has changed on the live site.** The new prices sit behind one line of code, `ACTIVE_PRICE_SET = 'current'`, which becomes `'recommended'` when you approve.

## 2. What we charge today

| Plan | INR | USD | AED |
|---|---|---|---|
| Monthly | ₹3,999 | $41.99 | AED 159 |
| Yearly | ₹47,999 | $499 | AED 1,849 |

- **Defect found:** in rupees, the yearly plan costs **₹11 more** than twelve monthly payments (₹47,999 against 12 × ₹3,999 = ₹47,988). Anyone who checks the maths sees a yearly plan with no saving. The recommended set fixes this, and a test now guards it.

## 3. Market benchmarks

### India: astrology

| Product | Price | Source |
|---|---|---|
| Astrotalk chat | ₹19–110/min, median about ₹40/min; first chat free; "no subscription" | astrotalk.com/chat-with-astrologer |
| Astrotalk typical new-user spend | about ₹200–500/month | owner's earlier research [U] |
| InstaAstro calls | ₹54–285/min, mostly ₹100–150; first call ₹1 | instaastro.com |
| AstroSage reports | Raj Yoga report ₹399; Brihat Kundli ₹996 | buy.astrosage.com |
| AstroSage plans | Cloud Gold ₹2,015/yr; ad-free comes inside the ₹19,994 Dhruv Platinum plan | buy.astrosage.com |
| AstroSage AI astrologer | listed as free on the App Store; no per-minute price published [U] | |
| Clickastro reports | ₹520 (marriage) to ₹1,499 (career, wealth); yearly horoscope ₹999 | clickastro.com |
| GaneshaSpeaks reports | from ₹999; yearly report ₹1,499 [U] | ganeshaspeaks.com, coupon sites |
| KundliGPT | coin packs, a 1-day unlimited pass, no subscription | kundligpt.com/en/pricing |
| AstroMedha | Pro ₹299/month [U] | astromedha.in/pricing |

- The Indian astrology market sells **per minute and per report**. Nobody large sells a ₹1,000+ monthly subscription.
- The closest benchmarks for a monthly forecast are ₹299–999 one-off reports and ₹200–500 a month of chat spend.

### India: consumer subscriptions

| Product | Price |
|---|---|
| Spotify Individual | ₹139/mo (cut from ₹199 in May 2026) |
| YouTube Premium | ₹149/mo |
| JioHotstar | ₹79–299/mo; ₹499–2,199/yr |
| Pocket FM VIP [U] | ₹99/mo; ₹799/yr |
| ChatGPT Go [U] | ₹399/mo |

- The **RevenueCat 2026 median** in India/SEA is **$3.75/month (about ₹363) and $18.32/year**.

### Global astrology apps

| App | Price | Source |
|---|---|---|
| Co-Star Pro-Star | $8.99/mo | App Store |
| The Pattern Go Deeper+ | $14.99/mo; $83.99/yr | App Store |
| CHANI | $11.99/mo; $107.99/yr | App Store |
| Nebula | $7.99/wk; $24.99/mo | republicworld.com review, Sep 2026 |
| Sanctuary+ | $14.99/mo; $49.99/yr [U] | apppricinglab.com |
| Kasamba (live readers) | $2.99–16.99/min | kasamba.com |

- The RevenueCat 2026 median is **$9.99/month and $39.99/year** in North America. Source: revenuecat.com/state-of-subscription-apps.

### What the benchmarks say

- **India:** ₹999/month is at the **top** of what the market will plausibly pay, and only for a clearly premium, personal product. ₹499–799 is where the volume is. ₹3,999 is outside the market.
- **Rest of world:** $14.99 matches the premium astrology apps (The Pattern and Sanctuary). $41.99 is about 3× them.

## 4. The cost of selling one subscription (honest basis)

### Our costs

| Cost | Value | Basis |
|---|---|---|
| Model and infrastructure, per daily-active subscriber-month | **$2.00** | $1.60 measured (2026-09-13, real stored 30-day forecast, every day opened) plus $0.40 for unmeasured Ask usage |
| Extra first-run spend per new subscriber | $1 India, $5 rest of world (config) | owner's $5–7 all-in target; §5 |

### Ziina's fees

Source: ziina.com/business/help/ae/en/business-fees, dated 29 Jun 2026.

- The base fee is **2.6% + AED 1** per charge, VAT included.
- Payments in a non-AED currency or on a foreign card pay **+1.5%**.
- When a non-AED charge converts to our AED payout, Ziina applies a **1.2% FX markup** (ziina.com/help-center/12807567).
- That gives two totals:

  | Charge | Total fee |
  |---|---|
  | INR or USD | **5.3% + AED 1** |
  | AED | 4.1% + AED 1, assuming a foreign card (a UAE card pays 2.6% + AED 1) |

- Refund and chargeback fees are **not published** [U]. We assume the processing fee is not returned on a refund. Ask Ziina support.
- Ziina has **no recurring billing, saved cards or mandates**: its API offers only payment intents, transfers, refunds and webhooks. Every renewal is a fresh one-tap payment, as today.

### Other costs

| Cost | Assumption | Source |
|---|---|---|
| Refunds | **5%** of revenue | RevenueCat 2026 puts the AI-app median at 4.2%, with an upper range of 15.6% (TechCrunch, 10 Mar 2026). We offer a 24-hour money-back guarantee. |
| Chargebacks | about 0.9–1.2% for subscription businesses [U] | Not modelled separately. Keep a single payment per buyer per period to stay well under card-network thresholds. |

### Taxes (not in the floor; needs an accountant)

- **India:** a foreign supplier selling online services to Indian consumers is generally liable for **18% GST** under the OIDAR rules.
- If that applies, ₹999 nets about $7.57 instead of $8.98: a 74% margin, which still clears the floor. ₹799 nets about $6.00: a 67% margin, which does **not** clear it.
- **UAE:** VAT of 5% applies only once we are VAT-registered (the threshold is AED 375k a year).

## 5. Unit economics at each price

These figures cover one payment. "Net" means after Ziina's fees and the 5% refund reserve. "Margin" means the share of net left after serving a daily user for the paid term.

The last four columns are the profit on a buyer who pays once and never renews, for each level of extra first-run spend. The $2.00 month of serving is already counted in every column, so "+$5 extra" means $7 all-in.

| Price | Gross $ | Fees $ | Refunds $ | Net $ | Serve $ | Margin | +$1 extra | +$3 | +$5 | +$7 |
|---|---|---|---|---|---|---|---|---|---|---|
| ₹3,999/mo (live) | 41.28 | 2.46 | 2.06 | 36.76 | 2.00 | 95% | +33.76 | +31.76 | +29.76 | +27.76 |
| $41.99/mo (live) | 41.99 | 2.50 | 2.10 | 37.39 | 2.00 | 95% | +34.39 | +32.39 | +30.39 | +28.39 |
| **₹999/mo** | 10.31 | 0.82 | 0.52 | 8.98 | 2.00 | **78%** | +5.98 | +3.98 | **+1.98** | −0.02 |
| ₹799/mo | 8.25 | 0.71 | 0.41 | 7.13 | 2.00 | 72% | +4.13 | +2.13 | +0.13 | −1.87 |
| ₹499/mo | 5.15 | 0.55 | 0.26 | 4.35 | 2.00 | **54%** | +1.35 | **−0.65** | −2.65 | −4.65 |
| **₹9,999/yr** | 103.22 | 5.74 | 5.16 | 92.32 | 24.00 | 74% | +89 | +87 | +85 | +83 |
| **$14.99/mo** | 14.99 | 1.07 | 0.75 | 13.17 | 2.00 | **85%** | +10.17 | +8.17 | +6.17 | +4.17 |
| **$119/yr** | 119.00 | 6.58 | 5.95 | 106.47 | 24.00 | 77% | +103 | +101 | +99 | +97 |
| **AED 54.99/mo** | 14.97 | 0.89 | 0.75 | 13.34 | 2.00 | 85% | +10.34 | +8.34 | +6.34 | +4.34 |

**The smallest first payment that breaks even on a one-time buyer:**

| All-in first-month generation | Needed first payment |
|---|---|
| $3 | $3.65 / ₹353 |
| $5 | $5.88 / ₹569 |
| $7 | $8.11 / ₹785 |
| $9 | $10.34 / ₹1,001 |

**Where the owner's $5–7 first-run budget breaks:**

| Price | $5–7 all-in first run |
|---|---|
| ₹499 | Never affordable. It loses money on every one-payment buyer once all-in first-month cost passes about $4.35. |
| ₹799 | Affordable up to about $7 all-in, at break-even. |
| ₹999 | Affordable up to $9 all-in. |
| $14.99 | Easily affordable: $7 all-in still leaves about $4 on a one-time buyer. |

- **Recommendation:** spend the full $5–7 on the first run only for buyers paying $14.99 / AED 54.99 or ₹999. Keep India's first run near measured cost (about $3 all-in) whenever an arm below ₹999 is live. The config holds this as `COST_MODEL.firstRunExtraUsd`, set to $1 for India and $5 for the rest of the world.

### Quiz-funnel one-time products

Generation cost for these products is **estimated**, not measured, because the Karmic Blueprint pipeline does not exist yet.

| Price | Gross $ | Ziina fee | Net $ | Est. cost | Left |
|---|---|---|---|---|---|
| ₹149 report | 1.54 | 0.35 (**23%**) | 1.11 | 0.50 | +0.61 |
| ₹199 report | 2.05 | 0.38 (19%) | 1.57 | 0.50 | +1.07 |
| ₹299 report | 3.09 | 0.44 (14%) | 2.50 | 0.50 | +2.00 |
| $4.99 report | 4.99 | 0.54 (11%) | 4.20 | 0.50 | +3.70 |
| ₹99 bump, **same charge** | 1.02 | 0.05 (5%) | 0.92 | 0.30 | +0.62 |
| ₹99 bump, separate charge | 1.02 | 0.33 (32%) | 0.64 | 0.30 | +0.34 |
| ₹149 down-sell | 1.54 | 0.35 (23%) | 1.11 | 0.40 | +0.71 |
| $3.99 down-sell | 3.99 | 0.48 (12%) | 3.31 | 0.40 | +2.91 |

- The order bump **must** go into the same Ziina charge as the report. Charged on its own, it pays a second AED 1 fee.
- At ₹149, Ziina takes almost a quarter of the sale.

### Will paid ads pay back?

This is an illustration, not a forecast. There are no public astrology-specific CPI or CPA benchmarks [U], so measure with a small test.

**India:**

- Meta CPM is $0.80–2.40 (stackmatix.com, Sep 2026 [U]).
- At a $1.60 CPM and a 1.2% click-through rate, a click costs about $0.13 (₹13).
- If 2% of clicks buy the ₹199 report, one buyer costs about **$6.70**.
- What that buyer brings at day 0:

  | Item | Value |
  |---|---|
  | Report | $1.57 |
  | Bump, if 30% take it | $0.28 |
  | ₹999 upsell first month, if 10% take it | $0.90 |
  | **Total** | **about $2.75** |

- That is roughly 0.4× the spend: a "pause the slug" result under spec G4.
- Paid ads in India only work if one of these holds:
  - click-to-purchase reaches about 5%;
  - the upsell take-rate is much higher;
  - subscribers renew for several months.
- The quiz is built to test exactly these, so treat the first ₹20,000 per slug as a measurement.

**Rest of world:**

- US CPMs are $10.50–16.80, so a click costs about $1.
- A $4.99 entry report cannot pay back paid traffic there.
- Use organic traffic and the $14.99 subscription directly. Do not run paid entry-report funnels outside India until the numbers are measured.

## 6. Localized prices and charm rounding

**Which currency a visitor sees:**

1. The visitor's own pick (the `vh_currency` cookie).
2. Otherwise their country (Vercel's `x-vercel-ip-country`): India → INR, UAE → AED, everyone else → USD.

**How prices are set:**

- INR prices are set by hand for India. They are not converted from dollars, because Indian willingness to pay is a different market.
- USD is set by hand.
- AED (and GBP/EUR, when they go live) is derived from USD at the current rate and then **rounded down** to the local charm price (`charmDown`):

| Currency | Charm endings |
|---|---|
| INR | under ₹100 → …9; ₹100–999 → …49 / …99; ₹1,000–9,999 → …499 / …999; ₹10,000+ → …999 |
| USD, GBP, EUR | under 100 → .99; 100+ → whole numbers ending in 9 |
| AED | under 100 → .99; 100–999 → ending in 9; 1,000+ → …49 / …99 |

- A computed ₹3,800 becomes ₹3,499, and AED 55.05 becomes AED 54.99. Rounding never goes up.

**Exchange rates** (open.er-api.com, 2026-10-10):

| Pair | Rate |
|---|---|
| USD/INR | 96.87 |
| USD/AED | 3.6725 (pegged) |
| USD/GBP | 0.756 |
| USD/EUR | 0.892 |

**More currencies:**

- Ziina's Payment Intent API accepts AED, BHD, EUR, GBP, INR, KWD, OMR, QAR, SAR and USD (docs.ziina.com/supported-currencies).
- It does **not** accept CAD, AUD or SGD, so those are excluded. We must never show a currency we cannot charge.
- The price book already prices **GBP and EUR**: £10.99 and €12.99 a month on the recommended set.
- Turning them on means adding them to checkout, the currency cookie, the switcher and the payment records. That is Payments plumbing, kept separate so this change cannot disturb live checkout.

## 7. Funnel experiments (quiz spec §9 E3/E4)

These are config in `EXPERIMENTS`, all **off** by default. Arms are sticky per visitor through a hash of the session id, so a refresh never changes a price (spec H6).

| Flag | Arms | Control | Notes |
|---|---|---|---|
| `price_report` (E3) | ₹149 / ₹199 / ₹299; ROW $4.99 | ₹199 | |
| `price_bump` | ₹99 / $1.99 | | must ride in the report's charge |
| `price_downsell` | ₹149 / $3.99 | | the ROW price is our choice; the spec names only ₹149 |
| `price_monthly_in` (E4) | ₹499 / ₹799 / ₹999 | ₹999 | ₹499 is flagged `belowFloor` with its reason |
| `price_monthly_row` (E4) | $41.99 vs $14.99 | $41.99 | the spec's control |

**Test rules:**

- Change one flag at a time.
- Wait for at least 300 reveal views per arm before reading a result.
- Judge on revenue per click, not conversion rate.

## 8. Recommendation

| | India | Rest of world (USD) | UAE (AED) |
|---|---|---|---|
| Monthly subscription | **₹999** | **$14.99** | **AED 54.99** |
| Yearly subscription | **₹9,999** (ten months' price) | **$119** (about 34% off) | **AED 429** |
| Funnel entry report | ₹199 (test ₹149 / ₹299) | $4.99 | AED 17.99 |
| Order bump (same charge) | ₹99 | $1.99 | AED 6.99 |
| Down-sell, 7-day forecast | ₹149 | $3.99 | AED 13.99 |
| Extra first-run budget | about $1 (≤ $3 all-in) while any arm below ₹999 is live | up to $5 ($7 all-in) | up to $5 |

**Why this ladder:**

1. **₹999 is the highest Indian price the benchmarks support**, and it is the lowest Indian price that pays for the full $7 first run. Every lower price the test tries can be compared against it.
2. **$14.99 matches the premium Western astrology apps** and still leaves an 85% margin.
3. **The yearly plans are real discounts:** two months free in India, about a third off elsewhere. That fixes today's yearly plan, which costs ₹11 more than twelve months.
4. **The ₹199 entry report pays for itself with cheap generation**, and the bump in the same charge adds almost pure margin.
5. **Every recommended price clears the new floor:** at least a 70% margin at daily use, and no loss on a one-payment buyer. A test enforces this, so a fee change or an exchange-rate move that breaks it fails the build.

**Why the floor changed:**

- The old rule was "6× a $6.50 worst case". It priced a cost we do not pay and put us outside the market.
- The new rule:
  - uses the measured cost plus an allowance for Ask;
  - uses the real Ziina fees, FX markup included;
  - keeps a refund reserve;
  - asks for the margin that software businesses normally run on.
- It is still conservative, because it assumes every subscriber opens the product every day.

**To go live:** in `src/lib/priceBook.ts`, change `ACTIVE_PRICE_SET` from `'current'` to `'recommended'`, and update the expected display strings in `pricingConsistency.test.ts`. /pricing, /api/geo, the paywall and checkout all read the same table, so they move together.
