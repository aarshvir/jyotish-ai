# Pillar 4 — Revenue Engine (1-Click Upsell + Programmatic SEO + Synastry)

**Status:** blocked on Pillar 1 (needs webhook-driven payment truth; otherwise upsell funnel is unreliable).

---

## Goal

Lift Average Order Value from 1 report × $9.99 to 1.4–1.7 reports × blended $14+. Capture long-tail search demand with dynamic ISR pages. Launch a second-player product (Synastry/Ashtakoot) to drive virality and retention.

**Acceptance:**

1. After a successful 7-day Ziina payment, the user lands on `/upsell` (not `/report/[id]`), sees a time-limited 1-click upgrade to Monthly Oracle at a clear discount (e.g., $9 add-on instead of $10 diff = 10% off the delta). Clicking "Upgrade" creates a second Ziina intent pre-filled with their saved details — user confirms OTP / card only (no re-entry).
2. `/horoscope/[sign]/[date]` returns a daily horoscope page, ISR-revalidated hourly, with 12×365 = 4,380 URLs listed in the sitemap.
3. `/synastry` is a functional MVP: two birth forms → Ashtakoot 36-point score + short commentary, gated to paid users (7-day or higher). Deterministic scoring + AI commentary.
4. Google Search Console shows `/transit/*` and `/horoscope/*` impressions within 14 days of deploy.

---

## Files Cursor will change / create

### Upsell funnel

- `src/app/api/ziina/verify/route.ts` — change redirect: if `planType === '7day'` and user has never purchased Monthly, redirect to `/upsell?reportId=<id>&offerType=7day-to-monthly`. Else, keep current redirect to `/report/<id>?payment_status=paid`.
- `src/app/(app)/upsell/page.tsx` — rewrite:
  - Server component: load `reports` row, verify `payment_status=paid`, read `offerType` from query.
  - Display current plan + upgrade CTA + 15-minute countdown (client).
  - "No thanks, take me to my report" dismiss link.
  - Dismissal writes `reports.upsell_dismissed_at` so we don't nag on every visit.
- `src/app/(app)/upsell/_UpsellButton.tsx` — already exists; modify to call new endpoint below.
- `src/app/api/ziina/upgrade/route.ts` — new. Validates user owns `reportId`, validates payment_status = paid, creates a new Ziina intent for the **delta** (Monthly - 7day) with `discount_pct` applied, returns redirect URL. Records intent in `ziina_payments` with `upsell_of_intent_id = <original>` for analytics.
- `supabase/migrations/<new>_upsell_tracking.sql` — add columns `reports.upsell_shown_at`, `reports.upsell_dismissed_at`, `reports.upsell_converted_at`; add `ziina_payments.upsell_of_intent_id text`.
- `src/lib/analytics/upsellEvents.ts` — emit structured events to `analytics_events` table (or Vercel Analytics if already wired).

### Post-upsell experience

- When Ziina webhook (from Pillar 1) receives `payment_intent.completed` for a row where `upsell_of_intent_id is not null`, it should:
  - Upgrade the originating `reports` row's `plan_type` to `monthly`.
  - Emit a `report/extend` Inngest event to generate the additional days (day 8–30) without redoing days 1–7.
- `src/lib/reports/phases/extendPlan.ts` — new phase function that appends days to an existing complete report.

### Programmatic SEO

- `src/app/(marketing)/horoscope/[sign]/[date]/page.tsx` — new. ISR with `export const revalidate = 3600`. `generateStaticParams` pre-builds today + next 7 days × 12 signs = 96 URLs (the rest render on first request and are cached).
- `src/app/(marketing)/horoscope/[sign]/page.tsx` — index that links to today + next 7 days.
- `src/app/api/sitemap/route.ts` — add `/horoscope/{sign}/{yyyy-mm-dd}` for today + next 30 days = 360 URLs. Revalidate daily.
- `src/lib/seo/horoscopeContent.ts` — deterministic daily content generator from ephemeris + a small template library; AI-enriched via a cached Anthropic call that's keyed `sha256(sign+date)` so we never spend tokens twice on the same URL.
- `src/app/(marketing)/transit/[planet]/[sign]/page.tsx` — add `export const revalidate = 86400` (was static only). Keep 108 URLs.

### Synastry (Ashtakoot) MVP

- `src/app/(app)/synastry/page.tsx` — replace "Coming soon" stub with two BirthForm cards side-by-side. On submit → server action → compute.
- `src/app/(app)/synastry/[id]/page.tsx` — result page.
- `src/lib/synastry/ashtakoot.ts` — new. Deterministic 8-koot scoring (Varna 1, Vashya 2, Tara 3, Yoni 4, Maitri 5, Gana 6, Bhakoot 7, Nadi 8 = 36 max). Covered by unit tests with 10 known-good cases from classical manuals.
- `src/lib/synastry/commentaryAgent.ts` — new AI agent that takes the Ashtakoot breakdown + both charts → 500-word compatibility narrative (Pillar 2 RAG injected).
- `supabase/migrations/<new>_synastry.sql` — `synastry_charts(id uuid pk, user_id uuid fk, partner_a jsonb, partner_b jsonb, ashtakoot jsonb, commentary text, plan_gate text, created_at timestamptz)`.
- Pricing: $14.99 one-time for Ashtakoot; add to `src/lib/ziina/server.ts` `ZIINA_PLANS` as `synastry`.
- `src/components/marketing/SynastryTeaser.tsx` — shown on dashboard for users who haven't bought synastry.

