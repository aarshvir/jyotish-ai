# v7 — UX audit + claims reconciliation

Scope: code-level end-to-end audit of the current branch after commits `2cfc845`, `50a58e2`, `d38bcd8`, `5255086`, and `f435437`. I did not mutate product source. Anything requiring live Ziina, Supabase production data, or real webhooks is marked ❓.

## 1. Workflow audit

### 1.1 First-time visitor → free Kundli

Steps: the visitor lands on `/`, sees the hero CTA to `/onboard?plan=free` at `src/components/landing/Hero.tsx:69`, is immediately redirected to `/login?next=/onboard...` when unauthenticated at `src/app/onboard/_OnboardForm.tsx:578`, creates/signs into an account, returns to the three-step onboarding form, enters name/email, birth date/time/city, optionally current city, chooses Free, and triggers `/api/reports/start` at `src/app/onboard/_OnboardForm.tsx:895`. The report page then polls status, starts background generation if needed, and eventually renders the report at `src/app/(app)/report/[id]/page.tsx:1342`.

Friction: the “Free Kundli” CTA does not disclose the account wall before data entry; that is a conversion shock because the landing copy says “no card needed,” not “account required” (`src/components/landing/FreeKundli.tsx:54`, `src/app/onboard/_OnboardForm.tsx:578`). The free flow can continue after geocoding failure with `birth_lat: form.birthLat ?? 0` and `birth_lng` equivalent in both the ephemeris pre-call and report start payload (`src/app/onboard/_OnboardForm.tsx:799`, `src/app/onboard/_OnboardForm.tsx:914`), so a user who typed an unrecognized city may silently get a chart anchored near 0,0 while marketing promises auto-geocoded precision (`src/components/landing/HowItWorks.tsx:5`). Copy also says “instantly” (`src/components/landing/FreeKundli.tsx:55`) while the FAQ says 3-8 minutes (`src/lib/faq-data.ts:36`).

Dead ends: if `/api/reports/start` fails, onboarding shows an error and in some catch paths still navigates to the report page “relying on report page retry” (`src/app/onboard/_OnboardForm.tsx:935`, `src/app/onboard/_OnboardForm.tsx:948`). That is recoverable, but the mental model is poor: the user clicked a free report button and lands on a generation screen that may need retry. The report page’s failed state is much better: it surfaces generation trace IDs, diagnostic copy, “Copy diagnostics,” and “Try Again” (`src/app/(app)/report/[id]/page.tsx:1119`, `src/app/(app)/report/[id]/page.tsx:1129`). However, completed free reports show Markdown and PDF buttons (`src/app/(app)/report/[id]/page.tsx:1288`, `src/app/(app)/report/[id]/page.tsx:1298`), conflicting with pricing rows that treat export as a paid feature (`src/components/landing/PricingComparison.tsx:47`).

Mobile/accessibility: onboarding is a centered `max-w-md` flow (`src/app/onboard/_OnboardForm.tsx:962`, `src/app/onboard/_OnboardForm.tsx:969`) with long Step 2 content; at 320px/375px, the date/time/city/current-city inputs and the non-sticky bottom CTA force keyboard scroll recovery. The landing nav hamburger is `h-10 w-10`, under the 44px target recommendation (`src/components/shared/Navbar.tsx:118`). The sample report tabs expose tab roles (`src/components/landing/SampleReportPreview.tsx:223`, `src/components/landing/SampleReportPreview.tsx:233`) but no arrow-key tab behavior is evident around their click-only state update.

### 1.2 First-time visitor → paid 7-day report

Steps: from landing the visitor can click Pricing cards in the landing Pricing section or `/pricing`; the 7-day CTA routes to `/onboard?plan=7day` (`src/components/landing/Pricing.tsx:196`, `src/app/pricing/page.tsx:39`). Onboarding redirects to login if unauthenticated (`src/app/onboard/_OnboardForm.tsx:578`), collects chart data, then posts `/api/ziina/create-intent` with `planType`, `reportId`, and optional promo code (`src/app/onboard/_OnboardForm.tsx:854`, `src/app/onboard/_OnboardForm.tsx:856`). Ziina returns to `/api/ziina/verify`, which redirects to the report on completion (`src/app/api/ziina/verify/route.ts:90`, `src/app/api/ziina/verify/route.ts:141`).

Friction: the paid flow is fragile after a failed/cancelled payment. The onboarding handler explicitly preserves only step/payment state and notes form fields are reset on full navigation (`src/app/onboard/_OnboardForm.tsx:664`, `src/app/onboard/_OnboardForm.tsx:682`). A user returning from Ziina can be sent back to step 3 with partial/default form state rather than their exact birth data. The launch discount banner says “Apply the code at checkout” but does not show the code (`src/components/shared/LaunchBanner.tsx:42`), and onboarding says “enter your promo code above” although the field is below the notice (`src/app/onboard/_OnboardForm.tsx:471`, `src/app/onboard/_OnboardForm.tsx:483`).

