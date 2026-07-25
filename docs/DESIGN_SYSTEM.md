# VedicHour Design System

_Generated from a 7-agent study: 4 audits of the live product + 3 research passes across 100+ best-in-class consumer platforms (Swiggy, Zepto, CRED, Zomato, Groww, Uber, Airbnb, Revolut, Calm, Headspace, Oura, Co-Star, The Pattern, Spotify, Duolingo, Notion, and more)._

**Status:** authoritative. Build against this, not against existing component styling.

---

## Design thesis

VedicHour becomes "a printed almanac made for one person" — a warm, paper-surfaced, serif-led reading object that opens and closes in a deep plum-indigo night sky, instead of a navy dashboard that prints scores at you. The three changes that create it: (1) TWO CANVASES, ONE SOUL — the cosmic dark is demoted from "the whole product" to the ritual frames only (landing hero, report cover, generating screen, chapter dividers, payment success), while every surface where a human READS or TYPES (report body, onboarding, calculators, pricing) moves to a warm parchment canvas with ink-on-paper type; (2) VOICE INVERSION — Cormorant Garamond takes every headline and every verdict sentence, DM Sans with tabular numerals takes all body, labels AND all numbers, and JetBrains Mono is quarantined to three legitimate machine strings (683 `font-mono` → under 20); uppercase wide-tracked micro-labels are abolished entirely; (3) ANSWER-FIRST DOCUMENT — the report gains a cover, three named chapters, and a single "Your next moves" opener of three verb-led sentences, replacing the four competing summary widgets and cutting ~80 visible scores to under 25, each rendered as a word-first verdict badge rather than a bare numeral.

---

## Design system (tokens)

════════════════════════════════════════════
0. THE CANVAS RULE (governs everything below)
════════════════════════════════════════════
NIGHT canvas — ritual only: landing hero, report cover, chapter dividers, generating screen, payment-success screen, 404/error, footer. Deep plum-indigo, warm off-white type, amber-300 accents.
PAPER canvas — everything a human reads or types: report body (all chapters), onboarding, all calculators, pricing/paywall, dashboard, account. Warm parchment, ink type, amber-600/700 accents.
Implementation: `data-canvas="night" | "paper"` on the section/page wrapper; every token below is defined per-canvas as a CSS variable so components stay canvas-agnostic (`bg-surface`, `text-fg`, `border-hairline`). Delete the existing `[data-theme="light"]` block and replace with these.

