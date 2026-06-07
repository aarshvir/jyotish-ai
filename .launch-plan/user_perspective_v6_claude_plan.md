# VedicHour — User-Perspective Complete Rethink (Claude v6 Plan)
## Starting from: "What does a real person actually want?"

---

## THE CORE INSIGHT I KEEP AVOIDING

Everything built so far has been FROM THE DATA OUT.
A good platform is built FROM THE USER IN.

The current platform answers: "Here is your astrological data, organized by time."
A user actually asks: "What should I do, and when should I do it?"

That gap is the whole problem. No amount of de-jargoning fixes it.

---

## WHO IS THE USER, REALLY?

Three distinct emotional states when they arrive:

**1. The Decision-Maker (60% of buyers)**
They have something specific weighing on them — a job offer, a business start, a relationship move, a contract to sign. They want: A DIRECT ANSWER with a timing recommendation. What they get today: 18 rows of hourly scores they have to interpret themselves.

**2. The Self-Knower (30% of buyers)**
They want to feel understood by their chart — why they repeat patterns, what their chart says about relationships, whether they are in a good or hard period. They want: A MIRROR — personal narrative that resonates. What they get today: "Cancer lagna with Moon in Capricorn. Rahu MD / Jupiter AD."

**3. The Practitioner (10% of buyers)**
They already know Vedic astrology. They want precision data. The platform works well for them but they are the minority.

**The platform is built FOR Practitioners, marketed TO Decision-Makers and Self-Knowers. This is the fundamental mismatch.**

---

## WHAT THE INFORMATION HIERARCHY SHOULD BE

### Current hierarchy (data-organized):
Summary → Year (12 months) → Weeks (6) → Days (N) → Hours (18/day) → Chart

### What it should be (user-need organized):

**DISCOVER** (first 15 seconds)
- Your identity: 2 sentences about who you are from the chart
- Your chapter: what life period you are in and what it means (plain language)
- Right now: today's energy in one sentence + your next best window

**ORIENT** (next 2 minutes)
- The year: visual heat map with DOMAIN overlays, not just one score
- Peak periods highlighted BY WHAT THEY ARE GOOD FOR
- "Best months for Career | Money | Love | Health" — separate filtered views

**ACT** (when they need timing)
- "I want to act on..." [Career / Money / Relationship / Health / Other]
- Best 3 dates in the next 30 days for that domain
- Today's optimal hours
- Plain recommendation: "Best window: Tuesday Apr 27, 10am-12pm"

**UNDERSTAND** (for the curious)
- Life chapters timeline (dasha sequence as life narrative)
- Chart details
- Why: the classical astrology behind the recommendations

---

## WHAT PRODUCTS WOULD A USER ACTUALLY BUY?

### Current products (data-centric):
- Free: Chart + 1 sample day
- 7-day: 7 days of hourly timing
- Monthly: 30 days + year overview
- Annual: Same as monthly, longer

### What users actually want to buy:

**"Know Yourself"** — FREE anchor product
- Your personal profile: rising sign, moon sign, life themes (2-3 paragraphs)
- Your current life chapter: what Dasha period you are in, what it is activating (1 paragraph)
- Today's timing: best and avoid windows for today
- This is COMPLETE and PERMANENT value — does not expire, does not get stale
- Hook: "This is actually about YOU, specifically"
- Why this works: People pay Co-Star/Pattern for exactly this. It is the emotional anchor.

**"Time Your Decisions"** — Core paid product
- 30-day decision timing
- Domain filters: Career / Money / Love / Health — each with its own date recommendations
- Plain language: "Best days for career action this month: Apr 14, Apr 27, May 3"
- Hourly detail when needed (not by default)
- The value prop: "A personal advisor who tells you WHEN"

**"Annual Intelligence"** — Premium
- Everything in monthly
- 12-month domain planning (which months for what)
- Life chapter deep-dive (dasha transitions across the year)
- Exportable planning calendar (iCal with best dates)
- The value prop: "Plan your entire year around your timing"

**Missing from current products:**
- A subscription model where today's timing refreshes daily
- The self-knowledge product (permanent value)
- Decision-mode filtering by domain