Dead ends: if Ziina is unconfigured, create-intent returns an error (`src/app/api/ziina/create-intent/route.ts:160`), but the user-facing copy is the generic `setError` path in onboarding rather than a guided recovery. If Ziina completes but Inngest is missing, finalization logs that it cannot auto-start generation (`src/lib/ziina/finalizeIntent.ts:133`); the report page may recover by calling `/api/reports/start`, but that is a hidden backstop, not an obvious payment recovery promise.

Mobile/accessibility: `/pricing` has an annual card, but the landing Pricing component does not expose annual as a visible card even though it stores annual prices (`src/components/landing/Pricing.tsx:10`, `src/components/landing/Pricing.tsx:17`). At mobile widths, a user comparing plans on the landing cannot directly choose Annual from the card set, then later sees Annual in PricingComparison (`src/components/landing/PricingComparison.tsx:59`), which is inconsistent.

### 1.3 First-time visitor → Monthly Oracle

Steps mirror 7-day, with `/onboard?plan=monthly` from landing or pricing (`src/components/landing/Pricing.tsx:59`, `src/app/pricing/page.tsx:58`). Payment is routed through Ziina and verified before report generation (`src/app/api/ziina/create-intent/route.ts:61`, `src/app/api/ziina/verify/route.ts:141`).

Friction: Monthly is marketed as the first tier with nativity deep-dive/PDF/Markdown in PricingComparison (`src/components/landing/PricingComparison.tsx:18`, `src/components/landing/PricingComparison.tsx:47`), but the report renderer does not gate Nativity, MonthlyAnalysis, WeeklyAnalysis, DailyAnalysis, PDF, or Markdown by plan (`src/app/(app)/report/[id]/page.tsx:1342`, `src/app/(app)/report/[id]/page.tsx:1403`, `src/app/(app)/report/[id]/page.tsx:1288`). This weakens the upgrade ladder and creates support risk if free/7-day users expect or receive too much.

Dead ends: if report generation takes too long, the client waits 15 minutes before a terminal error (`src/app/(app)/report/[id]/page.tsx:92`, `src/app/(app)/report/[id]/page.tsx:465`). Dashboard treats generating reports as stale after 30 minutes (`src/app/(app)/dashboard/page.tsx:85`, `src/app/(app)/dashboard/page.tsx:87`), so recovery messaging differs by surface.

### 1.4 First-time visitor → Annual Oracle

Steps: `/pricing` has an Annual Oracle card linking to `/onboard?plan=annual` (`src/app/pricing/page.tsx:66`, `src/app/pricing/page.tsx:79`), and onboarding supports `annual` in its plan type union and report type list (`src/app/onboard/_OnboardForm.tsx:12`, `src/app/onboard/_OnboardForm.tsx:77`). Ziina has annual amounts in AED/USD/INR (`src/lib/ziina/server.ts:29`).

Friction/dead end: Annual is materially oversold. Landing and comparison copy call it “365 days” and “Annual Varshaphala” (`src/components/landing/PricingComparison.tsx:41`, `src/components/landing/PricingComparison.tsx:59`, `src/components/landing/FinalCTA.tsx:20`), but the orchestrator uses only `30` daily days for both monthly and annual (`src/lib/reports/orchestrator.ts:894`), and the report type invariant only models 12 months, 6 weeks, and daily arrays, not 365 daily entries (`src/lib/agents/types.ts:225`, `src/lib/agents/types.ts:226`, `src/lib/agents/types.ts:548`). There is no solar-return Varshaphala-specific calculation in the cited annual generation path; it is a 30-day forecast plus 12 monthly themes.

Mobile: because landing Pricing omits the annual plan card (`src/components/landing/Pricing.tsx:17`) while later comparison includes Annual (`src/components/landing/PricingComparison.tsx:59`), mobile users may scroll through a long comparison and not find a matching purchase CTA nearby.

### 1.5 Returning user → login → dashboard → new report

Steps: user goes to `/login`, uses Google or email/password (`src/app/login/_LoginForm.tsx:58`, `src/app/login/_LoginForm.tsx:85`), gets redirected to `next` or `/dashboard` (`src/app/login/_LoginForm.tsx:109`), dashboard loads profile/reports/payments in parallel (`src/app/(app)/dashboard/page.tsx:394`), and clicks `+ New Report` to `/onboard` (`src/app/(app)/dashboard/page.tsx:569`).

Friction: dashboard load errors only say “Could not load your reports. Please refresh” with no retry affordance (`src/app/(app)/dashboard/page.tsx:413`). The tab bar is a row of buttons driven by `activeTab` (`src/app/(app)/dashboard/page.tsx:598`, `src/app/(app)/dashboard/page.tsx:608`), but it lacks tablist semantics and explicit focus-visible styling in that button class, unlike the FAQ which does add accessible expansion attributes (`src/components/landing/FAQ.tsx:54`). Settings now shows a CurrencySwitcher (`src/app/(app)/dashboard/page.tsx:824`), but it is not saved to profile or respected by checkout.

