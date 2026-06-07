# VedicHour — User-Perspective Final Plan v6
## Synthesis of: Claude user-perspective plan + Independent agent critique + My review of both

---

## THE HONEST DIAGNOSIS (agreed by both plans)

The platform answers: "Here is your astrological data."
The user asks: "What should I do, and when?"

All presentation fixes so far have been correct but insufficient.
The gap is INTERPRETATION — the platform shows scores; users need verdicts.
Additionally: the pipeline returns fallback content in critical sections (monthly scores all 48/48/48/48, synthesis is template text) — and the UI has been papering over it. This cannot continue forever.

---

## THE THREE USER TYPES (and what each wants)

**Decision-Maker (60%):** "I'm about to do X. Is now the right time?"
→ Wants: A DIRECT TIMING ANSWER. Not scores — a recommendation.

**Self-Knower (30%):** "Why does my life feel like this? What period am I in?"
→ Wants: A MIRROR — personal narrative that explains their experience.

**Practitioner (10%):** "Show me the hora table and dasha details."
→ Wants: PRECISION DATA. Already well-served.

The platform is built for Practitioners, marketed to Decision-Makers and Self-Knowers.

---

## PRODUCT VISION (synthesized)

"VedicHour is a personal timing advisor. You come to it when you need to decide when to act, and it tells you — specifically for your chart, in plain language."

---

## PRODUCT RESTRUCTURE

**Current (data-volume model):**
Free: Chart + 1 day | 7-day: 7 days | Monthly: 30 days | Annual: 12 months

**Better (outcome model):**

**"Know Yourself"** — Free anchor
- Complete personal profile: who you are (rising sign + moon sign, 2 warm paragraphs)
- Your current life chapter: what period you're in and what it means (1 plain paragraph)  
- Today's timing: best window + avoid window
- This is COMPLETE and PERMANENT — does not expire
- Hook: feel genuinely understood, not shown a teaser

**"Plan Your Month"** — $14.99 core paid
- This month mapped: strong weeks vs light weeks vs caution weeks
- Domain filtering: "Best career days / money days / relationship days this month"
- Hourly detail on demand (not front-and-center)
- Monthly delivery: new brief on the 1st of each month

**"Annual Intelligence"** — $79 premium
- Everything in monthly
- 12-month domain map (which months for career / money / love / health)
- Life chapter deep-dive (dasha transitions this year)
- Calendar export (.ics) with best dates and caution dates
- The value prop: "Plan your entire year. Know before it starts."

**NEW: "Timing Check"** — $2.99 per query (future)
- "Is [date] good for [contract / launch / conversation / travel]?"
- 200-word plain verdict
- Impulse buy from SEO traffic

---

## INFORMATION ARCHITECTURE (user-need organized)

### Replace linear scroll with 4-tab structure:

