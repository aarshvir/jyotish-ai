# 🚀 VedicHour Launch Playbook — Zero to Live (FINAL, vetted 3 rounds)

**For a 20-year-old who has never touched Supabase, Vercel, Ziina, Inngest, or Google Ads.** Every step says exactly where to go, what to click, how to know it worked, and what to do if it doesn't. Do the phases **in order**. **Phase 0, Phase 1, and the Phase 1.5 funnel decision determine whether you make any money at all — do not skip them.**

> Note: an earlier draft mentioned a second Kundali migration file (`20260613_kundali_deep_report.sql`). That was for an unbuilt feature and has been **removed** — you only need **`20260613_kundali_standalone.sql`** (File 1). Ignore any "File 2" reference.

---

## 📦 HONEST REALITY (read once, then stop refreshing the sales number)

> - **$5,000 in week 1 is the stretch, not the plan.** At ~$10/sale that's ~500 sales (~70/day), which a brand-new site with no audience and a brand-new ad account **cannot** hit on paid ads alone. **Honest base case: $300–$1,200 week 1.** $1,800–$2,500 needs a video to pop. $5k happens **only** if a video/community post goes viral **AND** you raise average order value with the bundle (Phase 2).
> - **The ONE most important thing:** before spending a single rupee or recording a single video, **fix the funnel-vs-product mismatch (Phase 1.5).** Your viral plan points strangers at a "free Gun Milan tool" that **does not exist as free** in the code — `/synastry` and `/kundali` are login+payment walls that show a raw error to everyone else. Pointing ads/videos at that = burning money on an error screen. Decide the funnel first.
> - Four things live ONLY in your dashboards (the code was read; these can't be): is the Ziina key **LIVE**? Is `OPENAI_API_KEY` funded? Is `INNGEST_EVENT_KEY` set? Are the migrations applied in your **live** Supabase? Phases 0 & 1 make you prove each by hand.

---

## ☑️ PHASE 0 BLOCKERS — must be TRUE before you accept one real payment

> - [ ] **0.0** — Identified the **LIVE** Supabase project (ref matches `NEXT_PUBLIC_SUPABASE_URL` in Vercel)
> - [ ] **0.1** — `20260613_kundali_standalone.sql` applied to the **live** project (Kundali buyer otherwise pays + gets locked out — **#1 blocker**)
> - [ ] **0.2** — `user_synastry_unlock` table confirmed present (Matchmaking otherwise = guaranteed refund)
> - [ ] **0.3a** — `ZIINA_API_TOKEN` in Vercel is the **LIVE** key, Production scope, **redeployed** (else $0 collected)
> - [ ] **0.3b** — `INNGEST_EVENT_KEY` present in Production **OR** Forecast held back (else Forecast buyer pays, report never generates — **co-#1 blocker**)
> - [ ] **0.4** — One real Forecast checked: domain scores vary, NOT the `48/52/58/70/73/65` fallback run
> - [ ] **0.7** — Railway ephemeris service confirmed **awake** (else every product fails at chart calculation)
> - [ ] **1.5** — Funnel decision made in incognito: free teaser, or redirect all traffic to the real free Kundli?

---

# PHASE 0 — TONIGHT, BEFORE YOU SLEEP (technical go-live)

**Total ~100–120 min.** If you do nothing else tonight, do **0.0, 0.1, 0.3a, 0.3b, 0.7**.

> **FOUR separate ways your money silently disappears:**
> 1. Kundali buyer charged but locked out → missing migration (0.1).
> 2. Forecast buyer charged but NO report generates → missing `INNGEST_EVENT_KEY` (0.3b).
> 3. No real money collected at all → test Ziina key (0.3a).
> 4. Every product fails at "calculating your chart" → Railway ephemeris asleep (0.7).

## Step 0.0 — Find WHICH Supabase project is your live one (do this FIRST) 🔴
**Why:** Run migrations on the **wrong** Supabase project and they "succeed" but change nothing live — you'd tick the box while every Kundali buyer is locked out.
1. **vercel.com** → log in → project **jyotish-ai** → **Settings** → **Environment Variables** (left).
2. Find **`NEXT_PUBLIC_SUPABASE_URL`** → click the **eye icon** → it reads `https://`**`abcd1234efgh`**`.supabase.co`. Copy the bold part (the **project ref**). Write it down.
3. **supabase.com** → log in → click a project → **Project Settings** (gear, bottom-left) → **General** → read **Reference ID**.
4. The project whose Reference ID **matches** is your LIVE DB. Bookmark it.
**(c)** ~6 min. **✅ Done when:** one project's ref matches `NEXT_PUBLIC_SUPABASE_URL`. Every Supabase step happens in THIS project only. **⚠ If none match:** stop — you're logged into the wrong Supabase. Don't run migrations anywhere until it matches.

## Step 0.1 — Apply the Kundali database migration (THE #1 BLOCKER) 🔴
**Why:** Kundali writes to a table `user_kundali_unlock` that doesn't exist yet. In `finalizeIntent.ts` a Kundali purchase marks the payment **`completed` (lines 235–242)** then writes the unlock **(244–255)**; if the table's missing the write fails but the payment is already completed, so a retry won't self-heal. Buyer pays, told to pay again.
1. Live Supabase project → **SQL Editor** (left) → green **+ New query**.
2. On your PC open **`C:\Users\aarsh\Downloads\jyotish-ai\supabase\migrations\20260613_kundali_standalone.sql`** with **Notepad** (right-click → Open with → Notepad — don't double-click). **Ctrl+A**, **Ctrl+C**.
3. Click the SQL box → **Ctrl+V** → green **Run** (or Ctrl+Enter).
**(c)** ~8 min. **✅ Done when:** green **"Success. No rows returned."** ("No rows returned" is CORRECT for table creation — don't panic.) **⚠ If "already exists":** good, it's already there, move on. Any other red error → **don't sell Kundali tomorrow**, screenshot it, launch Forecast + Matchmaking, fix Kundali after.

## Step 0.2 — Confirm the Matchmaking table is already applied
**Why:** Matchmaking has the identical charge-before-unlock pattern against `user_synastry_unlock`. Missing table = every match sale is a refund.
1. Same project → **Table Editor** (grid icon) → scan for **`user_synastry_unlock`**.
**(c)** ~4 min. **✅ Done when:** you see it. **⚠ If missing:** run via SQL Editor in order: `20260420_pillar4_revenue_synastry.sql` then `20260422_synastry_unlock_ziina_user.sql`; then **click the refresh icon** at the top of Table Editor (it doesn't auto-update).

## Step 0.3a — Confirm Ziina is collecting REAL money 💰
**Why:** The code reads exactly one setting — `ZIINA_API_TOKEN` (`server.ts` 123–127), no hidden "test mode." Live-vs-test is entirely whether that token is live.
- **Get LIVE token:** **app.ziina.com** → **Settings → API Keys** (may be **Developers → API Keys**; search "API" if not obvious). Turn OFF any "Test mode," copy the **LIVE** key.
- **Check Vercel before overwriting:** Vercel → jyotish-ai → Settings → Environment Variables → **`ZIINA_API_TOKEN`** → eye icon → if it already matches the live key, do nothing. If different/test/empty → **… → Edit** (or Add New, name it exactly `ZIINA_API_TOKEN`) → paste live token → check **Production** → Save.
- **Redeploy:** **Deployments** tab → newest → **… → Redeploy** → keep "Use existing Build Cache" → **Redeploy**.
**(c)** ~12 min. **✅ Done when:** redeploy shows **Ready** and the token is Production-scoped. The only 100% proof is the Phase 1 real-card buy charging you. **⚠ Unsure which key is live:** let the Phase 1 buy decide.

## Step 0.3b — Confirm `INNGEST_EVENT_KEY` exists (SILENT FORECAST-KILLER) 🔴
**What Inngest is:** a background-job service; your paid Forecast is generated in the background by it after payment. No key = the job never starts.
**Why co-#1:** `finalizeIntent.ts` 133–136: on a first-time `7day`/`monthly`/`annual` purchase the code marks the buyer paid, then `if (!process.env.INNGEST_EVENT_KEY?.trim()) { warn; return; }` — **silently returns, no inline fallback on this path** (the `monthly_upgrade` path has a fallback; first-purchase doesn't). Buyer pays, report never generates.
1. Vercel → Environment Variables → confirm **`INNGEST_EVENT_KEY`** has a value, scoped **Production**.
**(c)** ~4 min. **✅ Done when:** present in Production. **⚠ If missing and you don't have/know Inngest:** you probably can't fix it tonight — **hold the Forecast back, launch only Kundali + Matchmaking** (neither uses Inngest, both unlock instantly). Do NOT sell or advertise the Forecast until this key exists.

## Step 0.4 — Verify Forecast report quality (catch the "generic template" failure) 🎯
**Why:** Monthly text is written by AI (`gpt-5.5`, override `REPORT_MONTHLY_MODEL`). If `OPENAI_API_KEY` is missing/unfunded or the model is unreachable, it silently falls back to template text (HTTP 206).
**Note:** the only way to generate one is the Phase 1C paid 7-day buy. Do this check as part of 1C.
- Confirm `OPENAI_API_KEY` exists in Vercel (Production).
- In the generated report, ANY of these = AI did NOT run: **(a)** the 4 domain scores are **identical** within a month; **(b)** the six monthly overalls are exactly **48, 52, 58, 70, 73, 65**; **(c)** robot themes like literally **"A strong month (73/100)"**; **(d)** months with **no named transits**.
**✅ Done when:** scores vary, run is NOT 48/52/58/70/73/65, themes natural, transits present. **⚠ If fallback:** check `OPENAI_API_KEY` present + has billing; if `gpt-5.5` is the issue set `REPORT_MONTHLY_MODEL` to a known-good model + redeploy. Until fixed, don't run paid ads to the Forecast.

## Step 0.5 — Spot-check currency + prices (don't false-alarm)
Currency auto-detects (`server.ts` 59–65: AE→AED, IN→INR, else USD). **Prices are intentionally not clean conversions — do not "fix" them.**

| Product | USD | INR | AED |
|---|---|---|---|
| Forecast 7-day | $9.99 | ₹799 | **AED 37.99** |
| Forecast Monthly | $19.99 | ₹1,499 | AED 69.99 |
| Forecast Annual | $49.99 | ₹3,999 | AED 184.99 |
| Kundali | $9.99 | ₹899 | AED 36.99 |
| Matchmaking | $9.99 | ₹899 | AED 36.99 |

> 7-day is **AED 37.99** (`amountAED: 3799`), not 36.99 — that it differs from Kundali's 36.99 is **correct, not a bug**.

Open **vedichour.com** → prices show in your currency. **✅ Done when:** real symbol, no loading dashes. **⚠ Only ever USD from India:** not a blocker (USD still pays), fix later.

## Step 0.6 — Analytics
Vercel → jyotish-ai → **Analytics** tab → **Enable** if shown. ~3 min. Non-blocking.

## Step 0.7 — Confirm the Railway ephemeris service is AWAKE 🟠
**Why:** `synastry/compute` + `kundali/compute` call Railway ephemeris (502 if down). Free tiers sleep when idle; if cold, **every** product fails at chart calc.
1. Open **vedichour.com/kundali** (or `/synastry`) and go far enough to trigger a chart calculation (first load may be a slow cold-start; a second try should be fast). Or check **railway.app** → ephemeris service is **Active/Running**.
**✅ Done when:** a chart page proceeds past "calculating" on a second attempt. **⚠ Repeated 502s:** Railway down/out of credits — don't launch anything until it answers; restart/redeploy it in Railway.

**🛌 End of Phase 0.** With 0.0, 0.1, 0.3a, 0.3b, 0.4, 0.7 done, the site can take money *and* deliver. Sleep.

---

# PHASE 1 — PROVE THE MONEY WORKS (test-buy all 3, morning, ~40–50 min)
Buy each with your **own real card** in **incognito as a brand-new signed-up user**, confirm you get the product, refund yourself.
> - You **cannot** trigger test mode on the live site — expect real charges.
> - You'll likely eat a small non-refundable **FX loss** (Ziina settles AED; the spread often doesn't reverse). Use the cheapest option (7-day) for the Forecast.
> - Refunds take **5–10 business days**.

> 🔴 **Test the WHOLE flow LOGGED-OUT in incognito (Chrome Ctrl+Shift+N).** `create-intent` returns **401 for logged-out users** (`create-intent` 23–24) and the forms show it as a **bare "Unauthorized" with no login link** — if you only test while logged in, you'll miss that every cold stranger hits a dead end before they can pay.

- **1A Matchmaking** `/synastry`: incognito → sign up → pay → enter two births. **✅** 36-point score + 8-part breakdown appears, payment shows in Ziina. **⚠ bare "Unauthorized":** the #2 funnel killer (Phase 1.5).
- **1B Kundali** `/kundali`: incognito → sign up → pay → enter one birth. **✅** plain-English reading + life-chapters timeline, not asked to pay again. **⚠ locked out:** Step 0.1 didn't apply to the live project — recheck 0.0, re-run File 1 (+ Phase 8 manual-unlock if charged).
- **1C Forecast** (homepage free-Kundli/onboarding → 7-day plan): pay, let it generate. **✅** report appears AND passes the 0.4 quality check. **⚠ stays "paid" but never generates:** `INNGEST_EVENT_KEY` (0.3b) — hold Forecast back.
- **1D Refund yourself:** app.ziina.com → Payments → open each → **Refund**. **✅** all three show Refunded.

---

# PHASE 1.5 — THE FUNNEL DECISION 🔴 (before ANY ad/video/post — it rewrites all your copy)
Your viral plan points strangers at a "free Gun Milan / Kundli tool." **In code that free tool does not exist:** `/synastry` + `/kundali` compute require **login AND a paid unlock** (401 logged-out / 402 unpaid), and the forms render that as a **raw red error** — no sign-in prompt, no teaser, no partial score. A stranger from a video sees an **error**, not a score.

The genuinely-free path that DOES exist: the homepage **Free Kundli** (`/onboard?plan=free`). But that's the forecast/Kundli path, not Gun Milan.

**Pick ONE before spending a rupee:**
- **OPTION A (best, small build):** make `/synastry` show the **Ashtakoot total (out of 36) free** as a teaser, gate only the 8-fold breakdown + commentary behind pay. This is what makes "comment your score" videos work.
  > Engineer brief: "On `/synastry`, return the Ashtakoot **total only** for logged-out/unpaid users as a free teaser; gate the breakdown + commentary behind login+pay. Today compute returns 401/402 and `SynastryForm.tsx` shows a raw error. Add: (1) a public teaser response with just the total; (2) form renders teaser + 'Unlock full breakdown' CTA instead of an error; (3) paid path unchanged."
- **OPTION B (zero build, tonight):** scrap the "free Gun Milan tool" messaging; point ALL ads/videos/posts at the genuinely-free **homepage Free Kundli**. Honest, nothing errors.

**Also fix the logged-out dead-end (both options):**
> Engineer brief: "When `create-intent` or compute returns 401, redirect the form to login/sign-up with a return URL — not a bare 'Unauthorized'. Verified: `create-intent` 23–24 + `requireAuth.ts:91`. Cold traffic can't convert until this redirects."

**✅ Done when:** on paper: "Traffic goes to ___ , 'free' is honest because ___." **⚠ If you point 'free' ads at the error wall:** Google disapproves them (₹0 spent) or they convert ~0%. Don't.

> For Phases 4–6: wherever copy says "free tool"/`/synastry`, substitute your Phase 1.5 destination.

---

# PHASE 2 — THE OFFER (⚠ NOT a tonight task; day-2 priority; the only realistic path to $5k)
**2.1 — Bundle = hardcoded price, NOT a coupon.** "LAUNCH40" does **nothing**: `create-intent` 55, 60–63 skip promos for standalone products (`isStandaloneUnlock`), and promos need a `promo_codes` row. **Hardcode a "Complete Reading" bundle** (Kundali + Matchmaking + Monthly Forecast) at **$29 / ₹2,499 / ~AED 106.99**, with struck-through "$39 / ₹2,999" and "Launch price — ends Sunday 11:59pm." Monday, raise it.
> Engineer brief: "Add a `bundle` entry to `ZIINA_PLANS` (hardcoded launch price, `.99` AED rounding); add a branch in the standalone-unlock block of `finalizeIntent.ts` (~230–257) that for `planType==='bundle'` upserts user into `user_kundali_unlock` + `user_synastry_unlock` + grants a Monthly Forecast; add the bundle page UI. Do NOT use a promo code — promos are skipped for standalone products."

**2.2 — Trust elements on every product page:** 24-hour money-back guarantee (prominent), a free/redacted sample report, a one-line "who made this," 1–3 real testimonials once you have buyers.

# PHASE 2.5 — CAPTURE EMAILS (highest-ROI build after the bundle; brief tonight, ship week 1)
~70 visitors/day × ~2% conversion = ~98% leave forever. Add "enter your email to save your score / get your full reading" → a list → a 2-email follow-up ("you scored 26/36 — here's what the missing points mean" + deadline nudge).

---

# PHASE 3 — LAUNCH DAY RHYTHM (IST) — success = 3 videos + 5 communities + every comment answered (sales lag)
| Time IST | Do |
|---|---|
| 7:00–7:30am | Post **Video #1** to YT Shorts + IG Reels + TikTok |
| 7:30–8:30am | First WhatsApp/FB group message; glance at Ads (expect no clicks) |
| 9:00am | Check-in (Phase 7) |
| 9:30am–12pm | Reply to **every** comment |
| 12:00–1:00pm | **Video #2** (new hook); seed 1–2 more communities |
| 1:00–5:00pm | Monitor, reply, apply ad rules only if ads serving |
| 8:00–9:00pm | **Video #3** — best India window; strongest hook |
| 9:00pm | Evening check-in |

---

# PHASE 4 — GOOGLE ADS, CLICK BY CLICK (set up the NIGHT BEFORE; review runs overnight; expect zero Day-1 clicks)
> 🔴 Do NOT start until Phase 1.5 is decided. Send ads to your Phase 1.5 destination only. Budget cap ₹800–1,200/day. ~45–60 min.

1. **ads.google.com** → Start now → if pushed to "Smart mode," click **"Switch to Expert Mode" → "Create a campaign without a goal's guidance."**
2. Type: **Search** only. **Networks:** uncheck Display + Search partners. **Location:** India only. **Language:** English + Hindi. **Budget:** ₹1,000/day. **Bidding:** "Maximize clicks" → expand advanced → **"Set a maximum CPC bid limit"** = **₹40**.
3. Ad group **Kundli Matching**, phrase match: `"kundli matching online"`, `"gun milan calculator"`, `"kundli milan by name"`, `"ashtakoot gun milan"`, `"marriage compatibility kundli"`, `"kundli matching free"`.
4. **Final URL** = your Phase 1.5 destination **with UTMs**, e.g. `https://vedichour.com/synastry?utm_source=google&utm_campaign=kundli`.
5. **Ad copy:** H1 `Free Kundli Matching Online` · H2 `Get Your Gun Milan Score` · H3 `36-Point Ashtakoot Match` · D1 `Check marriage compatibility instantly. Free 36-point Gun Milan score with full 8-fold breakdown.` · D2 `Accurate Vedic Kundli matching by birth details. Try it free in 60 seconds.`
6. **Negatives:** `software`, `app download`, `job`. **Publish.**
**⚠ Disapproved ad spends ₹0** — check the **Status** column before blaming budget; usual cause is "free" → paywall (Phase 1.5).

---

# PHASE 5 — THE 30-SECOND VIDEO (highest-leverage free channel; ~30–45 min first, ~15 after)
Record whatever a logged-out visitor actually sees (your Phase 1.5 answer). Never claim "100% free" over a login wall.
1. **Record:** phone screen recorder or OBS → go to your Phase 1.5 destination, type details slowly, reveal the score/result (~30–45s raw).
2. **Edit in CapCut (free):** trim under 30s (reveal by ~20s), **auto-captions** (most watch muted), bold hook text first 3s, voiceover via CapCut TTS or ElevenLabs free.
3. **Script (Option A — free Gun Milan total):** *"Most couples score below 18 out of 36 — and they have no idea. Let me check a real one. I'll enter both birth details… and here's their Gun Milan score. [reveal] Twenty-six out of thirty-six. That's the 8-part Ashtakoot breakdown — mind, health, even future children. Want to check yours? It's free. Comment your score below."*
   **Script (Option B — free Kundli):** *"Most people have never seen their real Vedic birth chart explained in plain English. Let me pull up a real one… [reveal] your life chapters, decade by decade. This part's completely free. Want yours? Link's right here. Comment which decade hits hardest."*
4. **Post** same video to YouTube Shorts + IG Reels + TikTok, **1–3/day**. Caption + hashtags: `Check your marriage compatibility free 👇 #vedicastrology #kundli #gunmilan #jyotish #kundlimatching #marriagecompatibility`. Best India times: 7–9am & 8–10pm IST. **End every video with "comment your score."**

---

# PHASE 6 — COMMUNITY SEEDING (~30 min/day; be helpful, not spammy)
Rules: read each group's rules; **lead with a screenshot of a real result, not a link**; one post per group, never twice/day; reply like a person.
Where: WhatsApp (astrology/Kundli/matrimony), Facebook (search "Kundli matching", "Vedic astrology", "Marriage compatibility"), Reddit (r/astrology, r/hinduism, r/india — only where self-promo allowed).

**WhatsApp #1 (attach score screenshot):** *Found a free Gun Milan / Kundli matching tool that gives the full 36-point Ashtakoot breakdown (not just a number). Tried it for fun — got 26/36 😅. Sharing in case it's useful: vedichour.com*
**WhatsApp #2 (matrimony/parents):** *For anyone doing Kundli matching for a rishta — this free tool gives the full 8-fold Ashtakoot breakdown, not just a total. Did one for my cousin's match, 24/36. Might save a trip to the astrologer: vedichour.com*
**WhatsApp #3 (friends):** *Okay this is weirdly addictive 😅 — free Kundli matching with your Gun Milan score out of 36 and the full breakdown. What's yours? vedichour.com*
**Reddit:** *Title: Made a free Kundli matching tool that shows the full 8-fold Ashtakoot breakdown (not just a number). Body: built it as a free resource, not selling anything here — curious what scores people get and whether the breakdown matches their experience. [link]*
**Instagram caption:** *She said "we're perfect for each other" 😏 so I checked their Gun Milan. 👀 Most couples have NO idea they score below 18/36. Free 36-point Ashtakoot breakdown — mind, health, even future kids. 👉 Check yours free (link in bio). Comment your score 👇 #vedicastrology #kundli #gunmilan #jyotish #kundlimatching*
> Option B: swap "free Gun Milan tool" → "free Vedic birth-chart reading" and link the free Kundli everywhere.

---

# PHASE 7 — WATCH THE NUMBERS (9am + 9pm)
| Metric | Where | Notes |
|---|---|---|
| Sales / Revenue today | Ziina → Payments | the truth |
| Ad spend / clicks | Google Ads | ₹0 Day-1 is fine |
| Cost per sale | spend ÷ sales | needs UTMs to be real |
| Video views / comments | YT+IG+TikTok | reply to ALL |
| Refunds / complaints | Ziina + DMs | **2+ broken-report reports = STOP** |
> **Attribution:** Vercel Analytics + Ziina can't tie a sale to an ad click — set **UTMs on ad URLs BEFORE turning ads on**, or add a Google Ads conversion tag on the success page, or you burn ₹1,000/day with no kill signal.

**Rules:** Kill a keyword that spent **>₹400 with 0 clicks/sales**. Scale (+50%) a keyword selling under ~$10/₹800 cost-per-sale. Cost-per-sale >$10 → pause, lean on free video+community. **🔴 Chargeback circuit-breaker: 2+ buyers report a broken/generic report → PAUSE all ads + stop posting links immediately** (chargebacks can freeze Ziina). Fix the report (0.3b / 0.4 / 0.7) then resume.

---

# PHASE 8 — IF SOMETHING BREAKS
| Symptom | Cause | Fix |
|---|---|---|
| Migrations "succeeded" but still broken | wrong Supabase project | redo 0.0, run File 1 in correct project |
| Kundali buyer locked out | `user_kundali_unlock` missing | run File 1; manual-unlock below if charged |
| Matchmaking buyer locked out | `user_synastry_unlock` missing | run synastry files, refresh Table Editor |
| **Forecast paid, never generates** | **`INNGEST_EVENT_KEY` missing** | add key + redeploy, or hold Forecast |
| Every product fails "calculating" | Railway asleep/down | wake/restart Railway |
| No real money arriving | test/wrong `ZIINA_API_TOKEN` | 0.3a + redeploy |
| Cold visitors see "Unauthorized" | logged-out 401 not routed | Phase 1.5 login-redirect brief |
| Ads convert ~0% | traffic at login/error wall | Phase 1.5 |
| Scores identical / are 48,52,58,70,73,65 | OpenAI key/gpt-5.5 | fix key or set `REPORT_MONTHLY_MODEL`, redeploy |
| "LAUNCH40" does nothing | promos skipped on standalone | hardcoded bundle price (2.1) |

### 🟠 Manual-unlock (if charged BEFORE/AROUND the migration)
Payment flips to `completed` (235–242) **before** the unlock upsert, and a later verify short-circuits at **line 223** — so a pre-migration buyer **stays locked out even after you apply the migration**. Recover by hand:
1. Find their `user_id` in Supabase **Authentication → Users**.
2. SQL Editor: `insert into user_kundali_unlock (user_id) values ('THE-UUID') on conflict do nothing;` (use `user_synastry_unlock` for a match buyer). Tell them to reload.

### 🟠 Mobile redirect-abandon (no webhook)
Unlock fires only on the browser redirect to `GET /api/ziina/verify` — **no confirmed server-to-server webhook**. A buyer who **closes the tab on Ziina's page after paying** (common on mobile = your video/WhatsApp traffic) **never unlocks**. Watch Ziina for "completed payment, no unlock" and reconcile with the manual snippet. (Have a dev add a Ziina webhook in week 1.)

### 🚨 ROLLBACK
**A) FASTEST, NON-TECHNICAL (use this 99% of the time):** vercel.com → jyotish-ai → **Deployments** → a pre-launch deployment marked **Ready** → **… → Promote to Production.** Instant, no rebuild. **Your panic button.**
**B) Full code rollback — DEVELOPER ONLY** (contains `git push --force`, don't run yourself): tags `rollback/pre-launch-build` (last known-good), `rollback/step-54/55/56`. With a dev: `git fetch origin; git reset --hard rollback/pre-launch-build; git push --force origin main`.

---

## ✅ NIGHT-BEFORE CHECKLIST
- [ ] 0.0 LIVE Supabase identified · [ ] 0.1 File 1 applied "Success" · [ ] 0.2 `user_synastry_unlock` present · [ ] 0.3a `ZIINA_API_TOKEN` LIVE + redeployed · [ ] 0.3b `INNGEST_EVENT_KEY` present OR Forecast held back · [ ] 0.4 Forecast quality OK · [ ] 0.5 prices OK (7-day AED 37.99) · [ ] 0.6 Analytics on · [ ] 0.7 Railway awake · [ ] 1.5 funnel decided + login-redirect briefed · [ ] Phase 1 all 3 bought incognito + refunded · [ ] Engineer briefed: hardcoded bundle + email capture + login-redirect + free teaser · [ ] Ads set up tonight (UTMs, Phase 1.5 destination) · [ ] Video #1 recorded · [ ] 3–5 communities lined up

**The thing most likely to make tomorrow work isn't the ads — it's (1) pointing traffic at something actually free and working (Phase 1.5), (2) how many videos you post, (3) how fast you reply to comments, (4) starting to capture emails. The places you could do real damage tonight: 0.0, 0.3a, 0.3b, 0.7, and 1.5. Get those right; the rest is posting and replying.**