### 1.6 Returning user → dashboard → past report

Steps: dashboard fetches reports, renders cards, and complete report cards link to `/report/{id}` (`src/app/(app)/dashboard/page.tsx:394`, `src/app/(app)/dashboard/page.tsx:279`). Report page loads stored data and renders report sections (`src/app/(app)/report/[id]/page.tsx:911`, `src/app/(app)/report/[id]/page.tsx:1342`).

Friction: filtered empty states are weak. The all-reports empty state offers a generate CTA, but a filtered empty state only says no reports match the filter (`src/app/(app)/dashboard/page.tsx:731`, `src/app/(app)/dashboard/page.tsx:736`). For very old reports, dashboard date formatting is simple month/year (`src/app/(app)/dashboard/page.tsx:82`), but there is no stale-data warning that a six-month-old forecast may be obsolete. Past reports can be shared by copying a URL (`src/app/(app)/report/[id]/page.tsx:1250`), yet the report route requires auth and ownership, so “share link” is misleading for recipients.

### 1.7 Failed payment → recovery

Ziina cancel redirects to `/onboard?plan=...&payment=cancelled` before requiring an intent (`src/app/api/ziina/verify/route.ts:28`). Failed/pending/incomplete intents redirect back with `payment=failed|pending|incomplete` (`src/app/api/ziina/verify/route.ts:80`, `src/app/api/ziina/verify/route.ts:87`). Onboarding reads those params and tries to surface a banner (`src/app/onboard/_OnboardForm.tsx:664`).

Recovery gap: only the payment status and stored report ID survive in `sessionStorage` (`src/app/onboard/_OnboardForm.tsx:682`, `src/app/onboard/_OnboardForm.tsx:871`); form data is not durable. If the browser blocks storage, the recovery path is weaker (`src/app/onboard/_OnboardForm.tsx:686`). There is no “resume payment” using an existing pending intent except server-side reuse within 90 seconds (`src/app/api/ziina/create-intent/route.ts:94`, `src/app/api/ziina/create-intent/route.ts:116`).

### 1.8 Failed report → recovery

This is the strongest recovery surface. `/api/reports/start` writes `generation_trace_id` (`src/app/api/reports/start/route.ts:424`), `/status` returns generation errors and trace IDs (`src/app/api/reports/[id]/status/route.ts:212`), failures are normalized to CTA kinds (`src/lib/reports/reportErrors.ts:188`), and the report page exposes diagnostics plus retry (`src/app/(app)/report/[id]/page.tsx:1119`, `src/app/(app)/report/[id]/page.tsx:1129`). The main UX issue is timing: a user may wait 15 minutes on the report page before the client times out (`src/app/(app)/report/[id]/page.tsx:92`), while ops guidance says stuck paid users need action after 30 minutes (`docs/runbook/launch-day-support.md:92`).

### 1.9 Currency switching → user takes action

Manual currency switching is display-only for checkout. CurrencySwitcher persists `vh_currency` to localStorage/cookie (`src/components/landing/CurrencySwitcher.tsx:39`, `src/components/landing/CurrencySwitcher.tsx:43`), but create-intent selects currency exclusively from `x-vercel-ip-country` (`src/app/api/ziina/create-intent/route.ts:57`, `src/app/api/ziina/create-intent/route.ts:58`). `/api/geo` also uses the country header (`src/app/api/geo/route.ts:12`, `src/app/api/geo/route.ts:13`), and middleware injects `x-currency` from country, not the cookie (`middleware.ts:14`, `middleware.ts:15`). Result: a US user selecting INR sees INR on landing, then Ziina charges USD. Dashboard will display the stored payment currency (`src/app/api/user/payments/route.ts:47`, `src/app/(app)/dashboard/page.tsx:95`), so the dashboard will show what Ziina charged, not what the user selected.

### 1.10 Hindi waitlist → user signs up

Steps: the landing includes HindiWaitlist after Testimonials (`src/app/(marketing)/page.tsx:111`, `src/app/(marketing)/page.tsx:112`). The CTA is intentionally backend-free and opens a `mailto:` to support with a prebuilt subject/body (`src/components/landing/HindiWaitlist.tsx:4`, `src/components/landing/HindiWaitlist.tsx:29`, `src/components/landing/HindiWaitlist.tsx:50`).

Friction: this does not “sign up” the user in product; it relies on the user’s mail client. Users without a configured mail client hit a dead end. There is no server capture, no success state, and no analytics except the browser leaving to mail. The copy says citations will remain intact in Hindi (`src/components/landing/HindiWaitlist.tsx:46`), but the actual reporting stack is English-only unless future work adds translation.