**[TODAY]** — Immediate, actionable
- One sentence: "Today is a [strong/moderate/light] day for [what]"
- Your best 3 windows remaining today (from stored slots for today's date)
- Tomorrow's preview
- This tab is the daily return habit

**[DECIDE]** — The highest-value feature that does not exist yet
- "I want to act on:" [Career] [Money] [Relationships] [Health] [Other]
- Best 3 dates in the next 30 days for that domain
- Plain recommendation: "Best window: Tuesday Apr 27, 10am-12pm — strong for career"
- This directly answers the question every buyer is actually asking

**[PLAN]** — The overview
- 12-month heat map WITH domain overlay toggle (Career / Money / Love / Health)
  → User can see "my career months" vs "my relationship months" on the same strip
- Selected month shows: month score + domain breakdown + "Best days for Career: 14, 27"
- Week breakdown below

**[YOU]** — Identity and permanence
- Personal profile: warm 2-paragraph narrative (rising sign, moon sign, key themes)
- Life chapters timeline: dasha sequence as horizontal illustrated timeline
  → "You are in month 14 of your 18-year Rahu chapter (2025–2043)"
  → "Next chapter: Jupiter (wisdom, recognition) 2043–2059"
  → "Progress bar: [===========----------] 14/216 months"
- Chart details for the curious

---

## THE CORE RETURN LOOP (what brings users back)

Currently: None. Generate once, view once, never return.

**Daily trigger (Phase B):** 7am email/push
"Today is a 78/100 day. Your peak window: 9–11am. One thing: this is a strong day for decisions you've been delaying."

**Phase change trigger:** "Your Jupiter sub-period starts in 8 days. Here's what it activates for your chart."

**Best-day reminder:** "April 27 is 2 days away — your strongest career window this month."

---

## PIPELINE FIXES (root problem, not just UI)

The UI plainify layer is hiding broken pipeline output. Must fix at source:

1. **Monthly domain scores 48/48/48/48** — all months returning identical fallback scores. Fix the orchestrator months retry logic so fallback only fires for truly failed LLM calls, not as the default path.

2. **"Fallback monthly theme" for all 12 months** — the months-first/months-second routes' buildFallbackMonths now generates decent copy but the root issue is why the LLM calls are failing. Need monitoring + retry.

3. **Synthesis opening paragraph is a template** — "MARS-RAHU PERIOD SYNTHESIS FOR CANCER LAGNA" is LLM scaffolding, not a real verdict. The prompt needs: "Write a 2-sentence opening that sounds like an advisor speaking to THIS person: [chart context]."

4. **Strategic windows reasons are generic** — "Use peak-score day from synthesis context; schedule high-stakes work in slots with score 75+" is not a reason. Needs to reference why that specific date is strong.

---

## EXECUTION PLAN

### PHASE A — This sprint (frontend, no pipeline changes)

**A1. Domain overlay filter on year strip** [HIGH VALUE]
- Add toggle: [All] [Career] [Money] [Love] [Health] above the 12-month compact strip
- When domain selected, strip shows that domain's score per month instead of overall
- Uses existing `month.domain_scores.{career,money,health,relationships}` — data already there
- File: MonthlyAnalysis.tsx

**A2. "Best days per domain" in month detail** [HIGH VALUE]
- When a month is selected, show domain-filtered best days
- "Best career days: 14, 27 | Best money days: 8 | Best love days: 3, 11"
- Derive from per-month day scores (use day_score as proxy; domain-filtered view)
- File: MonthlyAnalysis.tsx

**A3. Life chapters dasha timeline** [EMOTIONAL ANCHOR]
- New component: DashaTimeline.tsx
- Renders dasha_sequence as horizontal timeline
- Highlights current period, shows progress bar ("month 14 of 216")
- Past chapters greyed, current highlighted amber, future shown dim
- Plain English per chapter: "Rahu: Amplified ambition, unconventional growth"
- Place in [YOU] section / bottom of report
- File: new DashaTimeline.tsx + integrate in page.tsx

**A4. Calendar export (.ics)** [HIGH UTILITY, LOW EFFORT]
- New API route: /api/reports/[id]/calendar
- Generates .ics with: strategic_windows as events + caution_dates as busy blocks
- Download button added to report header (alongside Markdown)
- File: new route.ts + button in page.tsx

**A5. Tab navigation restructure** [UX FOUNDATION]
- Replace sidebar nav + linear scroll with sticky top tabs: [Today] [Plan] [Decide] [You]
- Each tab shows the relevant section of the existing report, reorganized
- [TODAY]: ForecastSnapshot hero + today's DailyAnalysis (auto-selected to today's date)
- [PLAN]: MonthlyAnalysis + WeeklyAnalysis
- [DECIDE]: Domain selector → best dates from monthly domain_scores (A1 data)
- [YOU]: NativityCard + new DashaTimeline
- File: report/[id]/page.tsx + ReportSidebar.tsx

### PHASE B — Next week (some new features)

**B1. [DECIDE] tab: domain selector → best dates**
Full implementation of the "I want to act on [X] — here are your best 3 dates" feature.
Uses per-month domain_scores to rank dates across the full report period.

**B2. Today's live stats widget**
Sticky bar at top of report: today's day score + best remaining window for today.
Computed from stored slot data for today's date (find today in the days array).

**B3. Dashboard simplification**
Strip dashboard to: today's score, next strong date (with days-until), report links.
Remove pipeline logs, filter controls, plan badges from default view.

**B4. Monthly "plan your month" brief at section top**
"October in brief: Strong for career (73), mixed for money (48). Best action days: 14, 21, 27."
Auto-generated from existing domain_scores and day_scores.

**B5. Dasha "you are here" progress bar**
Inside the existing NativityCard dasha section:
"[=====--------] Month 14 of 216 · Rahu period · Ends 2043"

### PHASE C — Pipeline fixes (careful, tested)

**C1. Monthly LLM retry logic** — Ensure months-first/months-second retry on fallback, not use it as default.
**C2. Synthesis opening paragraph prompt rewrite** — Produce a real advisor verdict, not template.
**C3. Strategic windows reason specificity** — "Why" should reference the actual chart factors.
**C4. Daily morning email for paid users** — Inngest scheduled job, 7am, 3 sentences.

---

## WHAT NOT TO BUILD (scope discipline)

- No chatbot / "ask your astrologer" — the report IS the answer
- No social/sharing features yet — retention before virality
- No new LLM models — improve prompts first
- No subscription infrastructure yet — one-time payments are the differentiator
- No mobile app — PWA on the existing web is sufficient

---

## SUCCESS CRITERIA

A user should be able to:
1. Open their report and in 10 seconds know: "Today is [strong/mixed/light] and my best window is [time]."
2. Answer "What months are good for my career this year?" in 2 clicks.
3. Answer "When should I act on [my biggest current decision]?" in under 1 minute.
4. Understand "What life chapter am I in and how long does it last?" from a visual they can explain to a friend.
5. Add their best dates to their calendar in one click.

None of these are possible today. All are buildable this sprint.
