# VedicHour — Finish the launch (instructions for Claude Code)

Paste this whole file to Claude Code, running inside the repo
`C:\Users\aarsh\Downloads\jyotish-ai`. Execute the phases **in order**. Stop and tell me if any phase fails its check — do not continue past a failed build or failed migration.

---

## Context (what is already done — do NOT rebuild)

A previous session added **three launch products** to this Next.js 14 app. Two were already live-quality; one (Deep Kundali) was newly built this session. **All the code is already written and sitting in the working tree, uncommitted.** Your job is to verify it, ship it, and make it live on `www.vedichour.com`. The work is **additive and isolated** — do not modify the existing forecast/report pipeline (`src/lib/reports/*`, `src/lib/inngest/*`).

The three products:
1. **R/R Forecast** (7-day / Monthly / Annual) — already live, untouched.
2. **Matchmaking / Synastry** (Ashtakoot 36-point) — repriced to $9.99 / ₹899, relabelled, in the nav.
3. **Deep Kundali** ($9.99 / ₹899) — new: deterministic engine (D9/D7/D10 divisional charts, Manglik / Kaal Sarpa / Sade Sati doshas, 5-year dasha timeline) + scripture-grounded commentary across life, career & money, relationships, marriage & intimacy, health, children, family.

**Files changed/created this session (review these, fix only if they break the build):**
- `src/lib/kundli/varga.ts`, `doshas.ts`, `deepKundli.ts`, `kundliCommentary.ts`, `kundli.test.ts` *(new engine)*
- `src/app/api/kundali/compute/route.ts` *(rewired to the deep engine)*
- `src/app/kundali/[id]/page.tsx`, `src/app/kundali/[id]/KundaliResultDisplay.tsx` *(deep report UI)*
- `src/app/kundali/page.tsx`, `src/app/kundali/KundaliForm.tsx` *(deep-report copy)*
- `src/app/synastry/SynastryForm.tsx` *(You / Your partner labels)*
- `src/lib/ziina/server.ts` *(kundali plan + synastry reprice — verify both are $9.99 / ₹899)*
- `supabase/migrations/20260613_kundali_deep_report.sql` *(new deep columns)*
- `vercel.json` *(scheduled the payment-recovery cron)*

---

## Phase 0 — Safety net (so I can roll back)

1. Make sure the working tree is at a clean known point, then create a restore tag at the current `HEAD`:
   ```
   git config core.autocrlf true
   git tag -f prelaunch-backup-YYYYMMDD   # use today's date
   ```
2. Confirm the tag exists: `git tag --list "prelaunch-backup-*"`.

**Check:** the tag prints. If `.git/index.lock` blocks you, delete it first (`del .git\index.lock`).

---

## Phase 1 — Build & verify (THE GATE — do not skip)

```
npm install
npm run typecheck
npm run test          # vitest — includes the 17 kundli engine tests
npm run build
```

- If **any** step fails, **fix the errors** (they will be in the files listed above) and re-run until all four are green. Common things to check: imports from `@/lib/kundli/*` resolve, the `KundaliSections` type matches in `src/app/api/kundali/compute/route.ts`, and `next build` has no type errors.
- Do **not** commit or deploy until `npm run build` succeeds.

**Check:** `npm run build` exits 0.

---

## Phase 2 — Database migrations (production Supabase)

Apply these two SQL files to the **production** database (they are additive and safe to re-run):
- `supabase/migrations/20260613_kundali_standalone.sql`
- `supabase/migrations/20260613_kundali_deep_report.sql`

Use whichever is set up for this project:
- If the Supabase CLI is linked: `supabase db push`
- Otherwise: open each file, copy the SQL, and run it in the Supabase dashboard → SQL Editor.

**Check:** tables `user_kundali_unlock` and `kundali_charts` exist, and `kundali_charts` has the columns `overview, vargas, doshas, life_areas, year_outlook, engine_version`.

---

## Phase 3 — Environment & cost controls (prevents a runaway LLM bill)

In the **Vercel** project settings → Environment Variables, confirm these are set for Production:
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (rate limiting — without these, free reports are uncapped)
- `CRON_SECRET` (the payment-recovery cron returns 401 without it)
- `ZIINA_API_TOKEN`, `ANTHROPIC_API_KEY`, `EPHEMERIS_SERVICE_URL`, Supabase keys (should already be set)

Then **tell me** to set monthly spend caps in the Anthropic, OpenAI and Google AI consoles — that's a manual step only I can do.

**Check:** list which of the above are present vs missing, and flag anything missing before deploying.

---

## Phase 4 — Accuracy QA (the "no 1% mismatch" sign-off)

The astronomy is deterministic, so verifying a few charts certifies all of them.
1. Confirm the ephemeris service is reachable: `curl $EPHEMERIS_SERVICE_URL/health` (or open it).
2. Run the engine tests if not already: `npx vitest run src/lib/kundli`.
3. Generate the Kundali for **2–3 birth charts I trust** (ask me for one birth date/time/place, or use mine). Print the computed `lagna`, Moon `nakshatra`, `current_dasha`, and the Manglik / Sade Sati flags.
4. **Tell me the values** so I can compare them to a reference (AstroSage / Jagannatha Hora). We only proceed to charging once these match.

**Check:** the printed facts match a trusted reference for each test chart.

---

## Phase 5 — Commit & push to GitHub

Stage **only** the launch surface (avoids committing unrelated line-ending churn):
```
git add src/lib/kundli/ src/app/kundali/ src/app/api/kundali/ \
        src/app/synastry/ src/lib/synastry/ src/app/api/synastry/ \
        src/lib/ziina/server.ts src/app/api/ziina/ \
        supabase/migrations/ vercel.json src/components/shared/Navbar.tsx
git status --short        # show me what's staged
git commit -m "launch: deep Kundali report + matchmaking reprice + payment-recovery cron"
git push origin main
```

**Check:** push succeeds; show me the commit hash.

---

## Phase 6 — Deploy to Vercel

- If Vercel is connected to the GitHub repo, the push already triggered a Production deploy — watch it finish.
- Otherwise run `vercel --prod`.

**Check:** the deployment is "Ready" and `https://www.vedichour.com/api/health` returns `healthy` (not `unhealthy`/`degraded`). If degraded, tell me which checks failed.

---

## Phase 7 — Live smoke test (with real money)

Do these on the live site and report back:
1. `/kundali` → enter a birth detail → free chart facts appear → "Unlock — $9.99" → complete **one real Ziina payment** → the full deep report renders (all sections + 5-year outlook + doshas) → "Download / print PDF" works.
2. `/synastry` → two people → free score → unlock → full breakdown renders.
3. Repeat one Kundali checkout in **INR** and **AED** (switch currency) to confirm pricing shows ₹899 / AED 37.99.

**Check:** all three flows complete and the paid report generates.

---

## Rollback (if anything goes wrong)

- **Live site, instant (no rebuild):** Vercel → Deployments → last good deployment → "…" → **Instant Rollback**.
- **Code:** `git reset --hard prelaunch-backup-YYYYMMDD && git push --force origin main`.

Nothing here is permanent.

---

## Definition of done

✅ `npm run build` green · ✅ migrations applied · ✅ Upstash + CRON_SECRET set · ✅ Kundali facts verified against a reference · ✅ pushed to GitHub · ✅ deployed and `/api/health` healthy · ✅ one real paid Kundali + one paid Matchmaking generated on production.

When all eight are true, the three products are live on vedichour.com.