### 1.11 Mobile flow for journeys 1-4 at 320px / 375px / 768px

At 320px and 375px, the main hazards are target size, long forms, and horizontal preview charts. Navbar hamburger is 40px square (`src/components/shared/Navbar.tsx:118`), LaunchBanner close is a small absolute `p-1.5` button (`src/components/shared/LaunchBanner.tsx:55`), and report export buttons use `py-1.5 text-xs` (`src/app/(app)/report/[id]/page.tsx:1289`, `src/app/(app)/report/[id]/page.tsx:1301`). HourlyPreview intentionally creates horizontal scroll with `overflow-x-auto` and `min-w-[600px]` (`src/components/landing/HourlyPreview.tsx:65`, `src/components/landing/HourlyPreview.tsx:84`). At 768px, layout is safer, but the 100svh hero (`src/components/landing/Hero.tsx:20`) plus banner/nav means the next section may not be visible, and pricing comparison still requires heavy vertical scanning.

### 1.12 Refund request flow

Steps: user reads `/refund`, emails `support@vedichour.com`, and waits for manual processing. The policy promises a full refund within 24 hours and no questions (`src/app/refund/page.tsx:25`, `src/app/refund/page.tsx:64`). Eligibility oddly requires the report to have been successfully generated and delivered (`src/app/refund/page.tsx:26`), but the technical issue section says nondelivery entitles the user to regeneration or refund (`src/app/refund/page.tsx:30`).

Operational mismatch: refunds are manual. The SOP says issue the refund in Ziina dashboard and update Supabase `payment_status` to `refunded` (`docs/runbook/refund-sop.md:27`, `docs/runbook/refund-sop.md:39`). The webhook explicitly skips `refund.status.updated` (`src/app/api/ziina/webhook/route.ts:82`). Dashboard copy says “All payments are final” before mentioning refunds (`src/app/(app)/dashboard/page.tsx:778`), which contradicts the no-questions posture.

## 2. Claims-vs-offerings

### 2.1 Hero TRUST_STATS

- ❓ `12,000+ charts generated`: hard-coded in Hero and SocialProof (`src/components/landing/Hero.tsx:6`, `src/components/landing/SocialProof.tsx:12`). I found no code path that queries a global report count; dashboard counts only the signed-in user's reports (`src/app/(app)/dashboard/page.tsx:481`).
- ❓ `★ 4.8 from 340+ seekers`: hard-coded in Hero/Testimonials (`src/components/landing/Hero.tsx:7`, `src/components/landing/Testimonials.tsx:89`). No reviews table/API/package integration is visible.
- ✅ `18 hourly Vedic windows/day`: generated by `SLOT_COUNT = 18`, looped in daily grid, and validated as exactly 18 slots (`ephemeris-service/main.py:1394`, `ephemeris-service/main.py:1641`, `src/lib/validation/reportValidation.ts:197`).
- ⚠️ `24h no-questions refund`: public policy and SOP exist (`src/app/refund/page.tsx:25`, `docs/runbook/refund-sop.md:4`), but enforcement is manual and refund webhook events are skipped (`src/app/api/ziina/webhook/route.ts:82`).

### 2.2 UseCases

- ⚠️ Muhurta: hora/choghadiya/Rahu Kaal timing exists (`ephemeris-service/main.py:1572`, `ephemeris-service/main.py:1575`, `ephemeris-service/main.py:1685`), but there is no dedicated wedding/property/interview muhurta workflow despite that claim (`src/components/landing/UseCases.tsx:13`).
- ⚠️ Janam Kundali: natal chart includes planets, Ketu, Moon nakshatra, current dasha, and yogas (`ephemeris-service/main.py:358`, `ephemeris-service/main.py:400`, `ephemeris-service/main.py:423`, `ephemeris-service/main.py:425`, `ephemeris-service/main.py:426`). Dignities are LLM-requested in NativityAgent (`src/lib/agents/NativityAgent.ts:90`) rather than deterministic ephemeris output.
- ⚠️ Dasha-bhukti: current Mahadasha/Antardasha exists (`ephemeris-service/main.py:247`, `ephemeris-service/main.py:425`), but “the one thing not to miss in the next 6 months” is marketing copy, not a distinct six-month product (`src/components/landing/UseCases.tsx:42`).
- ⚠️ Gochara: transit-lagna and planet positions are used in daily grid/report presentation (`ephemeris-service/main.py:1662`, `src/app/(app)/report/[id]/page.tsx:1208`), but major shift detection is partly static/hinted rather than a comprehensive Saturn/Jupiter/Rahu/Ketu alert engine (`src/lib/reports/orchestrator.ts:1584`).
- ❌ Ashtakoot Milan: 36-point Moon-based Ashtakoot exists (`src/lib/synastry/ashtakoot.ts:2`, `src/lib/synastry/ashtakoot.ts:153`), including Bhakoot (`src/lib/synastry/ashtakoot.ts:126`), but the claim adds Lagna, Mangal Dosha, and citations (`src/components/landing/UseCases.tsx:73`), which are not present in the synastry compute route (`src/app/api/synastry/compute/route.ts:121`).
- ❌ Annual Varshaphala: Annual is not a 365-day daily or solar-return report. Annual gets 30 daily days (`src/lib/reports/orchestrator.ts:894`) plus 12 monthly summaries (`src/lib/agents/types.ts:225`, `src/app/(app)/report/[id]/page.tsx:1403`).

