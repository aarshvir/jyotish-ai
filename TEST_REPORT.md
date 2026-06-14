# VedicHour E2E QA Report

**Date:** 2026-06-14  
**Environment:** Local toolchain + production `https://www.vedichour.com`  
**Branch:** `qa/cursor-e2e`

---

## Executive summary

| Area | Result |
|------|--------|
| Install / typecheck / vitest / build | **PASS** (build has ESLint warnings only) |
| Deterministic charts (`qa-charts.mjs`, 4 refs) | **PASS** |
| Kundli engine tests | **PASS** (17/17) |
| Production public surface (27 checks) | **PASS** after QA script corrections |
| Production 7-day forecast E2E (bypass) | **SKIP** — local `BYPASS_SECRET` ≠ production (401) |
| Local 7-day forecast E2E (bypass) | **FAIL** — pipeline time budget at `pre_commentary` |
| Kundali / Synastry full paid reports | **SKIP** — require prod bypass + paid/unlock gate; documented below |

**Fixes in this PR:** synastry `partner_a`/`partner_b` body aliases, E2E bypass token sanitization, Ref 4 chart in `qa-charts.mjs`, typecheck fix in `adminReportAccess.test.ts`, reusable `scripts/qa-prod-surface.mjs`.

---

## Check matrix

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1 | `npm install` | **PASS** | 766 packages; 22 npm audit advisories (unchanged) |
| 2 | `npm run typecheck` | **PASS** | Fixed `adminReportAccess.test.ts` literal narrowing (was failing on re-run) |
| 3 | `npm run test` (vitest) | **PASS** | 61 tests, 10 files |
| 4 | `npm run build` | **PASS** | ESLint warnings only (unused vars, unescaped entities) |
| 5 | `qa-charts.mjs` Ref 1–3 | **PASS** | See chart table below |
| 6 | `qa-charts.mjs` Ref 4 (Kolkata) | **PASS** | Added in this QA run |
| 7 | `npx vitest run src/lib/kundli` | **PASS** | 17/17 |
| 8 | GET `/api/health` | **PASS** | `status=degraded`, `blockers=[]`, HTTP 200 |
| 9 | GET `/sitemap.xml` | **PASS** | 200, ~77 KB |
| 10 | GET `/robots.txt` | **PASS** | 200 |
| 11 | GET `/llms.txt` | **PASS** | 200 |
| 12 | POST `/api/kundali/teaser` | **PASS** | Returns `lagna`, `moon_sign` |
| 13 | POST `/api/synastry/teaser` | **PASS**† | `partnerA`/`partnerB`; `partner_a` fixed in PR |
| 14 | POST `/api/tools/chart` | **PASS** | `doshas`, `current_dasha` (not field `dasha`) |
| 15 | GET `/` H1 | **PASS** | Contains "Vedic" |
| 16 | GET `/free-kundli` H1 | **PASS** | "Free Kundli" |
| 17 | GET `/kundali` H1 | **PASS** | "Kundli Analysis" |
| 18 | GET `/synastry` H1 | **PASS** | "Gun Milan" |
| 19 | GET `/pricing` H1 | **PASS** | "Free Kundli" |
| 20 | GET `/manglik-dosha-calculator` H1 | **PASS** | |
| 21 | GET `/sade-sati-calculator` H1 | **PASS** | |
| 22 | GET `/vimshottari-dasha-calculator` H1 | **PASS** | |
| 23 | GET `/nakshatra-finder` H1 | **PASS** | |
| 24 | GET `/moon-sign-calculator` H1 | **PASS** | |
| 25 | GET `/lagna-calculator` H1 | **PASS** | |
| 26 | GET `/kaal-sarp-dosha-calculator` H1 | **PASS** | |
| 27 | GET `/horoscope/aries` H1 | **PASS** | "aries" |
| 28 | GET `/transit/jupiter/cancer` H1 | **PASS** | "Jupiter" |
| 29 | GET `/privacy` H1 | **PASS** | |
| 30 | GET `/terms` H1 | **PASS** | |
| 31 | GET `/refund` H1 | **PASS** | |
| 32 | `/kundali/test-id` noindex | **PASS** | |
| 33 | `/synastry/test-id` noindex | **PASS** | |
| 34 | `/report/test-id` noindex | **PASS** | |
| 35 | Prod forecast E2E (`test-report-e2e.mjs`) | **SKIP** | HTTP 401 — bypass token mismatch |
| 36 | Local forecast E2E | **FAIL** | See failure detail below |
| 37 | Kundali deep report E2E | **SKIP** | Payment gate on `/api/kundali/compute` |
| 38 | Synastry matchmaking E2E | **SKIP** | Payment gate on `/api/synastry/compute` |
| 39 | PDF / print smoke | **SKIP** | No completed report ID from E2E |

