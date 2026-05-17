# Task for GPT-5.5 (xhigh reasoning) — End-to-end UX audit + claims-vs-offerings reconciliation

You are the senior UX auditor for vedichour.com, a Vedic astrology SaaS shipping Monday. Opus 4.7 has done the work in commits `2cfc845`, `50a58e2`, `d38bcd8`, `5255086`, `f435437` (all between tag `rollback-pre-launch-fixes-20260517` and current HEAD). The branch is `claude/sad-mclean-e1c11d`.

## Your audit has four parts

### Part 1 — End-to-end workflow audit

Walk every user journey and find every UX defect, dead end, missing affordance, broken state, or unclear copy. Critical journeys:

1. **First-time visitor → free Kundli report.** Landing → click "Free Kundli" → onboarding → submit → report generation → report view → PDF? Test every CTA, every back button, every error state.
2. **First-time visitor → paid 7-day report.** Landing → Pricing → onboarding → plan select → Ziina payment → return → report → PDF.
3. **First-time visitor → Monthly Oracle.** Same as above but Monthly tier.
4. **First-time visitor → Annual Oracle.** Same.
5. **Returning user → login → dashboard → new report.** Auth flow, dashboard navigation, second report from dashboard.
6. **Returning user → dashboard → past report.** Click through to a past report from dashboard.
7. **Failed payment → recovery.** What happens if Ziina fails or webhook never arrives?
8. **Failed report → recovery.** What if the pipeline errors mid-stream? Is the trace_id surfaced? Is retry obvious?
9. **Currency switching → user takes action.** Pick INR, then go through paid flow — does Ziina actually charge INR? Does dashboard show INR?
10. **Hindi waitlist → user signs up.** Click the CTA → mailto opens → does the email body make sense?
11. **Mobile flow** for journeys 1–4 at 320px / 375px / 768px.
12. **Refund request flow.** User reads refund page → emails support → expected behaviour matches what's promised on the page.

For each journey list:
- Steps the user actually takes.
- Friction points / missing affordances.
- Dead ends (where the user can get stuck with no obvious next action).
- Confusing copy or unclear button labels.
- Mobile-specific failures (keyboard hides submit, tap targets <44px, horizontal scroll).
- Accessibility issues (focus order, aria-labels, contrast, keyboard nav).

### Part 2 — Claims-vs-offerings reconciliation

For every claim made on the website, verify the product actually delivers it. The new landing has these specific claims that must be checked:

- **Hero TRUST_STATS:** "12,000+ charts generated", "★ 4.8 from 340+ seekers", "18 hourly Vedic windows/day", "24h no-questions refund". Which of these is verifiable in code/DB?
- **UseCases section** (six tiles): Muhurta, Janam Kundali, Dasha-bhukti, Gochara, Ashtakoot Milan, Annual Varshaphala. Does the product actually deliver each?
- **SampleReportPreview** shows a Cancer-lagna sample with: Jupiter MD/Mercury AD, hourly grid with Amrit/Shubha/Labha/Char/Rog/Udveg windows + scores, Vimshottari timeline. Does a real generated report look like this?
- **VedicVsWestern** claims: sidereal Lahiri (verify in `ephemeris-service/main.py`), whole-sign houses, Vimshottari dasha, hora + choghadiya + Rahu Kaal, scripture-grounded. Verify each in code.
- **PricingComparison** matrix lists features per tier. For each feature row, verify the product actually delivers it for that tier:
  - "Free Kundli (Janam Kundali)" — free tier
  - "Lagna + Moon sign + Nakshatra" — free
  - "Current Mahadasha + Antardasha" — free
  - "Nativity deep-dive (40-page reading)" — monthly+
  - "All 9 grahas with dignities" — week+
  - "Yogas + scripture citations" — week (partial), month+
  - "Hora schedule (24/day)" — sample on free, full on week+
  - "Choghadiya (8 muhurtas/day)" — week+
  - "Rahu Kaal warnings" — week+
  - "Hourly Vedic windows (18/day)" — week+
  - "AI narrative per day" — week+
  - "30-day complete forecast" — month+
  - "12-month annual Varshaphala" — annual
  - "Weekly synthesis" — month+
  - "Monthly theme analysis" — month+
  - "PDF report" — month+
  - "Markdown export" — month+
  - "Priority generation queue" — annual
  - "24h no-questions refund" — paid tiers
- **Testimonials** section claims by named lagnas: Cancer / Virgo / Taurus / Scorpio / Libra / Sagittarius. Do the quotes describe features that actually exist?
- **FAQ** claims (read `src/lib/faq-data.ts`): verify each Q&A is consistent with current product.
- **Refund policy page**: 24h refund window. Does anything in the code enforce or contradict this?
- **Privacy policy page**: lists sub-processors. Does the actual `package.json` + production env match what's listed?

For each claim, mark:
- ✅ Verified in code (cite `path:line`)
- ⚠️ Partial — feature exists but doesn't fully match claim
- ❌ Missing — claim is made but product does not deliver
- ❓ Cannot verify without running the live system

### Part 3 — Visual / design polish

Walk each landing section and report any:
- Inconsistent spacing or typography.
- Missing dark/light mode considerations (the site is dark-only — flag any light-mode bleed).
- Buttons that don't match the established `btn-primary` / `btn-secondary` patterns.
- Spacing that breaks the section rhythm.
- Mobile breakpoints that look wrong.
- Animations that distract or jank.
- Color contrast failures (WCAG AA).
- Focus rings missing on interactive elements.

### Part 4 — Edge cases

For each major surface, list at least 3 edge cases the current implementation handles poorly or not at all:
- Empty states (no reports, no payments, no nativity).
- Long content (very long names, long city names, long generation errors).
- Stale data (old report from 6 months ago, payment from 1 year ago).
- Network failures (geo API fails, ephemeris service down, RAG retrieval timeout).
- User actions out of order (going back, refreshing mid-payment, multiple tabs).
- Auth edges (session expires mid-onboarding, OAuth callback fails).

## Constraints

- Read access to the whole repo. Write access only inside `.launch-plan/`.
- Cite `path:line` for every claim about the codebase.
- Be specific — "the Hero is fine" is useless; "the Hero's TRUST_STATS at `src/components/landing/Hero.tsx:5` claims X but the DB has Y" is useful.
- Be ruthless. The point of this audit is to find what to fix, not validate what looks fine.
- Length: this should be a thorough audit. Aim 3,000–5,000 words.
- Save your output to `.launch-plan/plan_v7_gpt55_uxaudit.md`. Do not edit source code outside `.launch-plan/`.

## Output structure

```
# v7 — UX audit + claims reconciliation

## 1. Workflow audit
### 1.1 First-time visitor → free Kundli
### 1.2 First-time visitor → paid 7-day
... (etc, one section per journey)

## 2. Claims-vs-offerings
### 2.1 Hero TRUST_STATS
### 2.2 UseCases
### 2.3 SampleReportPreview
### 2.4 VedicVsWestern
### 2.5 PricingComparison (feature-by-feature)
### 2.6 Testimonials
### 2.7 FAQ
### 2.8 Refund / Privacy

## 3. Design polish

## 4. Edge cases

## 5. Prioritized fix list
P0 (must fix before launch): ...
P1 (this week): ...
P2 (later): ...

## 6. Top 10 sharpest findings
The ten items most likely to bite on Monday.
```

When done, exit. Do not write code outside `.launch-plan/`.