### 2.3 SampleReportPreview

⚠️ The preview resembles the report structure but contains several launch-danger issues. It says “No demo data” (`src/components/landing/SampleReportPreview.tsx:217`) while the component comment says it is a plausible mock sample (`src/components/landing/SampleReportPreview.tsx:4`). Cancer sample metadata says current MD Jupiter / AD Mercury (`src/components/landing/SampleReportPreview.tsx:40`, `src/components/landing/SampleReportPreview.tsx:41`), but the dasha timeline marks Rahu current (`src/components/landing/SampleReportPreview.tsx:147`). The nativity copy says a Cancer-lagna native has a “Jupiter-ruled lagna lord” (`src/components/landing/SampleReportPreview.tsx:51`), which is astrologically wrong because Cancer's lagna lord is Moon. The hourly sample says 18 windows (`src/components/landing/SampleReportPreview.tsx:97`) but renders only the hard-coded eight `slots` visible around `src/components/landing/SampleReportPreview.tsx:84`. A real report validates 18 slots per day (`src/lib/validation/reportValidation.ts:197`), so the sample does not faithfully preview the delivered artifact.

### 2.4 VedicVsWestern

- ✅ Sidereal Lahiri: Swiss Ephemeris is set to Lahiri (`ephemeris-service/main.py:29`) and sidereal flags are used (`ephemeris-service/main.py:140`).
- ✅ Whole-sign houses: ascendant/whole-sign logic is explicit (`ephemeris-service/main.py:172`, `ephemeris-service/main.py:188`, `ephemeris-service/main.py:376`).
- ✅ Vimshottari dasha: implemented and returned (`ephemeris-service/main.py:197`, `ephemeris-service/main.py:247`, `ephemeris-service/main.py:425`).
- ✅ Hora + Choghadiya + Rahu Kaal: implemented as endpoints and daily-grid inputs (`ephemeris-service/main.py:470`, `ephemeris-service/main.py:524`, `ephemeris-service/main.py:579`, `ephemeris-service/main.py:1681`).
- ⚠️ Scripture-grounded: paid reports require grounding unless RAG is off (`src/lib/reports/orchestrator.ts:345`, `src/lib/reports/orchestrator.ts:1017`), but this depends on environment mode and retrieved context; it is not universally guaranteed for every sentence.

### 2.5 PricingComparison (feature-by-feature)

- ✅ Free Kundli, Lagna/Moon/Nakshatra, current MD/AD: ephemeris returns natal chart, Moon nakshatra, and current dasha (`ephemeris-service/main.py:422`, `ephemeris-service/main.py:423`, `ephemeris-service/main.py:425`).
- ⚠️ Nativity deep-dive / 40-page reading: NativityCard renders when report data exists (`src/app/(app)/report/[id]/page.tsx:1342`), but there is no plan gate and “40-page” is not measurable in code.
- ⚠️ All 9 grahas with dignities: all grahas are generated including Ketu (`ephemeris-service/main.py:358`, `ephemeris-service/main.py:400`); dignities are LLM fields, not deterministic ephemeris fields (`src/lib/agents/NativityAgent.ts:90`).
- ⚠️ Yogas + scripture citations: yoga detection exists (`src/lib/rag/yogaDetector.ts:106`), citations render if present (`src/components/report/NativityCard.tsx:121`, `src/components/report/ScriptureFootnotes.tsx:21`), but coverage depends on RAG and LLM output.
- ⚠️ Hora schedule 24/day: ephemeris has 24 horas (`ephemeris-service/main.py:492`, `ephemeris-service/main.py:505`), but the report product foregrounds 18 daytime hourly slots (`ephemeris-service/main.py:1639`).
- ⚠️ Choghadiya 8/day: the service computes day and night choghadiyas, 16 total (`ephemeris-service/main.py:547`, `ephemeris-service/main.py:560`); report slots show dominant choghadiya, not a standalone 8-muhurta table (`ephemeris-service/main.py:1682`).
- ✅ Rahu Kaal warnings and 18 hourly windows: daily grid includes `is_rahu_kaal` and exactly 18 slots (`ephemeris-service/main.py:1685`, `src/lib/validation/reportValidation.ts:197`).
- ⚠️ AI narrative per day: daily overviews and hourly commentary are generated, but fallbacks and validation boundaries exist (`src/lib/reports/orchestrator.ts:1327`, `src/lib/reports/orchestrator.ts:1514`).
- ✅/⚠️ 30-day complete forecast: monthly and annual both produce 30 days (`src/lib/reports/orchestrator.ts:894`). Good for monthly, bad for annual.
- ❌ 12-month annual Varshaphala: 12 months exist for all reports (`src/lib/agents/types.ts:225`, `src/app/(app)/report/[id]/page.tsx:1403`), but not annual-only and not solar-return Varshaphala.
- ⚠️ Weekly synthesis / monthly theme analysis: weeks/months render generally (`src/app/(app)/report/[id]/page.tsx:1403`, `src/app/(app)/report/[id]/page.tsx:1407`), not tier-gated to month+.
- ❌/⚠️ PDF and Markdown export: PricingComparison says exports are paid (`src/components/landing/PricingComparison.tsx:47`, `src/components/landing/PricingComparison.tsx:48`), but report page exposes both buttons for any completed report (`src/app/(app)/report/[id]/page.tsx:1288`, `src/app/(app)/report/[id]/page.tsx:1298`).
- ❌ Priority generation queue: I found no annual-specific priority queue branch; report start dispatch mode is generic Inngest/inline (`src/app/api/reports/start/route.ts:533`, `src/app/api/reports/start/route.ts:548`).
- ⚠️ 24h refund: manual, not code-enforced (`docs/runbook/refund-sop.md:27`, `src/app/api/ziina/webhook/route.ts:82`).

