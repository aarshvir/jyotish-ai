# Messaging and Pricing: Growth Evidence and Proposed Copy

Review date: **15 October 2026, Asia/Dubai**. Author: assigned growth/competitor reviewer. Status: researched and proposed, not implemented or released. Baseline read: `dfb774a972430790fa565dfe5d4529c2e5d3796f`. Other workers may subsequently change the source.

## Scope and Decision

Lead with a useful **free Vedic birth chart**, not a paid forecast disguised as the first free action. Explain the calculated placements, then the traditional interpretation and its limits. Offer a sample and task-specific learning paths without requiring marketing consent.

Authority: this assignment, `BRIEF.md`, `REQUEST-TRACKER.md` and `IMPLEMENTATION-PLAN.md`. The original full 22-section attachment is not separately present in this worker's supplied context or dated directory; primary must reconcile any additional requirements. Existing `docs/PRICING_RESEARCH.md` and `docs/SEO_AUDIT.md` are historical inputs, not approval or current proof.

Commercial eligibility remains unresolved. Free utility now; paid activation, price changes, real purchases and outbound campaigns are outside this work. A working payment integration, an advertised price, a competitor price or an old approval comment does not establish legal eligibility or willingness to pay. Preserve existing owners' records and entitlements; do not describe them as cancelled.

Evidence vocabulary: **observed** = retrieved public text or inspected source; **advertised** = vendor claim visible in that text; **tested** = an action actually executed with recorded inputs/results; **proposed** = original recommendation; **pending** = dependency not verified. Public retrieval is not a tested customer journey. No human interviews, customer counts, sales, conversions or validated predictive accuracy are claimed.

## Three Audience Hypotheses

| Group | Immediate question | Proposed first value | Evidence limit |
| --- | --- | --- | --- |
| First-chart explorer | What are my Moon sign, rising sign and birth star? | A short form, labelled calculated facts and one useful explanation | Source exposes these tools; demand and comprehension remain unmeasured |
| Everyday timing explorer | What do hora and choghadiya mean for my plans? | A clearly labelled example and a city/date-aware explanation | Personal paid forecasts are not the free offer; efficacy is not established |
| Compatibility or chart-factor explorer | What does this matching score or dosha label actually mean? | Transparent factors, input uncertainty and non-alarming context | A traditional score is not a relationship verdict or probability |

These are task groupings, not recruited personas. No segment sizes are known. A search visitor should land directly on the appropriate calculator/article, not be forced through the homepage or a long quiz.

## Current Official Competitor Evidence

All six reviewed through the web tool on **2026-10-15**. Dates shown inside pages are distinct from retrieval dates. Observations are text-only; no account, calculation submission, consultation, purchase, refund, download or retention journey was executed. Thus all six have **transaction/result testing: not tested**. No competitor artwork, screenshots, testimonials or copy is reused.

