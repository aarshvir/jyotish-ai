# SEO, SEM, Social and Launch: Evidence and Draft Plan

Date: **15 October 2026, Asia/Dubai**. Owner: growth/competitor reviewer. Status: read-only checks and proposals. No content publishing, indexing submission, ads, email, paid generation, external account change or launch executed. Only this file, `MESSAGING-AND-PRICING.md` and `INDEPENDENT-REVIEWS/growth-competitors.md` are owned by this reviewer.

## Decision and Evidence Limits

Fix truthful availability and useful first results before increasing traffic. Improve three existing foundational articles before producing more content. Route task intent to the corresponding free utility, not to a mandatory quiz. Paid acquisition, if ever separately approved, would initially measure a free utility experience, not revenue.

Read `docs/SEO_AUDIT.md` and `docs/PRICING_RESEARCH.md`, plus the dated brief/ledger/implementation plan. The old SEO audit's before/after counts, difficulty labels and proposed outcomes are historical. Its claim that ChatGPT referrals are about 56% of traffic is not supported by analytics available to this worker; its 116-answer test was not reproduced. Neither figure should appear in current growth claims. No Search Console, Bing Webmaster, campaign account, keyword-volume, revenue or customer-behaviour dataset was accessed. No rankings, traffic share, conversion uplift or AI citations are asserted.

## Current Public Checks

Checked 2026-10-15, approximately **00:11-00:14 +04:00**, against `https://www.vedichour.com`. Baseline local HEAD: `dfb774a972430790fa565dfe5d4529c2e5d3796f`. These checks precede other workers' release and do not certify the final implementation.

Method: web tool for public copy and official sources; read-only HTTP GET for plain endpoints; XML parser for sitemap; Playwright API requests plus an inert `DOMParser` in headless installed Edge for eight HTML responses. No page scripts executed, no personal inputs submitted, no account or purchase created. Bundled Chromium was unavailable; installed Edge completed the parsing check. This is HTTP/source evidence, not a rendered accessibility/performance or complete customer-journey test.