### 2.6 Testimonials

❓ The testimonials are hard-coded marketing copy (`src/components/landing/Testimonials.tsx:13`, `src/components/landing/Testimonials.tsx:20`, `src/components/landing/Testimonials.tsx:27`, `src/components/landing/Testimonials.tsx:34`, `src/components/landing/Testimonials.tsx:41`) and repeat unverified social proof (`src/components/landing/Testimonials.tsx:89`). Feature references mostly map to real surfaces: hourly windows (`ephemeris-service/main.py:1641`), dasha (`ephemeris-service/main.py:425`), Choghadiya (`ephemeris-service/main.py:1682`), Lahiri (`ephemeris-service/main.py:29`), and PDF (`src/app/(app)/report/[id]/page.tsx:1298`). The annual/property-purchase quote is risky because Annual is only 30 daily days plus monthly themes (`src/lib/reports/orchestrator.ts:894`).

### 2.7 FAQ

⚠️ Mostly accurate with important exceptions. Swiss/Lahiri/Vimshottari claims match implementation (`src/lib/faq-data.ts:12`, `ephemeris-service/main.py:29`, `ephemeris-service/main.py:197`). Free Kundli “sample hora schedule” understates/contradicts the current generated report, which can include more than a sample (`src/lib/faq-data.ts:20`, `src/lib/reports/orchestrator.ts:894`). “Any date range” and “365 days” are false for annual daily output (`src/lib/faq-data.ts:12`, `src/lib/faq-data.ts:20`, `src/lib/reports/orchestrator.ts:894`). FAQ says commentary uses Anthropic Claude (`src/lib/faq-data.ts:24`), while the report disclosure says Anthropic Claude and OpenAI (`src/app/(app)/report/[id]/page.tsx:1444`). Gift/share copy says users can share PDF/Markdown (`src/lib/faq-data.ts:56`), which is true for exports but not for the private report URL.

### 2.8 Refund / Privacy

Refund: ⚠️ policy and support SOP exist, but enforcement is manual and code skips refund webhook events (`src/app/refund/page.tsx:25`, `docs/runbook/refund-sop.md:39`, `src/app/api/ziina/webhook/route.ts:82`). Also fix the contradiction between “successfully generated and delivered” eligibility and technical nondelivery refund (`src/app/refund/page.tsx:26`, `src/app/refund/page.tsx:30`).

Privacy: ⚠️ the policy lists Ziina, email delivery, hosting, and Anthropic only (`src/app/privacy/page.tsx:26`, `src/app/privacy/page.tsx:28`, `src/app/privacy/page.tsx:29`). The repo also has Supabase, Upstash Redis, Inngest, OpenAI, Gemini, Vercel, and Google generative AI dependencies/envs (`package.json:30`, `package.json:31`, `package.json:38`, `package.json:40`, `package.json:47`, `package.json:50`, `.env.example:31`, `.env.example:43`, `.env.example:51`, `.env.example:63`). Health checks mention Sentry/PostHog envs (`src/app/api/health/route.ts:90`, `src/app/api/health/route.ts:91`), but the privacy policy only says “standard analytics” and does not name analytics subprocessors (`src/app/privacy/page.tsx:26`).

## 3. Design polish