---

## THE REPORT STRUCTURE THAT WOULD ACTUALLY WORK

Replace the linear document scroll with 4 tabs:

**[TODAY]** — Always showing current data
- Today is a [strong/moderate/light] day for [action type]
- Current/next-best hour quality (from stored slots)
- Best 3 windows remaining today
- Tomorrow's preview
- This tab should feel LIVE

**[DECIDE]** — The highest-value tab
- Domain selector: Career / Money / Relationship / Health / Spiritual
- Selected domain shows best 3 upcoming dates in 30 days with plain reason
- Today's relevant hourly windows for that domain
- One recommendation sentence
- This is what people pay for — a direct answer to "when should I act on X?"

**[PLAN]** — The overview tab
- 12-month heat map with domain overlay filter (see career months vs money months vs love months)
- Selected period detail (click month to see that month's character)
- Week breakdown when drilling

**[YOU]** — The identity/permanence tab
- Personal profile (rising sign narrative, moon sign, key themes)
- Life chapters timeline (dasha sequence as illustrated horizontal timeline)
  - "You are in month 14 of your 18-year Rahu chapter (2025-2043)"
  - "After Rahu: Jupiter period 2043-2059 — wisdom, recognition, family"
- Chart details for those who want it

---

## THE CORE LOOP (what brings users back)

Currently: No core loop. User generates report, views it once, never returns.

What it should be:
1. Daily touchpoint: notification — "Today's best window: 2-4pm. Good for creative decisions. Avoid 11am."
2. Decision triggers: "You have a strong career window coming Apr 27. Don't let it pass."
3. Progress narrative: "You're in month 3 of your 18-year Rahu chapter. Here's what typically activates..."
4. Weekly summary: "This week was scored 71/100. Your best day was Tuesday."

---

## THE 10 HIGHEST-ROI CHANGES (buildable now, no new pipeline)

1. **Domain overlay filter on the year strip** — Toggle Career/Money/Love/Health to see which months are strongest for each domain. Uses existing domain_scores already in the data.

2. **Life chapters dasha timeline** — Render dasha_sequence as a horizontal timeline showing past/current/upcoming chapters with plain descriptions. Answers "where am I in my life?" — Co-Star's most used feature.

3. **"Best days for X" in month detail** — When a month is selected, show "Best career days: 14, 27 | Best money days: 8, 22" derived from per-day domain scores.

4. **[DECIDE] tab** — Domain selector that filters best upcoming dates to "when should I act on [career/money/love/health]?" The platform's unique value finally made explicit.

5. **Today's stats widget** — A sticky widget showing today's day score + best remaining hour, computed dynamically from stored slot data for today's date.

6. **Free tier restructure** — Give COMPLETE personal profile + COMPLETE today's timing free. Remove the partial-report feeling. Users get real value; upgrade is for multi-day planning.

7. **"This month in brief" summary** — One paragraph at top of month detail: "Strong for career (score 73), challenging for finances (48), excellent for relationships (82). Best action days: 14, 21, 27."

8. **Dasha "you are here" progress bar** — "Rahu period: [====-------] Month 14 of 216 (2025-2043)". Makes the life chapter feel navigable, not just labeled.

9. **Tab navigation** — Replace sidebar + linear scroll with [Today] [Plan] [Decide] [You]. The report is an app, not a document. It should feel like one.

10. **Domain-prioritized ForecastSnapshot** — The hero should lead with the STRONGEST domain ("Your career is very strong this period") not just a balanced summary. Give users the most actionable signal first.

---

## WHAT IS FUNDAMENTALLY BROKEN

1. Organized for data, not for use. Months in calendar order means returning users scroll past history to get to now.
2. Value buried under data. "Your next great career window is April 27" is hidden in a 540-row data dump.
3. No reason to return. Static report. Day 1 and Day 14 look identical.
4. Wrong free tier. Partial truncated report says "you're getting less." Complete narrow report says "you're getting real value."
5. No identity hook. Every successful astrology app leads with WHO YOU ARE. VedicHour leads with timing scores. Timing without identity has no emotional resonance.
