# Report Rehaul v5 — Final Plan (2026-06-06 round 2)

## What's still broken (post steps 27-45)

### CRITICAL
- C1: synthesis.closing_paragraph (dev-fallback) renders inside "Read the full picture" without isDevFallback guard
- C2: month.commentary renders "PHASE LINE — April 2026 for Cancer lagna..." scaffold header raw
- C3: day.overview renders "Strategy:" section headers and bullets as template output — most-read text in report
- C4: month theme for all 12 months = "Fallback monthly theme." — literal placeholder shown to paid users

### HIGH
- H1: MonthlyAnalysis commentary not guarded by isDevFallback (only checks one old sentinel string)
- H2: HourlyChart legend says "Rahu Kaal"; HourlyTable getScoreLabel returns "RAHU KAAL" chip
- H3: DailyAnalysis best_windows chip shows raw choghadiya (Today's Playbook fixed, this section not)
- H4: NativityCard LAGNA_FALLBACK + DASHA_FALLBACK contain "hora", "choghadiya", "benefics" jargon
- H5: Pricing feature bullets use untranslated Vedic terms

### MEDIUM
- M1: Hero H1 "Your Jyotish Forecast" — "Jyotish" unexplained in headline
- M2: Testimonials jargon (Mahadasha, choghadiya overlay) — intentional for Vedic audience but cold-traffic risk
- M3: briefing_v2.why_today is a machine summary, not a human sentence (needs plainify)
- M4: H\d+ house refs (H10, H6) survive plainify

---

## PHASE A — Execute today

| # | Fix | File | Lines |
|---|-----|------|-------|
| A1 | Strip "Strategy:" + "BEST ACTION:" headers in day.overview; apply plainify | DailyAnalysis.tsx | ~307 |
| A2 | isDevFallback guard on MonthlyAnalysis commentary; suppress "Fallback monthly theme." | MonthlyAnalysis.tsx | ~46-55, 168 |
| A3 | isDevFallback guard on synthesis.closing_paragraph | ForecastSnapshot.tsx | ~230 |
| A4 | choghadiyaLabel on best_windows chip in DailyAnalysis | DailyAnalysis.tsx | ~339 |
| A5 | Add H\d+, PHASE LINE to plainify.ts | plainify.ts | JARGON_MAP |
| A6 | HourlyChart "Rahu Kaal" legend → plain; "X Hora" tooltip → "X planetary hour" | HourlyChart.tsx | ~145, 182 |
| A7 | HourlyTable getScoreLabel "RAHU KAAL" → "CHALLENGING WINDOW" | HourlyTable.tsx | ~48 |
| A8 | Rewrite NativityCard LAGNA_FALLBACK / DASHA_FALLBACK (no "hora", "benefics") | NativityCard.tsx | ~59-63 |
| A9 | Apply plainify to briefing_v2.why_today render | DailyAnalysis.tsx | ~300 |

## PHASE B — Next week

| # | Fix | File |
|---|-----|------|
| B1 | Pricing bullets de-jargon: Lagna->Rising sign, Dasha->Life-period, Hora->Hourly timing | Pricing.tsx, pricing/page.tsx |
| B2 | Hero H1: "Your Jyotish Forecast" → "Your Vedic Forecast" (keep Jyotish in eyebrow/SEO) | Hero.tsx |
| B3 | HowItWorks step titles: user-first rewrites (already partially done in step 42) | HowItWorks.tsx |
| B4 | ForecastSnapshot domain cards: suppress "Use daily scores..." non-insight lines | ForecastSnapshot.tsx |
| B5 | Testimonials: reorder low-jargon first; gloss "Mahadasha" → "Mahadasha (life-period)" | Testimonials.tsx |

## PHASE C — Future (pipeline changes)

| # | Fix |
|---|-----|
| C1 | Pipeline: fix "Fallback monthly theme." and "PHASE LINE" at source (orchestrator/months routes) |
| C2 | Pipeline: fix domain_scores all-48 flatline (every month same scores) |
| C3 | Pipeline: strategic_windows reasons are generic template filler |
| C4 | Pipeline: briefing_v2.why_today should be a human sentence not machine summary |