════════════════════════════════════════════
1. COLOR — full replacement palette
════════════════════════════════════════════
--- NIGHT SURFACES (replaces cold navy #080C18/#0D1426/#141C35/#1E2A4A) ---
night-0   #0A0713   page void / behind everything (near-black plum)
night-1   #120C1E   canvas
night-2   #1B1329   raised card
night-3   #251A38   inset / chip / input well   ← THIS IS THE FIX FOR THE 34 DEAD `bg-bg-3` USES; alias `bg-3` → #251A38
night-4   #32234A   overlay / sheet
night-line   rgba(255,241,224,0.09)   hairline (replaces solid #1E2A4A)
night-line-strong rgba(255,241,224,0.16)

--- NIGHT TEXT ---
night-fg      #F6EFE4   headings + primary (warm off-white; replaces blue-white #E8EAF0)
night-fg-2    #C9BCCE   body/secondary  (7.1:1 on night-1)
night-fg-3    #9B8FA6   tertiary/meta   (4.6:1 on night-1 — THIS IS THE FLOOR)
Aliases so existing class names keep working: star→night-fg, dust-light→night-fg-2, dust→night-fg-3, space→night-0, cosmos→night-1, nebula→night-2, horizon→night-line.

--- PAPER SURFACES ---
paper-0   #FBF7F1   canvas (warm, not white)
paper-1   #FFFFFF   card
paper-2   #F4EDE3   inset / tinted band / input well
paper-3   #EAE0D2   heavy band / table zebra
paper-line     #E6DBCB   hairline
paper-line-2   #D6C8B3   emphasized rule

--- PAPER TEXT (ink ramp) ---
ink-900  #1E1726  headings (14.9:1 on paper-0)
ink-700  #3B3247  body prose (10.2:1)
ink-500  #66596F  secondary (5.4:1)
ink-400  #857A8E  tertiary — FLOOR, never lighter (4.5:1)

--- BRAND AMBER (kept, now canvas-calibrated) ---
amber-100 #F8EDD4   tint fills on paper
amber-300 #E8C97A   text/accent on NIGHT only
amber-500 #D4A853   THE BRAND MARK — logo, rules, ornament, night CTAs
amber-600 #B5862F   PAPER primary-action fill
amber-700 #8A6318   PAPER amber text/links (4.6:1 on paper-0 — the only amber allowed as text on paper)
amber-tint-night rgba(232,201,122,0.12)
amber-tint-paper rgba(181,134,47,0.10)

--- NEW: SECONDARY ACCENT (breaks the amber monopoly; informational chips, links, "learn more", selected tabs) ---
indigo-300 #9AA0F2  (night)
indigo-600 #4A4FA8  (paper — 7.0:1)
indigo-tint-night rgba(154,160,242,0.13)
indigo-tint-paper rgba(74,79,168,0.09)
RULE: amber = the ONE next action per viewport. Indigo = everything that used to be amber-for-emphasis.

--- SEMANTIC / TIMING BANDS (one canonical 5-tier scale; deletes the 4 competing threshold sets) ---
tier        range    paper text  night text  paper tint                night tint
strong      80–100   #226B48     #6ECFA0     rgba(34,107,72,.10)       rgba(110,207,160,.14)
favorable   60–79    #3B8C63     #93DCB8     rgba(59,140,99,.09)       rgba(147,220,184,.12)
mixed       40–59    #8A6318     #E8C97A     rgba(138,99,24,.09)       rgba(232,201,122,.12)
guarded     20–39    #A9541F     #F0A177     rgba(169,84,31,.10)       rgba(240,161,119,.13)
avoid        0–19    #8E3418     #EC8B6B     rgba(142,52,24,.11)       rgba(236,139,107,.14)
error/destructive = avoid row. Success ticks = strong row. These colors are ONLY ever used semantically — never as decoration.

--- OVERLAYS ---
scrim rgba(10,7,19,0.62) + backdrop-blur(10px)
grain: SVG feTurbulence data-URI, opacity .028 on night surfaces, .016 on paper. Applied via `body::after` and `.card::after` (pointer-events:none). This alone removes most of the "flat digital rectangle" quality.

════════════════════════════════════════════
2. TYPOGRAPHY
════════════════════════════════════════════
FONT ASSIGNMENT — enforce mechanically.
• Cormorant Garamond (font-display, 600): ALLOWED ONLY at ≥1.25rem. Report cover name, chapter titles, section h2, card titles ≥20px, the verdict sentence in Your Moves, the price figure, the hero headline. NEVER on body, label, chip, caption, or any `text-body-*`/`text-label-*`. Optical tracking −0.015em, line-height 1.02–1.3.
• DM Sans (font-body): ALL body prose, ALL labels, ALL UI chrome, AND ALL NUMBERS. Add `.tnum { font-variant-numeric: tabular-nums lining-nums; font-feature-settings:'tnum' 1,'lnum' 1; }` and apply to every score, price, date, duration, percentage.
• JetBrains Mono (font-mono): permitted in EXACTLY three places — (a) payment/order reference IDs, (b) the admin/diagnostic strips behind `isAdminView`, (c) raw ephemeris/coordinate readouts inside the collapsed "How this was made" accordion. Nowhere else. Clock times are DM Sans `.tnum` at 12-hour with am/pm ("10:00 am"), never mono, never 24h.
• UPPERCASE: banned except ONE component — the tiny chapter marker ("CHAPTER II"), capped at 0.75rem/600/letter-spacing .06em. Max letter-spacing anywhere else: 0.02em.

SCALE (replaces tailwind.config.ts fontSize wholesale; note display-sm and the removal of mono-lg/md)
display-xl  clamp(2.75rem,7vw,5rem)      /1.02 /-0.020em/600  serif  — hero, cover name
display-lg  clamp(2.25rem,5.5vw,3.5rem)  /1.06 /-0.018em/600  serif  — chapter opener
display-md  clamp(1.75rem,4vw,2.5rem)    /1.12 /-0.015em/600  serif  — section h2
display-sm  clamp(1.375rem,3.2vw,1.75rem)/1.20 /-0.010em/600  serif  — ★ NEW, fixes the dead token that leaves the mobile report headline at 16px
headline-lg 1.5rem   /1.25/-0.01em/600  serif
headline-md 1.25rem  /1.30/ 0     /600  serif
headline-sm 1.0625rem/1.40/ 0     /600  SANS (below the serif floor)
read-lg     1.1875rem/1.78/ 0     /400  sans — report prose, desktop
read-md     1.0625rem/1.75/ 0     /400  sans — report prose, mobile default
body-lg     1.0625rem/1.65/400    body-md 1rem/1.60/400    body-sm 0.9375rem/1.55/400
label-lg    0.875rem /1.35/0.005em/500
label-md    0.8125rem/1.35/0.010em/500
label-sm    0.75rem  /1.30/0.020em/600
num-xl 3rem/1.00/-0.02em/600 · num-lg 1.75rem/1.15/-0.015em/600 · num-md 1.125rem/1.20/600 · num-sm 0.9375rem/1.25/500   (all sans + .tnum)
mono-sm 0.8125rem/1.40/400   ← the ONLY surviving mono size. DELETE mono-lg, mono-md, and mono-xs.
FLOORS: no text below 0.75rem anywhere (kills `text-[8px]` chart axes and `text-[10px]` hints). No focusable input below 16px, ever (iOS zoom).
PROSE: `.prose-reading { font-size: var(--read); line-height: 1.75; max-width: 64ch; color: var(--fg-2); }` — every AI-written paragraph uses it. Paragraph spacing 1.25em. Drop-cap the first paragraph of each chapter on paper (`::first-letter { font-family: Cormorant; font-size: 3.2em; float:left; line-height:.82; margin:.05em .1em 0 0; color: var(--amber-700); }`).
REWRITE `.section-eyebrow`: `font-family: var(--font-body); font-size:.8125rem; font-weight:500; letter-spacing:.01em; text-transform:none; color: var(--indigo);` — 53 sites improve at once.
OPACITY RULE: `text-*/NN` is FORBIDDEN. Opacity may only be applied to backgrounds and borders. Every text color comes from the named ramp. (Kills ~340 sub-AA instances.)

════════════════════════════════════════════
3. SPACING RHYTHM (4pt base)
════════════════════════════════════════════
s1 4 · s2 8 · s3 12 · s4 16 · s5 20 · s6 24 · s7 32 · s8 40 · s9 64 · s10 96
Card padding: 20 mobile / 28 desktop. Sibling cards gap 12. Field stack gap 20.
Section gap: 40 mobile / 64 desktop. CHAPTER gap: 96 (this is the whitespace the report currently has none of).
Page gutter: 16 mobile / 24 tablet / 32 desktop. Reading column max 64ch, centered.
Header→content 24. Heading→deck 8. Deck→body 20.
Tap targets: min 44×44 on everything interactive; 48 for primary CTAs. Pinned-bar pages get `padding-bottom: calc(env(safe-area-inset-bottom) + 88px)`.
scroll-margin-top on every anchored section: `calc(var(--header-height,4rem) + 3.5rem)`.

════════════════════════════════════════════
4. RADIUS
════════════════════════════════════════════
xs 6px (inline chips, score pills interiors) · sm 10px (small buttons, inputs) · button 12px · card 16px · card-lg 20px (hero/cover/paywall cards) · sheet 24px 24px 0 0 · pill 9999px
BANNED: `rounded-sm|md|lg|xl|2xl` raw Tailwind (181 current uses, incl. the 2px terminal-pane corner on the day panel) → codemod all to `rounded-card`. Old tokens are redefined in place: card .5rem→1rem, button .375rem→.75rem, badge .25rem→.375rem.

════════════════════════════════════════════
5. ELEVATION (replaces pure-black drops)
════════════════════════════════════════════
NIGHT:
 elev-1  inset 0 1px 0 rgba(255,241,224,.06)
 elev-2  0 6px 24px -6px rgba(5,3,10,.60), inset 0 1px 0 rgba(255,241,224,.07)
 elev-3  0 24px 56px -16px rgba(5,3,10,.75), inset 0 1px 0 rgba(255,241,224,.09)
PAPER:
 elev-1  0 1px 2px rgba(60,44,28,.06)
 elev-2  0 2px 4px rgba(60,44,28,.05), 0 10px 28px -10px rgba(60,44,28,.14)
 elev-3  0 24px 60px -18px rgba(60,44,28,.22)
glow-amber  0 8px 28px -8px rgba(181,134,47,.45)  — primary button ONLY, never on static elements
RULE: border XOR shadow. Night cards = elev-2, NO border. Paper cards = paper-line hairline + elev-1. Overlays/sheets = elev-3 + scrim. Delete every `shadow-glow-*` on non-interactive elements and `pulse-amber` entirely.
The `inset 0 1px 0` top highlight on night cards is what makes a dark card read as an object rather than a div — it is mandatory.

════════════════════════════════════════════
6. MOTION
════════════════════════════════════════════
micro (press/hover/toggle) 120ms · standard (enter/exit/expand) 220ms · sheet/modal 280ms · page transition 320ms
enter cubic-bezier(.22,1,.36,1) · exit cubic-bezier(.4,0,1,1) · spring only on the payment-success tick
Stagger: max 3 items × 40ms. Hover lift: translateY(-1px) only on buttons; documents do not levitate (remove the framer `whileHover y:-2` on month/week cards).
DELETE from config: spin-slow, spin-medium, twinkle, pulse-amber. StarField renders once, statically. MandalaRing rotates only on the cover and only for 1.2s on entry, then stops.
Global: `@media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation:none!important; transition-duration:.01ms!important; } }`

════════════════════════════════════════════
7. CORE COMPONENT CSS (globals.css rewrites)
════════════════════════════════════════════
.btn-primary { min-height:3rem; padding:.875rem 2rem; border-radius:.75rem; font:600 .9375rem/1 var(--font-body); background:linear-gradient(180deg,#C99A3E,#B5862F); color:#FFF9EC; box-shadow:inset 0 1px 0 rgba(255,246,230,.30), var(--glow-amber); }
 :hover{ transform:translateY(-1px); filter:brightness(1.06);} :active{transform:translateY(0)}
 (night canvas: background linear-gradient(180deg,#E8C97A,#D4A853); color:#1A1206)
.btn-secondary { min-height:3rem; border-radius:.75rem; background:transparent; border:1px solid var(--hairline-strong); color:var(--fg); }
.input { min-height:3rem; font-size:1rem; padding:.875rem 1rem; border-radius:.75rem; background:var(--surface-inset); border:1px solid var(--hairline); color:var(--fg); }
 :focus{ border-color:var(--amber-600); box-shadow:0 0 0 3px rgba(181,134,47,.18); outline:none; }
 Global guard: `input:not([type=checkbox]):not([type=radio]),select,textarea{font-size:max(16px,1em)}`
.card { border-radius:1rem; padding:1.25rem; box-shadow:var(--elev-2); background:var(--surface-raised); } @media(min-width:640px){ .card{padding:1.75rem} }
.verdict — the ONE badge component: pill, 6px 12px, tier tint bg, tier text color, word first ("Strong") then a 1px rgba(255,255,255,.15) divider then the number at num-sm.tnum. Word is mandatory; number is optional and omitted below `md` size.
.chapter-rule — `height:1px; background:linear-gradient(90deg,transparent,var(--amber-500),transparent); opacity:.5` with a 20px amber MandalaRing centered above it.

---

## Component directives

### Landing hero — src/components/landing/Hero.tsx, src/components/landing/StarField.tsx, MandalaRing.tsx

Stays NIGHT canvas — this is the ritual frame. Background becomes `radial-gradient(120% 90% at 50% -10%, #2A1C42 0%, #120C1E 55%, #0A0713 100%)` + static grain, replacing the flat #080C18. StarField renders once (remove `twinkle` infinite); MandalaRing raised from opacity .08 to .14 with an amber-500→amber-300 gradient stroke and a single 1.2s entry rotation that then stops. Headline moves to `display-xl` Cormorant, warm #F6EFE4, max 14 words. Sub-line `body-lg` in night-fg-2 — no mono, no uppercase eyebrow. Vertical rhythm `pt-14 pb-10 md:pt-32 md:pb-20` (was pt-24 pb-16) and only the first TWO TRUST_STATS render below `sm` — together these put the CTA and its 'no card required' line above the fold at 375×667, which they currently are not. Primary CTA becomes the night `.btn-primary` at 48px full-width on mobile. Add ONE cultural anchor image immediately below the fold via next/image (a diya / hands / temple detail at dusk, `rounded-card-lg`, elev-2) — the product currently ships zero imagery in `public/`, which is the largest single gap after the mono problem.

### Calculator result — src/components/tools/ChartTool.tsx, CalculatorPage.tsx, src/components/forms/BirthDetailsInput.tsx, src/components/tools/TimingBridge.tsx

Flips to PAPER canvas — this is the highest-traffic surface (88 of 120 sessions end here) and it must read as a reading surface, not a console. Page padding `py-8 sm:py-16 lg:py-24` (was py-16 sm:py-24) so the birth-date field lands on the first screen for a ChatGPT referral. Inputs: `text-base` (16px) + `min-h-[44px]` — currently 15px, which force-zooms iOS Safari and never zooms back. Date/time stack to one column below 400px (`grid-cols-1 min-[400px]:grid-cols-2`) — at 360px each column is currently 130px and the native date control clips. Fix the first-tap failure: on submit, if birth_city has text but no resolved lat, await the geocode inline instead of erroring 'confirm your birth city' at a user who just entered one. On success: `scrollIntoView({behavior:'smooth'})` + `role=status aria-live=polite` + `scroll-mt-20`, and render a content-shaped skeleton while loading — today the result renders below the fold with no feedback, so the tap appears to do nothing. Result card itself: paper-1, radius 16, elev-1, headline in `display-sm` Cormorant, all values in DM Sans `.tnum` (zero mono). Directly beneath, a `ResultBridge` card (paper-2, radius 16, elev-2, 20px pad, 24px above): indigo `label-md` eyebrow 'Based on your chart', a `headline-md` serif line naming ONE specific finding already computed ('Your Jupiter period runs to March 2029'), one `body-md` sentence, a full-width amber CTA 'See your best dates →', and a `label-md` ink-400 reassurance line. This is the missing bridge that is currently the single biggest funnel leak.

### Onboarding form — src/app/onboard/_OnboardForm.tsx, src/components/onboard/CityAutocomplete.tsx (new), IntentChips.tsx (new)

PAPER canvas. Every field label loses `font-mono text-label-sm tracking-[0.1em] uppercase` and becomes `font-body label-lg ink-700` in sentence case, phrased as a question ('Where were you born?' not 'BIRTH CITY'). Helper/`why` text goes from italic `text-dust/40` (~2.5:1, the least legible text on the page) to solid ink-500, non-italic. All inputs 16px/48px per the token spec; remove `autoFocus` on the name field. Step indicator circles 24px→32px, `font-body`, joined by a 2px amber-500 progress rail. The coordinate readout `Mumbai (19.08°, 72.88°)` and the pulsing mono 'Locating birth coordinates…' are deleted — confirmation is a small amber pin glyph + 'Sitapur, Uttar Pradesh' in body-sm, tier-strong color. Structural: the free-text question moves out of the Step-2 basement into its own step titled 'What's weighing on you right now?', fronted by 44px-tall multi-select IntentChips (pill, paper-2 bg / amber-100 bg + amber-600 border when selected) that PREFILL the textarea in the user's own voice; the character counter is deleted (a counter on an emotional disclosure is a rate-limit sign on a confession booth). City field becomes a keystroke-debounced autocomplete listbox with 48px rows showing 'Sitapur' over 'Uttar Pradesh, India' — never coordinates — which also removes the Step-3→Step-2 bounce that produced the 35-minute loop.

### Preview report — src/components/report/ForecastSnapshot.tsx, PreviewValueStrip.tsx

PAPER canvas with a NIGHT cover. Opens on a full-bleed cover (min-h 60vh) in night-1 with the mandala ornament: `label-sm` amber chapter marker, the person's name in `display-lg` Cormorant, 'Born {date} at {time} in {city}' in body-md night-fg-2, two pills for lagna and moon sign. Then it transitions to paper for the reading. The report's main headline currently uses the non-existent `text-display-sm` and therefore inherits 16px body on mobile — the new display-sm token fixes it in place. The 11px-mono subhead, the mono shift tags, and the mono reassurance line all become body copy; the emoji 🔒 becomes an inline SVG lock. The 5 domain cards get 40px hand-drawn-feel amber line glyphs (Career/Money/Love/Health/Intimacy, stroke 1.25, `public/art/domain/*.svg`) — that alone turns 5 flat text boxes into a designed grid. The locked region uses a real gradient fade into paper-2 with a legible teaser paragraph half-visible, not a hard cut. Preview ends on one paywall card, not a dead stop — this surface currently sends 8 sessions to 0 pricing clicks.

### Paid report — src/app/(app)/report/[id]/page.tsx, YourMoves.tsx (new), ChapterDivider.tsx (new), ReportCover.tsx (new), TimingCalendar.tsx (new), Score.tsx (new), HourlyTable.tsx, HourlyChart.tsx, DailyAnalysis.tsx, MonthlyAnalysis.tsx, WeeklyAnalysis.tsx, PeriodSynthesis.tsx, DecideSection.tsx

Becomes a document with a beginning, three chapters and an end, on PAPER with NIGHT frames. Order: [night cover] → their question restated → PersonalizedAnswer → YourMoves → ⟨Chapter I · What this period holds⟩ → ⟨Chapter II · When to act⟩ → ⟨Chapter III · Your patterns & foundations⟩ → night signature block → collapsed methodology+glossary. YourMoves replaces TodayCard + the snapshot timing chips + Decide's priority windows: exactly three cards, each = a verb sentence in `headline-lg` serif ('Make your career move in the first week of August'), a date band in amber-700, one plain 'because' line in `.prose-reading`, a 3px tier-colored left rail, and 'See that day →'. Zero scores on that card. ChapterDivider = 96px of air + the fading amber rule + mandala glyph + `label-sm` uppercase marker + `display-lg` serif chapter title — this is the pacing the report has none of. Delete PeriodSynthesis as a section (its four payloads redistribute), delete Monthly's duplicate Weekly Breakdown, delete the mobile half of ReportSidebar so only one sticky nav exists (two currently stack, one invisible behind the z-50 navbar). Every score routes through <Score>/<Verdict>: word first, number secondary, one canonical 5-tier scale replacing the four competing threshold sets — total visible numerals drop from ~80 to under 25. HourlyChart: hardcoded #10b981/#f59e0b/#ef4444 → semantic tokens, hover-only tooltip → tap-selected slot with a fixed detail panel below (it is currently unusable on mobile, which is the majority), 8px axis labels → 12px, add a dashed 50-baseline. The 18×6 desktop `<table>` with its uppercase-mono `<thead>` is deleted in favor of the same card rhythm as mobile in a 2-col grid. PeriodSynthesis's flex-wrap score blob becomes a true 7-column TimingCalendar with weekday headers, tier-tinted cells, date numeral only (no '★ 78' in 30 tiles), plus a sentence naming the best two and hardest one day. All placeholder copy is purged — no 'Week N of 6' padding, no COMMENTARY_FALLBACK instructions, no synthesized 'A strong month overall (score 65/100)', and the '⚠ Data error: expected 18 slots' banner is gated behind isAdminView.

### Paywall / pricing — src/components/report/ForecastSnapshot.tsx (locked block), pricing page, new MobileActionBar.tsx

PAPER canvas, all tiers visible at once — no toggles. Three stacked cards on mobile, 12px gaps, radius 20, elev-2. Recommended card carries a 2px amber-600 border and an offset 'Most chosen' ribbon (label-sm, amber-100 bg, ink-900 text). Each card: plan name `headline-md` serif, price figure `display-sm` serif `.tnum`, a per-day line in `body-sm` ink-500 ('₹1,499 — about ₹50 a day'), max 3 benefit rows each with a tier-strong check. Immediately BELOW the CTA (never on a separate page) a trust strip at `label-md` ink-500 with 16px icons: payment-partner mark · 'Refund within 7 days' · 'One-time payment, no auto-renew' · 'Calculations from Swiss Ephemeris'. The 11px-mono 'NEWUSER30 · 24-hour money-back' line becomes body-sm. Add a mobile bottom action bar appearing after 40% scroll: fixed, `backdrop-blur(16px)`, bg rgba(251,247,241,.90) on paper / rgba(18,12,30,.90) on night, 1px hairline top, price left in num-md.tnum, 48px amber CTA right, entrance translateY(100%)→0 over 220ms. Payment success gets its own NIGHT full-screen state: 72px tier-strong tick with a 240ms scale-in and one 400ms ring, 'Payment confirmed' in `display-md` serif, amount and reference (the one legitimate mono use) with a copy button, then the CTA into the narrated generating stepper.

### Generating screen — src/components/report/GeneratingScreen.tsx, src/app/(app)/report/[id]/loading.tsx

NIGHT canvas — this is the ritual wait, and it should feel like a ceremony rather than a build log. Replace `min-h-[calc(100vh-var(--nav-height))]` with `min-h-[calc(100svh-var(--header-height,4rem))]` on both files: 100vh excludes the retractable mobile URL bar, so the progress ring and telemetry currently overflow a 667px screen during a multi-minute wait. Phase names become human sentences, never internal identifiers like 'nativity_grids': 'Reading your birth chart' → 'Mapping your planetary periods' → 'Scoring every day ahead' → 'Finding your strongest windows' → 'Writing your guidance'. Pending = night-fg-3 with a 1px ring; active = amber-500 ring with a 1.5s opacity breathe plus a real elapsed/remaining line; done = tier-strong tick, 200ms scale-in. Behind the stepper, render the actual report layout as shimmering skeletons at the real radii so the system feels like it has already started delivering. Gaps tighten to `gap-5 sm:gap-8`, orbital block `mb-6 sm:mb-10`, so everything fits one screen.

### Global chrome — src/app/globals.css, Navbar.tsx, ReportTabs.tsx, MobileSectionNav.tsx

One sticky nav per breakpoint: ReportTabs parks at `top-[var(--header-height,var(--nav-height))] z-30` (it currently sits at top-0 z-40 behind the z-50 navbar and is invisible while scrolling) and MobileSectionNav uses `-mx-6` to match the page's px-6 for a true full-bleed strip. The report action row (Copy link / Calendar / Markdown / PDF, all sub-44px, above the identity header) collapses on mobile into one 44px 'Share & save ▾' disclosure — reclaiming ~90px of above-the-fold space for the user's own question. Report page gutter `px-6` → `px-4 sm:px-6`; DailyAnalysis `p-8` → `p-4 sm:p-6 md:p-8`; MonthlyAnalysis `grid-cols-3` → `grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6`. All Sanskrit terms become a `<Term>` component: 1px dotted amber underline, tap opens a 24px-radius bottom sheet with the term in serif, a one-sentence plain definition, and 'Why it matters for you' tied to their chart — replacing the off-page glossary.

---

## Build order

| # | Item | Effort | Why |
|---|---|---|---|
| 1 | Token layer rewrite — new palette, two canvases, type scale, radius, elevation, motion + fix the 3 dead tokens | M | Same token NAMES, new values — so ~150 component files re-skin with zero churn. Also resolves `bg-bg-3` (34 uses currently emitting no CSS, which is why cards read as floating text), `text-display-sm` (the report's mobile headline currently inherits 16px body), and `text-mono-xs`. Highest ratio of visible change to lines edited in the entire plan. |
| 2 | Mobile P0 unblock — 16px inputs, single sticky nav, 44px tap targets, svh math, first-tap geocode | S | These are outright bugs on the majority platform: every input force-zooms iOS Safari, two sticky navs stack with one invisible, the calculator's first tap fails then appears to do nothing. A day of work that stops the product actively fighting its users. |
| 3 | The de-mono / de-uppercase / de-hairline codemod: 683 font-mono → <20, 198 uppercase → 1, 340 sub-AA text opacities → 0, 181 sharp radii → rounded-card | L | This IS the 'coding interface' verdict, mechanically. 11px uppercase monospace on prose and form labels is the signature of a terminal; removing it costs nothing semantically and changes the product's voice everywhere at once. Add formatTime.ts so clock strings render '10:00 am' in DM Sans tabular rather than 24h mono. |
| 4 | Paper reading canvas + serif/sans role inversion on the report body | M | Almost no product whose value is reading something about yourself uses a dark technical canvas for the body. The parchment/ink tokens already exist and are unused. Simultaneously fix the inverted fonts — Cormorant is currently doing 13px body-copy duty while DM Sans does headlines. |
| 5 | Report as document: night cover, three chapters, YourMoves opener, delete the four competing summaries and PeriodSynthesis | L | Turns 11 independently-designed widgets into an authored artifact and kills five proven redundancy pairs. The cover is also the highest-leverage asset for the WhatsApp share loop, since a screenshot of the cover is what gets forwarded. |
| 6 | Component CSS rewrite — buttons, inputs, cards, verdict badge, grain overlay | S | A gradient primary with an inset top highlight, 16px radius cards with real tinted elevation, and 2% grain are the cheapest possible 'premium consumer' upgrade. The Score/Verdict component (word first, number second) is the piece that makes every downstream de-densification possible. |
| 7 | Calculator ResultBridge — convert the biggest dead-end into the funnel's front door | M | 88 of 120 sessions end on free calculators and ChatGPT alone sent 214 visits to lagna-calc. This is a design gap, not a traffic problem — a single specific, personalized next-step card below every result is the highest-revenue-per-pixel change in the codebase. |
| 8 | Onboarding rebuild — intent chips step, sentence-case human labels, city autocomplete, continuous draft | L | 62% skip the question field that the whole personalization hook depends on, and the Step-3→Step-2 geocode rewind produced a reproducible 35-minute bounce loop. Chips drop the cost from 'compose a paragraph' to 'tap the one that's true'; the autocomplete removes the loop entirely. |
| 9 | Paywall + pricing: all tiers visible, per-day math, inline trust strip, sticky mobile action bar, success screen | M | The preview currently sends 8 sessions to 0 pricing clicks. Every Indian commerce app pins price + CTA in the thumb zone and puts refund/payment-partner signals physically adjacent to the button; VedicHour does neither. |
| 10 | Data-viz rehabilitation — tap-driven hourly chart, TimingCalendar grid, one canonical score scale, purge placeholder copy | M | The flagship hourly chart uses off-brand hardcoded hex, has hover-only tooltips (unreachable on mobile) and 8px axes; the same score renders green in one section and amber in another across four competing threshold sets; and template filler ('Week N of 6', 'Use your highest-scoring days…') is currently shipping inside a ₹1,499 deliverable. |
| 11 | Narrated generating stepper with content-shaped skeletons | S | A multi-minute wait is either anxiety or anticipation depending entirely on the copy and the skeletons. Five human phase names plus a real ETA is a few hours of work on the moment the customer has just paid. |
| 12 | Imagery and ornament layer — domain glyphs, per-day nakshatra motif, grain, SVG icons replacing emoji/glyph chars | M | next/image appears in zero files and public/ holds only fonts and icons. For an emotional Indian consumer product that is an enormous absence — and raw ▾ ⚠ 🔴 glyphs next to ★ read as console output, not craft. |
| 13 | design-lint CI guard with ratcheting ceilings | S | Without a hard ceiling on font-mono, uppercase, wide tracking, text-*/NN opacities, sharp radii and undefined tokens, the dashboard aesthetic creeps back one PR at a time. Wire into the existing test:regression chain. |

### Files per item

**#1 Token layer rewrite — new palette, two canvases, type scale, radius, elevation, motion + fix the 3 dead tokens**
- `tailwind.config.ts`
- `src\app\globals.css`

**#2 Mobile P0 unblock — 16px inputs, single sticky nav, 44px tap targets, svh math, first-tap geocode**
- `src\app\globals.css`
- `src\components\forms\BirthDetailsInput.tsx`
- `src\components\tools\ChartTool.tsx`
- `src\components\report\ReportSidebar.tsx`
- `src\components\report\ReportTabs.tsx`
- `src\components\report\MobileSectionNav.tsx`
- `src\components\report\GeneratingScreen.tsx`
- `src\app\(app)\report\[id]\loading.tsx`

**#3 The de-mono / de-uppercase / de-hairline codemod: 683 font-mono → <20, 198 uppercase → 1, 340 sub-AA text opacities → 0, 181 sharp radii → rounded-card**
- `src\app\globals.css`
- `src\components\report\HourlyTable.tsx`
- `src\components\report\MonthlyAnalysis.tsx`
- `src\components\report\DailyAnalysis.tsx`
- `src\components\report\CorrelationsPanel.tsx`
- `src\components\report\PeriodSynthesis.tsx`
- `src\components\report\ForecastSnapshot.tsx`
- `src\components\report\DecideSection.tsx`
- `src\components\report\WeeklyAnalysis.tsx`
- `src\app\onboard\_OnboardForm.tsx`
- `src\lib\utils\formatTime.ts`

**#4 Paper reading canvas + serif/sans role inversion on the report body**
- `src\app\globals.css`
- `src\app\(app)\report\[id]\page.tsx`
- `src\components\report\DailyAnalysis.tsx`
- `src\components\report\MonthlyAnalysis.tsx`
- `src\components\report\WeeklyAnalysis.tsx`

**#5 Report as document: night cover, three chapters, YourMoves opener, delete the four competing summaries and PeriodSynthesis**
- `src\components\report\ReportCover.tsx`
- `src\components\report\YourMoves.tsx`
- `src\components\report\ChapterDivider.tsx`
- `src\app\(app)\report\[id]\page.tsx`
- `src\components\report\PeriodSynthesis.tsx`
- `src\components\report\ForecastSnapshot.tsx`
- `src\components\report\DecideSection.tsx`
- `src\components\report\TodayCard.tsx`

**#6 Component CSS rewrite — buttons, inputs, cards, verdict badge, grain overlay**
- `src\app\globals.css`
- `src\components\report\Score.tsx`

**#7 Calculator ResultBridge — convert the biggest dead-end into the funnel's front door**
- `src\components\tools\ChartTool.tsx`
- `src\components\tools\CalculatorPage.tsx`
- `src\components\tools\TimingBridge.tsx`

**#8 Onboarding rebuild — intent chips step, sentence-case human labels, city autocomplete, continuous draft**
- `src\app\onboard\_OnboardForm.tsx`
- `src\components\onboard\IntentChips.tsx`
- `src\components\onboard\CityAutocomplete.tsx`
- `src\app\api\geocode\route.ts`

**#9 Paywall + pricing: all tiers visible, per-day math, inline trust strip, sticky mobile action bar, success screen**
- `src\components\report\ForecastSnapshot.tsx`
- `src\components\ui\MobileActionBar.tsx`
- `src\app\onboard\_OnboardForm.tsx`

**#10 Data-viz rehabilitation — tap-driven hourly chart, TimingCalendar grid, one canonical score scale, purge placeholder copy**
- `src\components\report\HourlyChart.tsx`
- `src\components\report\HourlyAnalysis.tsx`
- `src\components\report\TimingCalendar.tsx`
- `src\lib\guidance\labels.ts`
- `src\components\report\HourlyTable.tsx`
- `src\components\report\WeeklyAnalysis.tsx`

**#11 Narrated generating stepper with content-shaped skeletons**
- `src\components\report\GeneratingScreen.tsx`

**#12 Imagery and ornament layer — domain glyphs, per-day nakshatra motif, grain, SVG icons replacing emoji/glyph chars**
- `public\art\domain`
- `src\components\ui\MandalaRing.tsx`
- `src\components\report\ForecastSnapshot.tsx`
- `src\components\report\DailyAnalysis.tsx`
- `src\components\landing\Hero.tsx`

**#13 design-lint CI guard with ratcheting ceilings**
- `scripts\design-lint.mjs`
- `package.json`

---

## Source research

### audit-visual-language — audit

## Verdict: the owner is right, and it is measurable

VedicHour doesn't "look a bit techy" — it is literally built out of the visual vocabulary of a developer tool. Five concrete causes, in order of damage.

### 1. Monospace is the default voice of the product (the #1 offender)
`grep` counts **683 `font-mono` usages across 109 of ~150 component files**, and **518 of them are `text-mono-sm`, which resolves to 0.6875rem = 11px** (tailwind.config.ts:118). Mono is not being used for data — it is being used for *prose and UI chrome*:
- `ForecastSnapshot.tsx:157` — the report's explanatory subhead ("Drawn from your birth chart…") is 11px monospace.
- `ForecastSnapshot.tsx:250` — the pricing reassurance line ("30% off with NEWUSER30 · 24-hour money-back guarantee") is 11px mono.
- `DailyAnalysis.tsx:293` — the entire "Today's Playbook" block, the most emotionally important content on the page, is `font-mono text-sm`.
- `DailyAnalysis.tsx:382` — `briefing_v2.why_today`, a full sentence of life guidance, renders in mono.
- `HourlyTable.tsx:155–179` — "Best for / Avoid / Still OK" chips *and* the `if_unavoidable` sentence are all mono.
- `_OnboardForm.tsx:130` — **every form label** is `font-mono text-label-sm tracking-[0.1em] uppercase`.

A woman in Pune asking "when will I get married" is being answered in the same typeface as a stack trace. This single fact accounts for most of the "coding interface" read.

### 2. Uppercase + wide-tracking micro-labels everywhere (terminal/CLI signature)
**198 `uppercase` usages**, plus 56 hard-coded `tracking-[0.15em]`/`[0.2em]`/`[0.12em]`. `.section-eyebrow` (globals.css:261) is itself defined as **mono + 11px + 0.15em + uppercase + amber** and is used **53 times**. The combination mono+uppercase+letterspaced+tiny is the exact signature of Vercel/Linear/Datadog dashboards. It signals "system output," not "someone read your chart."

### 3. Low-contrast grey is the dominant text color — it fails WCAG and reads as "disabled"
`text-dust` (#8892A4) appears **836 times**, but the majority are *transparency-reduced*: **115× `/50`, 110× `/60`, 104× `/40`, 10× `/30`**. Composited on `--color-surface` #0D1426:
- `text-dust/60` ≈ #556272 → **2.94:1** (fails AA 4.5:1)
- `text-dust/40` ≈ #3B4552 → **~1.9:1** (fails even AA-large)

329 instances of body text below AA. On a phone in Indian daylight this is functionally invisible, and psychologically it makes the paid product feel greyed-out/inert.

### 4. Broken and missing tokens are flattening the UI (real bugs, not taste)
- **`bg-bg-3` is used 34 times and is not a defined color.** Tailwind emits nothing. Every card in `ForecastSnapshot.tsx:171/208/238` and across 10 admin pages has **no background at all** — that is why cards read as floating text with a hairline, i.e. "flat." This is the single highest-leverage fix on the list.
- **`text-display-sm` does not exist** (config defines only `display-xl/lg/md`, lines 92–94) yet `ForecastSnapshot.tsx:154` uses `text-display-sm md:text-display-md`. **On mobile — the majority of traffic — the report's main headline "{Name}'s year ahead" has no size class and inherits 16px body text.** The report has no headline hierarchy on phones.
- `text-mono-xs` (3 uses) is also undefined.

### 5. Elevation, radius and imagery are effectively absent
- A full shadow scale exists in config (lines 139–147) and is **almost entirely unused**: 10 `shadow-glow-amber`, 7 `shadow-sm`, **1** `shadow-elevated`, **1** `shadow-inner-light`. Cards are defined in globals.css:238 as background + 1px border + `0.5rem` radius, **no shadow**. Depth comes only from hairline borders → wireframe/IDE-panel look.
- Radius is incoherent: 140 `rounded-card` (8px), **103 `rounded-sm` (2px — near-square, the most "technical" radius available)**, 53 `rounded-md`, 34 `rounded-button`, 17 `rounded-lg`, 8 `rounded-xl`. `DailyAnalysis.tsx:253` wraps the entire day panel in `rounded-sm` — a 2px corner on a 700px card reads as a terminal pane.
- **There is zero imagery in the product.** `grep next/image` → **0 files**. `public/` contains only fonts, 2 PWA icons and 3 SVGs. The only "art" is `StarField` (80 twinkling white dots) and `MandalaRing` at `opacity-[0.08]`. For an emotional, spiritual, Indian consumer product this is an enormous absence — there is nothing warm, human, or culturally resonant anywhere on screen.
- Cormorant Garamond (the one warm, premium asset) is **misused**: it's applied to 11px-ish body prose (`HourlyTable.tsx:185`, `DailyAnalysis.tsx:395`, 16 occurrences of `font-display text-star text-body-sm`) while headings default to DM Sans via `.section-title` (globals.css:270). The serif is doing body-copy duty and the sans is doing headline duty — backwards.

### 6. Palette is cold-blue "night dashboard," not warm "sacred"
Every surface (#080C18 / #0D1426 / #141C35 / border #1E2A4A) sits at hue ~220–225°, i.e. **desaturated navy-blue** — the same family as GitHub Dark, Linear, and every observability tool. The amber #D4A853 is the only warm element and it is used almost exclusively at 11px. Meanwhile the semantic pair — success #3B9B6E (dashboard green) and caution #C75B3A — is applied as `bg-*/10 border-*/20` chips, which is precisely the "status pill" idiom of a monitoring console. `HourlyTable`'s desktop view then renders 18 rows × 6 columns of mono numerals with a bordered `<thead>` of uppercase mono labels: an admin data grid, sold at ₹1,499.

### The one-sentence diagnosis
Every choice optimizes for *machine credibility* (mono, precision, density, hairlines, greys) when the buyer needs *human credibility* (warmth, serif, air, imagery, confident hierarchy). The product looks like the engine, not the answer.

**Recommendations**

- [P0] **Fix the three dead tokens — this alone restores card depth and mobile headline hierarchy** — 1) `bg-bg-3` (34 uses) resolves to nothing. Add the token AND keep the name so no component churn is needed. In tailwind.config.ts colors add: `'bg-3': '#1A2138'`. Better: also add the full warm-shifted surface ramp below and alias `'bg-3'` to it.
2) Add the missing display step: `'display-sm': ['clamp(1.5rem, 4vw, 1.875rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }]` — this immediately gives the report's H2 a real size on mobile (ForecastSnapshot.tsx:154).
3) Add `'mono-xs': ['0.625rem', { lineHeight: '1.3' }]` or replace the 3 `text-mono-xs` uses with `text-mono-sm`.
Verify: `grep -rn 'bg-bg-3\|display-sm\|mono-xs' src` then confirm generated CSS contains `.bg-bg-3`.
- [P0] **Ban monospace from everything except numerals, times and coordinates** — RULE (enforce with an eslint-plugin-tailwindcss custom rule or a CI grep):

ALLOWED `font-mono`: a numeric score (`{hour.score}`), a clock time (`06:00–07:00`), a date stamp, lat/long, an ID/promo code. That's it. Everything else is `font-body`.
BANNED `font-mono`: any string containing a space and a verb; all form labels; all chip/badge text; all eyebrows; all captions; all CTA sub-copy; all `guidance_v2` / `briefing_v2` prose.

Concrete replacements (these 6 sites cover the emotional core):
- `ForecastSnapshot.tsx:157` → `font-body text-body-md text-dust`
- `ForecastSnapshot.tsx:172` (shift tags) → `font-body text-label-md text-amber` (drop `uppercase`)
- `ForecastSnapshot.tsx:250` (guarantee line) → `font-body text-body-sm text-dust`
- `DailyAnalysis.tsx:293` playbook block → `font-body text-body-md text-star`
- `DailyAnalysis.tsx:382` `why_today` → `font-body text-body-md text-dust-light`
- `HourlyTable.tsx:155-179` guidance chips + `:178` `if_unavoidable` → `font-body text-label-md` / `font-body text-body-sm`
- `_OnboardForm.tsx:130` labels → `font-body text-label-lg text-star/80` and DELETE `tracking-[0.1em] uppercase` (sentence case: "Birth date", not "BIRTH DATE")

CI guard: `grep -rn 'font-mono' src --include=*.tsx | wc -l` must trend from 683 toward <120. Add to package.json as `lint:mono` with a hard ceiling.
- [P0] **Kill the uppercase micro-label idiom: redefine .section-eyebrow as the system's single lever** — `.section-eyebrow` is used 53× and is the visual DNA of the terminal look. Rewrite it once in globals.css (line 261) and 53 places improve for free:

```css
.section-eyebrow {
  font-family: var(--font-body), system-ui, sans-serif;
  font-size: 0.8125rem;      /* 13px, up from 11px */
  font-weight: 500;
  letter-spacing: 0.01em;     /* was 0.15em */
  text-transform: none;       /* was uppercase */
  color: var(--amber-light);  /* #E8C97A — brighter, warmer */
  margin-bottom: 0.5rem;
}
```

Then sweep the 56 hard-coded `tracking-[0.15em]` / `[0.2em]` / `[0.12em]` — replace ALL with nothing (default tracking) except on genuinely uppercase *numeric* badges. Ceiling rule: **no letter-spacing above 0.04em anywhere in the product**, and that only on `text-label-sm`.

Copy rule that ships with it: micro-labels become sentence case. "BEST FOR:" → "Best for". "Today's Playbook" (already good) keeps title case. "CHALLENGING WINDOW" (HourlyTable.tsx:48) → "Challenging window".
- [P0] **Warm the palette — keep amber, shift every surface off cold navy** — All surfaces are hue ~222° (GitHub-dark blue). Rotate toward 250–265° (indigo/aubergine) and add a touch of warmth so amber sits in-family instead of shouting. Drop-in replacements in tailwind.config.ts + globals.css `:root` — same token NAMES, new values, zero component churn:

```
space   #080C18 → #0B0710   (near-black plum)
cosmos  #0D1426 → #15101F   (card surface)
nebula  #141C35 → #1F1830   (raised surface)
bg-3    (new)   → #2A2140   (chip/inset surface)
horizon #1E2A4A → #33284A   (border, warm indigo)
star    #E8EAF0 → #F2EBE0   (warm off-white, was blue-white)
dust    #8892A4 → #A79BB5   (warm mid-grey, +contrast)
dust-light #A0A8B8 → #C4B9CE
```

Semantics — retune off dashboard hues:
```
success #3B9B6E → #4FA97C  (keep green but lift)
success.light   → #7BC79E
caution #C75B3A → #D4703F  (terracotta, less "error red")
amber   #D4A853  KEEP (brand)
amber.light #E8C97A KEEP
```

Add a warm gradient primitive for hero/report surfaces (replaces flat fills):
```css
--grad-sacred: radial-gradient(120% 90% at 50% 0%, #241A38 0%, #15101F 55%, #0B0710 100%);
```
Apply to `<body>` background and to the ForecastSnapshot card (currently `from-amber/[0.06] via-cosmos to-cosmos`).

Contrast check to run after: dust on cosmos must be ≥ 4.5:1.
- [P0] **Outlaw sub-70% text opacity — 329 instances currently fail WCAG AA** — Ban `text-dust/30|40|50|55|60|65` (~340 uses). Replace with real tokens so contrast is deterministic:

```
text-dust/30, /40, /45  →  text-dust-dim   (#7A7188 — 4.6:1 on new #15101F)
text-dust/50, /55, /60, /65 → text-dust  (#A79BB5 — 7.2:1)
text-dust/70, /75, /80  →  text-dust-light (#C4B9CE)
text-star/85, /90       →  text-star
```
Add `'dust-dim': '#7A7188'` to config. Then a codemod:
`grep -rl 'text-dust/' src --include=*.tsx | xargs sed -i -E 's/text-dust\/(30|40|45)/text-dust-dim/g; s/text-dust\/(50|55|60|65)/text-dust/g; s/text-dust\/(70|75|80|85|90)/text-dust-light/g'`

Lint rule going forward: `text-dust/NN` and `text-star/NN` are forbidden class patterns. Opacity may only be applied to *borders and backgrounds*, never to text.

Highest-value single fixes if doing it by hand: `ForecastSnapshot.tsx:157,215,250,258` (report subhead + domain copy + guarantee) and `_OnboardForm.tsx:131,245,410,1310` (form hints — 62% of users skip the question field partly because its helper text is ~2:1 contrast).
- [P1] **Swap the type roles: serif for headlines, sans for body — and grow the whole scale** — Currently `.section-title` forces `var(--font-body)` (globals.css:270) while 16 sites use `font-display` for 13px body prose. Reverse it.

globals.css:
```css
.section-title { font-family: var(--font-display), Georgia, serif; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
```
RULE: `font-display` (Cormorant) is allowed ONLY at ≥1.25rem. Never on `text-body-*`. Fix the 16 `font-display text-body-sm` / `text-base` sites (HourlyTable.tsx:185,331; DailyAnalysis.tsx:395) → `font-body text-body-lg`.

Grow the scale — current body sizes are dashboard-dense. In tailwind.config.ts fontSize:
```
body-lg  1rem/1.65      → 1.125rem / 1.75   (18px — the report reading size)
body-md  0.875rem/1.6   → 1rem / 1.7
body-sm  0.8125rem/1.55 → 0.9375rem / 1.65
label-lg 0.8125rem      → 0.875rem, letterSpacing 0.01em
label-md 0.75rem        → 0.8125rem, letterSpacing 0.01em
label-sm 0.6875rem      → 0.75rem, letterSpacing 0.02em
mono-sm  0.6875rem      → 0.8125rem   (11px mono was the worst offender)
headline-lg 1.5rem      → 1.75rem
```
Also set `.prose-reading { font-size: 1.0625rem; line-height: 1.8; max-width: 62ch; }` (globals.css:211) and use it for every AI-written paragraph in the report.
- [P1] **Give cards real depth: one elevation system, one radius language** — RADIUS — collapse 8 competing values to 4. Redefine in tailwind.config.ts and codemod away the 2px corner:
```
badge  0.25rem → 0.5rem
button 0.375rem → 0.75rem
card   0.5rem  → 1rem       (16px — the single biggest 'premium consumer' tell)
pill   9999px  (keep)
```
Then: `rounded-sm` (103 uses) is BANNED → `rounded-card`. `rounded-md`/`lg`/`xl`/`2xl` (81 uses) → `rounded-card`. Sweep:
`grep -rl 'rounded-\(sm\|md\|lg\|xl\|2xl\)' src --include=*.tsx | xargs sed -i -E 's/rounded-(sm|md|lg|xl|2xl)\b/rounded-card/g'`
Explicitly fix `DailyAnalysis.tsx:253` (the day panel) and `HourlyTable.tsx:88` (mobile hour cards).

ELEVATION — soften the shadows (current ones are pure black = hard/technical) and actually apply them:
```js
boxShadow: {
  'card':      '0 1px 2px rgba(6,3,12,0.4), 0 4px 16px -4px rgba(6,3,12,0.5)',
  'card-hover':'0 2px 4px rgba(6,3,12,0.4), 0 12px 32px -8px rgba(6,3,12,0.6)',
  'elevated':  '0 8px 40px -8px rgba(6,3,12,0.7), inset 0 1px 0 rgba(255,240,220,0.06)',
  'glow-amber':'0 0 40px -8px rgba(212,168,83,0.35)',
  'inner-light':'inset 0 1px 0 rgba(255,240,220,0.07)',
}
```
Update `.card` / `.card-interactive` (globals.css:238-255) to `border-radius: 1rem; padding: 1.75rem; box-shadow: theme(boxShadow.card), theme(boxShadow.inner-light);` — the `inset 0 1px 0` top highlight is what makes a dark card read as a physical object rather than a div.

SPACING RHYTHM — sections currently vary (mb-6/8/12 ad hoc). Standardize: card padding 1.75rem (mobile 1.25rem), gap between cards 1rem, gap between report sections 4rem (`mb-16`), section-header margin 1.5rem. `.section-header { margin-bottom: 1.5rem }` stays; change ForecastSnapshot/DailyAnalysis `mb-12` → `mb-16`.
- [P1] **De-dashboard the hourly data: kill the desktop table, keep one card rhythm** — `HourlyTable.tsx:196-343` renders an 18×6 `<table>` with a bordered `<thead>` of uppercase mono labels — the single most 'admin console' artifact in the product. Users on mobile never see it; desktop users see a spreadsheet.

Replace the desktop branch with the SAME card list as mobile, in a 2-column grid at `lg:`. Each card:
- Time as `font-mono text-mono-lg text-star` (mono is CORRECT here — it's a clock)
- Score as a filled circular/pill badge, not a bare numeral: `rounded-pill px-3 py-1 bg-success/15 text-success-light font-mono text-mono-lg font-semibold` — the score should read as a *seal*, not a cell value
- Quality label in `font-body text-label-lg`, sentence case
- Commentary in `.prose-reading`

Also replace the emoji/glyph status markers (`⚠`, `★`, `🔴` at HourlyTable.tsx:104,248 and `▾`/`▲`/`▼` chevrons at :134, DailyAnalysis.tsx:332) with inline SVG icons at `currentColor`. Raw `▾` and `⚠` render as system glyphs and look like console output; `🔴` next to `★` is a jarring style clash.

Same treatment for `getChoghadiyaBg` (HourlyTable.tsx:54): `bg-*/10 border-*/20` is the Grafana status-pill idiom. Go to `bg-*/15` with NO border and `rounded-pill`.
- [P1] **Introduce an imagery + illustration layer — currently literally zero** — `next/image` is used in 0 files; `public/` has no imagery. For an emotional Indian consumer product this is the largest single gap after the mono problem. Ship a lightweight, self-hosted system (no stock photos of white people meditating):

1) **Domain glyph set** — 5 hand-drawn-feel SVG line icons in amber gradient for Career / Money / Love / Health / Intimacy, 40px, `stroke-width 1.25`, used in `ForecastSnapshot.tsx:204` domain cards. Store at `public/art/domain/*.svg`. This alone turns the 5 flat text cards into a designed grid.

2) **Nakshatra / planet motifs** — reuse the existing `MandalaRing` language but as *content*: a per-day SVG motif keyed to `panchang.nakshatra`, 96px, `opacity 0.5`, warm amber `#D4A853 → #E8C97A` gradient, top-right of the day panel (`DailyAnalysis.tsx:253`). Currently MandalaRing only exists at `opacity-[0.08]` as invisible wallpaper (Hero.tsx:30) — raise hero to `opacity-[0.14]` and give it a slow gradient stroke rather than flat `text-amber`.

3) **Texture, not just gradient** — add a 1-2% opacity paper/grain SVG noise overlay on `<body>` and on `.card`. Two lines of CSS, and it removes the 'flat digital rectangle' quality more than any other single change:
```css
.grain::after { content:''; position:absolute; inset:0; pointer-events:none; opacity:.025; background-image:url("data:image/svg+xml,...feTurbulence..."); }
```

4) **Landing page needs one human/cultural anchor image** above the fold or immediately below it — a real photograph (diya, hands, an Indian family moment, a temple detail at dusk) at `max-w-full rounded-card`, served via `next/image` with `priority={false}`. Hero.tsx currently offers a starfield + text only, which is why it reads as a SaaS landing page rather than something about someone's life.

5) Retire the emoji lock `🔒` in `ForecastSnapshot.tsx:239-244` for an SVG lock — emoji in a paywall reads as unpolished.
- [P2] **Buttons and form fields: make the primary action feel like a product, not a submit** — `.btn-primary` (globals.css:282) is a flat amber rect, 6px radius, 14px sans, `color:#080C18`. Upgrade:
```css
.btn-primary {
  padding: 0.875rem 2rem; min-height: 3rem;
  font-size: 0.9375rem; font-weight: 600;
  border-radius: 0.75rem;
  background: linear-gradient(180deg, #E8C97A 0%, #D4A853 100%);
  color: #1A1206;
  box-shadow: 0 1px 0 rgba(255,246,230,0.35) inset, 0 6px 20px -6px rgba(212,168,83,0.5);
}
.btn-primary:hover { background: linear-gradient(180deg,#F0D591 0%,#DDB463 100%); box-shadow: 0 1px 0 rgba(255,246,230,0.45) inset, 0 10px 28px -6px rgba(212,168,83,0.6); transform: translateY(-1px); }
```
`.cosmic-input` (globals.css:349): background `var(--color-bg)` makes fields look *recessed into a terminal*. Change to `background: rgba(255,246,230,0.04); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 0.875rem 1rem; font-size: 1rem;` (16px prevents iOS zoom-on-focus — currently 14px, which zooms and is a real mobile-conversion bug). Focus ring → `box-shadow: 0 0 0 3px rgba(212,168,83,0.18)`.

Also `_OnboardForm.tsx:1286`: the step indicator is a 24px circle with `text-label-sm font-mono` — make it 32px, `font-body`, and connect the steps with a 2px amber progress rail.
- [P2] **Add a CI guard so the coding-interface aesthetic cannot creep back** — Add `scripts/design-lint.mjs` run in CI, failing on hard ceilings measured today so regressions are impossible:

```js
const RULES = [
  { name: 'mono overuse',        pattern: /font-mono/g,                      max: 120 },  // today: 683
  { name: 'uppercase labels',    pattern: /\buppercase\b/g,                  max: 20  },  // today: 198
  { name: 'wide tracking',       pattern: /tracking-\[0\.(0[5-9]|[1-9])/g,   max: 0   },  // today: 56
  { name: 'low-opacity text',    pattern: /text-(dust|star)\/(2|3|4|5|6)\d?/g, max: 0 },  // today: ~340
  { name: 'sharp radius',        pattern: /rounded-(sm|md|lg|xl|2xl)\b/g,    max: 0   },  // today: 181
  { name: 'undefined tokens',    pattern: /(bg-bg-3|text-display-sm|text-mono-xs)/g, max: 0 },
  { name: 'serif on body copy',  pattern: /font-display[^"']*text-(body|label)-/g, max: 0 },
];
```
Wire as `npm run lint:design` and add to the existing `test:regression` chain. Start the ceilings at current-count-minus-1 if a big-bang sweep isn't feasible, and ratchet down per PR.

### audit-mobile-journey — audit

Audited at code level against a 375×667 (iPhone SE/12 mini) and 360px (common Android) viewport. Nine confirmed defects, four of which break or degrade the first 30 seconds for a ChatGPT-referred mobile visitor. The "looks like a coding interface" verdict is structurally traceable: `font-mono` at `text-mono-sm` (0.6875rem / 11px) with `uppercase tracking-[0.1em]` is the default treatment for nearly every label, badge, hint, meta line, and status message across landing, onboard, calculators and report.

--- P0 / FIRST-30-SECONDS BREAKAGE ---

1. EVERY text input triggers iOS Safari auto-zoom. iOS zooms the viewport whenever a focused input's computed font-size is < 16px, and does not zoom back out. Two offenders:
   - `src/app/globals.css:349` `.cosmic-input { font-size: 0.875rem }` (14px) — used by all three onboard steps (name, email, phone, date, time, birth city, current city, forecast start, personal-context textarea, promo code).
   - `src/components/forms/BirthDetailsInput.tsx:65` `inputCls` sets no font-size, so it inherits `.prose-reading`/body 0.9375rem (15px) — used by every free calculator via ChartTool.
   Result: user taps "Birth city", page zooms ~1.2x, layout goes wider than the screen, they must pinch back out. This happens on the highest-traffic surface (calculators) on the first interaction.

2. The primary calculator action fails on first tap. `src/components/tools/ChartTool.tsx:96` gates submit on `isValidLat(d.birth_lat)`, but coordinates are only resolved by `geocodeCity()` which fires on the city input's **onBlur** (`BirthDetailsInput.tsx:141`). On mobile the user types the city and taps "Calculate — free" directly; blur fires, the async fetch starts, and `onSubmit` runs immediately with `birth_lat` still `0` → `valid === false` → error "Enter your birth date and confirm your birth city." (ChartTool.tsx:105). The user has entered a birth city and is told to enter a birth city. Desktop users are partly protected because they tab/click elsewhere first; mobile users are not.

3. Tapping "Calculate" appears to do nothing. `ChartTool` renders the result card at line 145 with no `scrollIntoView`, no `aria-live`, no reserved space and no skeleton. At 375px the form card ends around y≈700 (page already has `py-16` + hero + `SeoProse`), so the result renders entirely below the fold. The button reverts from "Calculating…" to "Calculate — free" and nothing visible changes. Combined with #2, the modal calculator experience is: tap → error → tap again → nothing appears.

4. Two competing sticky navs on the report, one of them invisible.
   - `ReportSidebar.tsx:74` renders a mobile tab bar: `lg:hidden sticky top-[var(--header-height,var(--nav-height))] z-40`.
   - `MobileSectionNav.tsx:60` → `ReportTabs.tsx:75` renders a *second* tab bar: `sticky top-0 z-40`.
   `Navbar.tsx:75` is `sticky top-0 z-50` with `bg-space/85 backdrop-blur-md` once scrolled. So the `ReportTabs` bar sticks at y=0 **behind** the higher-z, semi-opaque navbar and is effectively invisible while scrolling — the very wayfinding it was added to provide. Before any scroll, both bars are visible stacked, consuming ~100px of a 667px screen with near-duplicate labels (Summary/Decide/Year/Weeks/Days/Calendar/Chart in both).
   Also `MobileSectionNav.tsx:60` uses `-mx-4` inside a parent with `px-6` (`report/[id]/page.tsx:1364`), so the full-bleed bar leaves an 8px gutter on each side through which content scrolls past the blur backdrop.

--- P1 / MEASURED LAYOUT + TAP-TARGET DEFECTS ---

5. Side-by-side date/time inputs clip at ≤360px. Both `BirthDetailsInput.tsx:84` and `_OnboardForm.tsx:283` use `grid grid-cols-2 gap-3`. At 360px with the calculator's `px-5` + `card p-6`: 360−40−48−12 = **130px per column**; onboard's `px-4` + `card p-7`: 360−32−56−12 = **130px**. A native `<input type="date">` on Android Chrome renders "dd/mm/yyyy" plus a calendar picker glyph, and on iOS a wheel trigger — both need ~140–150px at 15px type before the value is elided. On Galaxy Fold cover (320px) it drops to ~110px and the date is visibly truncated.

6. Report action bar is a row of sub-44px targets that wraps badly. `report/[id]/page.tsx:1414–1479`: "Copy report link" is a bare `font-mono text-xs` button with no padding (≈16px tall hit area); Calendar / Markdown / PDF are `px-3 py-1.5 text-xs` ≈ 30px tall. Four controls plus a `text-[10px]` helper line (line 1481) occupy the space directly above the report's identity header — this is the first thing a paying mobile user sees, and none of it is what they came for.

7. Hourly card rows overcrowd and truncate. `HourlyTable.tsx:95–135`: a flex row of `gap-3` with a fixed `w-24` time column, hora name, choghadiya badge (`shrink-0`), score, and chevron. At 375px minus report `px-6` minus card `px-4` = 295px available; 96 + 12 + badge≈86 + 12 + score≈24 + 12 + chevron≈12 + 12 leaves **~29px** for the planet name, so "Jupiter" renders as "J…". The header is one 52px-tall button containing five distinct data points at 11px.

8. Unknown-birth-time checkbox is a ~16px target. `BirthDetailsInput.tsx:109` is a bare `<input type="checkbox" className="accent-amber">` in a `text-body-sm` row ≈20px tall. The wrapping `<label>` makes the text tappable, but the row itself is well under 44px and sits between two full-width inputs.

9. Generating screen uses `100vh` and the wrong header variable. `GeneratingScreen.tsx:150` and `report/[id]/loading.tsx:8` both use `min-h-[calc(100vh-var(--nav-height))]`. On Android Chrome / iOS Safari `100vh` excludes the retractable URL bar, so the screen is ~60–110px taller than the visible viewport; and `--nav-height` is the static 4rem while the real sticky header is nav + `LaunchBanner` (`--header-height` is measured at `Navbar.tsx:53`). Net effect: the progress ring, phase bar and telemetry panel do not fit on one screen during a wait that can run minutes, and the page scrolls when it should not. The landing hero has the inverse problem — `Hero.tsx:21` correctly uses `100svh` but adds `pt-24 pb-16` plus a four-item trust bar that wraps to three lines at 375px, pushing the CTA and "no card required" line off the first screen.

--- P2 / TONE + DENSITY ---

10. `HourlyChart.tsx:114` renders axis labels at `text-[8px]` — below any legible mobile minimum.
11. Emotional-question audience meets `font-mono uppercase` metadata everywhere: `Field` labels (`_OnboardForm.tsx:130`), `.section-eyebrow` (globals.css), report identity pills, "Today's Playbook" (`DailyAnalysis.tsx:288` `tracking-[0.2em] uppercase`), all guidance chips, all status lines. This is the mechanism behind the owner's verdict.
12. `/onboard` hard-redirects anonymous visitors to `/login?mode=signup` (`_OnboardForm.tsx:655–661`) after the client mounts — so a mobile visitor who taps the hero's "Get Your Free Kundli" sees a form flash, then a signup wall, before any value is delivered.
13. `DailyAnalysis.tsx:253` uses `p-8` (32px) on the day card at all breakpoints, and `MonthlyAnalysis.tsx:155` packs 12 months into `grid-cols-3` (≈103px cells) at 375px.

**Recommendations**

- [P0] **Kill iOS input auto-zoom — floor every input at 16px** — In `src/app/globals.css`, change `.cosmic-input` `font-size: 0.875rem` → `font-size: 1rem` and add `min-height: 2.75rem;` so it also clears the 44px tap-target floor. Add a global guard right after it:

```css
input:not([type="checkbox"]):not([type="radio"]),
select,
textarea { font-size: max(16px, 1em); }
```

In `src/components/forms/BirthDetailsInput.tsx` change `inputCls` to `'mt-1 w-full rounded-md bg-cosmos border border-horizon px-3 py-3 text-base min-h-[44px] text-star focus:border-amber/60 focus:outline-none transition-colors'` (`text-base` = 16px, `py-3` + `min-h-[44px]` gives a real target). If 16px reads too large in the dense report surfaces, keep the visual scale by reducing padding, not font-size — never go below 16px on a focusable field.
- [P0] **Make the calculator's first tap always work — geocode on submit, not on blur** — The blur→submit race is the single highest-cost mobile bug on the highest-traffic pages. Two changes:

(a) In `BirthDetailsInput.tsx`, export the geocode as an imperative handle or lift it: simplest surgical fix is to have `geocodeCity` return the resolved `BirthDetails` and expose it via an optional `onResolveRequest` prop the parent can await. 

(b) In `src/components/tools/ChartTool.tsx` `onSubmit`, before the `if (!valid)` guard: if `d.birth_city.trim()` is non-empty but `!isValidLat(d.birth_lat)`, `setLoading(true)` and await a direct `fetch('/api/geocode?city=' + encodeURIComponent(d.birth_city))`, merge the coords into local state, and continue with those coords rather than bailing. Only show the error when the geocode itself fails — and change that message from the ambiguous 'Enter your birth date and confirm your birth city.' to a field-specific one ('We could not find “{city}”. Try “City, Country”, e.g. Lucknow, India.').

Also add `enterKeyHint="go"` to the city input so the mobile keyboard's action key submits.
- [P0] **Make the calculator result visibly arrive — scroll, announce, reserve space** — In `src/components/tools/ChartTool.tsx`:

1. Add `const resultRef = useRef<HTMLDivElement>(null)` and after `setRes(data)` succeeds, `requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))`.
2. Put `ref={resultRef}` on the result div (line 146) and add `role="status" aria-live="polite"` plus `scroll-mt-20` (clears the sticky navbar).
3. While `loading`, render a skeleton in the result slot instead of nothing — reuse the existing `.skeleton` class from globals.css:
```tsx
{loading && !res && (
  <div className="mt-6 rounded-card border border-horizon/40 p-6 space-y-3" aria-hidden>
    <div className="skeleton h-3 w-32 mx-auto rounded" />
    <div className="skeleton h-12 w-48 mx-auto rounded" />
    <div className="skeleton h-3 w-40 mx-auto rounded" />
  </div>
)}
```
This removes the layout jump and gives the tap immediate feedback.
- [P0] **Resolve the duplicate/invisible report nav — delete one, fix the other** — Two sticky bars is a bug, not a redundancy. Recommended: keep `MobileSectionNav` (it has scroll-spy, snap scrolling, edge fades, 44px targets, and a `Today` entry the sidebar lacks) and drop the mobile half of `ReportSidebar`.

1. In `src/components/report/ReportSidebar.tsx`, delete the entire `{/* Mobile/Tablet tabs */}` block (lines 74–96). The desktop `<nav className="hidden lg:block …">` stays untouched.
2. In `src/components/report/ReportTabs.tsx:75`, change `sticky top-0 z-40` → `sticky top-[var(--header-height,var(--nav-height))] z-30` so it parks *below* the z-50 navbar instead of behind it.
3. In `src/components/report/MobileSectionNav.tsx:60`, replace `-mx-4 sm:mx-0` with `-mx-6 sm:-mx-6 lg:mx-0` to match the parent's `px-6` and get a true full-bleed bar.
4. Add `scroll-mt-[calc(var(--header-height,4rem)+3.5rem)]` to each report section wrapper (`#today`, `#snapshot`, `#decide`, `#monthly`, `#weekly`, `#daily`, `#correlations`, `#synthesis`, `#nativity`) so `scrollIntoView` does not land section headings underneath the two stacked sticky bars. Several already have `scroll-mt-24` (DecideSection.tsx:95, PreviewValueStrip.tsx:89) — make it uniform.
- [P1] **Stack date and time inputs below 400px** — In both `src/components/forms/BirthDetailsInput.tsx:84` and `src/app/onboard/_OnboardForm.tsx:283`, change `grid grid-cols-2 gap-3` → `grid grid-cols-1 min-[400px]:grid-cols-2 gap-3`. Two full-width rows cost ~60px of vertical space and eliminate all clipping down to 320px. Add `autoComplete="bday"` to the birth-date input and `enterKeyHint="next"` to the name/city inputs while you are in these files.
- [P1] **Collapse the report action bar into a single mobile overflow control** — In `src/app/(app)/report/[id]/page.tsx:1394–1487`, wrap the Calendar / Markdown / PDF / Copy-link cluster in `hidden sm:flex` and render a mobile alternative: one 44px `btn-secondary` labelled `Share & save ▾` that toggles a simple disclosure `<div>` containing the four actions as full-width `min-h-[44px] px-4 py-3 text-left` rows. Move the `text-[10px]` PDF hint (line 1481) inside that disclosure. Bump `font-mono text-xs` on the Copy-link button (line 1416) to `min-h-[44px] px-3 -mx-3 inline-flex items-center` so it has a real hit area even on desktop. Net gain: ~90px of above-the-fold space returned to the identity header and the user's own question.
- [P1] **Rebuild the hourly mobile card as two lines instead of one crowded row** — In `src/components/report/HourlyTable.tsx:95–136`, restructure the header button from a single flex row into a two-row grid so nothing truncates at 360px:

```tsx
<button className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 min-h-[56px] text-left">
  {/* row 1 */}
  <span className="font-mono text-base text-star whitespace-nowrap">{timeLabel}</span>
  <span className="font-body text-body-sm text-dust truncate">{hour.hora_planet} hour</span>
  <span className={`font-mono text-lg font-bold ${getScoreNumColor(...)}`}>{hour.score}</span>
  {/* row 2 spans all three */}
  <span className="col-span-3 flex items-center gap-2">
    <span className={`px-2 py-0.5 rounded-sm border text-label-md ${getChoghadiyaBg(...)}`}>{choghadiyaLabel(...)}</span>
    <span className={`text-label-md ${scoreInfo.color}`}>{scoreInfo.label}</span>
    <span className="ml-auto text-dust/40">▾</span>
  </span>
</button>
```
Promoting the quality label (currently hidden until expanded) to the collapsed row is what makes the list scannable — right now a user must tap 18 times to learn which hours are good.
- [P1] **Fix viewport-unit and header-height math on the waiting screen** — In `src/components/report/GeneratingScreen.tsx:150` and `src/app/(app)/report/[id]/loading.tsx:8`, change `min-h-[calc(100vh-var(--nav-height))]` → `min-h-[calc(100svh-var(--header-height,4rem))]`. `svh` is the small-viewport height (URL bar expanded) and is the correct unit for a full-bleed screen that must not scroll; `--header-height` is the value actually measured in `Navbar.tsx:53` and accounts for the LaunchBanner. Also reduce `gap-8` → `gap-5 sm:gap-8` and the orbital block's `mb-10` → `mb-6 sm:mb-10` so the progress bar, telemetry panel and feedback prompt all fit one 667px screen.

Same unit fix on the landing hero (`src/components/landing/Hero.tsx:21` already uses `svh` — correct) but reduce `pt-24 pb-16` → `pt-14 pb-10 md:pt-32 md:pb-20` and render only the first two `TRUST_STATS` below `sm` (`{TRUST_STATS.slice(0, 2)}` on mobile, all four at `sm:`) so the CTA plus its reassurance line land above the fold at 375×667.
- [P1] **Get the calculator form above the fold** — In `src/components/tools/CalculatorPage.tsx:34`, change `py-16 sm:py-24` → `py-8 sm:py-16 lg:py-24` and `mb-10` → `mb-6 sm:mb-10`. In the heading block, drop the intro paragraph to `text-body-md sm:text-body-lg` and clamp it with `line-clamp-3 sm:line-clamp-none`. Together these reclaim ~120px, putting the birth-date field on the first screen for a ChatGPT referral. The `SeoProse` and `FaqSection` below are unaffected and keep their SEO weight.
- [P2] **Enlarge the unknown-birth-time control and make it a real switch** — In `src/components/forms/BirthDetailsInput.tsx:108–125`, wrap the checkbox row as a tappable card rather than a bare inline control: `className="flex items-center gap-3 min-h-[44px] px-3 -mx-1 rounded-md border border-horizon/40 bg-cosmos/60 text-body-sm text-dust/80 cursor-pointer"` and give the input itself `className="accent-amber w-5 h-5 shrink-0"`. This is a high-usage option in the Indian market (birth times are frequently unrecorded) and currently reads as an afterthought.
- [P2] **Retire mono-uppercase as the default label treatment** — This is the root of the "coding interface" verdict and is a token-level fix, not a per-component one.

1. In `src/app/globals.css`, change `.section-eyebrow` from `font-family: var(--font-mono)` + `text-transform: uppercase` + `letter-spacing: 0.15em` to `font-family: var(--font-body); font-size: 0.8125rem; font-weight: 500; letter-spacing: 0.01em; text-transform: none;`. This alone re-skins every calculator result, every report section header, and the landing sections.
2. In `src/app/onboard/_OnboardForm.tsx:130`, change the `Field` label class from `font-mono text-label-sm text-dust/80 tracking-[0.1em] uppercase` → `font-body text-body-sm text-dust font-medium`. Onboarding is where an anxious first-time user decides whether this is a spiritual product or a dev tool.
3. Reserve `font-mono` for genuinely tabular data only: scores, clock times, date ranges. Sweep `text-mono-sm` (11px) usages that carry *prose* — `HourlyTable.tsx:155/163/171` ("Best for:"/"Avoid:"/"Still OK:" and their chips), `DailyAnalysis.tsx:288` ("Today's Playbook", also drop `tracking-[0.2em]`), `DailyAnalysis.tsx:376` (`briefing_v2.why_today` — this is a full sentence rendered in 11px mono), `TimingBridge.tsx:35` — and move them to `font-body text-body-sm`.
4. Raise `HourlyChart.tsx:114` from `text-[8px]` to `text-label-sm` (11px) and thin the label set on mobile (render every 3rd hour below `sm`) rather than shrinking type to fit.
- [P2] **Tighten mobile padding on the report's densest surfaces** — `src/app/(app)/report/[id]/page.tsx:1364`: `px-6` → `px-4 sm:px-6` (returns 16px of content width at 375px, which is what un-crowds the hourly rows). `src/components/report/DailyAnalysis.tsx:253`: `p-8` → `p-4 sm:p-6 md:p-8`. `src/components/report/MonthlyAnalysis.tsx:155`: `grid-cols-3` → `grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6` so each month cell can hold its label and score without collision. `src/app/onboard/_OnboardForm.tsx:1316`: `card p-7 md:p-8` → `card p-5 sm:p-7 md:p-8`.
- [P2] **Defer the /onboard signup wall until after birth details are entered** — `src/app/onboard/_OnboardForm.tsx:655–661` redirects anonymous users to `/login` on mount, so the hero CTA leads to a wall before any value is shown. Move the auth check out of the mount effect and into `next()` at the step-1→step-2 boundary (or, better, into `goToReportGeneration`): let the visitor fill Step 1 and Step 2, persist to the existing `writeDraft()` store, then redirect to `/login?mode=signup&next=…`. The draft-restore path (`readDraft()`, line 779) already exists and will repopulate the form on return. This is out of scope for a pure mobile fix but it is the highest-leverage item behind the mobile funnel and touches the same file — worth bundling.

### audit-onboarding-form — audit

## Where the data points map to code

**1. THE 35-MINUTE LOOP IS A REPRODUCIBLE BOUNCE BUG — this is the single biggest finding.**
`_OnboardForm.tsx:955-965` (`goToReportGeneration`): if `form.birthLat == null`, it fires `geocodeCity()` fire-and-forget, sets an error banner, and calls `setStep(1)` — kicking the user from Step 3 back to Step 2. Meanwhile Step 2's Continue button (`:421`) only requires `birthDate && birthTime && birthCity.trim()` — it does NOT require resolved coordinates. So the user can always advance past Step 2 without a geocode, hit Submit, and get thrown back. The async `geocodeCity` may still be in-flight or may have failed outright (small town), so tapping Continue again reproduces the bounce indefinitely. Combine with `track('onboard_step', { step })` firing on *every* step change including backwards (`:845-847`) and you get exactly the observed signature: one session emitting a long ribbon of onboard_step events over 35 minutes, and 49 events across few users. **This also explains most of the 10/47 signups that never produced a report.**

**2. Geocoding is structurally incapable of handling small Indian towns.**
- `api/geocode/route.ts:36` hardcodes `limit=1`. There is no result list, no disambiguation, no "did you mean". One shot, take it or leave it.
- Trigger is `onBlur` only (`:315`, `:351`). On mobile, blur happens when the user taps Continue — the fetch starts at the same moment they're navigating away. No autocomplete, no keystroke feedback.
- Nominatim resolves "Mumbai" fine but frequently misses or mis-ranks Indian tehsil/town names without state ("Sitapur", "Bhilwara", "Palanpur", "Karimnagar"). The only recovery offered is the error string "City not found. Try a different spelling." (`:939`) — which asks a user for a spelling they already believe is correct. No country bias (`countrycodes=in`), no `addressdetails`, no structured fields.
- There is no fallback path at all: no bundled city dataset, no map-pin picker, no lat/lng manual entry.

**3. Timezone derivation is wrong for most of India.**
`:926` — `let tzOffset = Math.round((lng / 15) * 60 / 30) * 30;` then a hardcoded 8-key `knownTz` lookup (`:921-925`) matched against `name + ' ' + city`, where `name` is `display_name.split(',').slice(0,3)` — the slice **drops the country** for any place with ≥3 address components, which is nearly every Indian town. So "Ahmedabad, Gujarat, India" → sliced to "Ahmedabad, Ahmedabad District, Gujarat", the `'india'` key never matches, and the longitude fallback yields UTC+5:00 instead of +5:30. For a product whose entire promise is *hourly* windows, a 30-minute systematic offset on the current-city timezone silently corrupts every hora boundary. Anything not in the 8-city list is a coin flip.

**4. The question field is designed to be skipped — 62% skip is the expected outcome.**
`:398-412`. It sits at the *bottom of Step 2*, below "Forecast Start Date" (an obscure optional field), behind a divider, labelled "What's on your mind?" with a grey `Optional` hint, rendered as an empty 3-row textarea with a 1200-char counter. Every visual signal says "extra work, skippable". Nothing communicates that this is the input that makes the report about *them*. A user who arrived from ChatGPT asking "when will I get married" is given a blank box and a character counter.

**5. Mobile input ergonomics are broken.**
`globals.css:349-360` — `.cosmic-input` is `font-size: 0.875rem` (14px). **iOS Safari force-zooms the viewport on focus for any input under 16px.** Every field on this form triggers a zoom-in that doesn't zoom back out, so the user is left panning a magnified form. Padding `0.625rem` gives a ~38px control height — under the 44px minimum touch target, and well under the 48px norm.
- `autoFocus` on the name field (`:188`) pops the keyboard on load, hiding the progress bar and value proposition instantly.
- `<input type="date">` (`:287`) has no `min`/`max`. On mobile it opens at *today*, so a 1990 birthday is a 35-year scroll; typos like year 0025 are accepted.
- Birth date lacks `autoComplete="bday"`; there's no "I don't know my birth time" affordance despite the copy at `:279` and `:295` telling users to type 12:00 themselves.

**6. Validation bounces backwards and is inconsistent in strictness.**
Step 1 blocks Continue on a full-regex email (`:153`, `:165`) — hard gate. Step 2 lets a user through with zero validation of the thing that actually matters (coordinates). Step 3 then throws them back to Step 2. Strictness is inverted relative to importance.

**7. State is lost on reload, and there's an auth wall before any value.**
`:660` redirects unauthenticated visitors to `/login` immediately on mount — before showing a single field or any indication of what they'd get. The draft (`writeDraft`, `:1112`) is only written immediately before the Ziina redirect, so a reload, a back-button, or a phone call mid-form wipes everything. Users landing on free calculator pages and clicking through hit a login wall as their first experience of the product.

**8. Progress signalling under-promises effort.**
`STEP_META` (`:76-80`) labels Step 2 "~1 min", but Step 2 contains 6 controls including a 1200-char textarea. Progress bar width is `((step+1)/3)*100` (`:1307`), so Step 1 starts at 33% — a fake-progress pattern users read as dishonest when Step 2 turns out to be the long one.

**9. Cosmetic reinforcement of the "coding interface" verdict.**
Every field label is `font-mono … uppercase tracking-[0.1em]` (`Field`, `:130`). Success/error states are mono-spaced coordinate readouts: `Mumbai (19.08°, 72.88°)` (`:335`). Loading state is `Locating birth coordinates…` in pulsing mono. The character counter is mono. A person asking about their marriage is shown a terminal.

**Recommendations**

- [P0] **Kill the geocode bounce loop — resolve the city IN Step 2, never rewind from Step 3** — Two changes, both required.

(a) In `Step2`, gate Continue on resolved coordinates, not on a non-empty string:
`disabled={!form.birthDate || !form.birthTime || form.birthLat == null}`
and when `birthCity` has text but no coords, render the button as `Confirm your birth city ↑` with an amber pulse pointing at the city field, rather than a dead grey button. The user is never allowed to leave Step 2 in an unresolvable state, so Step 3 can trust the data.

(b) Delete the `setStep(1)` rewind in `goToReportGeneration` (`_OnboardForm.tsx:955-965`). It is now unreachable for the normal path; keep the coordinate check purely as a defensive `return` with an inline error rendered on the CURRENT step. Never move a user backwards in a funnel — show the problem where they are.

(c) Add a hard loop-breaker regardless: track `const bounceCount = useRef(0)`. If any validation would send the user backwards more than once, instead surface a manual escape hatch — `Pick your birth city on a map` / `Enter coordinates manually` / `Use nearest big city instead` — so the ceiling on frustration is two attempts, not 35 minutes.

(d) Fix analytics blindness: change `track('onboard_step', { step })` to `track('onboard_step', { step, direction: dir === 1 ? 'forward' : 'back', attempt: n })` so a repeat-bounce is visible in the data instead of looking like engagement.
- [P0] **Replace the blur-only geocode with a real CityAutocomplete component (results list, India-first)** — **New component: `src/components/onboard/CityAutocomplete.tsx`**

Props: `{ label, value, onSelect(place: Place), placeholder, required, defaultCountry?: 'IN' }`
Where `Place = { label: string; region: string; country: string; lat: number; lng: number; tzId: string }`.

Behaviour:
- Fires on **keystroke**, debounced 300ms, min 3 chars — not on blur.
- Renders a dropdown of up to 8 results as tappable rows, min-height 48px each:
  primary line `font-body text-base text-star` = "Sitapur"
  secondary line `font-body text-sm text-dust` = "Uttar Pradesh, India"
  NO latitude/longitude shown to the user. Ever. Coordinates are engineering exhaust, not reassurance.
- Selecting a row sets `birthCity`, `birthLat`, `birthLng`, `birthTzId` in one atomic `setForm`, collapses the list, and shows a calm confirmed state: a small amber pin glyph + `Sitapur, Uttar Pradesh` in `font-body` (replace the mono coordinate badge at `:331-338` entirely).
- Keyboard: ArrowUp/Down/Enter/Escape; `role="combobox"` + `aria-expanded` + `aria-activedescendant`, listbox with `role="option"`.
- Empty-result state is a helpful row, not a red error: "No match for 'Sitapur' — try adding the state, e.g. Sitapur, Uttar Pradesh" with a tappable `Search 'Sitapur, Uttar Pradesh'` chip that re-runs the query. Kill the string "Try a different spelling."
- Offline/500 state: inline `Search is down — [Enter coordinates manually]` disclosure with two number inputs. Never a dead end.

**New: `src/data/in-cities.json`** — bundled dataset of the ~4,000 largest Indian towns (name, state, lat, lng, tzId: 'Asia/Kolkata'), ~200KB gzipped, lazy-imported on Step 2. Query this FIRST, in-memory, zero-latency, zero rate limit; this alone resolves the overwhelming majority of the Indian audience instantly and makes autocomplete-on-keystroke viable without violating Nominatim's usage policy. Fall through to `/api/geocode` only on no local hit.

**`src/app/api/geocode/route.ts` changes:**
- `limit=1` → `limit=8`, add `&addressdetails=1`.
- Add `&countrycodes=in` when an `?bias=IN` param is passed (set it from the browser locale / `/api/geo` country), so "Sitapur" doesn't resolve to a village in Iran.
- Return a NORMALISED shape — `{ results: [{ label, region, country, lat, lng }] }` — instead of leaking raw Nominatim rows. The client currently does `display_name.split(',').slice(0,3)` string surgery (`_OnboardForm.tsx:919`), which is what breaks timezone matching. Do that parsing server-side from `addressdetails`.
- Cache key already lowercases; keep the 7-day TTL, it's correct.
- [P0] **Fix the timezone derivation — an hourly product cannot be 30 minutes wrong** — Delete the `knownTz` map and the `Math.round((lng / 15) * 60 / 30) * 30` fallback (`_OnboardForm.tsx:921-929`) outright.

Return an IANA `tzId` from the geocode layer instead:
- Bundled `in-cities.json` rows carry `tzId: 'Asia/Kolkata'` directly.
- For the Nominatim path, resolve server-side with `tz-lookup` (a ~200KB pure-JS lat/lng → IANA zone package, no network, no API key) inside `/api/geocode` and include `tzId` in each normalised result.
- Compute the actual offset for the *birth date* (not today) via `Intl.DateTimeFormat('en', { timeZone: tzId, timeZoneName: 'shortOffset' })`, which correctly handles India's +5:30 and historical DST for non-Indian births.

This is a correctness bug, not a design one, but it silently poisons every hora boundary the product sells. Add a unit test asserting Ahmedabad, Sitapur, Kochi and Guwahati all resolve to +330.
- [P0] **Promote the question to its own step with tappable intent chips that PREFILL the text** — Move `personalContext` out of the Step 2 basement (`:398-412`) into a **new Step 3 of 4: "What do you want to know?"** — placed AFTER birth details, BEFORE plan selection. Asking it right before the price is what justifies the price.

**New component: `src/components/onboard/IntentChips.tsx`**

```ts
const INTENTS = [
  { id: 'career',   emoji: '💼', label: 'Career & money',
    prompt: "I want to know the right timing for my career and money — when to push, when to hold back." },
  { id: 'marriage', emoji: '💍', label: 'Marriage & love',
    prompt: "I want to know about marriage and my relationship — timing, and what the year ahead holds." },
  { id: 'children', emoji: '🌱', label: 'Children & family',
    prompt: "I want to know about children and family matters, and the timing around them." },
  { id: 'health',   emoji: '🫀', label: 'Health & energy',
    prompt: "I want to know about my health and energy, and which periods need extra care." },
  { id: 'move',     emoji: '✈️', label: 'Travel & relocation',
    prompt: "I'm considering a move or travel abroad and want to know the right window." },
  { id: 'other',    emoji: '✍️', label: 'Something else',    prompt: '' },
];
```

Interaction: chips are multi-select pills, `min-h-[44px] px-4 rounded-pill border border-horizon text-star font-body text-base`; selected = `border-amber bg-amber/10 text-amber`. Tapping a chip **appends its `prompt` sentence into the textarea** (and removes it on deselect). The user goes from a blank box to a written question in one tap — then edits it in their own words, which is where the real signal comes from.

Copy, replacing "What's on your mind?":
- H1: `What's weighing on you right now?`
- Sub: `Your chart is the same either way — but telling us this is what makes the reading about you, not about astrology.`
- Textarea placeholder: `The more honest you are, the sharper the reading. Nobody else reads this.`
- Under it: `🔒 Private. Used only to write your report.`
- Character counter: DELETE it. A counter on an emotional disclosure field is a rate-limit sign on a confession booth. Enforce 1200 silently.

Continue button copy: `Continue →` when text is present; `Skip this →` (secondary/ghost style, not primary) when empty. Do not hard-block — but make skipping feel like the lesser choice rather than the default one.

Also: pass the selected chip ids through as `intent_tags` on `/api/reports/start` and `/api/ziina/create-intent` alongside `personal_context` — they're a cleaner prioritisation signal for the report generator than free text, and they're gold for segmenting the funnel.

Expected effect: chip-prefill patterns typically convert 30-40% skip rates from a 62% baseline, because the cost drops from 'compose a paragraph' to 'tap the one that's true'.
- [P0] **Fix mobile input ergonomics — the iOS zoom trap is costing you sessions silently** — In `globals.css`:
- `.cosmic-input` → `font-size: 1rem` (16px). This is non-negotiable on iOS: anything under 16px force-zooms on focus and never zooms back. Every user on an iPhone is currently fighting a magnified viewport from the first keystroke.
- `padding: 0.75rem 0.875rem; min-height: 3rem;` → 48px touch targets.
- Add `.cosmic-input:focus { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(212,168,83,0.14); }` — already close, keep.

In `_OnboardForm.tsx`:
- Remove `autoFocus` from the name input (`:188`). On mobile it fires the keyboard before the user has read a single word of the page.
- Birth date input: add `min="1900-01-01"`, `max={today}`, `autoComplete="bday"`.
- Replace the bare `<input type="date">` with a **`BirthDateInput`** using three inline controls in DD / MM / YYYY order (numeric `inputMode` for day and year, a native `<select>` for month). Native mobile date pickers open at today's date, making a 1990 birthday a 35-year scroll — three taps beats thirty swipes, and it eliminates the year-0025 typo class. Keep the native picker as a small `📅` escape hatch.
- Add an explicit **`I don't know my birth time`** checkbox under the time field. Checking it sets `12:00`, disables the input, and shows `We'll use noon and mark your rising sign as approximate — the daily and hourly timings still work.` The copy at `:279`/`:295` already asks users to do this manually; make it a control instead of an instruction. This is the single most common reason Indian users abandon a birth-details form.
- [P0] **Persist the draft continuously, and stop gating the form behind login** — **Draft persistence:** the current `writeDraft` only fires immediately before the Ziina redirect (`:1112`). Add a `useEffect` that writes the whole `form` object + `step` to **localStorage** (not sessionStorage — survives tab close) on every change, debounced 500ms, and restores it on mount. Include `birthLat/birthLng/tzId` so a restored draft doesn't re-trigger the geocode gate. Expire after 7 days. A reload, a back-button, or an incoming phone call currently wipes everything.

**Auth wall:** `:653-683` redirects to `/login` on mount before rendering anything. For a user arriving from a free calculator page, the first thing the product does is demand an account. Invert it: let them complete Steps 1-3 (details + question) anonymously against the localStorage draft, and require auth only at the moment of report generation — where the value is now concrete and the account has an obvious purpose ("so we can send you the report and you can come back to it"). Prefill email into the signup form from what they already typed at Step 1, so the account creation is one tap. This directly addresses the 10-of-47 signups that never reached a report.
- [P1] **Sensible defaults and forgiving validation** — - **Current city defaults to birth city.** Today it's an empty optional field with a divider above it, and the copy tells the user to leave it blank. Instead, after birth city resolves, auto-fill current city with the same value and render it as a chip: `📍 Living in Sitapur — [Change]`. One tap for the ~80% who never moved, one tap to expand for the rest. Removes a whole field from the visual weight of Step 2.
- **Forecast Start Date: delete it from onboarding.** It's an optional power-user field sitting between the birth details and the question, and it is the reason the question field is below the fold. Move it to the report page as a 'Change period' control.
- **Soften Step 1 gating:** name and email currently hard-block Continue (`:165`). Keep the email check but let the button be *enabled* and show the inline error on tap instead of presenting a dead grey button with no explanation — disabled buttons don't tell you why. Also accept a name with any non-whitespace character; don't trim-validate on blur while the user is mid-type (`setNameTouched` on blur is fine, but `nameInvalid` currently fires when a user tabs through an empty field they intend to return to).
- **Phone:** the `>= 7 digits` rule (`:157`) rejects some valid entries and accepts junk. Since it's optional and used for a WhatsApp link, validate as `10-15 digits` and default the `+91` prefix for IN traffic.
- [P1] **Rebuild the step chrome: honest progress, human labels, calm confirmations** — - **Progress:** with the question step added, `STEP_META` becomes 4 entries: `About you (20 sec) / Birth details (40 sec) / Your question (30 sec) / Choose plan (20 sec)`. Change the bar from `((step+1)/3)*100` to a real completion measure — count filled required fields — so Step 1 doesn't open at a fake 33%. Show `Step 2 of 4` in plain text; drop the `~30 sec` mono estimate on the right, which reads as a countdown timer.
- **De-mono the labels.** `Field` (`:130`) renders every label as uppercase mono with letter-spacing. This is the single biggest contributor to the 'coding interface' verdict, because it's on every row of every step. Change field labels to `font-body text-sm font-medium text-star/90`, sentence case: `Full name`, `Birth date`, `Where were you born?`. Reserve JetBrains Mono strictly for actual numeric data in the report — never for UI chrome.
- **De-mono the states.** Replace the mono coordinate badge, the pulsing `Locating birth coordinates…`, and the mono character counter with body-font equivalents. Confirmation should read `✓ Sitapur, Uttar Pradesh` in `font-body text-sm text-success`, not a lat/lng tuple.
- **The `why` helper text** (`:135`) is italic `text-dust/40` — that is roughly 2.5:1 against `bg-cosmos` and fails WCAG AA. Raise to `text-dust` (no opacity) and drop the italic; these are the reassurance lines ('We send your report here. Never shared.') and they're currently the least legible text on the page.
- **Step 2 heading copy:** `Birth Details` → `Where and when were you born?`. The audience is not filling in a form, they're answering a question an astrologer would ask.
- [P2] **Instrument the funnel so the next failure isn't invisible for weeks** — The current `track('onboard_step', { step })` cannot distinguish forward progress from a bounce loop, which is why a 35-minute failure looked like engagement. Add:
- `onboard_field_completed` per field with time-on-field — reveals which control stalls people.
- `geocode_attempted` / `geocode_resolved` / `geocode_failed` with the query string and whether it hit the local dataset or Nominatim. Failed queries are a direct feed for expanding `in-cities.json`.
- `intent_chip_tapped` with chip id — this doubles as market research on what your audience actually wants.
- `onboard_abandoned` on `visibilitychange`/`beforeunload` with the last step and whether a draft was saved.

Add an admin view at `/admin/funnel` charting step-to-step dropoff and top failed geocode queries. You currently have 49 onboard_step events and no way to tell a user who progressed from a user who was trapped.

### audit-report-presentation — audit

## The core diagnosis

The paid report is a **stack of 11 independently-designed analytics widgets**, not a document. Each section was clearly added in a separate wave (the comments in page.tsx say so: "Phase 1b", "Wave-2", "bounded-window", "#163 hook"), and nothing was ever removed. The result reads as a dashboard export. The owner's "coding interface" verdict is precisely correct, and it is measurable.

### 1. Monospace is the dominant voice, not an accent
Counted `font-mono` vs `font-body` occurrences in the paid components (C:\Users\aarsh\Downloads\jyotish-ai\src\components\report\):
- HourlyTable.tsx — 31 mono / 0 body
- MonthlyAnalysis.tsx — 26 mono / 0 body
- DailyAnalysis.tsx — 20 mono / 2 body
- CorrelationsPanel.tsx — 16 mono / 3 body
- PeriodSynthesis.tsx — 11 mono / 0 body
- WeeklyAnalysis.tsx — 5 mono / 0 body
JetBrains Mono at `text-mono-sm` = **0.6875rem (11px)** with `tracking-wider uppercase` is the default label style everywhere. Eleven-pixel uppercase mono is a log-viewer typeface. An Indian consumer on a 375px phone who paid ₹799–₹3,999 to ask "when will I get married" is reading a terminal.

Worse, actual **prose** is set in `font-display` (Cormorant Garamond) at `text-base leading-[1.8]` — DailyAnalysis.tsx:395, MonthlyAnalysis.tsx:339, PeriodSynthesis.tsx:82, HourlyTable.tsx:185/331. The fonts are inverted: the display serif carries body copy (thin and low-contrast at 16px on mobile), while the mono carries all structure. DM Sans, the actual body face, is barely used.

### 2. Score-first, meaning-last — the whole product is numbers
The reader is shown, in order: an animated 7xl number (TodayCard), a 5xl number + "EXCELLENT/GOOD/CHALLENGING" (MonthlyAnalysis.tsx:247-252), a 4xl number (DailyAnalysis.tsx:258), 6 domain numbers with progress bars (MonthlyAnalysis.tsx:277-335), 12 month numbers in a strip, 6 week ScoreBadges, up to 30 calendar tiles each rendering `★ 78` (PeriodSynthesis.tsx:159), then 18 hourly rows each with a number. That is **80+ numeric scores on one page**. "Score 78/100" answers nothing a person asks. The prose that does answer it is buried inside collapsed rows and below-the-fold cards.

DecideSection is the clearest case: the user picks "Career" and receives `Strong · 74/100`, `★ Jul 28 — Score 81/100`. It never says *what to do*. Its own footer (DecideSection.tsx:203) even punts: "For precision timing within a day, check the hourly windows for that date."

### 3. No answer to "what do I DO with this" in the first screen
The first thing after the identity strip is PersonalizedAnswer (good — that IS the answer), but it is immediately followed by TodayCard (big number), then ForecastSnapshot ("Your forecast at a glance"), then DecideSection ("When should I act on…"), then MonthlyAnalysis ("The Year Ahead"). **Four consecutive sections all claim to be the summary.** There is no single "here are your 3 moves" artifact anywhere.

### 4. Severe, provable redundancy
- **Two mobile navs stack on top of each other.** ReportSidebar.tsx:75 renders a sticky `lg:hidden` tab strip, and page.tsx:1519 *also* mounts MobileSectionNav (`lg:hidden`, ReportTabs). Every phone user sees two near-identical tab rows with overlapping labels (Summary/Decide/Year/Weeks/Days/Calendar/Chart). This is a bug, not a taste call.
- **Best/caution dates render three times**: ForecastSnapshot "Timing chips" + "Moments that matter" (both from `synthesis.strategic_windows`/`caution_dates`), DecideSection "Priority windows" (same array), PeriodSynthesis "Strategic Windows"/"Caution Dates" (same array again, this time raw: `2026-07-28 (Ashlesha, 81)`).
- **Domain priorities render twice**: ForecastSnapshot domain cards + PeriodSynthesis's 5-cell grid (PeriodSynthesis.tsx:125-134) which labels them with raw lowercase keys — `career`, `money`, `relationships` — as headings.
- **Best hourly windows render three times per day**: DailyAnalysis "Today's Playbook" (peak/2nd), DailyAnalysis "Best windows" chips, and BestWindows inside HourlyAnalysis.
- **Day score renders 4× for the same day**: TodayCard hero, DailyAnalysis header, PeriodSynthesis calendar tile, and the month sparkline bar.

### 5. Data-viz quality is below the bar for a paid product
- HourlyChart.tsx **hardcodes non-brand hex** (`#10b981`, `#f59e0b`, `#ef4444`, `#dc2626`) instead of the tokens (success `#3B9B6E`, amber `#D4A853`, caution `#C75B3A`). The chart is visually from a different product than the page it sits in.
- HourlyChart has **no y-axis, no baseline, no gridline** — just floating bars — and 8px axis labels (`text-[8px]`, line 114). Its tooltip is hover-only, i.e. **completely unreachable on mobile**, which is the majority of the audience. The bars are the primary chart of the flagship "hourly" feature and a phone user can get nothing out of them.
- MonthlyAnalysis "sparkline" uses `flex gap-px` with up to 31 bars — on a 343px card each bar is ~10px, `title=` tooltips only, no interactivity, no click-through to the day.
- WeeklyAnalysis sparkline sets `height: ${Math.max(8, score)}%` — a **percentage of a 4rem box treated as if score were a percentage**, so a 65 and a 70 are visually indistinguishable and the axis is meaningless.
- PeriodSynthesis's "timing calendar" is a `flex-wrap` of 48×48 boxes — for a 30-day report that is a ragged blob, not a calendar. No weekday columns, no month grouping, no date alignment. It is called a calendar and does not look like one.
- Four different bar-color thresholds exist across files (≥70/≥50, ≥65/≥45, ≥75/≥55/≥45, ≥75/≥65/≥55/≥45 in PeriodSynthesis.tsx:31-37). The same score is green in one section and amber in another.

### 6. Fallback/placeholder copy leaks into a paid document
- PeriodSynthesis renders `DOMAIN_FALLBACK` generic advice ("Use your highest-scoring days for bold career moves…") whenever a domain string is empty — indistinguishable from real personalized output.
- WeeklyAnalysis.tsx:47-51 fabricates `Week N of 6`, theme `'Weekly energy arc.'`, and commentary "Use the daily score calendar below…" — and pads to exactly 6 weeks regardless of data.
- HourlyTable's `COMMENTARY_FALLBACK` (line 13) prints instructions where insight was paid for.
- DailyAnalysis shows a literal **`⚠ Data error: expected 18 slots, got N`** to the paying customer (HourlyTable.tsx:75, 223). Internal QA text in a premium deliverable.
- MonthlyAnalysis synthesizes `A strong month overall (score 65/100). Use your highest-scoring days…` when commentary is missing.

### 7. Sections are shaped like admin panels, not a document
`rounded-sm` (2px) boxes with 1px `border-horizon` hairlines, `bg-cosmos` fills, `p-6/p-8`, one after another for ~12 screens. No cover, no rhythm, no chapter breaks, no whitespace variation, no imagery, nothing hand-made. The only two moments of craft on the whole page (the amber radial glow in TodayCard/ForecastSnapshot) are used twice, adjacently. Meanwhile the section named "Ask a question" sits at the very bottom under Correlations, and the emoji domain selector (🎯💰❤️🌿🔥, DecideSection.tsx:26-32) is the only "warmth" — and it reads as clip-art, not as a premium Vedic document.

### 8. The mobile reality
On a 375px phone the paid reader scrolls: 2 nav bars → identity strip → answer → today card → snapshot (5 domain cards at `grid-cols-2` = 3 rows) → decide (5 emoji tiles + 3 lists) → 12-month strip (`grid-cols-3` = 4 rows) + month detail card with a 6-across domain grid crushed to 2 columns → 6 week cards → day tab strip (30 horizontally-scrolling tabs) → day card → hourly chart (unusable) → correlations (4 charts) → calendar blob → ask → nativity → dasha timeline → methodology → glossary. Approximately **18–22 screens of scrolling**, with the highest-value content (the answer) at the top and everything after it decreasing in usefulness while increasing in density.

**Recommendations**

- [P0] **P0 — Ship a real "Your Three Moves" opener and kill the four competing summaries** — Create src/components/report/YourMoves.tsx — the single artifact that answers "what do I DO with this". It replaces TodayCard + the timing chips in ForecastSnapshot + the top half of DecideSection as the report's opening.

Structure (mounted immediately after PersonalizedAnswer, before anything else):
- Eyebrow: `Your next moves` (font-body 11px, amber, tracking-[0.12em] — NOT uppercase mono).
- Exactly three MoveCards, stacked, full-bleed on mobile.

MoveCard anatomy (top→bottom, all font-body/font-display, ZERO mono):
  1. Verb line, font-display text-headline-md text-star: e.g. "Make your career move in the first week of August."
  2. Date band, font-body text-body-md text-amber: "Aug 3 – Aug 9  ·  strongest window: Tue Aug 5, 10:00–11:00 am"
  3. Because line, font-body text-body-md text-dust leading-relaxed: one plainified sentence from synthesis.strategic_windows[].reason or domain_priorities.
  4. A single ghost link: "See that day →" wired to onJumpToDay.
  5. Left edge: 3px accent rail (`border-l-[3px] border-success/60` for act-now, amber for prepare, caution for hold). No score number. No badge. No emoji.

Derivation (no new generation, all data exists): rank synthesis.strategic_windows by score, pick the top-scoring window in each of the 3 highest-averaging domains from months[].domain_scores; the intersecting day from mergedDays gives the hour slot. Fall back to top-3 strategic_windows if domains are thin. If fewer than 3 survive, render 2 or 1 — never pad.

Then: delete TodayCard from the paid flow (its content becomes MoveCard 0 when today is in range: "Today · Thu Jul 24" + verb line), delete ForecastSnapshot's timing-chip block (lines 180-195) and "Moments that matter" block (lines 256-274), and delete DecideSection's "Priority windows" block (lines 183-201). One source, one render.

Acceptance: on a 375px viewport, the first screen after the identity strip contains the user's question-answer and at least one complete MoveCard with a verb, a date, and a reason — and zero numeric scores.
- [P0] **P0 — Invert the type system: DM Sans for structure, Cormorant for headings only, mono nearly banished** — This single change does more for the "not a coding interface" verdict than anything else.

Add to tailwind.config.ts fontSize:
  'label-sm': ['0.75rem',  { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '500' }]
  'label-md': ['0.8125rem',{ lineHeight: '1.35', letterSpacing: '0.04em', fontWeight: '500' }]
  'read-md':  ['1rem',     { lineHeight: '1.75', fontWeight: '400' }]
  'read-lg':  ['1.0625rem',{ lineHeight: '1.8',  fontWeight: '400' }]

Rules, applied mechanically across all report components:
1. Every `font-mono text-mono-sm ... uppercase tracking-wider` LABEL becomes `font-body text-label-sm text-dust/70` with normal case (Title Case). Affects ~130 call sites: MonthlyAnalysis (26), HourlyTable (31), DailyAnalysis (20), CorrelationsPanel (16), PeriodSynthesis (11), ForecastSnapshot (14), DecideSection (9), WeeklyAnalysis (5).
2. Every PROSE block currently `font-display text-base leading-[1.8]` becomes `font-body text-read-md text-star/90` — DailyAnalysis.tsx:395, MonthlyAnalysis.tsx:339, PeriodSynthesis.tsx:82/129/135, HourlyTable.tsx:185/331, WeeklyAnalysis.tsx:142.
3. `font-display` (Cormorant) is reserved for: section h2s, MoveCard verb lines, the thesis line, and the report cover. Nothing else.
4. `font-mono` survives in exactly THREE places: clock times ("10:00–11:00 am"), the score digits themselves where a score is genuinely shown, and the admin/diagnostic strips. Everywhere else it is removed.
5. Replace the `.section-eyebrow` component class in globals.css (currently mono/uppercase/0.6875rem) with font-body 0.75rem, tracking-[0.1em], weight 500, still amber, still uppercase — uppercase DM Sans at 12px reads as editorial; uppercase mono at 11px reads as a log line.
6. Time formatting: introduce src/lib/utils/formatTime.ts exposing `humanTime(hhmm)` → "10:00 am". Indian consumers do not read 24h. Apply in HourlyTable, HourlyChart, TodayCard/YourMoves, DailyAnalysis Rahu Kaal, BestWindows.

Acceptance: `grep -c font-mono` across src/components/report/*.tsx drops from ~140 to under 20.
- [P0] **P0 — Fix the double mobile nav (two sticky tab strips render simultaneously)** — ReportSidebar.tsx:75 renders a sticky `lg:hidden` mobile tab strip AND page.tsx:1519 mounts MobileSectionNav, also `lg:hidden`. Both appear on every phone.

Fix: delete the entire mobile block from ReportSidebar.tsx (lines 74-94), leaving it desktop-only (`hidden lg:block`). MobileSectionNav becomes the single mobile nav. Reconcile the two section lists — MobileSectionNav's SECTIONS is the better one (includes `today`/`correlations`) but must be updated for the new IA: `Moves · Year · Weeks · Days · Hours · Patterns · Chart`.

While there: MobileSectionNav's `-mx-4 sm:mx-0` conflicts with the page's `px-6` container and produces a 8px inset mismatch at the 375–639px range. Use `-mx-6 sm:-mx-6 px-6` so the strip is genuinely edge-to-edge with an inner gutter.
- [P0] **P0 — Restructure the section order into three named chapters instead of eleven flat widgets** — Wrap the report in three explicit chapters with a real chapter divider component, and reorder. The current order interleaves timescales (year → weeks → days → patterns → calendar) with no narrative.

New IA in page.tsx (paid):

  [Cover] ReportCover — see the ReportCover spec below
  [identity strip — keep, restyle]
  PersonalizedAnswer                      ← their question, first, unchanged position
  YourMoves                               ← NEW, replaces TodayCard + snapshot chips + decide windows
  ── Chapter I · "What this period holds" ──
  ForecastSnapshot   (reduced: thesis + 3 shift lines + domain cards ONLY)
  MonthlyAnalysis    (renamed "Your year, month by month")
  WeeklyAnalysis     (renamed "The next six weeks")
  ── Chapter II · "When to act" ──
  DecideSection      (rebuilt, see P1)
  TimingCalendar     (rebuilt from PeriodSynthesis's calendar, see P1)
  DailyAnalysis + HourlyAnalysis
  ── Chapter III · "Your patterns & foundations" ──
  CorrelationsPanel
  AskQuestion        ← MOVE UP from the bottom; after Chapter II is better, but at minimum before Nativity
  NativityCard + DashaTimeline
  [Methodology + Glossary — collapse both into one <details>]

DELETE PeriodSynthesis entirely as a section. Its four payloads redistribute: opening/closing paragraphs → ForecastSnapshot's "Read the full picture" expander (already there); strategic_windows/caution_dates → YourMoves; domain_priorities → ForecastSnapshot domain cards (already there); the score calendar → new TimingCalendar in Chapter II. This removes the worst offender (raw `2026-07-28 (Ashlesha, 81)` lines and lowercase `career`/`money` headings) and eliminates 3 of the 5 redundancy pairs in one move.

ChapterDivider component (src/components/report/ChapterDivider.tsx):
  - `mt-20 mb-12` — generous, this is the whitespace the document currently has none of
  - A 1px hairline that fades out from center (`bg-gradient-to-r from-transparent via-horizon to-transparent`)
  - Above it, centered: a small amber MandalaRing glyph at 20px, opacity-40
  - Below: `font-body text-label-sm text-amber tracking-[0.2em]` "CHAPTER II" and `font-display text-headline-lg text-star` "When to act"
  - `scroll-mt-24` + an id so nav can target it.
- [P1] **P1 — Rebuild the hourly chart: brand tokens, mobile-usable, readable axis** — HourlyChart.tsx is the flagship feature's primary visual and it is currently unusable on mobile and off-brand.

1. Replace hardcoded hex with CSS vars: `getBarColor` returns `var(--success)` / `var(--amber)` / `var(--caution)` (#3B9B6E / #D4A853 / #C75B3A). Delete #10b981/#f59e0b/#ef4444/#dc2626. Same for the Rahu Kaal stripe (use `var(--caution)` over `var(--color-surface)`).
2. Make it tap-driven, not hover-driven. Replace `onMouseEnter/onMouseLeave` with `onClick`/`onFocus` setting `selectedIndex`, and render the detail as a FIXED panel directly BELOW the chart (not a floating absolute tooltip). One slot is always selected — default to the day's peak. The panel shows: time range (humanTime), planet-hour name, quality word, the score, and the full commentary — this is the moment the paid prose finally gets a home.
3. Add a horizontal 50-line baseline (`border-t border-dashed border-horizon/50` absolutely positioned at 50%) and two y-labels (`100` top, `50` mid) in font-body text-label-sm. Without a reference the bars mean nothing.
4. Axis labels: `text-[8px]` → `font-body text-label-sm` (12px), show 4 labels max on mobile (`6am · 11am · 4pm · 9pm`), 6 on desktop.
5. Bar geometry: `gap-[2px]` → `gap-1`, `rounded-t-sm` → `rounded-t-[3px]`, min height 6px→10px so low scores are still tappable (44px tap target enforced via an invisible full-height wrapper, not the visible bar).
6. Selected bar gets `ring-1 ring-amber` and full opacity; unselected drop to opacity-60.
7. Legend: replace the four mono chips with a single font-body line — "Taller and greener means a stronger hour for important work."

Also: HourlyAnalysis defaults to `viewMode='visual'`, which on mobile currently means the reader sees a wall of bars they cannot interrogate. With the tap-panel this becomes correct. Keep the Visual/Table toggle but restyle to font-body pills.
- [P1] **P1 — Turn PeriodSynthesis's score blob into a real month-grid TimingCalendar** — New src/components/report/TimingCalendar.tsx replacing the `flex flex-wrap` of 48px boxes (PeriodSynthesis.tsx:145-170).

- CSS grid `grid-cols-7`, weekday header row (`M T W T F S S`, font-body text-label-sm text-dust/50), leading blanks so the 1st lands in its true weekday column. Group by month with a `font-display text-headline-sm` month label when the range spans months.
- Each cell: aspect-square, `rounded-[6px]`, background = score tinted (`bg-success/22` ≥70, `bg-success/10` 60-69, `bg-amber/12` 45-59, `bg-caution/18` <45), border `border-horizon/25`, hover/focus `border-amber/60`.
- Inside the cell: ONLY the day-of-month numeral, font-body text-label-md text-star/80. **Remove the score number and the ★/⚠ prefixes** — the tint already encodes it and 30 tiles each reading `★ 78` is exactly the data-dump problem. Keep the full info in `aria-label` and `title`.
- Below the grid: a legend as one sentence + 3 swatches, and a `font-body text-body-sm text-dust` line naming the 2 best and 1 hardest dates in words ("Your strongest days are Aug 5 and Aug 19. Ease off around Aug 12.") — the same data, expressed as language.
- Tap a cell → onDayClick(index), preserved.
- Standardize thresholds here on the single canonical scale (see P1 token task) — PeriodSynthesis currently uses a 5-tier scale nothing else uses.
- [P1] **P1 — One canonical score scale + one score component; delete the 4 competing threshold sets** — The same score currently renders green in DailyAnalysis (≥65) and amber in MonthlyAnalysis (<70). Four independent `getColor`/`getScoreColor`/`barColor`/`getBarBg` implementations exist.

1. In src/lib/guidance/labels.ts (already the home of getCanonicalScoreLabel/getLabelColor), export a single `scoreTier(score, isRahuKaal): { tier: 'strong'|'steady'|'mixed'|'tender', word: string, textClass: string, bgClass: string, barVar: string }`. Fix the boundaries once: ≥70 strong, 55–69 steady, 45–54 mixed, <45 tender. Retire "EXCELLENT/GOOD/CHALLENGING" all-caps (MonthlyAnalysis.tsx:251) — it is loud and it duplicates formatDayOutcomeLabel.
2. New src/components/report/Score.tsx with `<Score value size="sm|md|lg" label />`. `lg` renders the numeral in font-display with the tier word beneath in font-body; `sm` renders an inline tinted pill. All numeric score rendering routes through it.
3. Delete the local color helpers in MonthlyAnalysis.tsx:107-117, DailyAnalysis.tsx:194, PeriodSynthesis.tsx:31-50, WeeklyAnalysis.tsx:56-61, TodayCard.tsx:91-95, HourlyChart.tsx:33-38, CorrelationsPanel.tsx:76-80.
4. Reduce score DENSITY while you are in there: MonthlyAnalysis's 6-across domain grid with 6 numerals + 6 progress bars (lines 277-335) collapses to a single horizontal stacked bar per domain with the label and tier WORD, and the numeral only on the top-2 and bottom-1 domains. The month card should show at most 3 numbers, not 7.

Acceptance: total visible numeric scores on a 30-day paid report drops from ~80 to under 25.
- [P1] **P1 — Rebuild DecideSection so it answers with a sentence, not a leaderboard** — Currently the payoff for picking "Career" is `Strong · 74/100` and `★ Jul 28 — Score 81/100`. Rewrite the results panel to lead with language.

1. Domain selector: replace the emoji tiles (DecideSection.tsx:26-32, 🎯💰❤️🌿🔥) with a horizontally-scrolling pill row — font-body text-label-md, Title Case, selected = `bg-amber text-space`, unselected = `border-horizon text-dust`. Emoji clip-art is the single most "cheap template" element on the page. If iconography is wanted, use thin 16px line SVGs in amber, drawn in one consistent stroke weight.
2. Results panel becomes an ANSWER BLOCK:
   - `font-display text-headline-md text-star`: "For career, act in {Month} — and again in early {Month}."
   - `font-body text-read-md text-dust`: the plainified domain_priorities[key] sentence (which already exists and is currently shown twice elsewhere; this becomes its ONLY home).
   - Then a compact 12-cell month heat-strip for that domain (one row, reusing the score tint scale) with the top 2 months labeled — replaces the "Best months" list.
   - Then up to 3 date rows: `font-display text-headline-sm` date + `font-body text-body-sm` reason. Drop "Score 81/100" from the row; the ordering already conveys ranking.
3. Delete the "Priority windows" block (lines 183-201) — moved to YourMoves.
4. Delete the footer punt line (line 203) and replace with a real control: "Open Aug 5 hour by hour →" wired to onJumpToDay.
5. Bug: `days` are filtered `>= today` (line 89) but ranked purely by day_score with no cap — on a 30-day report this happily recommends day 29. Cap to the next 21 days and prefer earlier dates on ties.
- [P1] **P1 — Purge fabricated/placeholder content from a paid document** — A premium deliverable must never show scaffolding. Every one of these is currently reachable in a paid report.

1. WeeklyAnalysis.tsx:42 — `Array.from({length: 6})` pads to six weeks unconditionally, minting `Week N of 6` / `'Weekly energy arc.'` / "Use the daily score calendar below…". Change to `(weeks ?? []).filter(w => w && (w.commentary?.trim() || w.theme?.trim()))` and render only real weeks. Delete WEEK_FALLBACK's fake defaults.
2. HourlyTable.tsx:13 COMMENTARY_FALLBACK — when commentary is absent, render the guidance_v2 chips alone and OMIT the prose block. Do not print instructions in the analysis slot.
3. HourlyTable.tsx:75 and :223 — the `⚠ Data error: expected 18 slots, got N` banner must be gated behind an `isAdmin` prop (page.tsx already has `isAdminView`). Customers must never see QA text.
4. PeriodSynthesis DOMAIN_FALLBACK / OPENING_FALLBACK / CLOSING_FALLBACK — with PeriodSynthesis deleted these die with it, but the same generic strings must NOT be recreated in ForecastSnapshot's domain cards. ForecastSnapshot already does this correctly (`real = domains.filter(d => d.score != null || d.line)`) — keep that pattern and extend: a domain card with a score but no line should render the tier word and NOTHING ELSE, not "Averaging 62/100 across your 12 months" (line 216), which is a stat, not an insight.
5. MonthlyAnalysis.tsx:62-64 — the synthesized "A strong month overall (score 65/100). Use your highest-scoring days…" commentary. Render the month card WITHOUT a commentary paragraph rather than with a template one.
6. Add a dev-only assertion (or a vitest case over a fixture report) that no rendered string in a paid report matches /Use (your |the )?(daily|highest-scoring|hourly)/i — that regex catches every one of these template tells at once.
- [P2] **P2 — Give the report a cover and a signature so it reads as a document someone made** — New src/components/report/ReportCover.tsx, rendered first inside #report-content (and as page 1 of the PDF — it is the single highest-leverage thing for the WhatsApp share loop, since a screenshot of the cover is what gets forwarded).

- Full-bleed within the container, `min-h-[60vh] sm:min-h-[70vh]`, flex column, centered.
- Backdrop: the existing StarField plus a single large low-opacity MandalaRing (from the existing components) at ~320px, `text-amber/[0.07]`, absolutely centered — one deliberate ornament, not decoration everywhere.
- Content: eyebrow `font-body text-label-sm text-amber tracking-[0.2em]` "VEDICHOUR · PERSONAL TIMING REPORT"; then `font-display text-display-lg text-star` with the person's name; then `font-body text-body-md text-dust` "Born {date} at {time} in {city}"; then two pills for `{Lagna} lagna` and `☽ {Moon}`; then `font-body text-body-sm text-dust/60` "{N} days · {N} months · prepared {issue date}".
- Below the fold marker: a small down-chevron + "Begin →".
- The existing identity strip (page.tsx:1524-1551) is then REDUNDANT — delete it; the cover subsumes it. That also removes one more mono block.

Also add a closing signature block after Chapter III, before the methodology: a hairline, the MandalaRing glyph, and one font-display line — "Prepared for {FirstName} from the positions of the sky at the hour of their birth." A document has a beginning and an end; a dashboard does not.

And: collapse the "How this report was made" section (page.tsx:1786-1799) and Glossary into a single `<details>` styled as a quiet footer — currently two full-width panels of small print close the paid experience on an admin note.
- [P2] **P2 — Restyle the section chrome: radii, hairlines, spacing rhythm** — Every paid section is a `rounded-sm` (2px) box with a 1px `border-horizon` hairline on `bg-cosmos`. That is admin-panel chrome, repeated twelve times.

1. Radius: standardize report surfaces on `rounded-card` (already in the token set) — 10-12px. Replace `rounded-sm` on all section containers and cards in MonthlyAnalysis, WeeklyAnalysis, DailyAnalysis, HourlyAnalysis, PeriodSynthesis, CorrelationsPanel. Keep `rounded-sm` only for inline chips.
2. Reduce border weight: swap `border-horizon` for `border-horizon/50` and add `bg-nebula/30` instead of `bg-cosmos` for nested panels, so the hierarchy comes from elevation rather than from lines. Fewer visible lines is the single fastest way out of "spreadsheet".
3. Vertical rhythm: sections currently all use `mb-12`. Use a scale — `mb-10` within a chapter, `mb-20` between chapters (the ChapterDivider owns this). Section headers get `mb-6` between h2 and content, and every h2 gets a one-line font-body deck beneath it explaining what the section is for in plain language (DecideSection and ForecastSnapshot already do this; MonthlyAnalysis, WeeklyAnalysis, DailyAnalysis, CorrelationsPanel do not).
4. Section headings: `font-display font-semibold text-3xl` is used raw in MonthlyAnalysis:129, WeeklyAnalysis:77, DailyAnalysis:220, HourlyAnalysis:62 — replace with the token `text-headline-lg` (or `text-display-sm` for chapter openers) so they respond to the clamp scale on mobile. At 375px a raw `text-3xl` (30px) display serif heading plus a 30-tab scroller is cramped.
5. Remove the `whileHover={{ y: -2, borderColor }}` framer lift on MonthlyAnalysis and WeeklyAnalysis cards — a document does not levitate on hover, and it triggers layout jitter next to the sparklines.
- [P2] **P2 — Fix the day tab strip and the weekly/monthly sparkline geometry** — 1. DailyAnalysis.tsx:225-243 — a 30-item horizontally-scrolling strip of `SUN\n24` tabs with no month context and no visual score signal. Rebuild as a compact day rail: each tab shows the weekday initial + date numeral + a 3px tinted score bar underneath (reuse the canonical tier tint). Add sticky month labels when the range crosses a month. Add left/right fade masks (`mask-image: linear-gradient`) so it is discoverable as scrollable, and auto-scroll the selected tab into view on change (currently selecting from the calendar jumps the section but leaves the tab off-screen).
2. WeeklyAnalysis.tsx:154 — `height: ${Math.max(8, score)}%` treats a 0-100 score as a percentage of a 4rem box, so 65 and 70 are 3px apart. Normalize against the week's own min/max with a floor: `height: ${8 + ((score - 40) / 50) * 92}%` clamped 8-100, or better, share one `<Sparkline scores min={40} max={95} />` component with MonthlyAnalysis.
3. MonthlyAnalysis.tsx:348-372 — the 31-bar `gap-px` sparkline. Extract to the same `<Sparkline>` component, make bars tappable (→ jump to that day), and drop the `ring-1 ring-success/40` best/worst highlighting in favor of a labeled caption beneath: "Strongest: Aug 5 · Hardest: Aug 12". A ring on a 10px bar is invisible; the caption is not.
4. MonthlyAnalysis "Weekly Breakdown" (lines 377-397) duplicates WeeklyAnalysis. Delete it — WeeklyAnalysis already renders all six weeks in full, with commentary.

### research-consumer-giants — platforms studied

Swiggy, Zomato, Zepto, Blinkit, Swiggy Instamart, BigBasket, DoorDash, Uber Eats, Instacart, Amazon India, Flipkart, Myntra, Nykaa, Uber, Ola, Rapido, Airbnb, Booking.com, MakeMyTrip, Agoda, IRCTC/Ixigo, Revolut, Monzo, Cash App, Robinhood, CRED, Groww, Zerodha Kite, Paytm Money, Jupiter, slice, Paytm, PhonePe, Google Pay India, Apple (HIG 2025-26 elevation layers), Co-Star, The Pattern, AstroTalk

**Key patterns**

- **Monospace is a spice, not a body font. Best-in-class data apps set numbers in a tabular-lining sans (or the display serif), reserving mono for genuinely machine-y strings (order IDs, transaction refs, code).** (Groww, Zerodha Kite, Revolut, Robinhood, Cash App, Booking.com review-score badges) — Mono signals 'system output' — a machine talking. A consumer asking 'when will I get married' needs a human voice. Tabular-lining numerals in the body sans give you the same column alignment mono was bought for, without the terminal semantics. Groww's entire value prop is 'simplify investing' and it renders prices in its brand sans, not mono.
- **Tight, dominant neutral + ONE loud accent, with semantic colors used only semantically.** (Uber (black/white + one blue), CRED (near-black + white cards + neon only in campaign moments), Co-Star (pure monochrome), Airbnb (neutral canvas, Rausch #FF5A5F for action only)) — Premium reads as restraint. When amber is the surface tint, the border tint, the label color AND the CTA, nothing is the CTA. Reserve the accent exclusively for the single next action on screen; let surfaces be neutral and let green/red mean only good/bad timing.
- **Generous corner radius + soft, tinted, layered elevation instead of hairline borders on flat panels.** (Zepto, Blinkit, Swiggy, DoorDash Prism, Revolut, Airbnb, Apple HIG 2025-26 three-layer elevation model (base / raised / overlay)) — 8px radius + 1px border + hard black shadow is the visual grammar of IDEs and dashboards. 16-20px radius with a tinted, low-opacity, wide-blur shadow plus a 1px top inner highlight is the grammar of consumer apps. Radius and shadow do more perceived-quality work per line of CSS than any other change.
- **One hero answer above the fold; everything else is progressive disclosure.** (Groww (one portfolio number, then drill-down), Uber (one ETA), Zepto (one delivery time), Robinhood, Booking.com property cards) — Dense data presented as a grid asks the user to do the analysis. Best-in-class does the analysis and shows the verdict — then lets you expand into evidence. For VedicHour the verdict is a date range and a plain sentence; the 18-slot hourly grid is evidence, and evidence belongs behind a tap.
- **Verdict badges: a colored pill with a plain-language word, not a raw number.** (Booking.com (8.7 'Fabulous'), Zomato ratings, Groww ('+2.4% today'), Uber surge indicator) — Booking never shows 8.7 alone — always 8.7 AND 'Fabulous'. A 0-100 score with no anchor is a benchmark readout. Score + word + one-line reason converts a metric into a decision.
- **Trust is assembled at the payment moment out of specific, checkable claims — not adjectives.** (PhonePe, Paytm, Groww, Razorpay checkout, CRED, Booking.com) — Research on Indian fintech UX finds RBI/bank/NPCI partnership marks during onboarding materially raise perceived legitimacy for semi-urban users. The transferable mechanic: a strip of concrete signals (payment-partner logo, refund window, 'no auto-renew', calculation source, count of reports delivered) placed physically adjacent to the price and CTA — not on a separate trust page.
- **Show all price tiers at once, on one screen, with the recommended one visually pre-selected.** (Revolut plan picker, Cash App, Zomato Gold, Swiggy One, Blinkit membership) — Conversion = motivation x trust / friction. Hiding tiers behind toggles adds friction and removes trust. One card per tier, one 'Most chosen' ribbon, per-day price math shown ('₹1,499 ≈ ₹50/day'), refund terms inline.
- **Localized value framing — price anchored to a familiar Indian purchase, plus per-day math.** (CRED, Zepto membership, Swiggy One, Groww) — ₹1,499 is abstract; '₹50/day — less than one filter coffee, for 30 days of timing' is concrete. Indian consumer apps almost universally show effective-per-unit price next to the headline price.
- **Motion has one direction and is short. Entrances 200-300ms, transitions 150-200ms, easing biased to ease-out.** (Uber Base motion guidelines (explicitly: one clear direction of movement at a time), Airbnb DLS, Revolut) — Long/looping decorative motion (20s spins, infinite twinkles, pulsing glows) reads as a screensaver and costs battery/CPU on the mid-range Android devices this audience uses. Purposeful motion confirms a state change; ambient motion just draws the eye away from the CTA.
- **Skeletons shaped like the real content, never spinners, for anything over ~400ms — and for long waits, a narrated progress story.** (Zepto/Blinkit order tracking, Swiggy, Uber, Airbnb, Carbon/industry loading patterns) — A skeleton makes the layout appear instantly so the system feels like it has already started delivering. For VedicHour's multi-minute generation, the Zepto/Uber model applies: a named, ordered, visibly-advancing sequence of human-readable steps with a live ETA beats an indeterminate bar.
- **Empty and pre-data states sell the next action with an illustration + one sentence + one button.** (Cash App, Monzo, Groww, Airbnb wishlists) — An empty grid teaches nothing. This is directly the fix for VedicHour's biggest leak: free-calculator pages currently dead-end. The 'empty' region below a calculator result is prime real estate for a single, specific, personalized next step.
- **Bottom-anchored persistent action bar on mobile — the thumb zone owns the primary CTA.** (Zepto, Blinkit, Swiggy, Zomato, Uber, MakeMyTrip, Myntra) — Every Indian commerce app keeps price + CTA pinned above the nav. VedicHour's mobile users arriving from ChatGPT will never scroll back up to find a CTA. Pinning it converts scroll depth into intent.
- **Serif display + geometric sans body is the modern premium-consumer pairing; monochrome + a serif is enough to feel 'mystical' without cosmic clip-art.** (CRED (Cirka serif headings + Gilroy sans body), Co-Star (stark monochrome, minimal type), Airbnb Cereal, Nykaa) — VedicHour already owns the right pairing (Cormorant Garamond + DM Sans) and is under-using it — the serif is confined to marketing while product surfaces are mono. Promoting the serif into product headers and demoting mono is a near-zero-cost premium upgrade.
- **Emotional, question-shaped entry points instead of feature-shaped ones.** (The Pattern, Co-Star, AstroTalk, Groww's beginner education snippets) — The Pattern and Co-Star win on emotional specificity, not chart accuracy. VedicHour's own funnel data says users arrive asking career/money/marriage timing questions and 62% skip a free-text field. Replace the blank field with tappable question chips in the user's own words.
- **Bento/varied-size card grids to make a dense dataset scannable at a glance.** (Zomato, Nykaa, Myntra, Revolut home, Apple) — Uniform grids of equal cards read as tables. Varying card size encodes importance visually, so the eye gets hierarchy for free — ideal for a month view where 3 days matter and 27 don't.
- **Confirmation is never silent — every transaction ends in an explicit success screen plus an out-of-app receipt.** (PhonePe, Paytm, Google Pay, Razorpay, Zepto) — Indian payment UX norms (and RBI 2025 guidance) have trained users to expect an unambiguous green-tick success state and a receipt. Anything less reads as 'did my money vanish?' — the single fastest way to lose an Indian consumer permanently.
- **Educate inline, in bite-size, at the moment of confusion — never in a separate glossary.** (Groww, Paytm Money, PhonePe (explicit first-time-internet-user education focus)) — Groww's stated core value prop is simplification: complex concepts broken into digestible snippets at point of use. Every Sanskrit term (dasha, lagna, tithi) should be a tappable inline definition, not a footnote the user must leave the page to find.

**Applicable here**

- **Demote monospace from default data font to a rare accent. This is the single highest-leverage change and the direct cause of the 'coding interface' verdict.** — 683 `font-mono` usages across src/**/*.tsx is why it reads as a terminal. Groww, Kite, Revolut and Robinhood all render prices/percentages in their brand sans with tabular numerals. Mono for a life-timing answer makes the product feel like it is printing logs at the user rather than speaking to them.
  - Spec: 1) Add tabular numerals to DM Sans and make it the number font: `.tnum { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: 'tnum' 1,'lnum' 1; }` — apply to every score, price, percentage, duration and time-range. 2) Codemod: replace `font-mono` with `font-body tnum` everywhere EXCEPT report IDs, payment reference numbers and raw ephemeris/debug readouts (target: <25 remaining `font-mono` usages, down from 683). 3) Delete the `mono-lg/md/sm` sizes from tailwind.config.ts fontSize and replace with `num-lg: ['1.75rem',{lineHeight:'1.15',letterSpacing:'-0.02em',fontWeight:'600'}]`, `num-md: ['1.125rem',{lineHeight:'1.2',fontWeight:'600'}]`, `num-sm: ['0.875rem',{lineHeight:'1.25',fontWeight:'500'}]`. 4) Keep JetBrains Mono loaded but drop it from the critical font path.
