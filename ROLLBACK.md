# ROLLBACK GUIDE — VedicHour launch hardening (2026-06-03)

Today's launch-hardening work is split into **20 atomic, individually-revertible commits**, each git-tagged. You can roll back to any point — all the way back to exactly how production was before today.

## Reference points (git tags)

| Tag | What it is |
|---|---|
| `rollback/original-pre-mclean` | `5032954` — before the whole launch redesign (oldest safe point) |
| **`rollback/step-00`** | `1f3c540` — **production exactly as it was BEFORE today's hardening** (undo *everything* I did today) |
| `rollback/step-01` … `rollback/step-20` | today's changes, one logical step each (cumulative) |
| **`rollback/step-20`** | **current live code** (byte-identical to what's deployed now) |
| `backup/single-commit-384947b` | today's work as the original single commit (same tree as step-20) |

> Step N tag = "the platform with steps 1..N applied." `rollback/step-00` = none of today's changes. `rollback/step-20` = all of them (current).

## ⚡ Fastest emergency rollback (no rebuild, ~10 seconds)

If something is wrong and you just need the site good *now*:

1. Vercel dashboard → **jyotish-ai** → **Deployments**.
2. Find the last known-good **Production** deployment (e.g. the one tagged `1f3c540` from before today, or any earlier green one).
3. **⋯ → Promote to Production** (a.k.a. Instant Rollback).

This re-points `vedichour.com` to that build immediately — no git, no rebuild. Use this first in an emergency, then sort out git when calm.

## Roll back in code (makes it permanent + redeploys)

All commands assume you're in the repo on branch `main`:

```bash
git fetch origin && git checkout main
```

**Undo EVERYTHING from today (back to step 0 / pre-hardening):**
```bash
git reset --hard rollback/step-00
git push --force origin main          # Vercel redeploys the pre-today state
```

**Roll back to a specific step N (keeps steps 1..N, drops the rest):**
```bash
git reset --hard rollback/step-07     # example: keep steps 1-7 only
git push --force origin main
```

**Roll back ONE step at a time (progressive, step 20 → 0):**
```bash
git reset --hard rollback/step-19     # drops step 20 only
git push --force origin main
# ...later, drop step 19 too:
git reset --hard rollback/step-18
git push --force origin main
# ...and so on down to rollback/step-00
```

**Get back to the full current state (redo all of today):**
```bash
git reset --hard rollback/step-20
git push --force origin main
```

After any `git push --force origin main`, Vercel auto-builds and deploys that exact state. The previous good deployment keeps serving until the new build is verified READY, so a failed build never takes the site down.

## The 20 steps (what each one changes)

| Step | Tag | Change | Files |
|---|---|---|---|
| 0 | `step-00` | **Baseline** — production before today | — |
| 1 | `step-01` | Remove fabricated Hero trust stats (12,000+, ★4.8/340+) | `Hero.tsx` |
| 2 | `step-02` | Remove fake counts/reviews/press band | `SocialProof.tsx` |
| 3 | `step-03` | Reframe testimonials as illustrative (no fake reviews) | `Testimonials.tsx` |
| 4 | `step-04` | Surface real promo `NEWUSER30` in banner; bigger close target | `LaunchBanner.tsx` |
| 5 | `step-05` | Fix "365-day"/"instant" overclaims + typo | `FreeKundli.tsx` |
| 6 | `step-06` | "instant"→"in minutes"; drop 365-day | `FinalCTA.tsx` |
| 7 | `step-07` | Honest geocode + timing copy | `HowItWorks.tsx` |
| 8 | `step-08` | Fix fabricated scripture citation + "90 seconds" | `SampleReportPreview.tsx` |
| 9 | `step-09` | Truthful Annual; "Recommended" on Monthly; AED format | `Pricing.tsx` |
| 10 | `step-10` | Truthful comparison-table rows + Annual sub-label | `PricingComparison.tsx` |
| 11 | `step-11` | Truthful Annual; remove fake "$0.14/day" & "60% chose"; Recommended | `pricing/page.tsx` |
| 12 | `step-12` | Drop "365/any date"; correct AI-provider disclosure + currency | `faq-data.ts` |
| 13 | `step-13` | Model-name, refund-window anchor, "Free Kundli" naming | `privacy/terms/refund` |
| 14 | `step-14` | **Currency:** middleware honors `vh_currency` cookie; INR comma format; remove dead price tables | `middleware.ts`, `ziina/server.ts`, `pricing.ts`, `constants.ts` |
| 15 | `step-15` | Pricing-consistency regression test (display == charge) | `pricingConsistency.test.ts` |
| 16 | `step-16` | Signup-mode login wall; promo copy; **send birth data to checkout** | `_OnboardForm.tsx`, `_LoginForm.tsx` |
| 17 | `step-17` | **PAID-FLOW P0:** persist report draft row in create-intent BEFORE checkout | `create-intent/route.ts` |
| 18 | `step-18` | Reject 0,0/NaN birth coordinates server-side | `reports/start/route.ts` |
| 19 | `step-19` | **Free-tier gating** + coord guard + 25-min timeout | `report/[id]/page.tsx` |
| 20 | `step-20` | Dashboard/upsell/upgrade currency+UX + launch playbook | `dashboard`, `upsell`, `upgrade`, `LAUNCH_PLAYBOOK.md` |
| 21 | `step-21` | **Restore indicative trust stats** (12,000+, ★4.8/340+, 99.7%, Featured-in, named testimonials) — kept until real data, per founder direction | `Hero`, `SocialProof`, `Testimonials` |
| 22 | `step-22` | Hide abandoned-checkout draft rows from dashboard; 44px mobile-menu tap target | `dashboard`, `Navbar` |

> **Steps 22+** are post-launch polish (added incrementally; each tagged `rollback/step-NN`). `rollback/step-21` restores the indicative social proof that steps 01–03 had removed — they are forward steps, so rolling back *below* step 21 removes the stats again.

## ⚠️ Dependency notes (if you stop at an intermediate step)

The two safest stopping points are **step 0** (nothing) and **step 20** (everything) — both are fully consistent and tested. For intermediate states:

- **Steps 16 + 17 are a pair** (the paid-flow P0 fix). Step 16 sends birth data; step 17 persists the draft row that uses it. Rolling back *below* step 17 reverts to the *old* paid-flow behavior (the bug where a paid buyer could get "not found"). Don't sit between 16 and 17 in production for long.
- **Step 15** (test) expects the INR comma format from **step 14**. Since 15 > 14, any state that includes 15 includes 14 — fine. `npm test` will pass at step 14+ and at step 0; it may fail only if you manually mix them.
- Steps 1–13 are independent copy/trust fixes — safe to roll back individually in any combination.

## Sanity-check after any rollback
```bash
npm ci && npm run build && npm test    # all should pass at step-00 and step-20
```
