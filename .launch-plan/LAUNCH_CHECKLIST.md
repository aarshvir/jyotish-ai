# VedicHour — Launch Checklist (3 products)
Built for launch. Read this top-to-bottom before going live.

## WHAT SHIPPED (live on main / vedichour.com)
1. **Kundali Analysis** — NEW standalone product. $9.99 / ₹899 / AED 36.99.
   - `/kundali` → unlock → enter birth details → instant plain-English chart reading + life-chapters timeline.
2. **Hour-by-Hour Forecast** — existing. 7-day $9.99 / Monthly $19.99 / Annual $49.99 (₹ + AED auto-detected).
3. **Matchmaking (Gun Milan)** — finished + repriced to $9.99 / ₹899.
   - `/synastry` → unlock → enter two birth details → 36-point Ashtakoot compatibility + 8-fold breakdown.

Prices auto-localize to AED / USD / INR by geo + the currency switcher. All one-time, 24h refund.

---

## ⚠️ YOU MUST DO THESE BEFORE ACCEPTING MONEY (I cannot — they need your Supabase / keys)

### 1. Apply the database migration (CRITICAL — Kundali will not work without it)
Run this in the Supabase SQL editor (or your migration pipeline):
- `supabase/migrations/20260613_kundali_standalone.sql`  ← NEW, creates `user_kundali_unlock` + `kundali_charts`

Also CONFIRM these (Matchmaking depends on them — likely already applied since synastry was pre-built):
- `supabase/migrations/20260420_pillar4_revenue_synastry.sql`
- `supabase/migrations/20260422_synastry_unlock_ziina_user.sql`

If the Kundali migration is NOT applied: a buyer can pay but won't be unlocked (finalize fails). Apply it first.

### 2. Smoke-test BOTH purchase flows end-to-end (use Ziina test mode or a real $9.99)
- **Kundali:** /kundali → "Unlock Kundali — $9.99" → pay → you should land on /kundali?unlocked=1 → enter birth details → reading appears.
- **Matchmaking:** /synastry → "Unlock Matchmaking — $9.99" → pay → /synastry?unlocked=1 → enter two births → 36-point score appears.
- Confirm INR shows ₹899 to Indian traffic and USD shows $9.99 elsewhere.

### 3. Verify report CONTENT quality (the hour-by-hour product)
Two independent audits found the generation pipeline was producing fallback/template content
(identical domain scores, ALL-CAPS synthesis). Step 54 fixed the prompts, BUT verify with a fresh paid report:
- Generate one real 7-day report. Check: month domain scores DIFFER (career ≠ money ≠ health ≠ love);
  the synthesis opening is a plain sentence (NOT "MARS-RAHU PERIOD SYNTHESIS FOR…"); day overviews are populated.
- If still fallback: confirm `OPENAI_API_KEY` is valid and the `gpt-5.5` model is accessible
  (the months routes default to `REPORT_MONTHLY_MODEL` || gpt-5.5). Set `REPORT_MONTHLY_MODEL` to a known-good
  model in Vercel if needed. This is the #1 product-quality risk for launch.

### 4. (Recommended, from the marketing plan) Add a higher-AOV bundle
$5k/week at $9.99 needs ~500 sales — not reachable on a $200 ad budget. Add a **$39 / ₹2,999 "Complete Reading"
bundle** (Kundali + Matchmaking + a monthly forecast) to roughly halve the sales needed. See LAUNCH_MARKETING_WEEK1.md.

---

## ROLLBACK — go back to the original platform anytime
Everything in this launch sits ABOVE a tagged baseline. To revert ALL of it (the 3-product launch +
the pipeline-prompt changes) back to exactly the pre-launch live state:

```bash
git fetch origin
git reset --hard rollback/pre-launch-build
git push --force origin main          # Vercel redeploys the pre-launch state
```

To revert just ONE step (granular), every step is tagged `rollback/step-NN`:
- `rollback/step-54` = + pipeline content-quality fixes
- `rollback/step-55` = + Matchmaking finished
- `rollback/step-56` = + Kundali product (current)
e.g. to keep Matchmaking but drop Kundali: `git reset --hard rollback/step-55 && git push --force origin main`.

Fastest emergency rollback (no rebuild): Vercel dashboard → Deployments → pick the last pre-launch
READY deployment → ⋯ → Promote to Production.

---

## NICE-TO-HAVE (post-launch, not blocking)
- Homepage: add a section/cards linking to /kundali and /synastry (nav links + pricing page already done).
- Ashtakoot engine has a minor simplification (Graha Maitri uses gana groups, not full planetary lordship) —
  acceptable for launch, matches many consumer kundli apps; refine later for purists.
- Add Mangal Dosha (Mars affliction) check to Matchmaking — expected by traditional users; a good v1.1.
- Sitemap: add /kundali and /synastry entries for SEO.