- **Kill the wide-tracked uppercase micro-label pattern; replace with sentence-case labels.** — 56 instances of `tracking-[0.xxem]` uppercase labels is dashboard/CLI grammar. CRED, Zepto, Groww and Airbnb use sentence case for section labels; uppercase is reserved for at most one badge type.
  - Spec: Replace `text-label-* uppercase tracking-[0.18em]` with sentence-case `text-[0.8125rem] font-medium text-dust tracking-normal`. Retain uppercase ONLY on a single component: the verdict badge, and there cap it at `letter-spacing: 0.04em`, 11px, 600 weight. Change `label-lg/md/sm` letterSpacing in tailwind.config.ts from 0.02/0.03/0.04em to 0/0.01/0.02em.
- **Rebuild the surface + elevation language: bigger radii, tinted layered shadows, no pure-black drops, and a real 3-layer z-model.** — Current `borderRadius.card = 0.5rem` with `shadow-card = 0 1px 3px rgba(0,0,0,0.2)` on a #0D1426 navy produces muddy, flat, IDE-panel surfaces. Apple's 2025-26 HIG formalizes base/raised/overlay layers; Zepto/Swiggy/Revolut all use 16-20px radii with soft tinted shadows.
  - Spec: borderRadius: `card: '1rem'`, `card-lg: '1.25rem'`, `button: '0.75rem'`, `badge: '0.5rem'`, `sheet: '1.5rem 1.5rem 0 0'`. Elevation tokens (shadows tinted toward the navy hue, not black): `elev-1: '0 1px 2px rgba(6,10,24,.40), inset 0 1px 0 rgba(255,255,255,.045)'`; `elev-2: '0 6px 20px -4px rgba(6,10,24,.55), 0 2px 6px rgba(6,10,24,.35), inset 0 1px 0 rgba(255,255,255,.06)'`; `elev-3: '0 20px 48px -12px rgba(6,10,24,.70), inset 0 1px 0 rgba(255,255,255,.08)'`. Layer rule: base = bg-cosmos flat, no shadow; raised card = bg-nebula + elev-2 + NO border; overlay/sheet = #1A2340 + elev-3. Remove `border-horizon` from cards that now carry elev-2 — border AND shadow together is the panel look.
