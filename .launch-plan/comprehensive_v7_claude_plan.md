# VedicHour — Comprehensive Plan v7 (Full First-Principles Rethink)
## My own thinking, independent of previous plans

---

## WHAT I ACTUALLY FOUND IN THE CODE (not assumptions)

After reading the pipeline code and real output data, here are the VERIFIED root causes:

### ROOT CAUSE 1: Monthly domain scores are all identical because the prompt example teaches the LLM to do so
**File:** `src/app/api/commentary/months-first/route.ts` line 183-186
**Evidence:** Example JSON shows `career_score: 55, money_score: 55, health_score: 55, love_score: 55` — all identical
**Effect:** LLM follows the example, sets all domain scores = overall_score
**Result in real data:** `{ money: 48, career: 48, health: 48, relationships: 48 }` — flat across all 12 months
**Impact:** The DecideSection, domain filter, and "month in brief" all show meaningless data. "Which months are good for career?" has no answer because every month shows the same career score.

### ROOT CAUSE 2: Synthesis prompt literally instructs ALL-CAPS opening + has a jargon fallback
**File:** `src/app/api/commentary/weeks-synthesis/route.ts` line 130, 156, 197
**Evidence:** 
- Line 130: instructs TWO PARTS with ALL-CAPS first sentence
- Line 156 example: `"ALL-CAPS sentence.\nThen 200-220 word analysis"`
- Line 197 fallback: `${mahadasha.toUpperCase()}-${antardasha.toUpperCase()} PERIOD SYNTHESIS FOR ${lagnaSign.toUpperCase()} LAGNA — DASHA THEMES AND ACTION WINDOWS. ...align benefic hora with top choghadiya...`
**Effect:** BOTH the LLM output AND the quality-guard fallback produce ALL-CAPS jargon openings
**Note:** The UI now strips these with plainify/stripScaffoldHeader — but fixing the ROOT CAUSE is better

### ROOT CAUSE 3: Strategic windows reasons are generic prompt filler
**File:** `src/app/api/commentary/weeks-synthesis/route.ts` line 133
**Evidence:** Example instructs "Mars hora 14:00–15:00 for bold career moves" — this is jargon-heavy AND generic
**Effect:** Every report's strategic windows say something like "Use peak-score day from synthesis context"
**Impact:** The "Calendar" section and ForecastSnapshot timing chips have no real reasoning

### ROOT CAUSE 4: key_transits in months prompt still uses H-notation in the template
**File:** `src/app/api/commentary/months-first/route.ts` line 188
**Evidence:** template: `["Planet transit date-range → H-notation house → specific effect for this lagna"]`
**Effect:** Month key_transits chips on the card can still contain "H10" style notation

---

## THE USER PERSPECTIVE (genuine first principles)

### Who arrives and why

**Archetype A — The Decision-Maker (60%)**
Life situation: Job offer sitting on the table. Relationship conversation needed. Contract to sign. Investment to make.
Real question: "Is this the right time? When is the right time?"
What they receive today: 18 rows of hourly scores + generic monthly summaries with identical domain scores.
What they need: "Your career is strong in April and September. For this month, your best windows for bold career moves are the 14th and 27th."

**Archetype B — The Self-Knower (30%)**
Life situation: Something in their life isn't working — a pattern they keep repeating, a year that felt unexpectedly hard or surprisingly good.
Real question: "Why is this happening? What does my chart say about this period?"
What they receive today: "MARS-RAHU PERIOD SYNTHESIS FOR CANCER LAGNA - DASHA THEMES AND ACTION AXIS. Mars as the main life-period lord activates key house themes..."
What they need: "You're in a Mars period — this is why you've felt more driven and possibly more reactive than usual. Mars rules your career and creative zones, so the push you're feeling toward ambition is real. The risk is overcommitting. This runs until 2032."

**Archetype C — The Practitioner (10%)**
Already knows Vedic astrology. Wants precision data.
What they receive today: Pretty good for them. The hora table, choghadiya, NativityCard.

### The fundamental design mistake

The platform was designed to impress practitioners (showing all data) while being marketed to Decision-Makers and Self-Knowers (who want guidance, not data).

The result: a technically impressive system that doesn't answer the real question.

---

## THE PRODUCTS (what users would actually buy)

### Current products (wrong framing):
- Free: Chart + 1 sample day (feels incomplete, generates poor first impression)
- 7-day: 7 days of hourly timing
- Monthly: 30 days + year overview
- Annual: Same as monthly, more months

### What users actually want to buy:

**"Know Yourself" — Free/Entry**
Complete: your rising sign and moon sign character (2 paragraphs), your current life chapter in plain language (1 paragraph), today's timing.
This is COMPLETE for its scope. Not a teaser. Not a truncated report.
Why it works: The personal profile is the emotional hook that makes people willing to pay for more.

**"Plan Ahead" — Core paid**
30-day domain-filtered timing intelligence.
Organized around the question: "When is the right time for [career/money/love/health]?"
Not "18 hourly slots × 30 days" — that's data, not value.
Value prop: "Know your best days before they happen."

**"Full Year" — Premium**
Everything in Plan Ahead + 12-month domain map + life chapter analysis + calendar export.
Value prop: "Plan your year, not just your month."

---