---

## Cursor does

1. Apply migrations (upsell tracking + synastry).
2. Implement upsell funnel: modify `/api/ziina/verify`, build `/api/ziina/upgrade`, rewrite `/upsell/page.tsx`.
3. Wire Pillar 1's webhook to branch on `upsell_of_intent_id`.
4. Build `extendPlan` phase that appends days 8–30 to an existing complete report.
5. Build `/horoscope/[sign]/[date]` ISR pages; update sitemap.
6. Build Ashtakoot scorer with exhaustive unit tests.
7. Build synastry UI + result page + Ziina plan.
8. Add analytics events.
9. `npx tsc --noEmit`, lint, test.

---

## You do (exact click-by-click)

### 1. Ziina — add `synastry` plan-type pricing (if you want a different SKU)

Ziina doesn't require pre-registered products (amounts are set per intent), so nothing to do in the dashboard for Synastry. The code-side `ZIINA_PLANS` entry is enough. Cursor will add:

```
'synastry': { name: 'VedicHour Synastry', amountAED: 5699, amountUSD: 1499, amountINR: 119900 }
```

If you want different pricing, reply in chat with your chosen USD price; Cursor will derive AED/INR from it at the same ratio.

### 2. Google Search Console — add the new URL patterns

1. Go to https://search.google.com/search-console → select property `https://www.vedichour.com`.
2. **Sitemaps** → confirm `https://www.vedichour.com/sitemap.xml` is listed with status "Success". If not, paste that URL and click Submit.
3. Wait 48h, then **URL Inspection** → paste `https://www.vedichour.com/horoscope/leo/2026-04-20` → click "Request indexing". Do this for ~10 sample URLs across signs/dates to accelerate first-crawl.
4. **Coverage → Indexed** — after 7 days you should see counts rising. If not, check **robots.txt** (https://www.vedichour.com/robots.txt) — `/horoscope/` must NOT be disallowed.

### 3. Supabase — run migrations

1. SQL Editor → run `20260419_upsell_tracking.sql`.
2. SQL Editor → run `20260419_synastry.sql`.
3. Sidebar: **Database → Replication** → add `synastry_charts` to `supabase_realtime` publication (optional, for future live updates on shared charts).

### 4. Vercel — nothing new

All env vars exist. Just deploy.

### 5. Post-deploy: manual test all three funnels

**Funnel A — Upsell:**

1. Incognito → https://www.vedichour.com/onboard → buy 7-day plan with Ziina test card.
2. Confirm redirect to `/upsell?reportId=<id>` (not `/report/<id>`).
3. Click "Upgrade to Monthly Oracle".
4. Ziina prompts for OTP only (no card re-entry, since the card is tokenized by Ziina for this merchant).
5. Complete. Confirm redirect to `/report/<id>?payment_status=paid`.
6. Supabase → **Table Editor → reports** → the row now has `plan_type = monthly` and `upsell_converted_at` populated.
7. Inngest dashboard → confirm a `report/extend` run executed successfully and days 8–30 now appear in the report.

**Funnel B — Programmatic SEO:**

1. Open https://www.vedichour.com/horoscope/leo/2026-04-20 directly → page renders with unique content and meta description.
2. Refresh — response header `x-vercel-cache: HIT` (ISR working).
3. Edit `src/lib/seo/horoscopeContent.ts` template, push — within 1 hour the page auto-revalidates.
4. Open https://www.vedichour.com/sitemap.xml → search for `horoscope` → see ~360 URLs.

**Funnel C — Synastry:**

1. /synastry → fill two birth forms → submit.
2. If not paid: redirected to Ziina checkout for synastry plan.
3. After pay: Ashtakoot breakdown table (8 kootas, each with points and 1-line reason), total score out of 36, 500-word AI commentary with scripture citations (from Pillar 2).
4. Supabase → `synastry_charts` row created.

### 6. Rollback

- Upsell disconnect: set Vercel env `UPSELL_ENABLED=false`; `/api/ziina/verify` falls back to direct redirect.
- Horoscope pages misbehaving: `export const dynamic = 'force-static'` and bypass `revalidate`; or add the path to `robots.txt` disallow list temporarily.
- Synastry: set `SYNASTRY_ENABLED=false`; existing `/synastry` stub re-renders.

---

## Acceptance check

```powershell
npx tsc --noEmit
curl -sI https://www.vedichour.com/horoscope/leo/2026-04-20 | findstr /i cache
curl -s https://www.vedichour.com/sitemap.xml | findstr /c:"horoscope"
```

Manual: complete one full upsell funnel with a test card; confirm the row in `reports` transitions `7day → monthly` and extended days render.

---

## Out of scope for Pillar 4

- Referral / affiliate program (future Pillar 5).
- Email nurture sequences (future).
- Mobile app TWA wiring (docs already in `.env.example`).