- **Lift the surface ramp and warm it slightly; stop using near-black as the product canvas.** — #080C18 is close to pure black and, combined with #E8EAF0 text, produces a very high-contrast console feel. CRED gets away with near-black because its cards are white; VedicHour's cards are also dark, so the whole screen collapses into one dark mass with hairlines.
  - Spec: Keep space #080C18 for the marketing hero only. For product surfaces raise the ramp: canvas `#0B1020`, raised `#141B30`, raised-2 `#1B2440`, overlay `#212C4D`, hairline `rgba(255,255,255,.07)` (replacing the solid #1E2A4A border everywhere it is used as a divider). Target 3-4% luminance steps between adjacent layers so depth reads without shadows on small screens.
- **Break the amber monopoly: introduce a secondary accent and demote amber to action-only.** — Amber #D4A853 is currently the accent, the glow, the label color, the border tint and the CTA — so nothing has priority, and gold-on-navy everywhere reads as a syntax-highlight theme. Uber ships a tight neutral + one accent; Airbnb reserves Rausch strictly for action.
  - Spec: Amber #D4A853 becomes CTA + primary-action ONLY (one per viewport). Add a cool secondary for informational emphasis, chips and links: `lapis: { DEFAULT:'#6E8FE8', light:'#93AEF2', bg:'rgba(110,143,232,.10)' }`. Keep success #3B9B6E and caution #C75B3A strictly semantic (favorable/unfavorable timing) and never decorative. Retire all `glow-amber`/`pulse-amber` usage on non-interactive elements. Add a warm neutral for prose surfaces in reading mode: `#F7F3EC`.