The landing section order is coherent (`src/app/(marketing)/page.tsx:101` through `src/app/(marketing)/page.tsx:114`), but the first screen is overloaded with motion and unverified proof. Hero uses `min-h-[100svh]` (`src/components/landing/Hero.tsx:20`), an aurora, starfield, and mandala (`src/components/landing/Hero.tsx:21`, `src/components/landing/Hero.tsx:25`, `src/components/landing/Hero.tsx:29`); with nav/banner, it may hide the next section on mobile. There is a typo/unused animation class: Hero uses `animate-slow-spin` (`src/components/landing/Hero.tsx:29`) while globals defines `animate-spin-slow` (`src/app/globals.css:129`). Reduced-motion CSS covers fade/bar animations but not every long-running decorative animation (`src/app/globals.css:160`, `src/app/globals.css:362`).

Buttons mostly use `btn-primary`/`btn-secondary` (`src/app/globals.css:266`, `src/app/globals.css:295`), but some legal/support pages and report action links use bespoke tiny buttons (`src/app/(app)/report/[id]/page.tsx:1272`, `src/app/(app)/report/[id]/page.tsx:1289`). Landing Pricing omits Annual while comparison includes it, breaking rhythm and plan hierarchy (`src/components/landing/Pricing.tsx:17`, `src/components/landing/PricingComparison.tsx:59`). The FinalCTA uses a large blurred amber orb (`src/components/landing/FinalCTA.tsx:10`), visually inconsistent with the otherwise precise astrology-tool tone and likely to read as generic SaaS decoration.

Contrast/focus: global focus rings exist (`src/app/globals.css:75`), and button classes define focus-visible styles (`src/app/globals.css:289`, `src/app/globals.css:317`). The dashboard tab buttons do not appear to use those button classes or ARIA tab roles (`src/app/(app)/dashboard/page.tsx:598`, `src/app/(app)/dashboard/page.tsx:608`). FAQ accessibility is better than dashboard tabs (`src/components/landing/FAQ.tsx:54`). Mobile tap targets need cleanup where controls are 40px or tiny padded icons (`src/components/shared/Navbar.tsx:118`, `src/components/shared/LaunchBanner.tsx:55`).

## 4. Edge cases

Landing/pricing:
- User selects INR/AED manually, then checkout uses geolocation anyway (`src/components/landing/CurrencySwitcher.tsx:43`, `src/app/api/ziina/create-intent/route.ts:57`).
- User wants Annual from landing Pricing but no annual card exists (`src/components/landing/Pricing.tsx:17`).
- User clicks “preview a sample report” and lands on `#hourly-preview`, not the sample report section (`src/components/landing/Hero.tsx:75`, `src/components/landing/SampleReportPreview.tsx:201`).

Auth/onboarding:
- OAuth callback failure returns generic `login?error=auth` (`src/app/auth/callback/route.ts:17`, `src/app/auth/callback/route.ts:42`).
- Geocode failure can continue with 0,0 coordinates (`src/app/onboard/_OnboardForm.tsx:799`, `src/app/onboard/_OnboardForm.tsx:914`).
- Browser back/payment return loses unsaved onboarding form state (`src/app/onboard/_OnboardForm.tsx:664`, `src/app/onboard/_OnboardForm.tsx:682`).

Payment:
- Pending intent reuse lasts only 90 seconds (`src/app/api/ziina/create-intent/route.ts:94`).
- Webhook disabled mode is supported, but then return verification must carry recovery (`.env.example:16`, `src/app/api/ziina/verify/route.ts:90`).
- Refund webhooks are skipped, so dashboard/payment state depends on manual Supabase updates (`src/app/api/ziina/webhook/route.ts:82`, `docs/runbook/refund-sop.md:39`).

Report generation:
- Annual requests only 30 daily days (`src/lib/reports/orchestrator.ts:894`).
- Hard-coded transit hints include 2025/2026 entries and can stale out (`src/lib/reports/orchestrator.ts:1584`).
- Client timeout and dashboard stale thresholds differ (`src/app/(app)/report/[id]/page.tsx:92`, `src/app/(app)/dashboard/page.tsx:87`).

Dashboard/report:
- Filtered empty report list lacks a clear reset/generate CTA (`src/app/(app)/dashboard/page.tsx:731`, `src/app/(app)/dashboard/page.tsx:736`).
- Payments empty CTA goes to `/onboard`, not a paid plan (`src/app/(app)/dashboard/page.tsx:760`).
- Copy Share Link implies shareability, but report pages are auth/owner protected (`src/app/(app)/report/[id]/page.tsx:1250`, `src/app/(app)/report/[id]/page.tsx:863`).

Policies/support:
- Refund policy contradicts itself on delivered vs nondelivered reports (`src/app/refund/page.tsx:26`, `src/app/refund/page.tsx:30`).
- Privacy omits OpenAI/Gemini/Upstash/Inngest/Supabase/Vercel as named subprocessors despite env/package usage (`package.json:30`, `package.json:31`, `package.json:38`, `package.json:40`, `package.json:47`, `package.json:50`).
- Support mailto flows depend on the user’s local mail client (`src/components/landing/HindiWaitlist.tsx:29`, `src/app/refund/page.tsx:81`).

