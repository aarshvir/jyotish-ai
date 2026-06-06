# Report Rehaul — Plan v1 (Claude / Opus)

## The problem (from real user feedback)
"Too technical, too verbose, no summary insights." People want to know **what will happen in their life** — career, money, love, health, family/kids — in plain language, then **drill deeper if they want**. Today the report leads with the birth chart (max jargon) and buries the only summary at the bottom.

## The core idea: INVERT the report
Lead with plain-language life insight. Let users drill **top-down**: Life arc → Year → Month → Week → Day → Hour. Jargon (lagna/dasha/hora/planets) becomes **opt-in depth**, never the opener. Every screen answers "what does this mean for me?" before "why (astrologically)?"

## What we already have (so this is mostly inversion + 1 new content pass, not a rebuild)
- Hierarchical data already exists: `nativity` (+ unused `dasha_sequence` = full life timeline), `synthesis` (period overview, currently rendered LAST), `months[12]`, `weeks[6]`, `days[N]`, `slots[18]`.
- `dasha_sequence` (multi-decade chapters w/ date ranges) — computed, stored, **unused by UI**.
- `guidance_v2`/`briefing_v2` plain-language layer — **generated but dropped** by `page.tsx` `mergedDays` mapping (lines ~1195-1244). Re-plumbing = instant plain-language win.
- `NativityProfile.life_themes` / `current_year_theme` / `summary` — life-shaped, buried.
- Prompts are ~70% plain already; worst jargon = `nativity-text` route + `key_transits` + weeks-synthesis fallbacks.

## Target information architecture (top-down, each level expand/drill)
```
0  YOUR LIFE AHEAD            ← NEW hero. Plain. The "what happens to me" summary.
     • 2–3 warm sentences on the dominant theme right now + the period ahead
     • Life-weather verdict (period tier + one line)
     • 5 domain cards: Career · Money · Love · Health · Family — 1 plain line + trend each
     • "Moments that matter": 3–5 dated windows (best / watch-out), plain reasons
1  YOUR LIFE CHAPTERS         ← NEW, from dasha_sequence (zero ephemeris work)
     • "You're in an 18-yr chapter of [plain theme] until 2043. Next: [theme] from 2043."
     • current chapter highlighted; prev/next with date ranges + plain meaning
2  THE YEAR AHEAD (12 months) ← reuse MonthlyAnalysis, summary-first
     • year overview line + 12-month visual strip (score + 1-word theme)
     • click a month → expands detail + reveals that month's WEEKS
3  MONTH → WEEKS → DAYS → HOURS   ← progressive drill-down (reuse Weekly/Daily/Hourly)
     • each level: score + plain one-liner first; expand for detail
     • DAY: plain "briefing" first (best-for / avoid / why today) — turn on briefing_v2;
            hour-by-hour behind "See the hour-by-hour"
     • HOUR: deepest detail (current table) + guidance_v2 plain chips; jargon ok here
∞  ABOUT YOUR CHART           ← DEMOTED NativityCard (lagna/dasha/planets/yogas/rasi/citations)
     • opt-in "the why / your birth chart" drawer at the bottom for the curious
```

## Content layer (plain-language, life-event-focused, responsible)
1. **NEW life-summary generation pass** — the heart of the rehaul. Produces Level 0 + Level 1 content: plain-language life predictions (career/money/love/health/family arc), current chapter meaning, and the 1–2 biggest upcoming turning points. Distilled from `natal_chart` + `dasha_sequence` + `months` + `synthesis`. Warm, second-person, **responsible**: tendencies & windows, not deterministic fate ("a strong window for career moves", "watch your health mid-year"), never harmful specifics (death/medical/doom). Add `life_summary` + `life_chapters` to `ReportData`.
2. **Turn on the dormant plain layer** — fix the `mergedDays` drop so `briefing_v2`/`guidance_v2` render. Instant readability win at day/hour.
3. **De-jargon the worst prompts** — `nativity-text` (drop "every sentence names a planet/house/nakshatra"), `key_transits`, weeks-synthesis fallbacks. Adopt the daily-overviews LANGUAGE RULES everywhere.
4. **Glossary tooltips** — any remaining term (lagna, dasha, nakshatra, hora, choghadiya, Rahu Kaal) gets a hover/tap plain-English gloss, so jargon is never a dead-end.

## Implementation phases (incremental, each shippable, lowest-risk first)
**Phase 1 — UI inversion + turn on dormant plain layer (NO pipeline change; lowest risk).**
- Fix `mergedDays` to carry `briefing_v2` (day) + `guidance_v2` (slot).
- Build `<LifeSummary>` hero from EXISTING data (synthesis opening + domain_priorities + best/worst dates + top/bottom month + current_year_theme). Render FIRST.
- Build `<LifeChapters>` from `dasha_sequence` (deterministic plain narration via lagna house-meanings; LLM optional later). Render second.
- Reorder; demote `NativityCard` to "About your chart" at the bottom. Update `ReportSidebar` nav to the new tiers.
- `<CollapsibleSection>` wrapper → collapse the 12 month / 6 week cards (kill verbosity).
- Default Hourly to compact (BestWindows + chart); full 18-row table behind "Show all hours".
- Ship. This addresses all 3 complaints with near-zero generation risk.

**Phase 2 — the real "what will happen" content (NEW generation).**
- Add `life_summary`/`life_chapters` to types; new `/api/commentary/life-summary` route; new Inngest phase + checkpoint + budget + paid-gating fallback (mirror weeks-synthesis); assembly + deterministic fallback.
- Wire `<LifeSummary>`/`<LifeChapters>` to the generated content (replace the Phase-1 composed version).
- De-jargon `nativity-text` + fallbacks.

**Phase 3 — polish.** Glossary tooltips; generalized drill controller (month→week→day breadcrumb); mobile pass; PDF/markdown reflect the new summary-first order.

## Guardrails
- Don't break the frozen invariants (12 months / 6 weeks / 18 slots / paid-no-placeholder). New sections get robust real-LLM + fallback like weeks-synthesis.
- Keep `id="report-content"`, `pdf-exclude`, plan-gating (free = preview), and progress-monotonicity intact.
- Every change is a tagged rollback step; build+test+e2e before each push.
- Responsible-prediction content rules baked into the new prompt (no fate/medical/doom; tendencies + windows + agency).

## Success criteria
A first-time user, in 15 seconds, reads a plain-English summary of what's ahead in their life and the key dates — and can choose to drill all the way to a single hour if they want. Zero Sanskrit required to get value; full depth available on demand.