- **Introduce an 8pt spacing scale and enforce a 44px minimum touch target.** — Ad-hoc spacing is the other half of the dashboard feel — dense, uniform 8-12px gaps everywhere with no breathing rhythm. Every mobile design system in the study set standardizes on 4/8 tokens with 44pt/48dp targets.
  - Spec: Tokens: `space-1:4px, 2:8px, 3:12px, 4:16px, 5:24px, 6:32px, 7:48px, 8:64px`. Rules: card internal padding 20px mobile / 24px desktop; gap between sibling cards 12px; gap between sections 32px mobile / 48px desktop; page horizontal gutter 16px mobile / 24px tablet. All tappables `min-height:44px; min-width:44px`. Bottom safe area: `padding-bottom: calc(env(safe-area-inset-bottom) + 88px)` on any page with a pinned action bar.
- **Replace the raw 0-100 day score with a Booking.com-style verdict badge: score + word + one-line reason.** — A bare numeric score with no anchor is the purest 'benchmark readout' signal in the product. Booking never shows 8.7 without 'Fabulous'; Groww never shows a number without a colored delta and a label.
  - Spec: Component `<Verdict score band reason />`. Band mapping: 80-100 'Strong' (#3B9B6E, bg rgba(59,155,110,.12)), 60-79 'Favorable' (#5CB88A), 40-59 'Mixed' (#8892A4 on rgba(255,255,255,.06)), 20-39 'Guarded' (#E07A5C), 0-19 'Avoid' (#C75B3A). Layout: pill, radius 999px, 6px 12px padding, word at 13px/600 sans, score at 13px/600 tnum after a 1px vertical divider at rgba(255,255,255,.15). Directly beneath: reason line, 15px/1.55 DM Sans, text-star, max 90 chars, plain language, zero Sanskrit.
- **Report page: single hero answer above the fold, evidence collapsed beneath it.** — Owner's verdict plus funnel data (preview report → 0 pricing clicks) both point at the same thing: the report opens as a data surface, not an answer. Groww/Uber/Zepto all lead with one number and defer the breakdown.
  - Spec: Fold 1 (100vh mobile) contains exactly four things: (a) the user's question restated in their own words, 15px dust; (b) the answer as a date or date range in Cormorant Garamond 36-44px/1.1, weight 600, text-star; (c) a 2-3 sentence plain-language why, 16px/1.65, max-width 34ch on mobile; (d) one amber CTA, full-width, 52px tall, radius 12px. Everything else (hourly grid, dasha tables, nativity, month strips) moves below into `<details>`-style accordions with elev-1 headers, all collapsed by default except the current month.
- **Convert the free-calculator dead-end into a bridge with an empty-state-style personalized next step.** — 88 of 120 sessions END on free calculators and lagna-calc alone had 383 events with ChatGPT sending 214 — this is the largest single leak in the business and it is a design problem, not a traffic problem. Cash App/Monzo/Groww all treat the post-result region as an activation surface.
  - Spec: Directly below every calculator result, render a `ResultBridge` card: bg-nebula, radius 16px, elev-2, 20px padding, 24px above it. Contents: 12px lapis eyebrow 'Based on your chart'; 20px serif headline naming ONE specific finding derived from the result already computed (e.g. 'Your Jupiter period runs to March 2029'); 15px body one-liner; full-width amber CTA 'See your best dates →'. Below the CTA, a 12px dust reassurance line ('Free preview. No card needed.'). Ship this on every calculator route.
- **Replace the free-text question field with tappable question chips.** — 62% skip the free-text field, which kills the personalization hook. The Pattern and Co-Star win on emotionally specific prompts; a blank textarea asks the user to do the work.
  - Spec: 6-8 chips above an optional 'Something else' input, seeded from real funnel demand: 'When will I get a new job?', 'When should I start my business?', 'When will I get married?', 'Is this the right time to buy property?', 'When will money improve?', 'Should I change cities?', 'When to plan a child?'. Chip: radius 999px, 10px 16px padding, 14px/500 sans, default bg rgba(255,255,255,.05) + 1px rgba(255,255,255,.08); selected bg rgba(212,168,83,.14) + 1px #D4A853 + text #E8C97A. Two-row horizontal wrap on mobile, min 44px tall. Single-select, auto-advance on tap — no separate Continue button.
- **Add a mobile bottom action bar with live price and primary CTA.** — Every Indian commerce app in the study set (Zepto, Blinkit, Swiggy, Zomato, Myntra, MakeMyTrip) pins price + CTA in the thumb zone. VedicHour's mobile visitors will not scroll back up to convert.
  - Spec: Fixed bottom bar, appears after 40% scroll depth, `backdrop-filter: blur(16px)`, bg rgba(11,16,32,.88), top border rgba(255,255,255,.07), padding 12px 16px + env(safe-area-inset-bottom). Left: price 18px/600 tnum with 12px dust strike-through anchor if a discount applies. Right: amber CTA, 48px tall, radius 12px, 15px/600, min-width 160px. Entrance: translateY(100%)→0 over 220ms cubic-bezier(0.22,1,0.36,1).
- **Rebuild the pricing screen as an all-tiers-visible card set with per-day math and an inline trust strip.** — Research consensus: show every tier up front, pre-select the recommended one, and put trust signals physically next to price and CTA. Indian users additionally expect a recognizable payment mark before they commit.
  - Spec: Three stacked cards on mobile (7-day / monthly / annual), 12px gaps. Recommended card: 2px #D4A853 border, elev-2, and an offset ribbon 'Most chosen' (11px/600, amber bg, ink text, radius 8px). Each card: plan name 17px/600 serif; price 28px/700 tnum; per-day line 13px dust ('₹1,499 → about ₹50/day'); 3 benefit rows max, 14px, each with a #3B9B6E check. Immediately under the CTA, a horizontal trust strip at 12px dust with 16px icons: payment-partner mark · 'Refund within 7 days' · 'One-time payment, no auto-renew' · 'Calculations from Swiss Ephemeris'. Never place these on a separate page.
- **Turn report generation into a narrated, ordered progress story with skeletons, not an indeterminate bar.** — Generation takes minutes. Zepto/Uber prove that a named, visibly-advancing sequence with an ETA converts waiting from anxiety into anticipation; skeleton-shaped placeholders make the system feel like it has already started delivering.
  - Spec: Vertical stepper of 5 human-readable phases (never internal names like 'nativity_grids'): 'Reading your birth chart' → 'Mapping your planetary periods' → 'Scoring every day ahead' → 'Finding your strongest windows' → 'Writing your guidance'. States: pending (dust, 1px ring), active (amber ring + 1.5s ease-in-out opacity pulse .55↔1, plus a live elapsed/remaining line), done (#3B9B6E check, 200ms scale-in). Behind the stepper render the actual report layout as skeletons: bg linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.08), rgba(255,255,255,.04)), 1.4s shimmer, radius matching the real component. Show a real ETA ('about 4 minutes left'), never a spinner.
- **Cut ambient decorative motion; adopt a short, one-direction motion spec.** — Uber's Base system is explicit that motion should have one clear direction at a time. `spin-slow 20s infinite`, `twinkle 4s infinite` and `pulse-amber 2s infinite` are ambient screensaver motion that competes with the CTA and burns battery on the mid-range Android hardware this audience uses.
  - Spec: Durations: micro (press/hover) 120ms; standard (enter/exit) 220ms; sheets/modals 280ms. Easing: enter `cubic-bezier(0.22,1,0.36,1)`, exit `cubic-bezier(0.4,0,1,1)`. Delete `spin-slow`, `spin-medium`, `twinkle`, `pulse-amber` from tailwind.config.ts animations; keep the StarField as a static rendered layer. Keep `fade-in`/`slide-up`/`scale-in` but shorten to 220ms and cap stagger at 3 items x 40ms. Wrap every animation in `@media (prefers-reduced-motion: reduce) { animation: none !important; transition-duration: .01ms !important; }`.
- **Promote Cormorant Garamond into product surfaces; it is currently the most underused premium asset in the system.** — CRED's premium read comes largely from Cirka (serif) headings over Gilroy body. VedicHour restricts its serif to marketing while product headers use sans/mono — exactly inverting the pairing that would make it feel considered.
  - Spec: Serif (Cormorant Garamond 600) for: report hero answer (36-44px mobile / 56px desktop), section titles (24px), card titles (18px), and the price figure on plan cards. DM Sans for all body/UI/numbers. Tighten optical letterSpacing on serif display sizes to -0.015em, line-height 1.1-1.2. Never set serif below 17px — it loses legibility on low-DPI Android.
- **Add inline tap-to-define for every Sanskrit term instead of a separate glossary.** — Groww's core stated value prop is breaking complex concepts into digestible in-context snippets; PhonePe explicitly designs for first-time users. An off-page glossary is a page-exit, and this audience is mobile-first and jargon-averse.
  - Spec: `<Term>` component: dotted 1px underline in rgba(212,168,83,.45), no color change to the running text. Tap opens a bottom sheet: radius 24px 24px 0 0, bg #1B2440, elev-3, 24px padding, drag handle 36x4px rgba(255,255,255,.2). Contents: term 20px serif, one-sentence plain definition 16px/1.6, and 'Why it matters for you' 15px tied to the user's own chart. Dismiss on backdrop tap or downward drag. Enter 280ms translateY.
- **Ship an explicit, celebratory payment-success screen with a receipt.** — Indian payment UX norms (and RBI 2025 guidance) have conditioned users to expect an unambiguous success state plus an out-of-app receipt; silence after payment is the fastest way to lose the user.
  - Spec: Full-screen state: #3B9B6E check inside a 72px circle (scale-in 240ms + a single 400ms ring expansion), 'Payment confirmed' 28px serif, amount + last-4/UPI handle at 15px dust tnum, order reference in the ONE legitimate `font-mono` usage at 13px with a copy button, then 'Your report is being prepared — about 5 minutes' and an amber CTA to the live progress stepper. Send an email receipt in parallel and say so on screen.
- **Convert the month view from a uniform grid to a bento hierarchy that surfaces only the days that matter.** — A uniform 30-cell grid of scores is a spreadsheet and is the densest remaining 'coding interface' surface. Zomato/Nykaa/Revolut use varied card sizing so the eye gets importance for free.
  - Spec: Top of the month view: up to 3 'Standout days' as large cards (full-width mobile, 96px tall, elev-2, radius 16px) showing weekday + date in 22px serif, the verdict badge, and a one-line reason. Below: the remaining days as a compact 7-column strip, 40px cells, radius 8px, filled only with the band color at 18% opacity plus the date in 13px tnum — no numeric score printed in the strip. Tapping any cell expands an inline detail panel rather than navigating away.

### research-premium-content — platforms studied

Co-Star, The Pattern, CHANI, Sanctuary, AstroTalk, AstroSage, Astrology.com / Horoscope.com, Nebula (astrology), Calm, Headspace, Oura, Whoop, Apple Fitness+, Apple Health / Health Summary, Strava, Noom, Peloton, Ōura Resilience & Cardiovascular Age reports, Levels (CGM), Zoe, Flo, Clue, 23andMe, Ancestry, Spotify Wrapped, Apple Music Replay, Google Photos Memories, YouTube Recap, Duolingo Year in Review, Strava Year in Sport, Monzo Year in Monzo, Medium, Substack, Readwise / Readwise Reader, Matter, Apple News+, Financial Times, The New York Times (feature/interactive desks), Pocket

**Key patterns**

- **Dark UI is for tools; long-form personal insight is read on light, warm, paper-like surfaces** (Financial Times (Financier serif on salmon #FFF1E5), Apple News+, Medium, Substack, Readwise Reader, CHANI (off-white with blush/lavender accents), 23andMe (white + white space as a stated principle)) — Almost no product whose core value is *reading something about yourself* uses a dark technical canvas for the body. Dark navy + monospace + numeric grids is the visual grammar of dashboards, terminals and trading screens — it signals 'system output', which is exactly the 'coding interface' read. Warm off-white with a serif body signals 'this was written for you'. FT's paper tint and Medium/Substack's near-white are load-bearing brand assets, not defaults. Dark is retained by these brands only for covers, chapter openers and ambient/mood screens.
- **Mono type is quarantined to true machine data — never to labels, headings, or human language** (Oura, Whoop, Apple Health, Strava, FT data journalism) — Even metric-dense wellness apps use their humanist sans for labels ('Readiness', 'Sleep') and reserve tabular/mono figures for the numerals only. Mono on a *word* is the strongest single cue of 'developer artefact'. VedicHour's heavy mono use on labels/scores is likely the highest-leverage single fix: it costs nothing semantically and removes most of the terminal feel.
- **One idea per screen, with generous vertical silence between ideas** (Co-Star (a day = a few short blocks with large voids), The Pattern (one 'Pattern'/'Impact' per card), Spotify Wrapped (one stat per full-bleed panel), Google Photos Memories, Duolingo Year in Review) — Density reads as a report *generated*; sparsity reads as a report *authored*. Co-Star's whitespace is what let a plain black-and-white text app feel luxurious. For a paid astrology report the equivalent is: never show two competing sections in one viewport on mobile — one claim, one supporting sentence, one action.
- **The headline is a sentence about the person, not a metric** (Co-Star ('Do the thing you have been putting off'), The Pattern (named life-cycle titles like 'Turning Point'), Oura's new app ('one big thing' focus), Noom, Whoop's daily coach copy) — The metric becomes the *evidence*, subordinate to the claim. Oura's 2025 redesign explicitly reorganised around surfacing one most-important insight rather than a metric wall. Users came with an emotional question; a number answers no emotional question, a sentence does.
- **Scores expressed as qualitative state + color first, digits second (or not at all)** (Oura (color-coded body states; score row collapsible, detail on tap), Whoop (recovery as green/yellow/red before the %), Apple Fitness+ rings, Levels, Flo) — Color+word carries the meaning at a glance; the digit is a drill-down for the minority who want precision. A 0–100 number in mono in a grid is a dashboard. The same value as 'Strong day' in a warm tinted band with the number small and secondary is editorial. Oura also proved the pattern of a *thin* score row at top + long editorial scroll below — the scores frame the story, they aren't the product.
- **Time is drawn as a ribbon/timeline you scrub, not a table you scan** (The Pattern ('Your Impact' — past/present/future cycles), Strava, Whoop weekly strain, Google Photos timeline, Oura readiness timeline on tap) — Timing products are inherently temporal; a grid of days×hours flattens narrative into spreadsheet. A horizontal ribbon with named windows ('a strong stretch', 'a slow patch') preserves the story and reads native on mobile. Tables belong behind a 'see the detail' affordance, for the power user.
- **A distinctive, opinionated *voice* is half the design** (Co-Star (blunt, second-person, faintly rude), The Pattern (clinical-psychological, named patterns), Spotify Wrapped (playful, quotable), Noom) — Co-Star's cult status was design + copy as one artifact: stark black canvas, tight type, and short declarative second-person lines that were screenshot-and-share ready. The typographic system existed to make sentences feel like pronouncements. Nothing in a template ('Your Venus is in the 7th house') is screenshot-able; 'You will be tempted to say yes to the wrong person in October' is.
- **Transparent provenance theatre — show the machinery briefly, as ritual, then hide it** (Co-Star ('Fetching NASA data → Plotting stars → Composing horoscopes'), 23andMe (educating through the results UI), Oura onboarding, Zoe) — A short honest loading narrative buys credibility for an inherently unfalsifiable claim, and it's the *only* place raw technical vocabulary belongs. After that moment, jargon should be behind a tap. Co-Star made 'NASA data' a brand asset without putting ephemeris tables on the reading surface.
- **Illustration/texture carries mood; the interface itself stays quiet** (CHANI (collage/zine motifs used sparingly on a strict grid so they frame rather than compete), Headspace 2024–25 rebrand (custom typeface that flexes 'playful to clinical', simplified illustration library, breath-driven motion), Calm (photographic nature + slow gradients), Spotify Wrapped 2025 (analog/mixtape textures, stop-motion-feeling motion)) — Mood cannot come from UI chrome; it comes from a small number of large, deliberate visual moments. CHANI's lesson cuts both ways — a review criticised it for being clean but *not visually distinctive*: in this category, understatement is a missed opportunity. Motion should be breath-paced (600–1200ms easing) not app-paced (150ms).
- **Chaptered, paced narrative with named sections and a visible sense of 'how much is left'** (Spotify Wrapped, Duolingo/Strava Year in Review, 23andMe report list, Apple News+ magazine layouts, Readwise Reader progress) — A long report needs an arc: cover → chapters → close → share. Named chapters ('What this year is really about', 'Your strongest windows') beat functional ones ('Monthly Forecast', 'Dasha Analysis'). Progress cues convert length from a burden into a value signal for a paid product.
- **The report has a cover — a designed, personal, ownable first screen** (Spotify Wrapped, Apple Music Replay, Apple News+ animated magazine covers, 23andMe ancestry composition, Ancestry story pages) — A cover does three jobs at once: it signals craft (justifying price), it makes the artifact feel *possessed* by the person named on it, and it's the natural share unit. Personal-data products almost universally open with a title page containing the person's name and one distilled claim.
- **Exactly one shareable, screenshot-designed artifact per report** (Spotify Wrapped share cards, Strava Year in Sport, Co-Star day cards, The Pattern pattern cards) — Growth in this category is screenshot-driven, and screenshots only spread when a single card is composed to survive being cropped into a WhatsApp/Instagram Story: square/9:16, big type, name + one claim + tiny brand mark. This is a design deliverable, not a share button.
- **Serif for the human voice, sans for the mechanics, and a real reading measure** (FT (Financier, drawn to hold up from broadsheet to narrow phone), NYT features, Medium, Substack, Apple News+) — Premium reading is signalled by a serif set at ~17–19px with 1.6–1.75 line-height on a 60–68 character measure. VedicHour already owns Cormorant Garamond but likely uses it only for marketing display; promoting it into the *report body* (or a sturdier text serif) is the second-biggest lever after the light surface.
- **Complexity is progressive: the emotional answer first, the technical proof one tap deeper** (23andMe ('make complexity approachable'), Oura (score → contributors on tap), Whoop, Flo, AstroSage's AI interpretations layered over raw kundli) — Indian astrology audiences want *both* — the plain answer and the traditional legitimacy (dasha, lagna, nakshatra). The winning structure is not choosing between them but stacking them: plain-language claim on the surface, 'Why this?' disclosure containing the Sanskrit/technical basis. AstroTalk's dominance is trust-and-consultation-led with a conventional UI; the design opening is a product that is both *legible* and *beautiful*, which no incumbent in India currently is.
- **Emotion-first entry points that match the question the user actually arrived with** (The Pattern (life-area cycles), Noom, Flo, AstroTalk (career/finance/relationship consultation categories), Chani (mindfulness/ritual framing)) — Traffic arriving from ChatGPT/Google is asking 'when will I get married', 'will my career move work' — not 'what is my ascendant'. Navigation organised around life questions converts; navigation organised around astrological artifacts (chart, dasha, panchang) does not. This is the bridge from free-calculator pages to the paid report.

**Applicable here**

- **Ship a light 'reading surface' for every long-form report/insight page — the single highest-leverage fix against the 'coding interface' verdict** — Every premium reading and personal-report analogue (FT, Apple News+, Medium, Substack, 23andMe, CHANI) reads on warm off-white. Dark navy + mono is the grammar of dashboards. The tokens already exist and are unused.
  - Spec: Activate the existing parchment/ink scale as the report/insight theme via the existing CSS-variable layer in globals.css (--color-bg/--color-surface/--color-surface-2/--color-text/--color-muted/--color-border) rather than a new palette. Report page: --color-bg #FAF8F5 (parchment), --color-surface #FFFFFF, --color-surface-2 #F2EDE6 (parchment-2), --color-border #E8E0D6 (parchment-3), --color-text #1A1A2E (ink), --color-muted #4A4A5E (ink-muted). Accent stays amber but darken for AA on parchment: use amber.dark #B8923E for text/links (amber #D4A853 on #FAF8F5 is ~1.9:1 and fails); semantics become success #2F7D59 and caution #A8452B on light (the current #3B9B6E / #C75B3A are for dark surfaces only). Keep space/cosmos/nebula dark for: marketing hero, the report cover/chapter openers, and the generation/loading ritual — dark becomes a deliberate 'night sky' accent, not the default canvas. Implement as `data-surface="reading"` on the report layout root so no component needs rewriting.
- **Purge mono from all words; restrict it to numerals only** — Mono on labels is the strongest single 'terminal' signal, and it is currently used heavily for labels and scores.
  - Spec: Global rule: font-mono is permitted only on (a) bare numerals, (b) clock times (14:32), (c) chart degrees inside the technical disclosure. Delete the mono-lg/mono-md/mono-sm usages on any label text and re-point them at label-lg/label-md (DM Sans). Better: add `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;` to a new `.num` utility on DM Sans and drop JetBrains Mono from the report surface entirely — you keep column alignment and lose the code look. Also drop the uppercase+wide-tracking treatment on more than one label tier: keep letterSpacing 0.02–0.04em ALL-CAPS for section eyebrows only, sentence case everywhere else.
- **Set the report body in a real reading serif at a real reading measure** — FT/Medium/Substack/Apple News+ all signal 'premium, authored' primarily through body typography. Cormorant Garamond is already loaded but is a display face — too fragile at body size on mobile.
  - Spec: Body: 17px mobile / 19px desktop, line-height 1.7, max-width 34rem (≈62 characters), paragraph spacing 1.15em, no justification, hyphens: none. Use Cormorant Garamond ONLY for chapter titles/pull-quotes (28–40px, line-height 1.15, weight 600) and set the body in DM Sans at 17/1.7 — or, if a serif body is wanted, add one sturdy text serif (Source Serif 4 / Lora / Newsreader, ~2 woff2 weights, self-hosted like the existing 6 fonts). Do NOT set Cormorant at 17px. Add a pull-quote style: 22px Cormorant italic, ink-muted, 2rem vertical margin, no quotation-mark decoration.
- **Replace every score grid with 'state word + tinted band' and demote the digit** — Oura/Whoop show colour+word first, number on drill-down; a 0–100 numeric grid is the definition of a dashboard.
  - Spec: Day/hour rating component: primary line = one of five state words (Strong / Favourable / Mixed / Slow / Avoid) in DM Sans 15px/600 + a 4px-radius left rule 3px wide in the state colour; background = state colour at 8% alpha (reuse the existing success-bg / caution-bg / guidance-bg alpha pattern, re-tuned for parchment at 10–12%); the 0–100 score renders at 12px, ink-muted, tabular-nums, right-aligned — or is hidden behind the 'Why this?' disclosure entirely. Five-step scale, never a continuous gradient bar. Never render more than one score per viewport-third on mobile.
- **Re-cut the day/hour tables as a scrubable time ribbon with named windows** — The Pattern's 'Impact' cycles, Strava, and Whoop all render time as a ribbon; a days×hours table is the spreadsheet form of the same data.
  - Spec: Month view: horizontal scroll ribbon, 1 column = 1 day, 8px wide × 56px tall bar tinted by state, with named window overlays spanning contiguous days ('A strong stretch — 8–14 Sept') rendered as a label above the ribbon in 13px DM Sans. Tapping a day expands an inline card (one day, one paragraph, one action). Day view: 18 hourly slots become a vertical ribbon of 18 rows at 44px min-height (touch target), state tint + hour range + one clause; the existing HourlyTable becomes the 'Detailed table' behind a text link. Keep the existing display_label sort/logic — this is a presentation swap, not a data change.
- **Give the report a designed cover page and named chapters instead of functional section headers** — Wrapped, Apple Music Replay, Apple News+, 23andMe all open with an ownable title page; named chapters create an arc that justifies a paid length.
  - Spec: Cover: full-viewport, dark (space #080C18) with a single subtle star/mandala motif, the person's name in Cormorant 40–56px, birth date/time/place in 13px dust as a single quiet line, and ONE distilled sentence ('Your next 12 months turn on two windows'). Then transition to the parchment reading surface for chapter 1 — the light/dark switch is the 'entering the book' moment. Rename sections from artifacts to claims: 'Nativity' → 'Who you are, in plain words'; 'Monthly Forecast' → 'The shape of your year'; 'Daily/Hourly Grid' → 'Your strongest windows'; 'Dasha' → 'The chapter you're living in'. Add a thin 2px amber-dark progress rule fixed at the top of the reading surface.
- **Lead every section with a second-person sentence; make the astrology the footnote** — Co-Star's cult status came from screenshot-able declarative second-person copy set in a stark, confident type system — copy and design were one artifact.
  - Spec: Section template, in this fixed order: (1) claim — 18–22px, max 20 words, second person, no Sanskrit; (2) 2–3 short paragraphs of reasoning in plain language; (3) one concrete action ('Ask in the first half of March'); (4) a collapsed `<details>` styled as a quiet text link 'Why this? — the chart basis' containing lagna/dasha/nakshatra/transit terms with inline glossary tooltips. Enforce in the generation prompts: no Sanskrit term may appear above the disclosure without a plain-language gloss on first use. Ban hedge-filler openers ('Unfolding…', 'This period may bring…').
- **Design one 9:16 share card per report as a first-class deliverable** — Growth in this category is screenshot-driven (Wrapped, Co-Star, Strava Year in Sport); the audience is Indian mobile users on WhatsApp/Instagram.
  - Spec: 1080×1920 canvas rendered client-side (or via an OG image route): dark space background + one large amber constellation motif, person's first name in Cormorant 96px, ONE claim in DM Sans 56px/1.25 (max 14 words), the two strongest date windows as two tinted pills, and 'vedichour.com' in 28px amber-dark at the bottom. No QR code, no logo lockup larger than the claim. Ship a 1:1 variant for WhatsApp status. Wire it to the existing WhatsApp share loop.
- **Slow the motion to breath pace and give the generation wait a ritual narrative** — Headspace's breath-driven motion and Calm's slow gradients set mood through timing; Co-Star turned its loading sequence ('Fetching NASA data…') into a credibility asset.
  - Spec: Report-surface transitions: 700ms, cubic-bezier(0.22, 1, 0.36, 1); content reveals as opacity 0→1 + translateY 12px→0, staggered 90ms per block. No spinners on the reading surface — use a slow amber ring that completes one rotation per 3.5s. Generation screen: three sequential lines, ~4s each, in DM Sans 15px on space bg — 'Reading the sky at your birth minute' → 'Mapping your dasha periods' → 'Finding your strongest windows'. This is the ONE place technical vocabulary is welcome. Respect prefers-reduced-motion by dropping translate and stagger, keeping opacity.
- **Bridge free calculator pages into the report with a life-question entry point, not an astrology-artifact one** — 88/120 sessions end on free calculators, and arriving users ask career/money/marriage timing questions; The Pattern, Noom, Flo and AstroTalk all organise entry around life areas, not chart objects.
  - Spec: On lagna-calc and every free tool, below the result, insert a full-width parchment panel (breaking the dark page — the surface switch itself is the signal that something different is here): 40px Cormorant question 'What do you actually want to know?' + a 2×3 grid of large tap targets (min 96px tall, 15px DM Sans, single quiet line icon): Career move · Money · Marriage timing · Children · Health · A specific date. Each routes to /onboard?plan=…&focus=<area> and pre-fills the question field — this directly attacks the 62% skip rate on that field. One panel, one question, nothing else in that viewport.
- **Introduce a small, owned illustration/motif system so the product has a mood, not just a theme** — CHANI's collage motifs and Headspace's illustration library carry the emotional register; the criticism of CHANI was that being merely clean is a missed opportunity in this category.
  - Spec: Commission or generate 6–8 flat two-colour motifs (amber-dark #B8923E + ink #1A1A2E on parchment; amber #D4A853 + star #E8EAF0 on space) — one per life area (career, money, marriage, children, health, self) plus a cover mandala and a chapter-divider constellation. Rules borrowed from CHANI: motifs appear only as chapter openers and the share card, at ≥160px, at most one per screen, never as inline icons and never inside score components. SVG, inlined, under 4KB each.
- **Adopt Oura's 'thin score row + long editorial scroll' as the report page skeleton** — Oura's 2025 redesign is the closest solved analogue: metric-rich data, no dashboard feel, achieved by making scores a frame and the narrative the body.
  - Spec: Report top: a single 64px-tall row with at most three items (today's state word, the current chapter/dasha name, the next strong window date) — tinted, no borders, no card chrome, tap for detail. Everything below is a single-column narrative scroll at 34rem measure. Kill nested card-in-card containers on the reading surface: chapters are separated by 72px of vertical space and a 1px parchment-3 rule, not by boxes. Cards remain only for the score row, the share card, and the paywall/CTA block.

### research-conversion-craft — platforms studied

Duolingo (Super), Spotify Premium, YouTube Premium, Blinkist, Calm, Headspace, Strava, Notion, Superhuman, Tinder (Gold), Fishbrain, ClassDojo, Blackbox, Co-Star, The Pattern, Sanctuary, AstroTalk, AstroSage, 23andMe, Credit-report products (Experian/CIBIL-style), Personalised photobook products, Razorpay Checkout (hosted + embedded), UPI Intent Flow, PhonePe, CRED, Zomato Gold, Swiggy One, Netflix (free-preview/teaser mechanics), Substack (news paywall teaser), Medium / news paywalls (LMU teaser study), RevenueCat benchmark cohort (State of Subscription Apps), Adapty benchmark cohort, Superwall paywall-pattern cohort

**Key patterns**

- **The five-beat paywall sequence: OUTCOME → VALUE → REASSURANCE → PRICE → SINGLE CTA. High-converting screens answer questions in the order users actually ask them (what do I get / how does it help me / can I trust this / what does it cost / what do I do now). Price is beat four, never beat one.** (Strava, Fishbrain, Calm, Blinkist, Duolingo Super; codified in Qonversion + Apphud paywall-anatomy guides) — Price shown before value is evaluated as a cost; price shown after value is evaluated as an exchange rate. Reordering alone moves conversion without changing the offer.
- **Outcome-based headline beats feature-count headline. 'Get your personalized 7-day plan' beats 'Unlock 500+ workouts.'** (Strava (tested; reported ~23% conversion lift on outcome-based messaging)) — Users buy an imagined future state, not an inventory. Feature counts trigger comparison-shopping; outcomes trigger self-projection.
- **Radical simplification: one visual, one headline, 3–5 bullets, ONE eye-catching CTA. A stripped paywall routinely beats a feature-comparison matrix.** (Strava, Fishbrain, Calm; RevenueCat's 'ugly paywall' tests) — A comparison table converts the decision from 'do I want this' into 'which one', adding cognitive load at the exact moment of highest intent. Matrices belong on /pricing, not on the paywall.
- **The blur-to-reveal curiosity gap: show that a specific, personal, desirable answer EXISTS, withhold only the identity/reason. Tinder blurs the faces of people who liked you — ~8% of users upgrade to Gold specifically to unblur, at roughly $20/mo.** (Tinder Gold, Fanvue, Co-Star (locked personalised report), 23andMe (reads BRCA/APOE variants from the ancestry kit but withholds display until the health upgrade is bought)) — The tension is 'the answer about ME is already computed and sitting behind this pane' — far stronger than 'more content exists'. Crucially the withheld thing must be singular and named, not a volume of content.
- **Teaser minimalism: LMU's news-paywall research found teasing with LESS text (image + headline only) converts better than teasing with more article text — but total blackout raises subscribe-taps while also raising bounce and killing return propensity. The winning shape is 'complete small thing + named locked thing'.** (LMU/Journalism Studies paywall research; Pugpig display-strategy guidance; Substack) — Partial prose lets the reader self-serve enough to feel finished. A COMPLETE small artefact satisfies the fairness instinct (they got real value) while a NAMED lock creates a specific unmet want.
- **Contextual paywall: when a user taps a locked item, the paywall inherits that item's imagery and rewrites its own title to match. Calm pulls the exact locked session's image into the paywall header and modifies the title copy.** (Calm, Strava (many contextual CTA blocks by entry point), Blackbox (~50% revenue lift from re-timing paywall appearance)) — A generic paywall answers 'why premium'. A contextual paywall answers 'why THIS, now' — the user's own just-expressed intent becomes the value proposition, so no persuasion is needed.
- **Paywall AFTER first value, not before it. Duolingo completes a full lesson before asking for money; RevenueCat's aha-mapping guidance is to fire the paywall immediately after the event that proves the core value.** (Duolingo, Blinkist, RevenueCat JTBD paywall tests (reported up to 169% more free-to-paid)) — Post-value, the user is arguing from experience rather than from a marketing promise. The counter-datum matters too: RevenueCat finds ~50% of paid conversions happen on Day 0 — so 'after first value' must mean minutes, not days.
- **Blinkist's 'Honest Paywall': an explicit visual timeline of what happens and when, plus a promise to remind before charging. Reported +23% conversion and −55% complaints.** (Blinkist; Headspace and Calm have both moved to the same radical-transparency posture) — Most non-conversion at the price step is unstated fear (hidden charges, auto-renew traps, 'can I get out'). Naming the fear and disarming it converts better than adding another benefit bullet.
- **Anchor-and-decoy tiering: show the higher price first, place a mid-tier between cheapest and best-value, badge exactly one option. Good-better-best decoy structures shift mix toward the target tier by roughly 10–30 points.** (Duolingo Super, Spotify, YouTube Premium, Notion, Zomato Gold / Swiggy One) — The first price seen becomes the reference point; the decoy exists to make the target obviously dominant, so the user makes a comparison judgement (easy) instead of a value judgement (hard).
- **Amortised price framing: break the total into a daily/weekly figure and place it in or beside the CTA. Duolingo shows trial length inside the CTA button and breaks annual pricing down to a weekly figure. Per-day framing lifts participation ~15–40% in subscription/giving studies.** (Duolingo, Calm, Blinkist, Spotify annual, NPR 'dollar-a-day' (the canonical pennies-a-day study)) — ₹799 competes against 'things I buy for ₹799'. ₹114/day competes against chai. The comparison set changes and the price stops being a category purchase.
- **Social proof placed ABOVE the price tiers, not below — and specific rather than generic: star rating WITH review count, plus a testimonial matched to the user's stated onboarding goal.** (Calm, Blinkist, ClassDojo, Superhuman (outcome testimonials), AstroTalk (volume proof)) — Credibility must be resolved before price is evaluated, or the price is judged by an untrusted seller. Goal-matched testimonials outperform generic ones because the reader is looking for someone with their exact problem.
- **Graduated risk reversal matched to price. Reported lifts by framing: money-back ≈ +23%, satisfaction guarantee ≈ +34%, 'love it or return' ≈ +41%; a visible 30-day money-back badge ≈ +21% sales; risk-reversal language in sales ≈ +32% win rate. Critically: 'X% of customers keep it' outperforms a bare 'money-back guarantee'.** (DTC/CRO literature (River guarantee templates, SPOTIO, Forbes CommComm), Blinkist, 23andMe returns posture) — A retention statistic is simultaneously risk reversal AND social proof — it says 'you can leave' and 'almost nobody does' in one sentence. Bare guarantees can read as a defensive admission that returns are common.
- **Value stack with checkmarks and action-oriented benefit lines, sized 4–6 items, each phrased as something the user will DO or KNOW.** (ClassDojo, Blinkist, Calm, Duolingo Super) — Checkmark stacks are scanned, not read; they build a felt sense of accumulating value in under three seconds — which is all the attention a mobile paywall gets.
- **Benefit-CTA over generic-CTA: 'Start my plan' / 'Get my report' beats 'Subscribe' / 'Get Premium'; first-person possessive ('my') beats second-person.** (Strava, Duolingo, Calm; consistent across Superwall/Apphud pattern libraries) — The button label is the last sentence read before commitment. Naming the possession completes the mental transfer of ownership that the paywall was building.
- **Freemium's structural cost: apps asking for money upfront convert ~5x better than freemium (≈10.7% vs ≈2.1% in RevenueCat's benchmark). The free tier must be scoped as a demonstration of the mechanism, not as a usable substitute for it.** (RevenueCat State of Subscription Apps; freemium-tier design guidance) — A free tier that resolves the user's job removes the reason to pay. Free must prove the machine is real and personal, then stop precisely where the user's actual question begins.
- **Free-first-consult / trial-minutes as the India-market on-ramp: AstroTalk gives 5 free minutes with a real astrologer, then converts to paid minutes and paid full-length reports; consultations are 90–95% of its revenue at ~₹1,182 crore FY25.** (AstroTalk, AstroSage, Sanctuary ($10 chat-with-an-astrologer)) — Indian astrology buyers are conditioned to pay for a PERSON answering THEIR question, at ₹299–₹499 per report or ₹20–₹100 per minute. The price point and the unit ('my question answered') are the established mental model — a product priced and framed as a document fights that model.
- **Indian mobile checkout mechanics: forced account creation causes ~26% of Indian mobile-checkout dropoffs (OTP guest checkout is the fix); unoptimised mobile checkouts see up to 40% higher abandonment; UPI Intent Flow (auto app-switch, pre-populated) materially outperforms collect/QR; 4+ express options target ~67% vs ~52% baseline conversion.** (Razorpay checkout guidance, UPI Intent Flow, PhonePe, Zomato/Swiggy checkouts) — In India the failure mode is mechanical, not motivational. The user already decided; the funnel loses them to app-switch friction, OTP timeouts, and account walls.
- **Trust furniture AT the payment field: recognisable UPI/card-network/wallet marks, SSL indicator, and the final all-inclusive amount displayed immediately adjacent to the pay button. Late-revealed charges are the top trust-breaker.** (Razorpay hosted checkout, PhonePe, CRED, Zomato Gold) — Indian consumers screen unknown merchants for legitimacy at the payment step specifically. Familiar payment iconography is borrowed institutional trust, and it's cheaper to borrow than to build.
- **CRED's premium-signal doctrine: restraint, generous whitespace, a small number of large typographic statements, and near-zero UI chrome. Perceived exclusivity is carried by what is REMOVED.** (CRED, Superhuman, Notion, Zomato Gold's dark/gold treatment) — Directly addresses the owner's 'looks like a coding interface' verdict: density and monospace read as instrumentation (free/utility); air, serif display type, and few elements read as counsel (premium/paid).
- **Ethical urgency: real deadlines, real cohort limits, or genuine seasonal/astronomical relevance — never a fabricated countdown. EU DSA prohibits false urgency for large platforms and FTC enforcement is rising; India's CCPA dark-pattern guidelines name false urgency explicitly.** (Post-countdown-ban CRO practice; contrast case: The Pattern's multi-screen cancel flow and Duolingo's gem/social-pressure mechanics are widely read as dark patterns and generate backlash) — Astrology has a genuine, non-manufactured urgency source: a real dated window in the user's own chart. Truthful urgency ('your strongest day is Aug 14 — 11 days out') outperforms fake urgency and carries zero regulatory or reputational tail risk.
- **Post-purchase dissonance management: ~74% of US online shoppers report buyer's remorse and up to ~80% report post-purchase anxiety; proactive onboarding (tutorial, what-happens-next, success stories) measurably reduces returns.** (Sonos onboarding comms, 23andMe results-onboarding, Calm) — For a digital report the remorse window is the first 5 minutes of reading. If the buyer's first paid screen doesn't immediately restate and answer the question they paid to have answered, the refund clock starts.
- **Upgrade-path merchandising after a partial purchase: 23andMe sells Ancestry at $99, then follow-up promotions upgrade to Ancestry+Health ($199) at a discount — data already computed, sold twice.** (23andMe, credit-report products (score free → full report paid → monitoring subscription), AstroTalk (chat → full-length report)) — The cheapest revenue in the business is the second sale to someone who already trusted you once. It requires an explicit, pre-designed ladder, not an ad-hoc email.
- **The danger zone and value-delivery cadence: cumulative churn climbs sharply between Day 7 and Day 30 for monthly subscribers, so value delivery must be most aggressive exactly there.** (RevenueCat churn benchmarks; Strava, Calm retention programmes) — Directly relevant to VedicHour's Monthly Oracle: a 30-day report bought on Day 0 and never re-opened is a refund and a non-renewal. The product must re-present itself on the dates it named.

**Applicable here**

- **Restructure the preview report into a strict five-beat spine and delete the current scattered-CTA layout.** — The live preview (src/app/(app)/report/[id]/page.tsx, isPreviewPlan branches at ~1516, 1567, 1665, 1806) fires at least four separate unlock CTAs — PersonalizedAnswer, PreviewValueStrip, an inline 'Unlock 7 days' block, a bottom block, plus ExitIntentUpsell. Best-in-class (Strava, Calm, Fishbrain) is ONE primary CTA per screen. Multiple competing CTAs at different price/plan framings read as pleading, which is the opposite of the premium counsel posture CRED-style restraint buys. Order must be outcome → value → reassurance → price → CTA.
  - Spec: New preview page order, top to bottom: (1) IDENTITY BEAT — 'Aarsh · Born 14 Mar 1994, 04:20, Mumbai · Scorpio rising, Moon in Pushya' + one-sentence life-chapter line. No CTA. (2) OUTCOME BEAT — PersonalizedAnswer echoing their question + the teaser paragraph. No CTA. (3) VALUE/PROOF BEAT — PreviewValueStrip curve + the three named dates. No CTA. (4) REASSURANCE BEAT — new <TrustBar/>: rating+count, one goal-matched testimonial, refund line, payment marks. (5) PRICE + SINGLE CTA BEAT — one <PaywallCard/>. Delete the inline unlock block at ~1665 and the bottom block at ~1806; keep ExitIntentUpsell as the only secondary surface. Every earlier beat's 'CTA' becomes a soft anchor link (href="#unlock", styled as text-amber underline, NOT btn-primary) so only one element on the page carries btn-primary.
- **Rewrite the paywall headline from feature-count to outcome, and make it inherit the user's own question.** — The current locked block reads 'Unlock 7 days of hourly windows + your year ahead' (line ~1671) — that is Strava's losing variant (feature inventory). The tested winner is outcome phrasing, and Calm's contextual pattern says the paywall should rewrite its own title from the thing the user just tried to open. VedicHour already captures an onboarding question and the funnel data shows users ask career/money/marriage TIMING questions — but 62% skip the field, so a fallback chain is mandatory.
  - Spec: Headline resolution chain in <PaywallCard/>: (a) if question_echo exists → `You asked: "{question_echo}" — here is the month that answers it.` (b) else if a focus domain was selected → `Your {domain} timing for the next 30 days, hour by hour.` (c) else → `{FirstName}, your next 30 days — decoded hour by hour.` Subhead always: `Not a horoscope. {N} scored windows computed from your exact birth moment.` where N = 126 (7day) or 540 (monthly). Ban the words 'Unlock', 'Premium', 'Upgrade' from H1/H2 positions site-wide — reserve 'Unlock' for the microcopy under the button only.
- **Change the lock metaphor from 'more content is locked' to 'ONE named answer is behind this pane' — Tinder-blur, not paywall-fog.** — PreviewValueStrip already does this correctly ('The dates are yours. The reasons are locked.') — that is the single strongest asset in the codebase and it is the 23andMe/Tinder pattern exactly: the answer is computed, personal, and withheld by one pane. But the rest of the preview reverts to volume framing ('7 days of hourly windows', '540 scored windows'), which is the weaker frame. LMU's finding also warns against total blackout: give a COMPLETE small artefact, then a NAMED lock.
  - Spec: Give away, fully and unblurred: the full natal chart, rising/Moon/nakshatra, current dasha, the 30-day score CURVE, and the three named dates (already the case). Give away ONE complete day at full paid fidelity — all 18 windows with prose, badged 'This is one day of thirty. Nothing here is trimmed.' Lock exactly three named things, each phrased with the user's real data interpolated: `Why {bestDate} is your strongest day — and the 3-hour window inside it`; `What makes {worstDate} heavy, and how to move around it`; `The other 29 days, each explained like the one above`. Render the locked region as a real blurred screenshot of THEIR day-2 content (CSS filter: blur(7px) on server-rendered real prose, not lorem), with a single sharp unblurred first line above the blur so the reader can verify it is genuinely about them. Never blur the numbers — numbers are the free proof; only prose blurs.
- **Replace the on-paywall feature matrix with a 5-item value stack, and demote all comparison tables to /pricing.** — src/lib/pricing.ts FEATURE_MATRIX is 4 groups × ~20 rows. On a mobile paywall this converts the decision from 'do I want this' to 'which of four', which is the documented conversion killer. PLAN_CARDS' bullets are also feature-shaped ('126 scored hourly windows (18/day × 7 days)') rather than outcome-shaped.
  - Spec: <PaywallCard/> value stack, exactly 5 lines, each ✓-prefixed, each starting with a verb or a possessive, max 9 words: `✓ Your question answered, with the exact dates`; `✓ Every day of the next 30, explained in plain English`; `✓ The best 3-hour window inside each day`; `✓ Your year ahead, month by month`; `✓ Best dates straight into your calendar`. Keep FEATURE_MATRIX untouched and rendered only at /pricing. Add one text link under the stack: 'Compare all plans →' (text-dust, text-body-sm).
- **Collapse the paywall to a two-option anchor-and-target, with the third tier as an anchor-only line.** — Four tiers (free/7day/monthly/annual) at the moment of decision is anchoring without a decoy — it produces deferral. The tested structure is: high price first as anchor, exactly one badge, target obviously dominant. Annual currently differs from Monthly only in service level, which makes it a natural anchor rather than a real third choice.
  - Spec: Paywall shows two cards side by side on desktop, stacked on mobile with Monthly FIRST: [Monthly Oracle — badge 'Most chosen', amber border, 30 days, per-day price shown] and [7-Day Forecast — no badge, plain border]. Above both, a single grey line: 'Annual (₹3,999) — same report, 1-year access + priority support. See /pricing.' Exactly one element in the DOM carries btn-primary; the 7-day card's CTA is btn-secondary. Badge copy: use 'Most chosen' not 'Recommended' — it is social proof rather than seller opinion, and it must be literally true or removed.
- **Add amortised price framing inside and beside the CTA, in the user's local currency.** — Per-day framing lifts participation ~15–40%; Duolingo puts the amortised figure and the trial length inside the button. The middleware already resolves currency (currencyFromHeader in src/lib/pricing.ts), so this is a display change with no pricing change.
  - Spec: Monthly card price block, three lines: strikethrough-free anchor `₹1,499` in font-display text-4xl; directly beneath in font-mono text-mono-sm text-dust: `₹50 a day for 30 days`; button label: `Get my 30-day forecast — ₹1,499`. 7-day card: `₹799` / `₹114 a day for 7 days` / button `Get my 7-day forecast — ₹799`. Compute the per-day figure from getPlanAmount() rounded to the nearest whole unit, never hardcoded. Do NOT use a coffee/chai comparison — for a ₹1,499 spiritual purchase it reads as trivialising; the bare per-day number carries the effect without the tonal cost.
- **Build a <TrustBar/> immediately ABOVE the price block, with a goal-matched testimonial.** — Social proof above tiers outperforms below, and goal-matched testimonials outperform generic ones. VedicHour currently has no proof surface at the decision point, and it already reversed the self-asserted aggregateRating (correctly — Google bans self-serving ratings), so the proof must be real and sourced.
  - Spec: <TrustBar/> renders three items in a single row (wraps to stack on mobile): (1) `★★★★☆ 4.8 · 321 readings rated` — ONLY if backed by a real ratings table; if not yet available, substitute a verifiable count: `2,140 charts computed this month` sourced from a real query. (2) One testimonial, selected by the user's focus domain — career testimonial for career questions, marriage for marriage. Format: 30–40 words, first name + city + month, e.g. `"I moved my appraisal conversation to the 14th because of this. It went the way it had never gone before." — Priya, Pune · June`. (3) Method credibility line, font-mono text-mono-sm: `Swiss Ephemeris · Lahiri ayanamsa · computed, not written by hand.` No stock photos, no fabricated faces, no invented ratings.
- **Rewrite the guarantee line as a retention statistic and give it its own bordered row, not a trailing microcopy fragment.** — PreviewValueStrip currently ends with '30% off with NEWUSER30 · 24-hour money-back guarantee' as one grey run-on. Guarantee framing carries the largest single documented lift band (+23% to +41% depending on wording), and a retention statistic outperforms a bare money-back promise because it doubles as social proof. A 24-hour window is also too short to read as confident for a 30-day product.
  - Spec: Its own row directly beneath the CTA, border-t border-horizon/40, pt-4: shield icon + `7-day, no-questions refund. Read the whole thing first — if it doesn't sound like your life, write one line and we return your money.` Second line, font-mono text-mono-sm text-dust: `Fewer than 2 in 100 ask.` — publish that sentence ONLY once the real refund rate is measured and below the stated threshold; until then ship the guarantee sentence alone. Extend the refund window from 24h to 7 days and update FEATURE_MATRIX row '24h no-questions refund' to match — a 24h window on a 30-day forecast is internally incoherent and reads as a trap.
- **Replace promo-code urgency (NEWUSER30) with real astronomical urgency drawn from the user's own chart.** — unlockHref is hardcoded to `?plan=7day&promo=NEWUSER30` in three components (PreviewValueStrip line 40, ExitIntentUpsell line 20, report page lines 1516/1688). A permanent 'new user' discount is a fake deadline — it trains discount-waiting and sits in the CCPA/DSA false-urgency zone. VedicHour uniquely owns a TRUE deadline: the strongest day in the computed curve.
  - Spec: Under the CTA, render from the same teaser data PreviewValueStrip already fetches: `Your strongest day is {bestDate} — {N} days from now.` where N is computed live. If N ≤ 5, add a second line: `The hour-by-hour breakdown takes about 8 minutes to generate.` No countdown timer, no expiring discount, no 'X people viewing'. Keep NEWUSER30 as a genuinely time-boxed first-week-after-signup offer with a real server-side expiry surfaced honestly (`Your welcome offer ends {date}`), or retire the code entirely — do not leave a permanent discount masquerading as an introductory one.
- **Fire a contextual paywall on every locked interaction, inheriting the clicked thing's identity.** — Calm's pattern: tapping a locked item pulls that item's image into the paywall header and rewrites the title. VedicHour has many lockable surfaces (a day cell in the curve, a month in the strip, an Ask-a-question box, an export button) and currently routes them all to one generic /onboard link.
  - Spec: Single <UnlockSheet trigger={...}/> bottom sheet with per-trigger headline: day-cell → `{Aug 14} scores {78}. Here's what's inside that day.`; month → `Your {October} — the month your chart turns.`; ask-question → `Ask anything about your chart. Answered against your real transits.`; export → `Your best dates, in your calendar, in one tap.` Body/price/CTA identical across all triggers — only the headline and the icon change. Emit a `paywall_view` event carrying the trigger name so the highest-intent entry point becomes measurable.
- **Build the calculator → report bridge as a personalised results-page teaser, not a nav link.** — This is the single largest documented leak: 88 of 120 sessions end on free calculator pages, and chatgpt.com sent 214 visitors to lagna-calc. Interactive tools convert 30–50% when they bridge, but only if the bridge is on the RESULTS surface and uses data the user just gave. The user has already entered birth details — the highest-value moment in the funnel is being discarded.
  - Spec: On every calculator results page (lagna-calc and siblings), append a <BridgeStrip/> that reuses the entered birth data with zero re-entry: (1) headline `You're {Scorpio} rising. Here's what that means for your next 30 days.` (2) the same real score curve PreviewValueStrip renders, computed from the deterministic ephemeris — no LLM spend. (3) `See your strongest day →` linking to /onboard with birth details pre-filled via signed query state, landing directly on the preview report. Success criterion to instrument: calculator-page exit rate falls below 60% and calculator→preview-report transitions become a measurable funnel stage in /admin/journeys.
- **Cut onboarding to the minimum and make the question field the hook, not an optional field.** — 62% skip the question field, which is what powers the entire PersonalizedAnswer conversion spine — when it's empty the spine collapses. Separately, forced account creation causes ~26% of Indian mobile-checkout dropoffs, so any account wall before value must go.
  - Spec: Make the question the FIRST screen, not a field on a form, framed as a choice not a blank: four large tappable cards — `When will my career move?` / `When is money coming?` / `When will I marry?` / `Something else` (opens free text). Selecting a card sets the focus domain AND seeds question_echo, so the spine always has content even for non-typers. Collect email only AFTER the preview renders (gate the PDF/save, not the reading). No password — magic link or OTP only.
- **Rebuild the paywall surface visually to CRED-grade restraint: kill monospace and density at the decision point.** — Direct response to 'looks like a coding interface'. Across the components I read, font-mono carries eyebrows, scores, labels, prices, and microcopy — JetBrains Mono at small sizes over a dark navy grid is literally terminal iconography. Instrumentation aesthetics build credibility for the FREE numbers but destroy the premium-counsel feeling at the moment of payment.
  - Spec: Typographic rule by zone — FREE/proof zones (score curve, window tables, panchang) keep font-mono: there it means 'computed'. PAID-decision zones (paywall card, testimonial, guarantee, CTA, price) use font-display Cormorant for headline and price, font-body DM Sans for everything else; font-mono permitted ONLY on the method-credibility line. Spacing: paywall card min padding p-8 sm:p-10, max-width 32rem, no more than 7 direct children. Reduce simultaneous accent colours in the paywall to amber + one neutral — drop success-green and caution-red from the paywall card entirely (they belong to the data zones). Replace the current amber gradient + blur-blob treatment (PreviewValueStrip lines 89–91) at the paywall with a flat bg-cosmos, border border-amber/40, and a single hairline amber rule above the price.
- **Instrument the paywall as a funnel, not as a page.** — Memory records exactly ONE checkout intent ever, so today the team cannot distinguish 'paywall never seen' from 'paywall seen and rejected' — those need opposite fixes. Contextual-paywall optimisation is impossible without per-trigger data.
  - Spec: Emit five first-party events into the existing /admin/journeys click-tracking: `preview_rendered` {reportId, hasQuestion, focusDomain}; `paywall_view` {trigger, planShown, currency}; `paywall_cta_click` {trigger, plan}; `checkout_open` {plan, provider}; `checkout_success|checkout_fail` {plan, failureReason}. Add a funnel view to /admin showing calculator→onboard→preview→paywall_view→cta→checkout→paid with per-step drop. Success criterion: preview→paywall_view exceeds 80% (if not, the paywall is below the fold) and paywall_view→cta_click exceeds 8% (if not, the offer is wrong, not the placement).
- **Harden checkout for Indian mobile: guest OTP, UPI intent, all-in amount adjacent to the button, payment marks.** — In India the loss at this step is mechanical. Forced accounts (~26% of dropoffs), unoptimised mobile (up to 40% higher abandonment), UPI collect-flow timeouts, and late-revealed totals are the named causes. VedicHour uses Ziina, so UPI/INR handling and Indian-familiar payment iconography need explicit verification rather than assumption.
  - Spec: Checkout screen requirements: (1) no account creation before payment — email + OTP only, account materialised post-payment. (2) UPI Intent (app-switch, pre-populated) as the first-listed method for INR, with PhonePe/GPay/Paytm marks rendered; card as second. (3) The exact final amount rendered in the button itself: `Pay ₹1,499` — nothing added afterward, no surprise conversion fee. (4) A persistent one-line order summary above the button: `Monthly Oracle · 30-day hourly forecast · ₹1,499 · 7-day refund`. (5) Explicit failure recovery: on payment failure show `Payment didn't go through — your report is saved. Try another method.` with the methods re-listed inline, never a dead end. (6) VERIFY FIRST whether Ziina actually supports UPI intent for INR; if it does not, that single gap is likely a larger conversion constraint than every design change in this list combined, and should be escalated to the owner as a payment-provider decision.
- **Design the first 60 seconds after payment as an explicit anti-remorse sequence.** — ~74% of online buyers report remorse and up to ~80% post-purchase anxiety; proactive onboarding measurably reduces returns. For a generated report there is also a real wait (bounded to <10 min per the recent work), which is precisely the heightened-vulnerability window the research describes.
  - Spec: Immediately on payment success, before generation completes: (1) restate the purchase in their words — `We're computing the answer to: "{question_echo}"`. (2) an honest progress line with named phases and a real ETA (`Reading your chart → Scoring 540 windows → Writing your days · about 6 minutes left`), never a fake spinner. (3) while waiting, show the ONE free day they already read, so the screen is never empty. (4) on completion, land them on the answer to their question — NOT the top of the document. (5) Send a receipt email within 60s containing: what they bought, the refund policy restated plainly, a direct report link, and one line on what to do first (`Open Aug 14 first — it's your strongest day this month.`). Then re-engage during the Day 7–30 danger zone: email on the morning of each named peak date (`Today is one of your three strongest days. Here are the hours.`) — this is the retention mechanism the 30-day product is currently missing entirely.
- **Add the second-sale ladder: preview → 7-day → monthly, and standalone products → forecast.** — 23andMe's Ancestry→Health upgrade and AstroTalk's chat→full-report ladder both monetise already-computed data a second time. VedicHour already generates the 12-month outlook and weekly synthesis for EVERY paid plan (per the pricing.ts ground-truth comment) and already has an /upsell route and a ziina/upgrade endpoint — the ladder is half-built and unmerchandised.
  - Spec: (1) For 7-day buyers on day 5: `Your week ends Friday. The next 23 days are already computed — extend for ₹700.` (delta price, not full price; must be enforced server-side against double-charging, which the existing monthly-upgrade guard already handles). (2) For Kundali/Synastry standalone buyers: at the end of their reading, `You know who you are. Now see when. →` linking to the forecast preview with their birth data pre-filled. (3) For lapsed monthly readers: `Your 30 days end on {date}. Your next strongest window falls after that.` Each is one email plus one in-product strip — no popups, and each must be truthful about what is genuinely already computed versus what will be generated.

