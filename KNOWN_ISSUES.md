# Known issues & post-launch backlog — VedicHour

Status as of the launch-hardening pass (main @ step 25). Nothing here is launch-blocking; the platform is live, validated (7-day + 30-day e2e PASSED), and fully rollback-able (`ROLLBACK.md`). These are the honest residuals.

## 🔴 Pre-traffic operational (env/config — only you can do; NOT code)
1. **Upstash Redis** — set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel. `/api/health` reports `upstash_required_but_missing`; without it rate-limiting falls back to ineffective in-memory.
2. **LLM spend caps** — set hard monthly caps in Anthropic + OpenAI + Google consoles. With Upstash + caps you're protected against a free-Kundli cost wave.
3. **One real Ziina test checkout** — the paid-flow P0 fix (draft row before checkout) is logic-verified + Codex-confirmed, but the e2e used the bypass path. Do one real ₹/$ purchase to confirm end-to-end.
4. **Canonical host** — site serves both `vedichour.com` and `www.vedichour.com`; canonicals point to `www`. Confirm Vercel 301-redirects the apex → www (domain settings) so SEO signals don't split.

## 🟡 Content quality (LLM-tuning; touches the frozen generation pipeline — do in a careful dev cycle, not live)
5. **Paid nativity occasionally short** — on the 30-day e2e the nativity analysis came back 159 chars (a template stub) vs ~1,900 chars on the 7-day run. The LLM intermittently returns empty and the deterministic stub backfills; it passes the non-empty validator. Fix: for paid plans, retry the nativity-text call and/or validate a minimum length before accepting. File: `src/lib/reports/orchestrator.ts` (nativity-text phase) + `src/lib/validation/reportValidation.ts`.
6. **Rahu Kaal commentary tone** — ~4% of Rahu Kaal hourly slots used action verbs ("sign", "commit") instead of advising restraint. Fix: add an explicit instruction to the hourly-commentary prompt that Rahu Kaal windows should advise caution / avoid recommending new initiatives. File: `src/app/api/commentary/hourly-batch/route.ts` (or `hourly-day`).

## 🟢 Economics (optional optimization)
7. **Free tier generates the full pipeline** (~$0.50–2 LLM each) but only displays a preview (nativity + 1 sample day). Make free generate nativity-only to cut cost. Requires careful orchestrator work + a free-path e2e. Until then, Upstash rate-limiting + spend caps (items 1–2) are the cost guardrails.
8. **Abandoned-checkout `pending`/`unpaid` draft rows** accumulate in `reports`. They're hidden from the dashboard (step 22) and harmless, but add a daily cleanup cron (delete `status='pending' AND payment_status='unpaid' AND created_at < now()-1 day`).

## 🔵 Minor polish (P3 — nice-to-have)
9. SEO: add `twitter.site`/`creator` handle + populate `Organization.sameAs` with real social URLs (`src/app/layout.tsx`); optionally enrich the pricing `Product` JSON-LD (`description`/`image`/`brand`) or drop it (the `SoftwareApplication` offers graph already covers all plans).
10. a11y: `ReportSidebar` mobile tabs are 36px (bump to 44px); dashboard tab labels can wrap at 320px (shrink padding/text under `sm`).
11. Add `/synastry` to the sitemap once it has its own `generateMetadata` (`src/app/api/sitemap/route.ts`, `src/app/synastry/page.tsx`).

## ✅ Validated & clean (for reference)
- Paid + free report generation: 7-day **and** 30-day e2e PASSED on production (structure, slots, months, weeks, varied scores, no placeholders).
- Money path: currency display == charge in every surface; paid-flow draft-row P0 fixed; Codex-reviewed.
- Security: no client secret leakage; debug routes gated; auth/ownership enforced.
- Two fresh-eyes audits (correctness, mobile/a11y, SEO): "very strong shape."
