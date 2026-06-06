# Report Rehaul — FINAL Plan v3 (synthesis of Claude v1 + GPT-5.5 review)

## Goal
Turn the report from a technical Jyotish dump into a **personal reading**: plain-language "what's ahead in my life" first, drill-down to the hour on demand, jargon opt-in. Fix: "too technical, too verbose, no summary insights."

## Emotional arc the page must follow
Recognition ("this is about MY life") → Relief/orientation ("here's the main pattern") → Agency ("what to do and when") → Depth ("show me year→month→week→day→hour") → Credibility ("the chart logic, if I care"). Today it starts at credibility — backwards.

## FINAL information architecture (top-down)
```
1  PERSONAL FORECAST BRIEF      ← hero, above the fold, plain, no jargon
2  THE YEAR AHEAD               ← 12-month strip + one selected-month detail
3  NEXT 6 WEEKS                 ← near-term weeks (this is what the engine actually has)
4  DAYS                         ← day list; each leads with plain briefing
5  HOURS                        ← deepest detail (per day), compact-first
6  YOUR BIGGER LIFE CHAPTER     ← dasha (plain): current + previous + next only
7  ABOUT YOUR CHART / WHY       ← demoted NativityCard (lagna/dasha/planets/yogas/rasi/sources), opt-in
```
NOTE: NO "month → its weeks" drilldown — engine has months[12] + weeks[6] (near-term), not weeks-per-month. Keep them as separate sections.

## The hero — "Personal Forecast Brief" (exact spec, per GPT-5.5)
- Header: `{Name}'s next {12 months | 30 days | 7 days}`
- Subline: "Generated from your birth chart and timing cycles. These are strongest windows, not fixed outcomes."
- **Big headline = one plain-language life thesis** (the recognizable personal story of this period).
- **3 "what's shifting" lines**: Career/public life · Money/stability · Love/family/home.
- **2 timing chips**: `Best opening: {window}` · `Go slower: {window}`.
- **5 domain cards**: Career · Money · Love · Health/energy · Family & children — each one plain line + small trend.
- (Phase 3) CTA row: Focus on career/love/family · Ask a question.

## Content model — the claim structure (editorial backbone)
Every life statement = **domain + time window + likely theme + action + confidence**.
- ✅ "April is a strong window for visibility — promotion talks, launches, asking for authority. If an opportunity appears then, treat it seriously."
- ❌ "You will get promoted in April."
Specificity from: named domain + concrete window + emotional theme + action + "if this is already active in your life" framing. Never invent facts the system doesn't know (e.g., whether the user has kids).

## Family & children — responsible policy (per GPT-5.5)
- DON'T predict: child health/death/destiny/personality, pregnancy certainty, divorce/infertility/miscarriage, any medical outcome, another person's private fate.
- DO allow: household timing, parenting pressure/support periods, good windows for family conversations/decisions, conditional "if you have children / if planning a family", supportive-period framing.
- UI: a `Family & Children` card with a lightweight selector (Have children / Planning / Family & home / Skip) → tailors copy. MVP: conditional copy without requiring the selector.

## Responsible-prediction ENFORCEMENT (not just prompts)
Add a validator (`src/lib/validation/lifeSummaryGuard.ts`) that rejects/regenerates life-summary output containing: death, severe illness/diagnosis, guaranteed pregnancy/marriage/divorce, financial certainty ("you will become rich/bankrupt"), or child-specific fate. Wire into the new generation route + assembly.

## Execution phases (each = tagged rollback steps; build+test+e2e before push)

### PHASE 1 — Inversion + turn on dormant plain layer (NO pipeline change; ship first)
1. **Plumb the dormant plain layer**: fix `page.tsx` `mergedDays` to carry `briefing_v2` (day) + `guidance_v2` (slot). Instant plain-language win.
2. **`<ForecastSnapshot>` hero** composed from EXISTING data (synthesis.opening_paragraph + domain_priorities + strategic_windows/caution_dates + best/worst month + `NativityProfile.current_year_theme`). Render FIRST. Label "Your Forecast at a Glance / Forecast Snapshot" (honest — not a grand "life" claim until Phase 2). Plain lines + the 5 domain cards + best/watch windows.
3. **Reorder + demote**: NativityCard → bottom "About your chart" (opt-in). New section order per IA. Update `ReportSidebar` nav.
4. **Kill verbosity**: months → compact 12-strip + one selected-month detail (not 12 full stacked cards); hourly → compact (BestWindows + chart) with full 18-row table behind "Show all hours".
5. **Normalize** month `domain_scores` → UI model (career/money/health/love) so domain cards are correct.
6. **PDF/Markdown**: put the snapshot first in the export order too (not deferred).

### PHASE 2 — The real "what will happen in your life" content (new generation)
7. Add `life_summary` (+ `life_chapters`) to `ReportData` types.
8. New `/api/commentary/life-summary` route producing the hero brief + bigger-life-chapter, using the **claim structure** + **family policy** + reading from natal chart + `dasha_sequence` + months + synthesis. Plain, responsible, specific.
9. New Inngest phase + checkpoint + budget + paid-fallback (mirror weeks-synthesis); assembly + deterministic fallback; the responsible-prediction validator.
10. Wire `<ForecastSnapshot>` + `<BiggerLifeChapter>` to the generated content (replace Phase-1 composed version). Rename hero to "Your Year Ahead / Your Life Ahead" now that it's real.
11. De-jargon `nativity-text` route + weeks-synthesis/months fallbacks. Hide remaining terms behind "Why astrologically?" expanders.

### PHASE 3 — Interactivity & polish
12. Life-area focus tabs (Career/Money/Love/Health/Family) reframing the same forecast.
13. Report-grounded "Ask a question" (answers constrained to report JSON + safety rules; suggested prompts).
14. Family selector; glossary tooltips on remaining terms; mobile pass; drill breadcrumbs.

## Guardrails
- Preserve invariants (12 months/6 weeks/18 slots/paid-no-placeholder), `id="report-content"`, `pdf-exclude`, plan-gating (free=preview keeps snapshot as upsell), progress monotonicity.
- Honest fallback labels (no "life ahead" when it's generic synthesis).
- Every step tagged (`rollback/step-NN`); verify before each push; keep the site live throughout.

## Definition of done (Phase 1+2)
A first-time user reads, in ~10 seconds, a plain personal thesis + the 3 shifts + best/watch windows + 5 domains — then can drill to any hour, and open "the chart / why" only if curious. Zero Sanskrit needed for value; full depth on demand; nothing reckless about health/kids/fate.