## 5. Prioritized fix list

P0 (must fix before launch):
- Remove or qualify unverified social proof: 12,000+, 4.8/340, 99.7%, featured-in claims (`src/components/landing/Hero.tsx:6`, `src/components/landing/SocialProof.tsx:24`, `src/components/landing/SocialProof.tsx:53`).
- Stop claiming Annual/365-day/Varshaphala unless annual generation truly produces a solar-return/year product (`src/lib/reports/orchestrator.ts:894`, `src/components/landing/PricingComparison.tsx:59`).
- Fix manual currency switch so checkout uses selected currency, or label it display-only (`src/components/landing/CurrencySwitcher.tsx:43`, `src/app/api/ziina/create-intent/route.ts:57`).
- Fix SampleReportPreview contradictions and wrong Cancer-lagna/Jupiter copy (`src/components/landing/SampleReportPreview.tsx:51`, `src/components/landing/SampleReportPreview.tsx:147`, `src/components/landing/SampleReportPreview.tsx:217`).
- Clarify free flow auth requirement and geocode failure before report generation (`src/app/onboard/_OnboardForm.tsx:578`, `src/app/onboard/_OnboardForm.tsx:914`).

P1 (this week):
- Gate PDF/Markdown/monthly/weekly/nativity sections by plan or update pricing truthfully (`src/app/(app)/report/[id]/page.tsx:1288`, `src/app/(app)/report/[id]/page.tsx:1403`, `src/components/landing/PricingComparison.tsx:47`).
- Add durable onboarding state across payment return (`src/app/onboard/_OnboardForm.tsx:664`, `src/app/onboard/_OnboardForm.tsx:682`).
- Add Annual card to landing Pricing or remove Annual from landing comparison until the product is ready (`src/components/landing/Pricing.tsx:17`, `src/components/landing/PricingComparison.tsx:59`).
- Repair refund copy and dashboard “All payments are final” contradiction (`src/app/refund/page.tsx:26`, `src/app/(app)/dashboard/page.tsx:778`).
- Update privacy subprocessors to match actual providers (`src/app/privacy/page.tsx:28`, `.env.example:51`, `.env.example:63`).

P2 (later):
- Build real muhurta and Ashtakoot/Mangal Dosha flows before using those claims broadly (`src/components/landing/UseCases.tsx:13`, `src/components/landing/UseCases.tsx:73`).
- Add keyboard arrow handling to tabs and ARIA tab semantics to dashboard tabs (`src/components/landing/SampleReportPreview.tsx:223`, `src/app/(app)/dashboard/page.tsx:598`).
- Raise small tap targets to 44px and reduce decorative motion (`src/components/shared/Navbar.tsx:118`, `src/components/shared/LaunchBanner.tsx:55`, `src/components/landing/Hero.tsx:25`).

## 6. Top 10 sharpest findings

1. Annual Oracle is sold as 365-day/Varshaphala, but annual gets only 30 daily days (`src/lib/reports/orchestrator.ts:894`, `src/components/landing/PricingComparison.tsx:59`).
2. Manual currency switching does not affect Ziina checkout currency (`src/components/landing/CurrencySwitcher.tsx:43`, `src/app/api/ziina/create-intent/route.ts:57`).
3. Hero/social proof stats are hard-coded and not verifiable from code (`src/components/landing/Hero.tsx:6`, `src/components/landing/SocialProof.tsx:12`).
4. Sample report says “No demo data” but is mock/inconsistent and astrologically wrong for Cancer lagna (`src/components/landing/SampleReportPreview.tsx:4`, `src/components/landing/SampleReportPreview.tsx:51`, `src/components/landing/SampleReportPreview.tsx:217`).
5. Landing Pricing omits Annual while comparison sells Annual (`src/components/landing/Pricing.tsx:17`, `src/components/landing/PricingComparison.tsx:59`).
6. Free Kundli hides the auth wall until after CTA click (`src/components/landing/Hero.tsx:69`, `src/app/onboard/_OnboardForm.tsx:578`).
7. Geocode failure can silently fall back to 0,0 coordinates (`src/app/onboard/_OnboardForm.tsx:799`, `src/app/onboard/_OnboardForm.tsx:914`).
8. PDF/Markdown exports are exposed to all completed reports despite paid-tier claims (`src/app/(app)/report/[id]/page.tsx:1288`, `src/components/landing/PricingComparison.tsx:47`).
9. Refund promise is manual-only and webhook refund updates are skipped (`docs/runbook/refund-sop.md:39`, `src/app/api/ziina/webhook/route.ts:82`).
10. Privacy policy omits several real subprocessors/providers visible in package/env config (`src/app/privacy/page.tsx:28`, `package.json:30`, `package.json:50`, `.env.example:63`).