## THE INFORMATION HIERARCHY (user-need ordered)

### What it should be (from emotional need outward):

**Layer 1 — The verdict (10 seconds)**
Who you are + what chapter you're in + the headline for this period.
Not "Cancer lagna with Moon in Capricorn and Rahu MD/Jupiter AD."
YES: "You're a Cancer rising in a Mars period — one of the most driven chapters your chart produces. The next 6 years are for building. The risk is overextension."

**Layer 2 — The near-term guide (2 minutes)**
"Which months/weeks are strong for what?"
Domain-filtered: Career months / Money months / Love months.
Not 12 identical month cards — 12 meaningfully different cards.

**Layer 3 — The timing tool (5 minutes)**
"I need to act on X — when exactly?"
The DecideSection pointing to specific dates.
The hourly table as a precision tool, not the main event.

**Layer 4 — The evidence (for the curious)**
Chart details, dasha explanation, planetary positions.
For the 10% who want to understand why.

---

## THE 10 HIGHEST-ROI CHANGES

### IMMEDIATE (pipeline fixes — affect ALL future reports):

**1. Fix monthly domain score differentiation** [CRITICAL — 30 min]
- Change example JSON in months-first/route.ts to show meaningfully differentiated scores
- Add explicit instruction: "Career, money, health, and love scores MUST differ from each other. Each domain responds differently to different transits."
- Impact: Every future report shows genuinely differentiated "this month is good for career, challenging for money" guidance

**2. Remove ALL-CAPS instruction from synthesis prompt** [CRITICAL — 20 min]
- Remove the "Write ALL-CAPS sentence" instruction from weeks-synthesis/route.ts
- Fix the quality-guard fallback to not inject ALL-CAPS jargon
- Replace with: "Open with a warm, specific 2-sentence verdict that names what this period means for THIS person."
- Impact: Synthesis opening becomes a real advisor statement, not template output

**3. Fix strategic windows reasons to be specific** [HIGH — 20 min]
- Change the strategic_windows prompt to produce reasons referencing the person's specific chart zones
- Example: "This date is strong for career decisions because [planet] is favorably placed in your career zone — use it for proposals, negotiations, or launches."
- Impact: The "Calendar" section and timing chips have real reasons

**4. Fix key_transits H-notation in months prompt** [MEDIUM — 10 min]
- Change template example to use plain language: "Jupiter moves into your creative zone in June — expect new creative opportunities"
- Impact: Month key_transit chips no longer show "H10 kendra" style text

### UI/UX (high impact, already in the system):

**5. Today's live widget** [HIGH — 1 hour]
Build a sticky widget that finds today's date in the stored `days` array and shows:
- Today's score
- Current/next-best hour (based on stored slot times)
- "Next best window: 14:00–15:00"
Uses stored data, no new generation needed.

**6. Dashboard simplification** [MEDIUM — 30 min]
Strip to: today's score + next strong date + report links.
Remove: pipeline logs, filter controls, plan badges.

**7. Free tier restructure** [HIGH — 1 hour]
Show complete personal profile + today's timing for free.
Remove the partial-report feeling.
The hook is "this is genuinely about YOU" not "here's a taste of the full report."

**8. Synthesis → real advisor verdict** [HIGH — requires prompt change]
Currently: compositional fallback that sounds generic.
Should be: "You are in a Mars period. For Cancer rising, Mars rules your [zones]. The defining quality of this chapter: [specific]. Watch out for [specific risk]. The opportunity: [specific]."

**9. Monthly email for paid users** [HIGH — 1-2 hours]
On the 1st of each month: "Here's your [Month] brief."
3 sentences: month character + best week + one action.
Builds the return habit.

**10. Products framing change** [HIGH — 1 hour copy change]
Change "7-day: 126 hourly ratings (0-100)" to "7-day: Know your best 3 days before they happen."
Change "monthly: 30-day hourly calendar" to "Monthly: A full month mapped before it starts."

---

## WHAT SHOULD BE KILLED

- The "Methodology" disclosure at the bottom (users don't care how the math works)
- The pipeline log in the dashboard (internal tool, not user-facing)
- H-notation anywhere in user-facing text (already mostly done)
- "Weekly energy arc." as a fallback theme (should be empty or score-based)

---

## WHAT THE PIPELINE MUST PRODUCE (minimum quality bar)

For the platform to work as promised:

**Monthly:**
- Career score meaningfully different from money score, from health score, from love score
- At least 30-point spread between the best and worst month overall
- A theme that specifically names what that month is good for ("Career visibility and bold proposals" not "Steady month")

**Synthesis:**
- Opening that names the current dasha period, what it activates for this specific rising sign, and what the dominant risk/opportunity is
- Strategic windows with specific reasoning (not "use peak score day")

**Daily overviews:**
- First line as a direct statement ("A focused day — your window for important decisions is late morning")
- Not a template with nakshatra/yoga inserted

---

## THE CORE RETURN LOOP

Build this or the platform has no retention:

1. Daily email (7am): "Today is a [score]/100 day. Your best window: [time]. One thing: [plain instruction]."
2. Phase change alert: "Your [planet] sub-period starts in [N] days. Here's what it activates."
3. Monthly brief (1st of month): "Your [Month] in 3 sentences."

Without these, users generate one report and never come back.