| Endpoint / sampled page | Actual observation | Limit |
| --- | --- | --- |
| [Home](https://www.vedichour.com/) | 200; title `Hour-by-hour Vedic timing \| VedicHour`; description starts with 18 hourly windows and free chart to start; one H1; self canonical; `index, follow` | First CTA text names free timing but points to `/free-kundli`; no result executed |
| [Pricing](https://www.vedichour.com/pricing) | 200; `index, follow`; self canonical; description promotes subscriptions, manual renewal and 24-hour refund | Advertised availability is not commercial approval; USD 14.99/month and 119/year displayed |
| [Free Kundli](https://www.vedichour.com/free-kundli) | 200; self canonical; one H1; `index, follow`; description names chart facts/no signup | Does not prove that visitor can reach result without consent or account |
| [Start](https://www.vedichour.com/start) | 200; `index, follow`; self canonical; no H1 in fetched server HTML; description promises a 30-day plan | Client rendering not assessed here; unsuitable promise while new paid purchases unresolved |
| [Unknown birth time guide](https://www.vedichour.com/blog/kundli-without-birth-time) | 200; self canonical; one H1; `index, follow`; concise task-specific description | Source has quantified synthetic-frequency claims whose reproducibility this worker did not establish |
| [AstroSage comparison](https://www.vedichour.com/compare/astrosage-alternative) | 200; self canonical; one H1; `index, follow`; snippet advertises personal report/timing | Needs dated official source receipts and availability correction, not an unsupported superiority rewrite |
| [Daily horoscope sample](https://www.vedichour.com/horoscope/aries/2026-10-15) | 200; self canonical; one H1; `noindex, follow` | One sample only; do not infer every date/sign is correct |
| [Fast transit sample](https://www.vedichour.com/transit/sun/aries) | 200; self canonical; one H1; `noindex, follow` | One sample only; slow-transit calculations were not crosschecked |
| [Robots](https://www.vedichour.com/robots.txt) | 200; wildcard and named AI crawler rules allow public paths, disallow API/auth/dashboard/reports and selected flows; names sitemap | Rules are not authorisation or evidence of actual bot access/citation. Private ownership must still be enforced by server |
| [Sitemap](https://www.vedichour.com/sitemap.xml) | 200 XML; **173 unique URLs**, **46 blog leaves**, **48 transit leaves**, **0 horoscope URLs**; `/start` and `/account` absent; `/about` and `/methodology` present | Not a full crawl of 173 URLs; old 328/174 totals are not today's count |
| [llms.txt](https://www.vedichour.com/llms.txt) and [llms-full.txt](https://www.vedichour.com/llms-full.txt) | Both 200 plain text. Broken multiline links contain `https://www.vedichour.com\r\n/free-kundli`; text describes subscriptions and exact-birth certainty; visible update date 2026-10-11 | Web tool alone returned internal errors, but direct HTTP confirmed endpoints. Generated/static date is not a substantive editorial review date |

All eight HTML samples inherited at least six paid global `Offer` entries, three currencies for monthly/yearly, with `availability = https://schema.org/InStock`; pricing also had its own paid offers. This is verified public markup, not a determination that payments currently succeed.

## Prioritized Verified Problems and Acceptance

| Priority / ID | Problem and source | Proposed remedy | Verification needed from implementing owner |
| --- | --- | --- | --- |
| P0 S1 | Available-paid promises conflict with free-only boundary: global schema `src/app/layout.tsx` / `src/lib/seo/aiVisibility.ts`, pricing metadata, public copy and AI summaries | Drive all surfaces from the same verified availability state. Omit unpurchasable paid offers rather than disguising them as free offers | Inert HTML checks after deployment: no active paid offer/price tag/buy CTA for new users; existing records retained; server-side gate tested |
| P0 S2 | Home's first free timing promise mismatches chart destination: `Hero.tsx` and `UNLOCK_FREE_HREF` | Name free birth chart in CTA, H1, snippet and preview; use a clearly labelled timing example separately | Arrival from organic/ad/social -> same named free output; no compulsory marketing consent |
| P1 S3 | Both public AI text files have newline-contaminated URLs; route builders fail to trim base URL | Sanitise once, rebuild both files, validate every emitted URL and any schema URL | Fetch after deployment, parse URLs, reject CR/LF/whitespace and unintended hosts; links resolve to intended public pages |
| P1 S4 | Unknown-time guide source claims 56%, 89%, 75%, 96% and a 20,000-date calculation without a reproduction receipt found in reviewed scripts/tests | Remove numeric claims pending reproducible code, seed, dataset definition, timezone, flags and output; retain qualitative boundary guidance | Editorial and calculation reviewer approve a traceable computation or a no-probability rewrite; these are not human research |
| P1 S5 | `hora-planetary-hours-guide.ts` describes sunrise-based variable horas, while product surfaces sell fixed hourly windows; article includes surgery as a muhurat use | Explain the two units separately and remove medical-timing suggestion. Use illustrative arithmetic or validated city-specific calculation | Method reviewer signs off sample inputs/output; clinical care is never delayed or scheduled by this tool |
| P1 S6 | Unqualified competitor/accuracy assertions in `faq-data.ts` and `src/content/comparisons.ts`; comparisons imply equal calculations without executed crosschecks | Reframe as dated advertised capabilities, tested separately; link C1-C6 sources in messaging file; no league table | Every comparative field has primary receipt or `not verified`; final wording matches live feature availability |
| P2 S7 | `/start` is indexable and promises paid generation, with no H1 in fetched server HTML | Use `noindex` and remove from acquisition paths while it is a transactional/unavailable flow; otherwise add a genuine public task page | Confirm rendered purpose before deciding; sitemap omission alone does not prevent indexing |
| P2 S8 | Sitemap contains both `/blog/vedic-vs-western-astrology` and `/compare/vedic-vs-western-astrology` | Inspect overlap; allocate beginner explainer vs method/tool comparison only if substantive distinction. Merge/canonicalise if duplicate | Do not redirect simply because two URLs share a topic; preserve useful content and links; inspect Search Console first |
| P2 S9 | Crawlability/training permissions are bundled in a long crawler list, with comments implying quotation growth | Have privacy/content owner decide crawler purposes individually; preserve legitimate search discovery, review training permissions separately | No bot policy changes in this task. Robots is not access control and permission does not imply citation |

Previously reported problems not promoted as current failures: blanket 216 filler URLs in sitemap, missing About, site-wide homepage canonical, and all long snippets. Current source and sampled pages show several earlier repairs. No new Lighthouse/Core Web Vitals or search-rank result is available.

Google's [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features), checked 2026-10-15 (page updated 2025-12-10), says normal search fundamentals apply and special AI files/schema are unnecessary. Make accurate visible text and structured data agree; treat the existing `llms` files as maintained summaries, not a citation lever. [Robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro) distinguishes crawl management from keeping a page out of results. [Scaled-content policy](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content) concerns low-value pages created to manipulate search, irrespective of generation method. These are risk/quality principles, not a finding that Google has penalised VedicHour.

## Proposed Metadata and Internal Linking

Exact drafts, not product edits. Use an absolute title or the existing title template consistently so the brand is not appended twice. Character counts are a readability check, not a universal Google truncation rule. Do not create fake `Review`, `AggregateRating`, testimonials or an unavailable paid `Offer`.

| Route | Proposed title | Proposed description |
| --- | --- | --- |
| `/` | Free Vedic Birth Chart in Plain English \| VedicHour | See your Vedic chart facts from your birth details. Clear explanations, visible birth-time limits, and no sign-up or card needed. |
| `/free-kundli` | Free Kundli: Your Vedic Birth Chart \| VedicHour | Enter your birth date, time and place to see calculated chart facts. Check the details and learn what changes when the birth time is uncertain. |
| `/pricing` | Free Tools and Availability \| VedicHour | Use VedicHour's free chart calculators. New paid purchases are unavailable. See what is included and how to access existing results. |
| `/sample-report` | Sample Vedic Astrology Report \| VedicHour | Read a labelled example of chart facts and interpretive commentary. See the inputs, method and limits before creating your own free chart. |
| `/moon-sign-calculator` | Vedic Moon Sign Calculator \| VedicHour | Find your sidereal Moon sign from your birth details. If your birth time is uncertain, check whether the Moon changes sign that day. |
| `/synastry` | Kundli Matching: Score and Meaning \| VedicHour | Explore traditional matching factors for two birth charts. Understand input uncertainty and why a score is not a verdict on a relationship. |
| `/blog/kundli-without-birth-time` | Kundli Without Birth Time: What Changes \| VedicHour | Learn which chart details depend on birth time, why a noon guess can mislead, and what to check before using a partial chart. |

`/sample-report` wording requires verified provenance/labels; `/pricing` existing-access wording requires ownership-safe retrieval. Moon-sign description describes the explanation, not a guarantee that the current UI computes a full-day interval.

Link design: calculator -> matching beginner guide beside output; guide -> exact tool beside the worked example; uncertainty warning -> A02; method disagreements -> A04 and `/methodology`; timing pages -> A03/A15/A16 rather than a purchase quiz. Use descriptive anchors, not site-wide keyword repeats. Keep free navigation available from error/empty states. Help-route links are conditional until `/help` is shipped and tested. No automated link building or external submissions.

## Twenty Substantive Article Proposals

**All twenty are improvements to existing registered articles**, not twenty new thin URLs. Source registry `src/content/blog/index.ts` and current sitemap show 46 blog leaves. The exact draft editorial titles below may differ from existing titles; retain their current slugs. A01-A03 are the first foundational batch. Do not redate an article until a substantive reviewed change is actually published.

Evidence labels: **available** identifies inspected source/official documentation, not verified article accuracy; **required** identifies new evidence that must exist before a claim/example publishes. For traditional interpretations, cite a specific edition/section and name rule variation. A competitor's claim is evidence of its marketing, not proof of a scientific effect. No article promises a health, money, marriage or career outcome.

### A01 [Foundation]: How to Read Your First Kundli

- **Audience / intent / question:** first-chart explorer; beginner task. "Which parts of my chart should I read first?"
- **Existing URL:** `/blog/how-to-read-kundli`.
- **Distinct contribution:** one original annotated example with an input receipt; distinguish sign numbers from houses; explain Moon sign, Lagna and dasha in the order shown by the actual free result. Replace rectification-first detours with a usable uncertainty path.
- **Evidence:** available: current article and calculator source. Required: calculation-reviewer-approved synthetic fixture, birth-time status, timezone/ayanamsa/house-system receipt, and original screenshot from the release. No customer chart or borrowed image.
- **Product action / links:** "Create my free chart" -> `/free-kundli`; links to `/lagna-calculator`, `/moon-sign-calculator`, A02, A07 and `/methodology`; result should link back here.
- **Maintenance:** review every calculator layout/method change and quarterly; owner: editorial + calculation reviewer. Done when mobile example/labels match release and a reader can identify the first three facts without paid access.

### A02 [Foundation]: Kundli Without Birth Time: What You Can and Cannot Know

- **Audience / intent / question:** missing/approximate-time visitor; uncertainty task. "Can I use a chart without inventing a time?"
- **Existing URL:** `/blog/kundli-without-birth-time`.
- **Distinct contribution:** qualitative reliability matrix; unknown vs approximate vs recorded; a boundary-crossing example and same-day-stable example; explain why a noon chart must not expose confident houses/dasha. Remove unverified probability figures rather than substituting a new guessed percentage.
- **Evidence:** available: article and [Swiss Ephemeris interface](https://www.astro.com/swisseph/swephprg.htm). Required: reviewed full local-day interval calculation, date/timezone boundaries and reproducibility receipt. The existing asserted 20,000-date count is not reproduced here.
- **Product action / links:** only use an implemented safe partial-chart flow; otherwise link `/free-kundli` for known-time use and explain the limitation. Links: `/moon-sign-calculator`, `/nakshatra-finder`, A05, A08 and `/blog/birth-time-rectification-guide`; do not imply VedicHour provides rectification.
- **Maintenance:** every uncertainty-engine change and quarterly; editorial + input reviewer. Done when form and article give the same warning, no noon-as-truth recommendation and no untraceable probabilities remain.

### A03 [Foundation]: Hora Explained: Planetary Hours Are Not Clock Hours

- **Audience / intent / question:** everyday timing explorer; explanation/comparison. "Why is a hora not always sixty minutes?"
- **Existing URL:** `/blog/hora-planetary-hours-guide`.
- **Distinct contribution:** separate sunrise-based day/night divisions from VedicHour's displayed clock-hour grid. Show explicit illustrative arithmetic with assumed sunrise/sunset, then a separately validated location-specific receipt. Remove surgery scheduling example.
- **Evidence:** available: current article, [Drik timing tables](https://www.drikpanchang.com/muhurat/choghadiya.html), Swiss interface's rise/set functions. Required: match sunrise definition, date/location/timezone and implemented hora convention with engine reviewer; Drik is not universal certification.
- **Product action / links:** `/hora` explanation, `/sample-report` labelled timing example; links to A15, A16, A17 and `/methodology`. Do not promise live city timing if destination is explanatory only.
- **Maintenance:** sunrise/method changes and quarterly; editorial + timing reviewer. Done when the article's unit and the product's unit cannot be mistaken for each other.

### A04: Why Two Vedic Charts Can Differ: Ayanamsa and Settings

- **Audience / intent / question:** comparing calculators; troubleshooting. "Why do these two tools disagree for the same birthday?"
- **Existing URL:** `/blog/ayanamsa-lahiri-explained`.
- **Distinct contribution:** check date format, local time/offset, coordinates, zodiac, ayanamsa, house convention and node mode in order; explain a boundary discrepancy rather than declaring a rival inaccurate.
- **Evidence:** available: Swiss interface and C1 advanced fields/C6 form in `MESSAGING-AND-PRICING.md`. Required: controlled synthetic crosschecks with both tools' actual settings/outputs and tolerance, not homepage marketing.
- **Product action / links:** edit chart details in verified free result; `/free-kundli`, `/methodology`, A02 and `/blog/vedic-vs-western-astrology`.
- **Maintenance:** engine/settings or comparator changes; quarterly official-source review. Editorial + calculation reviewer.

### A05: Rising Sign and Birth-Time Uncertainty

- **Audience / intent / question:** first-chart and approximate-time visitor; fact lookup. "Can a rounded birth time change my Lagna?"
- **Existing URL:** `/blog/lagna-ascendant-guide`.
- **Distinct contribution:** boundary-specific example instead of a universal two-hour rule; distinguish approximate time from wrong city; show exactly which outputs to treat as provisional.
- **Evidence:** available: existing guide/engine declarations. Required: reviewed time-sensitivity fixture, same coordinates/method and clearly illustrative range; no percentage accuracy claim.
- **Product action / links:** `/lagna-calculator` with recorded time; A01, A02, A04 and `/methodology`.
- **Maintenance:** input/house-system changes and quarterly; calculation reviewer.

### A06: Moon Sign and Sun Sign: Which One Is This Tool Showing?

- **Audience / intent / question:** Western/Sun-sign arrival; clarification. "Why does my Vedic sign differ from the sign I know?"
- **Existing URL:** `/blog/moon-sign-vs-sun-sign-vedic`.
- **Distinct contribution:** separate Sun-vs-Moon from sidereal-vs-tropical; compare like with like, not Vedic ascendant with Western Sun. Explain that equal zodiac sectors are not the irregular astronomical constellations.
- **Evidence:** available: article and Swiss sidereal documentation. Required: reviewed synthetic example and accurate labels for all compared positions.
- **Product action / links:** `/moon-sign-calculator`; A04, A07 and `/blog/vedic-vs-western-astrology`.
- **Maintenance:** quarterly and terminology changes; editorial + method reviewer.

### A07: Nakshatra and Pada: Read the Label Before the Meaning

- **Audience / intent / question:** birth-star search visitor; explanation. "What is my Nakshatra and what does its pada mean?"
- **Existing URL:** `/blog/nakshatra-birth-star-guide`.
- **Distinct contribution:** a sourced 27-row boundary/lord table, separate from interpretive traits; show boundary uncertainty and correct Nadi mapping only where relevant.
- **Evidence:** available: `src/content/nakshatras.ts`. Required: compare table with matching-engine mapping and cited rule edition; exact boundary fixture signed off by reviewer. Prior Nadi bug reports are not a fresh certification.
- **Product action / links:** `/nakshatra-finder`; `/nakshatra`, A02 and A10.
- **Maintenance:** every data-table/matching-engine change, otherwise six-monthly; calculation reviewer.

### A08: Vimshottari Dasha: Order, Balance and Date Limits

- **Audience / intent / question:** current-period visitor; explanation/calculation. "How is my current dasha calculated, and which dates depend on birth time?"
- **Existing URL:** `/blog/vimshottari-dasha-current-period`.
- **Distinct contribution:** one transparent balance calculation from a labelled synthetic Moon longitude, then show the difference between arithmetic and interpretations; no guaranteed life-event chronology.
- **Evidence:** available: article and engine source. Required: cited rule/year-length convention, timezone and expected start/end fixture, including rounded/unknown-time cases.
- **Product action / links:** `/vimshottari-dasha-calculator`; `/dasha`, A02, A07 and `/methodology`.
- **Maintenance:** dasha/year-length changes and quarterly; calculation reviewer.

### A09: Gun Milan Scores: What a Number out of 36 Does Not Say

- **Audience / intent / question:** compatibility visitor; interpretation. "Does 18 or 24 out of 36 decide a relationship?"
- **Existing URL:** `/blog/gun-milan-score-marriage`.
- **Distinct contribution:** show eight contributing factors and their maximums, input sensitivity, school variation, and distinction from success probability; consent and practical relationship considerations alongside the score.
- **Evidence:** available: matching engine and article. Required: cited factor rules and synthetic two-chart expected breakdown, reviewed without claiming efficacy.
- **Product action / links:** `/synastry` only with a tested free-score route; A10, `/blog/bhakoot-dosha-explained`, A11 and A02.
- **Maintenance:** matching algorithm changes and quarterly; editorial + matching reviewer.

### A10: Nadi Dosha: Mapping, Exceptions and Uncertainty

- **Audience / intent / question:** concerned matching visitor; rule clarification. "Why do Nadi labels or exceptions differ between tools?"
- **Existing URL:** `/blog/nadi-dosha-kundli-matching`.
- **Distinct contribution:** inspectable nakshatra-to-Nadi mapping and source-specific exceptions; never fertility, illness or partner-harm prediction.
- **Evidence:** available: local nakshatra/matching data. Required: test-backed mapping and named classical edition/section for any exception; no claim that an exception is universally accepted.
- **Product action / links:** inspect the factor breakdown at `/synastry`; A07, A09 and `/blog/bhakoot-dosha-explained`.
- **Maintenance:** mapping/exception changes, six-monthly otherwise; matching reviewer.

### A11: Manglik Rules: What a Flag Means and Why Checks Differ

- **Audience / intent / question:** anxious chart-factor visitor; comparison. "Which Mars placements did this tool check?"
- **Existing URL:** `/blog/manglik-dosha-marriage`.
- **Distinct contribution:** name reference point, included houses and cancellation policy; show disagreement from rule differences, not a prediction of death/divorce or a remedy sales pitch.
- **Evidence:** available: dosha source/article. Required: named rule sources and synthetic fixtures including cancellation/unknown-time cases; no causal claim from a flag.
- **Product action / links:** `/manglik-dosha-calculator`; `/blog/manglik-dosha-cancellation-rules`, A09, A02 and `/methodology`.
- **Maintenance:** detector changes and quarterly; calculation + editorial reviewer.

### A12: Kaal Sarp Checks: Definition Before Interpretation

- **Audience / intent / question:** dosha search visitor; fact/rule lookup. "What exactly was tested to show this flag?"
- **Existing URL:** `/blog/kaal-sarp-dosha-explained`.
- **Distinct contribution:** diagram made from an original synthetic fixture; state node-mode and inclusion convention, near-boundary cases and traditional disagreement. Remove unsourced prevalence claims.
- **Evidence:** available: detector/article. Required: node convention, boundary fixtures and cited definition; any frequency needs reproducible seed/period/timezone/output receipt.
- **Product action / links:** `/kaal-sarp-dosha-calculator`; A02, A04 and `/methodology`.
- **Maintenance:** detector/node changes and six-monthly; calculation reviewer.

### A13: Sade Sati: Natal Moon Sign, Transit and Phase

- **Audience / intent / question:** worried Moon-sign visitor; explanation. "What determines the phase, and does it predict misfortune?"
- **Existing URL:** `/blog/sade-sati-guide`.
- **Distinct contribution:** separate natal Moon identification, current sidereal Saturn sign and traditional interpretation; show uncertainty if natal Moon changes during unknown birth day; no inevitability or cure purchase.
- **Evidence:** available: current transit source and Moon/dosha detector. Required: reviewed phase fixtures and source-defined sidereal convention; no unsourced current-date phase table.
- **Product action / links:** `/sade-sati-calculator`; `/transit`, A02, A14 and `/blog/saturn-return-vs-sade-sati`.
- **Maintenance:** each Saturn ingress/re-entry, with monthly current-status check; transit reviewer.

### A14: Sade Sati 2026-2027: Dated Moon-Sign Table

- **Audience / intent / question:** year-specific search arrival; current timing lookup. "Which Moon signs fall within the defined period on a given date?"
- **Existing URL:** `/blog/sade-sati-2026-2027-moon-signs`.
- **Distinct contribution:** exact method/timezone and date intervals, retrograde re-entries, reviewed-as-of timestamp; distinguish date evidence from personal-life prediction. Do not change the slug just for a new year.
- **Evidence:** available: `src/content/transits.ts`. Required: regenerated ephemeris outputs, regression fixtures and independent astronomical comparison under equal settings; no dates calculated in this audit.
- **Product action / links:** `/sade-sati-calculator`; `/transit/saturn/pisces`, A13 and A02.
- **Maintenance:** monthly and immediately after relevant boundary/correction; transit reviewer; preserve correction history.

### A15: Choghadiya: Eight Day Parts, Eight Night Parts

- **Audience / intent / question:** everyday/festival timing visitor; method lookup. "How does location change a Choghadiya window?"
- **Existing URL:** `/blog/choghadiya-guide`.
- **Distinct contribution:** illustrative division arithmetic plus verified city/date example, local sunrise convention, midnight rollover and no-sunrise limits; no universal 90-minute duration.
- **Evidence:** available: [Drik Choghadiya](https://www.drikpanchang.com/muhurat/choghadiya.html) and local method sources. Required: reviewer-approved same-location/date calculation; no scraping/republication of full vendor tables.
- **Product action / links:** `/muhurat` explanation, not an unverified live calculator; A03, A16, A17 and `/methodology`.
- **Maintenance:** timing-method changes and quarterly; timing reviewer.

### A16: Hora and Choghadiya Disagree: Read Them as Different Systems

- **Audience / intent / question:** timing comparer; interpretation. "Which label should I trust when the tools disagree?"
- **Existing URL:** `/blog/choghadiya-vs-hora-timing`.
- **Distinct contribution:** side-by-side original worked example at one actual instant, each system's divisor/boundary and the product's scoring convention; no invented scientific weighting.
- **Evidence:** available: A03/A15 method content. Required: independently reviewed fixture matching engine output; clearly separate city timings from personal score.
- **Product action / links:** `/hora`, `/muhurat`, `/sample-report`; A03, A15, A17 and `/methodology`.
- **Maintenance:** any score/hora/choghadiya change and quarterly; method reviewer.

### A17: Rahu Kaal: Weekday Rule and a Location-Specific Example

- **Audience / intent / question:** timing-search visitor; explanation. "How is the window derived, and what should I not use it for?"
- **Existing URL:** `/blog/rahu-kaal-explained`.
- **Distinct contribution:** weekday interval rule and labelled sunrise/sunset receipt; explicitly not a medical/emergency restriction, and not a birth-chart prediction.
- **Evidence:** available: existing article and timing engine. Required: cited convention and reviewed city/date computation, including timezone and day boundary.
- **Product action / links:** `/muhurat` explanation; A03, A15 and `/methodology`.
- **Maintenance:** method changes and quarterly; timing + editorial reviewer.

### A18: Jupiter in Leo 2026: Dates, Settings and Limits

- **Audience / intent / question:** timely transit visitor; fact lookup. "Which zodiac and dates does this transit table use?"
- **Existing URL:** `/blog/jupiter-transit-leo-2026`.
- **Distinct contribution:** ingress/retrograde re-entry table with computation receipt, contrasting tropical/sidereal labels without comparing unlike methods; no marriage/job opportunity guarantee.
- **Evidence:** available: transit dataset and Swiss documentation. Required: regenerated exact instants with flags and timezone plus independent comparison; current dates not certified here.
- **Product action / links:** `/transit/jupiter/leo`; `/free-kundli`, A04 and `/transit`.
- **Maintenance:** monthly while topical, event boundaries and corrections immediately; transit reviewer.

### A19: Rahu-Ketu Transit 2026: Mean or True Nodes?

- **Audience / intent / question:** transit-date comparer; troubleshooting. "Why do websites publish different node-transit dates?"
- **Existing URL:** `/blog/rahu-ketu-transit-december-2026`.
- **Distinct contribution:** explicitly identify mean/true node choice, ayanamsa and time basis; show source of discrepancy instead of one unsupported universal date. Keep old slug stable unless an accuracy correction requires a managed redirect.
- **Evidence:** available: transit source and Swiss node documentation. Required: both-mode computation receipt and reviewed published dates; traditional effects labelled as interpretation.
- **Product action / links:** `/transit/rahu/capricorn`, `/transit/ketu/cancer`, A04 and `/methodology`.
- **Maintenance:** monthly until/around transition, then quarterly with archived as-of status; transit reviewer.

### A20: AI Astrology: Calculation, Commentary and Mistakes

- **Audience / intent / question:** sceptical comparison visitor; product evaluation. "What did AI write, what was calculated, and how can I check?"
- **Existing URL:** `/blog/how-ai-is-changing-vedic-astrology`.
- **Distinct contribution:** original fact-vs-commentary example, uncertainty/error demonstration and corrections path. Contrast authorship models without claiming most competitors are generic or that AI cannot hallucinate.
- **Evidence:** available: local fact/commentary source and [CHANI's authorship description](https://www.chani.com/app); C1-C6 for advertised offers. Required: reviewer-approved synthetic example and citation-to-claim audit; no paid model batch.
- **Product action / links:** `/free-kundli`, `/sample-report`, `/methodology`, `/about` and A01; help/correction link only once live.
- **Maintenance:** model/pipeline/claims changes and quarterly; editorial + safety reviewer.

## Editorial Execution and Measurement

Proposed sequence: before publication, resolve S1-S6; first batch A01-A03; second batch A04-A10; third batch A11-A20 according to observed search questions and maintenance capacity, not assumed keyword volume. Do not publish all twenty at once to satisfy an output count. One accountable editor must review terminology, examples, sources and user action; the source has only been inventoried here, not fully fact-checked.

Each updated piece needs direct answer, specific contribution, exact input/method receipt if numeric, traceable sources, honest author/reviewer attribution, visible changed date, correction route, contextual tool link and mobile-readable original example. No fake reviewer biography, invented expert endorsement, copied competitor assets or new claim of predictive validity. A text-only source is insufficient evidence of a licensed library or verified interpretation.

After owner grants read access, baseline Search Console by page/query/country/device before edits; inspect index status, canonical selection, impressions/clicks and field CWV. Compare matched time windows and note seasonal/algorithm/release confounders. Tool completion and useful return visits are separate from article traffic. Low sample counts are descriptive, not a winner or forecast. AI-origin referral classifications are incomplete; never state a citation/traffic share without export, period, denominator and known attribution loss.

## SEM Drafts: No Launch

All keywords and copy are **proposed**, not measured-volume terms. No account created, credits used, ad imported or budget authorised. Free utility only. New paid services are not targets. Search quality and geography/language are hypotheses until account evidence and owner approval exist.

| Draft group | Exact-match seeds / limited phrase candidates | Matched page and expected action | Reason |
| --- | --- | --- | --- |
| Chart | `[free kundli]`, `[free vedic birth chart]`, `[janam kundali online]`; phrase `"vedic birth chart calculator"` | `/free-kundli`; complete free chart, then read relevant guide | Actual utility named in ad and landing page |
| Moon | `[vedic moon sign calculator]`, `[rashi calculator by date of birth]`; phrase `"sidereal moon sign"` | `/moon-sign-calculator`; calculate and inspect uncertainty | Narrower task rather than broad fortune-seeking |
| Birth star | `[nakshatra finder]`, `[birth star calculator]`; phrase `"janma nakshatra calculator"` | `/nakshatra-finder`; free star/pada fact, A07 | Specific question with inspectable output |
| Unknown time, deferred | `[kundli without birth time]`, `[birth time unknown chart]` | A02; safe implemented partial-chart/help action only | Do not buy traffic for a tool that requires known time while promising an unknown-time result |
| Matching, deferred | `[kundli matching score]`, `[guna milan calculator]` | `/synastry`; verified ungated free score + context only | Hold until primary confirms the delivered free contract |

**Proposed negative keywords:** jobs, vacancy, salary, course, certification, astrologer phone number, live chat astrologer, free call, kundli software download, crack, apk, mod, vashikaran, black magic, love spell, death prediction, disease prediction, medical treatment, surgery muhurat, lottery, stock tips, investment returns, guaranteed marriage, guaranteed prediction, gemstone shop, puja booking, customer care. Exclude competitor brand queries from the initial experiment rather than implying affiliation. Review negatives at query level so `birth time unknown` is not accidentally excluded from an approved educational group. Separate Hindi terms until a reviewed Hindi landing/form/result exists; no auto-translated landing promise.

### Original Ad Copy

Headlines are short enough for a standard responsive-search draft; final combinations, punctuation and platform validation remain the ads owner's task. Do not let automatic assets add unsupported outcomes or paid offers.

| Group | Headline candidates | Description drafts |
| --- | --- | --- |
| Chart | Free Vedic Birth Chart; Kundli in Plain English; No Sign-Up or Card; VedicHour Free Kundli | Enter your birth date, time and place. See chart facts with clear explanations.; Start with a free chart. Birth-time limits are explained before you rely on a result. |
| Moon | Find Your Vedic Moon Sign; Free Rashi Calculator; Check Your Birth Details | See your sidereal Moon sign from your birth details. Free, with no sign-up.; Not sure of your birth time? Read the limits before treating the result as certain. |
| Birth star | Find Your Birth Star; Free Nakshatra Finder; Nakshatra and Pada | Enter your birth details to see your Nakshatra and pada, with plain-English context.; A free chart fact, not a prediction of what will happen. Check uncertain birth times. |

Proposed sitelinks: `How to Read a Kundli` -> A01; `Birth Time Unknown` -> A02; `Calculation Method` -> `/methodology`; `Free Tools and Availability` -> `/pricing` after availability fix. No report purchase, trial, refund or forecast sitelink while those are unavailable.

### Optional Proposed Capped Experiment

**Actual authorised spend for this task: zero.** Default recommendation: no paid launch until product, privacy, eligibility and measurement gates are signed off. A later, separately authorised research proposal could use one English-language, Search-only campaign in one owner-approved geography, with only the Chart group initially; no display network, search partners, broad match, retargeting, sensitive-profile audiences or automatic expansion. This choice is proposed, not a platform policy/eligibility determination.

Illustrative maximum: **AED 200 all-in**, consisting of **AED 140 media ceiling** and **AED 60 reserve** for known taxes/charges; not a forecast or an approved payment. Seven fixed account-timezone calendar days, average daily media budget AED 10, no budget increases, one campaign. [Google Ads budget guidance](https://support.google.com/google-ads/answer/1704443), checked 2026-10-15, allows up to twice average daily spend and uses a 30.4-day monthly limit. Therefore AED 10 is not a hard daily AED 10 cap: under that standard rule 7 x AED 20 = AED 140. Confirm rule applicability, dates, invoice currency, tax and account settings before approval; if any cannot be bounded, do not run. Pause at media AED 100 to review tracking/query quality; stop at AED 140, end date, integrity incident or broken free promise, whichever occurs first. Notifications/reports can lag, so a manual threshold alone is not a guaranteed cap.

Finance owner must approve an acceptable research loss in advance. Free completions do not provide return on ad spend, and the old document's CPM/CTR/bump/upsell assumptions are not used. Additional generation/geocoding/support costs need separate approval and inclusion in the total ceiling; if the reserve cannot cover them, reduce media or do not run. No currency conversion/traffic/purchase forecast is claimed.

### Measurement Contract, Not Existing Telemetry

The inspected allowlist in `src/lib/analytics/events.ts` has `calc_complete` and quiz/purchase-oriented events. This does **not** prove free calculator coverage or the definitions below. Extend only after analytics/security owner approval; do not silently emit new names into a rejecting schema.

| Proposed event / operational record | Definition | Allowed evidence |
| --- | --- | --- |
| `utility_view` | Eligible free tool visible in the chosen visit | Tool code, release, coarse campaign/landing code |
| `utility_start` | First meaningful form interaction | Tool code only; no birth fields |
| `utility_validation_error` | Client/server validation rejects submission | Allowlisted error code, field category, no value or free text |
| `utility_result` | Successful chart response visibly rendered once per attempt | Tool code, request correlation without personal identifiers, duration bucket, uncertainty category |
| `utility_next_step` | Relevant guide/edit action taken after result | Allowlisted destination/action code |
| `utility_save_success` | Ownership-safe save confirmed by server | Success category, not raw chart, birth data, account email or chart URL |
| `utility_return` | Later consented visit opens a genuinely persisted result | Storage scope and interval bucket; no cross-device claim from browser-only ID |

Primary metric: cost per valid free result = billed attributable media spend / successful deduplicated results in defined window; call it **cost per result**, not CAC. Secondary: starts/views, results/starts, field-category errors/starts, method-guide actions/results, separately consented saves/returns. Report raw denominators, device/geography, dates and attribution coverage; no target rate invented. Test consent denied, duplicate retry and tracking off before any experiment. Never push names, birth dates/times, exact cities/coordinates, score/dosha labels, report text, email, signed URLs or sensitive-derived audiences to ad platforms. Keep ad click identifiers only under approved consent/retention policy. No purchase events or fictional revenue for free use.

## Social Drafts: Original, Unsent and Unscheduled

Proposed first channels: Instagram for a short visual example and X for concise methodological explanations, based on format fit, **not** verified audience presence or reach. Choose one first if editorial capacity is limited. Owned blog/help is the source of truth. All example assets must be original release screenshots with synthetic inputs, labelled as examples and stripped of private data; none are created/copied here. Use captions/transcripts and descriptive alt text. No platform account changes, uploads, DMs or posts.

| Draft / format / timing | Exact draft copy or script | Destination / evidence / intended action |
| --- | --- | --- |
| SD1 Instagram carousel, evergreen, T+2 proposed | Slide 1: "Your birth time is uncertain. Your chart should say so." Slide 2: "Rising sign and houses depend on birth time." Slide 3: "The Moon can also cross a sign or Nakshatra boundary during the day." Slide 4: "A noon guess is not a recorded birth time." Slide 5: "Read what is still possible before creating a chart." Caption: "Use the details you know, and keep uncertainty visible. Our guide explains what changes when the birth time is missing. Read the guide at VedicHour." | A02; prerequisite remove unverified probabilities and align safe flow; learn first, not fear/purchase. Optional tags: #Kundli #VedicAstrology |
| SD2 X thread, evergreen, T+4 proposed | 1: "A Vedic chart has calculated placements and traditional interpretations. They are not the same thing." 2: "Check the date, local birth time, place and calculation settings before comparing two charts." 3: "When the time is uncertain, some details need to stay provisional. A complete-looking chart is not proof that the inputs were complete." 4: "Start with the free chart facts, then read what each label means: https://www.vedichour.com/blog/how-to-read-kundli" | A01 + method receipt; useful guide visit then free chart; no authorship superiority |
| SD3 Instagram reel, evergreen, T+7 proposed | Voiceover: "A planetary hour is not always a clock hour. Hora divides daylight into twelve parts, then the night into twelve more. Sunrise and sunset depend on the place and date. VedicHour's sample grid uses clock-hour windows, so check which kind of time you're reading. See the worked explanation at VedicHour." On-screen labels: "Hora" / "Clock-hour window" / "Example, not your forecast" | A03; 20-30 seconds proposed; show reviewed original diagram/example, no generated visual credit spend |
| SD4 X single post, evergreen, T+10 proposed | "A matching score out of 36 is not a percentage chance that a relationship will succeed. Read the factors, check the birth details, and keep real conversations at the centre. Our guide: https://www.vedichour.com/blog/gun-milan-score-marriage" | A09; no partner verdict, no targeting people based on relationship distress |
| SD5 Instagram static + caption, release-dependent, T0 proposed | Image heading: "Your free chart, explained." Caption: "VedicHour starts with chart facts from your birth details, with the traditional terms explained in plain English. Check the time and place, read the limits, and correct the details when needed. The chart tools need no sign-up or card. New paid purchases are unavailable. Explore the free Kundli at VedicHour." | `/free-kundli`; prerequisite verified ungated result, input edit and availability page |

Use per-asset UTM codes without sensitive data only under approved measurement policy. Metric is valid result or relevant article action per attributed visit, with source/denominator; saves, comments and impressions are context, not proof of product efficacy or revenue. No popularity or optimal posting-time assertions. Moderation draft: "Please don't post birth details or another person's chart publicly. General method questions are welcome; personal medical, legal or financial decisions need qualified support." Do not diagnose or perform private chart readings in comments.

## Launch Draft: Free Utility Release, Not Paid Activation

No launch date selected. **T0 means an owner-approved release after evidence gates pass**, not 15 October by default. No readiness score fabricated. Role labels below are proposed owners, not claims that separate human reviewers have signed off.

| Phase | Channel / proposed owner | Work and evidence gate |
| --- | --- | --- |
| T-7 to T-3 | Owned: product/editorial | Verify free result, input uncertainty, copy/metadata/schema/AI alignment, examples, helpful errors and safe historical access; finish A01-A03 and correction/help paths |
| T-3 to T-1 | Rented: social/editorial | Prepare SD1-SD5 with original assets, captions and checks; choose actual owned channel only after owner permission. No publish/schedule now |
| T-7 to T-1 | Borrowed: founder/community | Draft a factual request for one permitted educational/community mention; verify community rules and existing relationship. No unsolicited outreach or purchased links |
| T0 | Product/release owner | Confirm deployed SHA and live evidence on direct calculator/article/pricing routes; monitor failures; do not announce unverified saving/export/paid availability |
| T0 to T+2 | Owned then rented: owner | Only after explicit approval, publish a small truthful release note; operational signoff separate from campaign authorisation. Paid SEM remains held |
| T+3 to T+7 | Support/editorial | Review consented feedback and coarse error counts; repair confusing copy and documentation. Do not label internal synthetic tests as customer interviews |
| T+8 to T+14 | Editorial/analytics | Evaluate foundational article-to-tool usefulness and attribution coverage; decide next improvement from evidence, not content volume |
| T+15 to T+30 | Product/research owner | Plan authorised observation with real adults and informed consent, minimal personal data, task-based questions and transparent compensation; no research actually conducted here |

Proposed no-go conditions: unsupported free/paid promise; owner-scope failure; absent uncertainty handling; broken calculation/city recovery; unresolved privacy/consent language; stale misleading structured data; unavailable support route; unlicensed/copied asset; inability to bound authorised costs. Primary's broader release gate still applies. Incident plan: owner pauses campaign/public promotion, records release/time and actual failure, invokes the documented rollback process if warranted and re-verifies; this worker performs no deployment or rollback.

### Exact Announcement Draft

"VedicHour's free chart tools are built around a simple starting point: your birth details and the chart facts they support. See the traditional terms in plain English, check uncertain birth times, and edit the details before relying on a result. No sign-up or card is needed for the free chart. New paid purchases are currently unavailable. Start here: https://www.vedichour.com/free-kundli"

Publication requires primary's evidence that every stated feature works. Do not use this as a message saying the release has already happened.

Borrowed-channel draft, not sent: "We're preparing a free Vedic birth-chart utility with plain-English labels and visible birth-time limits. Would an educational guide on what can and cannot be read without a birth time suit your community? We can provide an original example and its calculation assumptions. No paid offer, copied assets or reciprocal ranking links are involved." Recipient and permission must be established separately.

## Lifecycle Drafts: No Sending

These are proposed **templates**, not new email jobs or drafts stored in an account. Consent and channel preference must be verified; transactional purpose does not authorise promotional follow-up. No address, list size or existing consent is assumed. Signed/private chart links need authentication and expiry; never put birth details or report results in subject lines, analytics URLs or public previews.

| ID / trigger and suppression | Subject / exact body draft | Action / dependencies |
| --- | --- | --- |
| LC1, after a verified save and explicit request for an email link; suppress if save/delivery not requested | Subject: "Your saved VedicHour chart". Body: "Your chart is saved to your account. Sign in to view it, check the birth details or make a correction. If the birth time is approximate, keep that in mind when reading time-sensitive details." | "Open my saved chart" -> owner-safe authenticated destination. Requires free-save and transactional delivery support; not sent |
| LC2, one optional education message only to a confirmed update subscriber after result; suppress if unsubscribed, bounced or no consent | Subject: "A starting point for reading your chart". Body: "Start with the rising sign, Moon sign and birth star, then read how the houses and planetary periods are used in the tradition. Our beginner's guide follows that order and explains the limits. It is a guide to interpretation, not a promise about your future." | "Read the beginner's guide" -> A01; include functioning unsubscribe/preference controls. No claim about a user's personal result |
| LC3, optional one-time return reminder after seven days only for separately opted-in saved-chart reminder; suppress if already returned or preference revoked | Subject: "Your chart is there when you need it". Body: "You can return to your saved chart to check its details or revisit the guide. Nothing new needs to be purchased. If you no longer want chart reminders, turn them off in your preferences." | "View saved results" -> `/account` only if verified; no assumed implementation of reminder preferences; no repeated nagging |
| LC4, transactional response to user-requested recovery/help; suppress if issue resolved or no request | Subject: "Help with your VedicHour result". Body: "If your saved result will not open, check that you are signed in to the account that saved it. Try again, or contact support with the error message. Please do not email card details or another person's birth information." | Link verified help/support path; no unsupported promise of a completed repair |
| LC5, unavailable-paid action, on-page only, not an email trigger | "New paid purchases are currently unavailable. The free chart tools are available without a card. Existing reports remain in your account where access is supported." | Free tool + sign-in/support; historical-access clause requires verification. No waitlist or availability email unless separately chosen |

Cadence, consent interpretation, preference UI, deliverability, real template tests and all external sending require owner approval. Do not use unfinished-form birth data for remarketing, create an abandoned-checkout flow or enrol users by calculation.

## Pending Dependencies and Handoff

1. **Primary/product:** full original attachment reconciliation, final free/paid availability contract, known/approximate/unknown behaviour, sample provenance, persisted-result ownership and actual live release checks.
2. **Engineering/security:** consistent paid gating in public copy/schema/AI files and server actions; safe URL sanitation; private noindex/ownership/consent tests; no new events without allowlist updates.
3. **Editorial/calculation:** source-specific rule review, original example outputs, numerical reproduction receipts and maintenance owners for A01-A20. Swiss Ephemeris method reference is not proof of product accuracy or licensing; library/license review belongs to primary.
4. **Commercial/finance:** unresolved commercial and processor eligibility, taxes, account-specific fees, measured costs and future paid value testing. No eligibility claim or new paid activation here.
5. **Analytics/research:** consented telemetry coverage and Search Console/Bing read access; actual user task observation. No synthetic/customer conversion claims.
6. **Channel owner:** explicit authorisation for any publication, outreach, email, ad account use or spend. Every launch/SEM/social/lifecycle item remains a draft.

All evidence is embedded in the three owned files; primary may incorporate it into `EVIDENCE.md`. No product edits or commit by this reviewer.

## Implementation Addendum: Three Foundational Articles

**2026-10-15 follow-up authorisation:** implement only the three named article modules and append implementation evidence to this plan and the growth review. This addendum supersedes the earlier documentation-only status for these three articles, not the wider release or campaign gates. The named slugs match A01-A03; none were substituted or added to the registry.

| Proposal / source | Implemented local repair | Status and limit |
| --- | --- | --- |
| A01 `src/content/blog/how-to-read-kundli.ts` | Preserved chart-style, house and planet teaching tables. Added actual Known/Approximate/Unknown contract, distinguished the free facts snapshot from a full diagram, labelled the Aries/Mars example invented, removed unsupported commonness/rounding and paid-quiz promises; linked the free tool, example, methodology and task-filtered help | Source edited and existing blog/SEO tests passed. No new report generation, rendered journey, build or deployment claimed |
| A02 `src/content/blog/kundli-without-birth-time.ts` | Removed all asserted probabilities/frequencies, the unreproduced 20,000-date claim, noon-accuracy claims, claimed noon-to-dasha error bound and two-guesses-as-proof instructions. Preserved useful dependency guidance and birth-record steps. Unknown does not compute; Approximate calculates only one estimate with all results provisional and no interval/confidence check. Labelled 09:00 input example invented | Source edited and existing blog/SEO tests passed. No date-only or partial-chart feature, recovered birth time or individual reliability claim introduced |
| A03 `src/content/blog/hora-planetary-hours-guide.ts` | Preserved weekday ruler and traditional-association tables. Removed real Delhi timing assertion, unsupported 45-75-minute range and surgery-timing suggestion. Added explicitly invented arithmetic, actual 60-minute forecast grid versus variable sunrise-based horas, greatest-overlap labelling, and free-tool/help/example actions with no new paid offer | Source edited and existing blog/SEO tests passed. Arithmetic verified; no city-specific ephemeris calculation or outcome validation performed |

The required `BlogPost` shape was read and retained. Original `date` values and slugs stay unchanged; all three substantive repairs have `updated: '2026-10-15'`. Linkable primary methodology citations in the article HTML: [Astrodienst Swiss Ephemeris interface](https://www.astro.com/swisseph/swephprg.htm), rechecked 2026-10-15, sections 9.2/12.1/15.2 or 8.12/8.12.1 as relevant; [Drik Panchang's official hora page](https://www.drikpanchang.com/muhurat/hora.html), rechecked through its homepage link on the same date, supports the hora sequence and location-bound tables. No vendor table or asset copied; citations do not establish predictive efficacy or licence compliance.

Contract read from current `BirthDetailsInput`, `ChartTool`, `src/lib/tools/birth.ts` and `/api/tools/chart`: the free tool requires time certainty, rejects Unknown before calculation, and labels Approximate as a single-estimate result without an interval check. Fixed-window distinction read from `ephemeris-service/main.py` (`_hora_spans`, `_pick_dominant`, fixed-hour output loop); source inspection is not a fresh engine correctness test. Help article data and query/anchor behaviour were also inspected; links use `/help?q=...#topic`, whose result contains the intended help topic.

Executed verification: `npm test -- src/__tests__/blogIndex.test.ts src/__tests__/seoMetadata.test.ts` passed **14/14 tests across 2 files** on the corrected run. The first run passed registry but failed the existing internal-link resolver on six new dynamic help links; links were changed within the authorised articles to the supported task-filtered help page, then the same suite passed. No test source edited. Focused local assertions passed for original dates, updated dates, primary-method links, labelled invented examples, removed claims, free actions, all help query/anchor matches, and invented 55/65-minute arithmetic. `git diff --check` passed for the article edits. Full build and integrated/browser release verification remain with main.

Write scope in this follow-up: exactly these three source modules plus append-only updates to this plan and `INDEPENDENT-REVIEWS/growth-competitors.md`. `MESSAGING-AND-PRICING.md`, registry, tests, other product source and primary's `EVIDENCE.md` were not edited. No purchase, paid model call, campaign, email, outreach, commit or push.