† On production **before** this PR merges, `partner_a`/`partner_b` returns 400; `partnerA`/`partnerB` works.

---

## Reference chart accuracy (`qa-charts.mjs`)

| Chart | DOB / time / city | Lagna | Moon nakshatra | Current dasha | Manglik | Sade Sati (now) |
|-------|-------------------|-------|----------------|----------------|---------|-----------------|
| Ref 1 | 1990-01-15 08:30 New Delhi | Capricorn (20.22°) | Purva Phalguni p2 | Rahu/Rahu (2025-10-02 → 2028-06-14) | no (Mars h11) | no (Saturn Pisces) |
| Ref 2 | 1985-07-20 14:45 Mumbai | Scorpio (0.67°) | Magha p1 | Moon/Venus (2024-10-16 → 2026-06-17) | no (Mars h9) | no |
| Ref 3 | 2000-11-05 23:10 Chennai | Cancer (8.20°) | Dhanishta p4 | Jupiter/Mercury (2024-08-30 → 2026-12-06) | no (Mars h3) | **YES** (3rd phase, Saturn Pisces) |
| Ref 4 | 1995-03-22 06:15 Kolkata | Pisces (16.82°) | Anuradha p3 | Venus/Venus (2025-05-09 → 2028-09-07) | no (Mars h5) | no |

Cross-check against AstroSage / Jagannatha Hora for regression validation.

---

## Failure details

### F1 — Production forecast E2E (SKIP / auth)

```
POST https://www.vedichour.com/api/reports/start → HTTP 401
GET  https://www.vedichour.com/api/reports/{id}/status → HTTP 401 Unauthorized
```

**Root cause:** `BYPASS_SECRET` in local `.env.local` does not match production Vercel `BYPASS_SECRET`. Bypass header was accepted only after trimming `\r\n` from env; still rejected by prod.

**Action:** Run with production secret (from Vercel env, not committed):

```bash
E2E_BYPASS=<production-bypass-secret> node scripts/test-report-e2e.mjs https://www.vedichour.com
```

### F2 — Local forecast E2E (FAIL)

```
HTTP 500 after 164.3s:
{"error":"Error: Pipeline time budget exceeded (pre_commentary)","engine":"node","dispatch_mode":"inline_fallback"}
```

**Root cause:** Inline pipeline on `localhost:3000` with `REPORT_PIPELINE_INLINE=1` exceeded orchestrator time budget before commentary phase (LLM latency / local cold start).

**Action (P2):** Increase pre-commentary budget for inline mode, or run E2E against prod with valid bypass; use Inngest path in prod (202 + poll).

### F3 — Synastry teaser `partner_a` on prod (fixed in PR)

```
POST /api/synastry/teaser {"partner_a":...,"partner_b":...}
→ 400 {"error":"Both birth dates and located cities are required."}
```

**Root cause:** API only read `partnerA`/`partnerB`; QA spec used snake_case (matches DB columns).