| ID / Relevant alternative | Official source and observed offer | Advertised cost / uncertainty | Practical inference for VedicHour |
| --- | --- | --- | --- |
| C1 AstroSage: direct chart/report alternative | [Homepage](https://www.astrosage.com/) exposes birth chart, matching and advanced timezone/ayanamsa fields; [Brihat Kundli](https://buy.astrosage.com/service/astrosage-brihat-horoscope?language=en&prtnr_id=ICHOM) advertises a PDF report and email delivery within 24 hours | INR 599 displayed, not the historical INR 996. Dollar labels disagree within that page: USD 9 near the top and USD 9.22 lower down. Discount, final charge and delivery untested | Offer clarity and an inspectable example matter. Do not compete on report page count or repeat its outcome claims |
| C2 AstroTalk: consultation substitute | [Homepage](https://astrotalk.com/) exposes chat/call, free Kundli, matching and first-consultation promotion. [Pricing policy](https://astrotalk.com/pricing) describes customised prices | Policy advertises INR 500-1,500 per user/session; not a measured typical spend, per-minute median or recurring subscription price. Promotions and exact session terms untested | Explain that VedicHour's free tool is self-service, not access to a live astrologer. Do not infer monthly willingness to pay from a consultation |
| C3 InstaAstro: consultation/content substitute | [Homepage](https://instaastro.com/) exposes free chart/matching/panchang and mobile OTP/wallet steps for consultation | Advertises first consultation at INR 1. Retrieved profile examples included INR 66/min and INR 300/min, not an exhaustive range or average. Eligibility, duration and checkout untested | Keep the calculator distinct from any contact capture or paid service; clearly disclose any future cost before a paid action |
| C4 Drik Panchang: everyday calendar/timing substitute | [Homepage](https://www.drikpanchang.com/) and [Choghadiya](https://www.drikpanchang.com/muhurat/choghadiya.html) expose location, date, sunrise/sunset and timing tables | Tables readable without a purchase in retrieval; remove-ads control visible, subscription amount not verified. Retrieved default was Washington, D.C., **14 Oct 2026**, not Dubai's 15 Oct | Every timing example needs its place, date, timezone and assumptions. City-wide timings are not personal birth-chart forecasts |
| C5 CHANI: adjacent reflection/subscription alternative | [App page](https://www.chani.com/app) describes chart readings, transits, meditations and journal prompts; it attributes writing/recording to its astrologers | [Official US App Store listing linked by CHANI](https://apps.apple.com/us/app/chani-your-astrology-guide/id1532791252) advertises free download, USD 11.99 monthly and USD 107.99 yearly purchases. Storefront-specific; tax, trial and final billing untested | Make authorship and reflection value explicit. Its subscription is not an interchangeable benchmark for Vedic chart utility or an India price ceiling |
| C6 Prokerala: direct utility/report alternative | [Astrology hub](https://www.prokerala.com/astrology/) and [Free Kundli form](https://www.prokerala.com/astrology/kundli/) expose date/time/place, name, gender and language; [report catalogue](https://www.prokerala.com/astrology/reports/) separates reports from tools | Free chart advertised; no reliable report amount extracted, so no price copied. Hub displayed an update date of 13 Oct 2026. Form requirements and delivered chart untested | Explain input purpose and remove unnecessary fields where calculation allows. A broad catalogue is not evidence that more products improve comprehension |

**Astro-Seek limitation:** direct [homepage](https://www.astro-seek.com/) and [chart page](https://horoscopes.astro-seek.com/birth-chart-horoscope-online) returned web-tool internal errors. Official-domain search extracts were about 1.3 years old and labelled 2025. They are not accepted as current 2026 evidence. `astrology-seek.com` is a different domain and was excluded. Prokerala is the sixth current comparison, not a claim that Astro-Seek lacks any feature.

The differentiation hypothesis is **plain-language results, visible assumptions, useful next steps and honest availability**. It is not a proven unique feature, superiority result or market position. Current competitors already advertise personal charts. Do not write that most competitors only provide generic Sun-sign text.

## Prioritized Messaging Problems

| Priority / ID | Verified problem on baseline | Evidence | Required handoff check |
| --- | --- | --- | --- |
| P0 M1 | First CTA promises free hourly windows, but destination is the chart calculator | [Live home](https://www.vedichour.com/) and `Hero.tsx`; `UNLOCK_FREE_HREF` in `src/lib/pricing.ts` equals `/free-kundli` | CTA must name the output available at that destination; end-to-end free result must be verified by primary |
| P0 M2 | Paid availability appears in copy, price tags and globally inherited structured data despite unresolved commercial readiness | [Pricing](https://www.vedichour.com/pricing), `pricing/layout.tsx`, `layout.tsx`, `seo/aiVisibility.ts`; eight retrieved pages carried paid offers marked `InStock` | Gate visible copy, metadata, schema, AI summaries and links together; preserve existing access separately |
| P1 M3 | Input uncertainty is understated while source offers a noon fallback | `BirthDetailsInput.tsx`; `free-kundli/page.tsx` says approximate time can still be useful without a boundary-specific warning | Persist known/approximate/unknown status; no confident Lagna/houses/dasha from a noon placeholder |
| P1 M4 | Absolute security, correctness and superiority statements exceed reviewed evidence | `faq-data.ts`, `Products.tsx`, `Hero.tsx`: broad confidentiality promises, no-guesswork implication, no-contradiction claim, generalisations about competitors | Replace with specific method and uncertainty; privacy owner must approve data-processing language |
| P1 M5 | Two AI summaries contain broken multiline URLs and still promote subscriptions | Read-only HTTP 200 for [llms.txt](https://www.vedichour.com/llms.txt) and [llms-full.txt](https://www.vedichour.com/llms-full.txt); pattern `https://www.vedichour.com\r\n/free-kundli` | Trim/sanitise base URL and regenerate/redeploy summaries; assert links contain no whitespace; no assistant-citation guarantee |
| P1 M6 | Advice can displace important real-world decisions | Live homepage refers to timing interviews/property/weddings; `hora-planetary-hours-guide.ts` includes surgery among muhurat examples | State boundaries near relevant result; remove medical scheduling suggestions, fear and relationship verdicts |

These are diagnosed facts about the baseline, not claims that another worker's fixes are already implemented. Details of current public metadata and sitemap checks are in `SEO-SEM-PLAN.md`.

## Exact Proposed Copy

All text below is original **proposed copy**. Tokens in braces are runtime values, not fabricated result data. Match each conditional line to tested behaviour; never ship a persistence, export or availability promise solely because it appears here.

### Homepage and Product Explanation

| Surface | Exact copy | Why / condition |
| --- | --- | --- |
| H1 | VedicHour: Your Free Vedic Birth Chart | Names brand, product and current offer immediately |
| Subheading | Start with your Moon sign, rising sign and birth star, explained in plain English. Enter your birth details, or see an example first. | Concrete output and low-pressure alternative; rising sign only with sufficient time |
| Primary CTA | Get my free chart | Destination `/free-kundli`; no forecast or elapsed-time promise |
| Secondary CTA | See an example chart | Use only a verified, labelled chart example; do not call a paid day-forecast sample a chart example |
| Current fallback secondary CTA | See a sample report | Destination `/sample-report` while that is the actual available sample; page must say it is an example, not included free personal generation |
| Offer note | Free chart facts. No sign-up or card needed. | Gate on tested, ungated calculator result; no implied free personal narrative |
| Product explanation | A Kundli is a Vedic birth chart. We calculate the placements from the date, time and place you enter, then explain the chart's terms in plain English. Astrology is an interpretive tradition, not a guarantee about what will happen. | Separates method, language and predictive limits |
| Calculations and AI | Calculated chart facts and AI-generated commentary are labelled separately. AI commentary may be mistaken; check it against the chart facts. | Show where generated commentary actually occurs; do not imply a model cannot invent information |
| Chart task | Understand my birth chart | Leads directly to free utility, not quiz |
| Timing task | Learn about daily timing | Leads to `/hora` or reviewed explanation; does not promise an unbuilt free personal timing tool |
| Matching task | Explore compatibility | Leads to `/synastry`; only label score free after primary verifies ungated delivery |
| Matching explanation | See the traditional matching factors for two charts. A score is one perspective, not a verdict on your relationship. | Avoids deterministic partner selection |

Alternative H1 for a quieter title: **VedicHour: Free Kundli in Plain English**. Alternative CTA: **Create my birth chart**. Both are hypotheses to evaluate for comprehension after release, not scored winners or proven conversion improvements. No synthetic headline score is a customer score.

### Form and Field Help

| Surface | Exact copy | Why / condition |
| --- | --- | --- |
| Form title | Your birth details | A short, concrete first step |
| Form introduction | Use the date, local time and place where you were born. If the time is uncertain, tell us rather than guessing. | Distinguishes local clock time from present location |
| Optional name label/help | Name or label (optional) / Use a nickname to recognise this chart. It does not change the calculation. | Ship optional only if it is genuinely optional; no real-name request |
| Birth date | Date of birth / Use the date shown on your birth record. | Clear source suggestion; preserve familiar locale-aware date control |
| Birth time | Time of birth / Enter the local clock time recorded where you were born. Check AM or PM. | Reduces UTC conversion and 12-hour ambiguity |
| Time certainty control | Recorded time / Approximate time / I don't know the time | Must be real state carried into calculation/result, not a cosmetic toggle |
| Approximate time help | Use your best estimate and mark it approximate. We will label results that may change with the time. | Requires actual uncertainty handling; otherwise use safe fallback below |
| Unknown time help | Without a birth time, we cannot reliably show your rising sign, houses or dasha dates. Your Moon sign or birth star may also change during the day. | No assumed-noon certainty; no unsourced probability |
| Safe fallback when partial result is not implemented | This tool needs a birth time. You can read what is still possible without one. | Link `/blog/kundli-without-birth-time`; do not promise unsupported partial computation |
| Birth place | Place of birth / Enter the town or city where you were born, then choose the correct place from the results. | Requires confirmed selection instead of silently accepting first geocoder match |
| Place confirmation | Selected place: {city}, {region}, {country} | Makes same-name cities distinguishable; use provider result, not inferred home city |
| Current location, timing only | City for this timing / Choose the city where you will use these times. It can be different from your birthplace. | Not needed in first free natal-chart form |
| Method/timezone note | Times are interpreted for the selected birthplace. Calculation details are shown with your result. | Show actual timezone/offset and method in result; ambiguity goes to recovery |
| Calculate button | Show my chart | Describes expected output |
| Loading | Calculating your chart... | No invented countdown or delivery SLA |
| Two-chart consent note | Use another person's birth details only with their permission. | No collection of their email/phone required |
| Optional marketing checkbox | Email me VedicHour updates. I can unsubscribe at any time. | Separate unchecked consent; calculation never requires it |

### Results, Account and Return

| Surface | Exact copy | Why / condition |
| --- | --- | --- |
| Results heading | Your Vedic chart | Identifies the object received |
| Input summary | Calculated for {date}, {time}, {birthplace}. Timezone: {zone}; UTC offset at birth: {offset}. | Facilitates correction; values must be actual resolved inputs |
| Fact heading | Calculated placements | Distinct from narrative |
| Lagna label/help | Rising sign (Lagna) / The sign rising at your birth time. This depends strongly on the time you entered. | Plain English first, traditional term second |
| Nakshatra label/help | Birth star (Nakshatra) / The traditional lunar division containing your Moon. | Avoids calling a lunar division a literal star measurement |
| Dasha label/help | Current planetary period (Dasha) / A traditional timing cycle calculated from the Moon's position at birth. | Not a scientifically proven life chapter |
| Uncertain result | Birth time is uncertain. Treat time-sensitive placements and dates as provisional. | Show beside affected outputs, not only at the footer |
| Unknown result | Rising sign, houses and dasha dates are not shown because the birth time is unknown. | Requires omission, not populated noon-derived outputs |
| Result next action | Read my chart / Edit birth details | Contextual guide plus reversible input correction |
| Dosha flag context | This is a traditional chart pattern, not a prediction of harm. Different schools may interpret it differently. | Non-alarming, avoids remedy pressure |
| Score context | Traditional matching score: {score}/36. This is not a percentage chance of a successful relationship. | Score must be actual calculation; not probabilistic |
| Critical boundary | Do not use an astrology reading to delay medical care or make financial, legal or safety decisions. | Near sensitive output, not a buried disclaimer |
| Save action, verified only | Save this chart to my account | Requires ownership-safe, successful account persistence |
| Successful save, verified only | Chart saved to your account. | Show only after success response, never optimistically |
| Browser-only return, verified only | Continue your chart / These details are stored in this browser, not in an account. | Requires genuine local draft/result availability; explain device boundary |
| Resume action | Continue / Edit details / Clear saved details | Each control must work; clearing must not delete account records |
| New account empty state | No saved charts yet. Create a free chart, then choose whether to save it. | Distinguishes an empty list from a product failure; requires free save capability |
| Empty-account fallback | No saved reports yet. You can use the free chart calculators without an account. | Use when only paid/legacy reports persist and free saving is not implemented |
| Returning account | Your saved charts and reports / Open a result or check its birth details. | List only the authenticated owner's actual records |
| Historical entitlement | Your existing reports are listed here. New paid purchases are currently unavailable. | Primary must confirm retrieval and account state before publishing |
| Retrieval failure | We couldn't load your saved results. Try again. | Not the same as empty account; do not invite unnecessary repurchase |
| Unsaved-device return | No chart is saved in this browser. Start a new chart or sign in to view results saved to your account. | Avoid implying an unsaved chart can be recovered |

### Pricing and Availability

Recommended current page title: **Free Tools and Availability | VedicHour**. Visible heading: **What's available now**.

| Surface | Exact copy | Why / condition |
| --- | --- | --- |
| Free row | Free chart calculators / No sign-up or card needed. See chart facts from your birth details. | Only tested free outputs listed beneath it |
| Primary action | Use the free calculators | Direct free route |
| Paid row | New paid purchases are currently unavailable. | No price-as-offer, trial countdown, buy button or guessed opening date |
| Availability explanation | You can use the free chart tools now. Paid reports and subscriptions are not available for new purchase. | Does not assert that old records are unavailable |
| Existing account line | Already have a report? Sign in to view your existing results. | Only when primary verifies owned retrieval; otherwise link support without a retrieval guarantee |
| Sample | See a sample report | Label sample inputs/date/place and explanatory status on destination |
| Legacy paid route | New purchases are unavailable. You can still use the free chart calculators. | Show before payment handoff; enforce server-side separately |

Do not publish historical prices as a hidden active offer in Product/Offer schema, Open Graph price tags, `llms` files, FAQs, comparison tables or emails. Preserve a truthful description of historical purchases without claiming all payments are disabled until primary proves the gate. No pricing experiment is approved here.

### Important Errors and Recovery

| Condition | Exact message and action | Guardrail |
| --- | --- | --- |
| Missing date | Enter your date of birth. | Associate message with field, retain other inputs |
| Invalid/future date | Choose a valid birth date that is not in the future. | Respect actual accepted date range separately |
| Missing required time | Enter your birth time, or choose "I don't know the time". | Only offer unknown option when a safe help/partial path exists |
| AM/PM ambiguity | Check whether this time is AM or PM. | No automatic guessing |
| Place not selected | Choose a place from the search results before continuing. | Confirmation must preserve coordinate integrity |
| No city match | We couldn't find that place. Try adding a region or country. | Retain query; permit safe manual alternative only if supported |
| City service unavailable | Place search is temporarily unavailable. Try again in a moment. | Distinguish provider failure from no match |
| Ambiguous historical clock time | This local time is ambiguous for the selected place. Check the time on your birth record before continuing. | Engineering must handle duplicated/skipped DST time; do not claim resolution |
| Calculation failure | We couldn't calculate this chart. Check the birth details and try again. | No generated narrative pretending calculation succeeded |
| Network interruption | The request did not finish. Check your connection and try again. | Promise retained inputs only when verified |
| Rate limit | You've made several requests in a short time. Wait a moment, then try again. | Use actual retry-after duration when available |
| Save failure | We couldn't save this chart. Try again before leaving. | Show result still present only if true; never say saved |
| Expired sign-in | Your sign-in has expired. Sign in again to view your saved results. | No forced deletion of local draft |
| Inaccessible result | This result isn't available to this account. Check that you're signed in to the account that saved it. | Do not reveal another owner's identity or report existence |
| Generated explanation failure | The chart facts are available, but the explanation couldn't be loaded. | Use only when calculation succeeded; allow safe fact-only result |
| Paid action | New purchases are currently unavailable. Use the free calculators instead. | Never route into live real-money checkout |

## Pricing and Financial Crosschecks

Observed on 2026-10-15: `ACTIVE_PRICE_SET = 'recommended'` in `src/lib/priceBook.ts`; live USD pricing and AI text matched that set. The October 11 research statement that prices have not changed and require a switch is stale. These amounts are **legacy configured/advertised values, not approved offers or validated willingness to pay**:

| Currency | Monthly | Yearly | Arithmetic relative to 12 monthly payments |
| --- | --- | --- | --- |
| INR | 999 | 9,999 | 11,988 comparison total; 1,989 difference; about 16.59%. Not exactly ten months: ten monthly payments total 9,990 |
| USD | 14.99 | 119 | 179.88 comparison total; 60.88 difference; about 33.84% |
| AED | 54.99 | 429 | 659.88 comparison total; 230.88 difference; about 34.99% |

Arithmetic is not price validation and is not proposed discount copy. The historical INR 47,999 versus 12 x INR 3,999 defect concerns the retained `current` set, not the active baseline set.

**Serving cost:** the older research attributes USD 1.60 to a particular daily-active month plus USD 0.40 for unmeasured Ask usage, yielding USD 2.00. This review did not access invoices or reproduce that measurement. Treat it as historical, partially assumed, not a current fully loaded floor. Include retries, long reports, cache misses, free visitors, geocoding, storage/export, support, abuse, refunds and tax before any business decision. Do not equate first-run generation budget with advertising acquisition cost.

**Processor evidence:** [Ziina business-fee help](https://ziina.com/help-center/6847430-what-are-the-fees-to-use-ziina-business-101), checked 2026-10-15 and updated 29 June 2026, states 2.6% + AED 1, with an additional 1.5% for non-AED currency **or** international card. Do not add that 1.5% twice. It says fees include VAT on the fee. The separate [fees page](https://ziina.com/fees) says fees are subject to VAT and mentions changes effective 1 November 2026. Account terms and the relevant business schedule need reconciliation; no definitive future fee floor is claimed. The older 1.2% FX article could not be retrieved at its stated ID; the combined 5.3% assumption remains unverified here.

Illustrative arithmetic only, under the business-help schedule and before FX, other charges, refunds or tax on the sale: an AED 10 local-card transaction would incur AED 1.26 (12.6%); international-card AED 10 would incur AED 1.41 (14.1%). The fixed fee makes small tickets sensitive to checkout structure, but this is not permission to launch a bundle.

Free acquisition has **zero direct purchase revenue** under this release. ROAS and payback cannot be inferred from free result completions. A proposed ad research loss must be funded and approved as such, not justified using invented upsell or renewal rates. No current CAC, LTV, CTR, conversion rate or demand-volume estimate is available.

Any future pricing work needs owner authorisation, commercial/processor eligibility evidence, tax/accounting review, current measured cost distribution and observed customer value. First use consensual task observation and clearly hypothetical price discussions with a defined sample; interviews and intent surveys are not purchases. No participants have been recruited or surveyed in this work.

## Embedded Evidence and Pending Dependencies

Read-only evidence collected between roughly **00:07 and 00:14 +04:00 on 2026-10-15**: official competitor web retrievals, source inspection, four plain HTTP endpoints and eight public HTML responses parsed with an inert DOM parser in headless installed Edge. No product forms or paid pipelines were submitted. Public source state is the baseline, not a later overhaul release.

Primary owns `EVIDENCE.md`; this worker leaves evidence here and in the other two owned files. Recheck after integration: free chart and unknown-time behaviour; authenticated saving/retrieval; legacy access; server-side paid gate; copy/schema/AI agreement; privacy wording and consent; sample provenance. External dependencies: original full attachment reconciliation, commercial/processor decision, accounting and cost telemetry, Search Console/analytics access, editorial review and real-user observation. No campaign, email, payment or credit spend occurred; no product file or price book was edited; no commit was made.
