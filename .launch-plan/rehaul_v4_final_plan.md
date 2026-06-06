# Report Rehaul v4 — Final Synthesized Plan (2026-06-06)

## Process
1. Claude audit (5 parallel dimensions: UX, content, technical, conversion, competitive)
2. Claude initial plan
3. Independent critic review (adversarial)
4. Final synthesis (this document)

## Current state on entry
Steps 27-34 shipped: summary-first hero, plain-language layer, de-jargoned synthesis/weeks/months, compact year strip, choghadiya labels, panchang tooltips, "Day by Day" / "The Next 6 Weeks" headings, timing calendar in nav.

---

## PHASE A — Immediate (already executing)

| # | Change | Files | Priority |
|---|--------|-------|---------|
| A1 | Fix "FALLBACK DAY — USE HOURLY TABLE. STRATEGY:" in orchestrator | orchestrator.ts L1388,1429 | CRITICAL |
| A2 | Warm nativity fallback — personal, rising-sign-aware, no jargon | orchestrator.ts L1418,1440 | CRITICAL |
| A3 | Add new sentinels to isDevFallback() | plainify.ts | HIGH |
| A4 | Fix ALL-CAPS instruction in daily-overviews prompt | daily-overviews/route.ts L197 | HIGH |
| A5 | Nativity stub guard: replace if length < 200 chars | orchestrator.ts L1417,1439 | HIGH |
| A6 | Remove fake "30% off" badge; replace with "24-hour money-back" | page.tsx L1550 | HIGH |
| A7 | Fix WeeklyAnalysis fake 65/65/65 sparkline (empty daily_scores in FALLBACK) | WeeklyAnalysis.tsx | MEDIUM |
| A8 | Panchang collapse: move to <details> accordion (less noise for non-practitioners) | DailyAnalysis.tsx | MEDIUM |
| A9 | Add keyboard accessibility to hourly table rows (tabIndex + onKeyDown) | HourlyTable.tsx | MEDIUM |

---

## PHASE B — Next (ordered by ROI)

| # | Change | Files | Notes |
|---|--------|-------|-------|
| B1 | Restructure DailyAnalysis: score+prose→briefing→playbook→panchang (collapsed) | DailyAnalysis.tsx | 3h |
| B2 | Add mid-report upsell BETWEEN day 1 and locked days 2-7 for free plan | page.tsx | 2h |
| B3 | Post-purchase upsell: 7-day → Monthly strip at top of paid report | page.tsx | 2h |
| B4 | NativityCard: plain-language tooltips on Functional Benefics/Malefics/Badhaka | NativityCard.tsx | 1h |
| B5 | Remove static Family domain card or drive from real synthesis data | ForecastSnapshot.tsx | 1h |
| B6 | Fix ReportSidebar mobile tabs to 44px (KNOWN_ISSUES item 10) | ReportSidebar.tsx | 20min |
| B7 | Add section eyebrow above "Optimal Windows" area in DailyAnalysis | DailyAnalysis.tsx | 20min |
| B8 | Hero eyebrow: replace "Swiss Ephemeris · Lahiri Ayanamsa · Vimshottari Dasha" with plain technical badges | Hero.tsx | 30min |

---

## PHASE C — Future

| # | Change | Notes |
|---|--------|-------|
| C1 | Calendar export (.ics) for timing windows | Biggest feature gap vs Co-Star |
| C2 | Post-purchase 7-day→Annual sticky banner | Higher ROI than social share |
| C3 | Social share card / OG image from ForecastSnapshot thesis | Distribution flywheel |
| C4 | Email "strong day ahead" notification for paid users | Requires notification prefs |
| C5 | Free-tier cost optimization (nativity-only pipeline) | After Upstash rate limiting |
| C6 | Either remove "Dasha Timeline" tab from SampleReportPreview or build real visualization | Don't mislead with tab |
| C7 | Hero H1 test: "Your Life, Decoded" vs "Your Jyotish Forecast" | SEO risk — needs data first |

---

## SKIP LIST
- Synastry before core report quality fixed
- Tooltip modals/popovers (inline plain language beats modal jargon)
- Orchestrator architecture changes  
- Subscription billing model
- Chatbot / ask-an-astrologer chat
- A/B testing infrastructure before traffic warrants it