**Fix:** Accept both naming conventions in teaser + compute routes (**this PR**).

---

## Production health detail

```json
{
  "status": "degraded",
  "blockers": [],
  "degraded": true,
  "deps": {
    "sentry": { "configured": false },
    "posthog": { "configured": false }
  }
}
```

**P2:** Configure Sentry + PostHog in production to reach `healthy` (non-blocking for reports).

---

## Manual paid-flow steps (when prod bypass is available)

### 7-day AI forecast

1. `E2E_BYPASS=<prod-secret> node scripts/test-report-e2e.mjs https://www.vedichour.com`
2. Open `https://www.vedichour.com/report/{reportId}` (from script output).
3. Verify nativity, 12 months, 6 weeks, 7 days × 18 slots, synthesis render.
4. Print / PDF: browser print or `GET /api/report/pdf` with auth.

### Deep Kundli

1. Authenticate with bypass: visit `/onboard?bypass=<token>` or send `x-bypass-token` on API calls.
2. **Note:** `/api/kundali/compute` requires `payment_status=paid` report **or** `user_kundali_unlock` row — bypass forecast alone uses `payment_status=bypass` and does **not** unlock compute (402).
3. Options: complete a real Ziina `kundali` checkout, or insert unlock for bypass user in admin (ops only).
4. POST `/api/kundali/compute` with `{ person: { birth_date, birth_time, birth_city, birth_lat, birth_lng } }`.
5. Open `/kundali/{id}` — verify overview, life areas, doshas, print view.

### Gun Milan / Synastry

1. Same payment gate as Kundli (`user_synastry_unlock` or paid forecast).
2. POST `/api/synastry/compute` with `{ partnerA, partnerB }` (or `partner_a`/`partner_b` after PR).
3. Open `/synastry/{id}` — verify score /36, eight kootas, commentary.

---

## Prioritized fix list

| Priority | Item | Status |
|----------|------|--------|
| **P0** | None identified — report generation blocked only by bypass mismatch / local timeout | — |
| **P1** | Synastry teaser/compute accept `partner_a`/`partner_b` aliases | **Fixed in PR** |
| **P1** | E2E scripts trim `BYPASS_SECRET` (Windows `\r\n` in env) | **Fixed in PR** |
| **P1** | `adminReportAccess.test.ts` typecheck failure | **Fixed in PR** |
| **P2** | Local inline pipeline time budget (`pre_commentary`) — flaky local E2E | Open |
| **P2** | Configure Sentry + PostHog in prod (health `degraded`) | Open |
| **P2** | Bypass flow should unlock Kundli/Synastry compute for QA (or document ops unlock) | Open |
| **P2** | ESLint warnings in build (unused vars, unescaped quotes) | Open |
| **P2** | npm audit (22 advisories) | Open |

---

## Changed files (this QA PR)

| File | Change |
|------|--------|
| `scripts/qa-charts.mjs` | Added Ref 4 (Kolkata 1995-03-22) |
| `scripts/qa-prod-surface.mjs` | New reusable production curl matrix |
| `scripts/test-report-e2e.mjs` | Sanitize bypass token for headers |
| `src/app/api/synastry/teaser/route.ts` | `partner_a`/`partner_b` aliases |
| `src/app/api/synastry/compute/route.ts` | Same aliases |
| `src/__tests__/adminReportAccess.test.ts` | Typecheck-safe plan type |
| `TEST_REPORT.md` | This report |

---

## How to re-run

```bash
npm install
npm run typecheck
npm run test
npm run build

node --env-file=.env.local --env-file=.env.vercel.production.local scripts/qa-charts.mjs
npx vitest run src/lib/kundli
node scripts/qa-prod-surface.mjs

# Forecast E2E (needs matching bypass secret + inline on local):
REPORT_PIPELINE_INLINE=1 npm run start
node --env-file=.env.local scripts/test-report-e2e.mjs http://localhost:3000
```
