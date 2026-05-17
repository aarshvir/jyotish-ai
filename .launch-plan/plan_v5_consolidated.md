# Plan v5 — Consolidated Best-Path (final, pre red-team)

**Author:** Claude Opus 4.7 (1M ctx), consolidating v1 (Opus), v2 (GPT-5.5 own), v3 (Opus revised), v4 (GPT-5.5 final).
**Discipline:** Pure consolidation. Every item attributed. No new ideas.
**Window:** ~18 hours, anchor Sun 2026-05-17 12:00 IST → Mon 2026-05-18 06:00 IST.
**Fallback:** Mon 2026-05-18 18:00 IST if any P0 gate is red at Mon 02:00 IST.

---

## 1. Headline finding (the thing that justifies this whole exercise)

**Three real bugs survived three plans and were caught only on the fourth pass:**

1. `src/components/landing/Hero.tsx:5` — `TRUST_STATS` hard-codes "12,000+ charts generated" and "★ 4.8 from 340+ seekers". Neither number is instrumented. Under the "no fake proof" rule (consensus from v2 onward), this is a **launch-blocker** that nobody noticed until GPT-5.5 v4. Removing those two array entries is the single highest-leverage change in this whole plan.

2. `src/lib/reports/postProcess/extractCitations.ts:16` — the citation parser **structurally requires** `SOURCE:CHAPTER:VERSE`. `src/components/report/ScriptureFootnotes.tsx:47` renders "Ch." and "v." unconditionally. v3 said "manual audit + change prompt if metadata bad." v4 corrected: the prompt change alone is insufficient because the rendering pipe drops anything that doesn't match the full pattern. **The extractor + UI must change** to accept source-only and source+chapter citations. Code change, not display polish, not audit-only.

3. `src/components/shared/Footer.tsx:12` — no visible support email. The legal pages and JSON-LD have it; the footer does not. Discovery path during launch-day incidents: bad.

Anything else in this plan is downstream of "the three real bugs above plus the operational safety net both models agree on."

---

## 2. Provenance map (full attribution)

| Item | v1 Opus | v2 GPT-5.5 | v3 Opus | v4 GPT-5.5 | Final source |
|---|:---:|:---:|:---:|:---:|---|
| Five-clause launch definition (free works, paid works, paid report has X fields, failures visible, no double-charge) | — | ✅ origin | ✅ adopted | ✅ refined (added "no fake proof" clause) | **GPT-5.5 v2, refined v4** |
| Production env walkthrough via `.env.example` | — | ✅ origin | ✅ adopted | ✅ named `scripts/verify-report-generation-env.mjs` | **GPT-5.5 v4 (script found)** |
| `/api/health` endpoint shape | proposed shapeless | ✅ shape | ✅ adopted | ✅ tightened (200 vs 503 rules per dep) | **GPT-5.5, refined v4** |
| Sentry as P0 | ✅ | ✅ | ✅ | ✅ unconditional | **Consensus** |
| PostHog as P0 | ✅ unconditional | ✅ unconditional | ✅ unconditional | ✅ **conditional on consent done by Sun 15:00** | **GPT-5.5 v4** |
| CSP update before SDK init | implicit | ✅ explicit | ✅ adopted | ✅ adopted | **GPT-5.5 v2** |
| **Citation extractor + UI code change (not just audit)** | — | "soften copy" | "audit + prompt change" | ✅ **patch parser + footnote UI** | **GPT-5.5 v4** |
| Citation manual audit gate | retrieval@5 framing | "downgrade display" | ✅ audit gate added | ✅ audit + code change | **Opus v3, code patch added v4** |
| **Hero TRUST_STATS removal** | — | — | — | ✅ **identified as P0** | **GPT-5.5 v4** |
| **Footer support email** | — | "support email visible" | "footer must have it" | ✅ **identified file `Footer.tsx:12`** | **GPT-5.5 v4** |
| Forbid orchestrator extraction | ❌ proposed extraction | ✅ forbid | ✅ adopted forbid | ✅ adopted forbid | **GPT-5.5 v2** |
| Forbid `next-intl` route work | ❌ proposed scaffold | ✅ forbid | ✅ adopted forbid (prep ok) | ✅ adopted | **GPT-5.5 v2** |
| Forbid fake testimonials/counters/scarcity | ❌ permissive | ✅ bright line | ✅ adopted | ✅ adopted + Hero specific | **GPT-5.5 v2, applied v4** |
| Forbid admin refund route | ❌ proposed | ✅ forbid | ✅ adopted | ✅ adopted | **GPT-5.5 v2** |
| Forbid dashboard tab rebuild | ❌ proposed | ✅ already-tabs | ✅ adopted | ✅ named four existing CTAs | **GPT-5.5 v4 (most specific)** |
| Forbid 12+ new E2E specs | ❌ proposed | ✅ existing-only | ✅ adopted | ✅ adopted | **GPT-5.5 v2** |
| Five-lane agent topology | 6-agent | ✅ 5-lane | ✅ adopted | ✅ adopted with caveat | **GPT-5.5 v2** |
| Kill switches (`REPORT_START_REQUIRE_INNGEST` etc.) | — | ✅ named | ✅ adopted | ✅ adopted | **GPT-5.5 v2** |
| Cost guardrails (Anthropic, Inngest, Sentry, Upstash, Vercel) | — | partial | ✅ Opus added | ✅ adopted + Upstash explicit | **Opus v3, Upstash v4** |
| Support runbook + first-response SLAs | — | "support visible" | ✅ Opus added | ✅ adopted + macros listed | **Opus v3, refined v4** |
| Performance budget | partial | runbook only | ✅ hard numbers | ✅ relaxed (Lighthouse 85, not 90; no LCP hard gate) | **Opus v3, calibrated v4** |
| DPA / privacy update for telemetry | — | "no PII" | ✅ added | ✅ adopted | **Opus v3** |
| DPDP/EEA cookie consent | — | — | ✅ added | ✅ adopted, sequenced before PostHog | **Opus v3, sequenced v4** |
| Burst test on staging | k6 200 RPS | rejected | 20 concurrent | ✅ **3 same-user starts** (rate-limit aware) | **GPT-5.5 v4 (correct one)** |
| 50 RPS on `/api/health` | — | — | ✅ Opus added | ✅ adopted | **Opus v3** |
| Content correctness gate | — | — | ✅ Opus added at Mon 04:00 | ✅ moved to Sun 23:00–Mon 00:30 | **Opus v3, moved v4** |
| Three approval gates | 2 | 2 | 3 | 2 (content + final go/no-go) | **Tie — see §6** |
| 18h timeline starting Sun 12:00 | — | 48h | 24h Sun 02:00 | ✅ 18h Sun 12:00 | **GPT-5.5 v4** |
| Monday 18:00 IST fallback launch | — | — | implied | ✅ explicit | **GPT-5.5 v4** |
| Inngest concurrency cap | — | — | proposed | ✅ adopted | **Opus v3** |
| Upstash present in prod (no in-memory rate-limit fallback) | — | — | — | ✅ identified | **GPT-5.5 v4** |
| Domain spot-check items (Lahiri sidereal, dasha lord sequence, hora rotation, no fatalism, no PII bleed) | partial | partial | ✅ Opus list | ✅ adopted | **Both, refined v4** |

**Verdict:** v4 contributed the most repo-grounded specific catches. v2 contributed the operating principles. v3 contributed the operational safety net. v1's main contribution was being wrong about enough things that v2's corrections produced the right tradeoffs.

---

## 3. Final P0 (the only list that ships)

Ten items. Hard rule: nothing else.

### 3.1 — Freeze the report pipeline
`src/lib/reports/orchestrator.ts` (verified 1992 LOC in this checkout, against v4's reported 2129 — actual EOF count is 1992) and `src/app/api/reports/start/route.ts` (631 LOC) are frozen. Only touched if a launch gate fails and the patch is narrow + reversible. **Source:** GPT-5.5 v2, adopted Opus v3, reconfirmed v4.

### 3.2 — Production environment verification
Run `node scripts/verify-report-generation-env.mjs` in production-like envs. Walk `.env.example` for Ziina, Inngest, Upstash, Anthropic, fallback LLM, ephemeris, `JOB_TOKEN_SECRET`, `BYPASS_SECRET`, `NEXT_PUBLIC_URL`. Verify Ziina + Upstash manually (script doesn't fully cover them). **Source:** GPT-5.5 v2, script identified v4.

### 3.3 — `/api/health` + Sentry
Health endpoint: 200 with `{ok, supabase, ziina_configured, inngest_configured, upstash_configured, ephemeris, anthropic_configured, build, ts}`. 503 only on report-blocking deps (Supabase, Ziina config for paid, Inngest when strict, ephemeris). Analytics degraded → 200 with `degraded` field.

Sentry: server + client + edge. PII scrubbers required. CSP `connect-src` in `next.config.mjs:46` updated to include Sentry hosts **before** SDK init in production. Event context allowed: `user_id`, `report_id`, `plan_type`, `generation_trace_id`, route, phase, sanitized error code. Forbidden: name, birth date/time/city, current city, email, IP, full request body, report text. **Source:** GPT-5.5 v2 shape, Opus v3 PII rule, GPT-5.5 v4 sequencing.

### 3.4 — Citation truth (code change + audit)
- Change prompts in `src/lib/agents/NativityAgent.ts:25,61` and `src/lib/agents/ForecastAgent.ts:80` from `[[SOURCE:CHAPTER:VERSE]]` mandatory to "cite only metadata actually present in retrieved context; source title alone is acceptable; do not invent verse numbers."
- Patch the extractor at `src/lib/reports/postProcess/extractCitations.ts:16` to accept `SOURCE`, `SOURCE:CHAPTER`, and `SOURCE:CHAPTER:VERSE` forms.
- Patch `src/components/report/ScriptureFootnotes.tsx:47` to render "Ch." only when chapter is present and "v." only when verse is present.
- Remove or condition the footer line about "scholarly editions" at `ScriptureFootnotes.tsx:59`.
- Manual audit 3 reports (1 free, 1 paid/bypass 7-day, 1 monthly if available). Every footnote ties to retrieved metadata or it doesn't ship.
**Source:** Opus v3 audit gate, GPT-5.5 v4 code patch upgrade.

### 3.5 — Hero TRUST_STATS removal + footer support email
- Remove or replace the four entries in `src/components/landing/Hero.tsx:5`. The third and fourth ("18 hourly Vedic windows/day" and "24h no-questions refund") are factual product claims and can stay. The first ("12,000+ charts generated") and second ("★ 4.8 from 340+ seekers") must go unless tied to live instrumentation by Sun 16:00. **Replace with:** "Swiss Ephemeris", "Lahiri ayanamsa" (already in `Hero.tsx:34`) — make those the trust line.
- Add `support@vedichour.com` to `src/components/shared/Footer.tsx:12` as a visible link. **Source:** GPT-5.5 v4 (both findings).

### 3.6 — Payment smoke + idempotency proof
- One Ziina create-intent → verify → `payment_status=paid` row on dashboard.
- Re-fire `/api/ziina/verify` with same intent; finalizer returns "already done" via early return at `src/lib/ziina/finalizeIntent.ts:223`. No double-dispatch.
- RLS verified: browser cannot insert/update `payment_status='paid'` directly. Migration at `supabase/migrations/20260514_lock_down_paid_report_status.sql:4,12`.
**Source:** Consensus v2 onward.

### 3.7 — End-to-end report smoke (free + paid/bypass)
- Free preview generates without payment.
- Paid/bypass 7-day report completes. Bypass single-user limit means one start, watched to completion via existing `e2e/report-generation-bypass.spec.ts:32`. Must finish with non-empty days; "status=error with non-empty error" is NOT a launch pass.
- Domain checklist on the successful report:
  - Lagna = sidereal/Lahiri ascendant rashi ✓
  - Moon sign + current Mahadasha/Antardasha dates plausible ✓
  - Dasha lord sequence correct (Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury→Ketu→Venus) ✓
  - Hora schedule rotates in Chaldean/day-lord order ✓
  - Choghadiya + Rahu Kaal present for current city/date ✓
  - No fatalism in Rahu Kaal copy ✓
  - No medical / legal / guaranteed-outcome claims ✓
  - No system prompt leak, no other-user PII bleed ✓
  - PDF downloads ✓
**Source:** Opus v3 domain list, GPT-5.5 v4 (added system-prompt-leak + cross-user PII items).

### 3.8 — Existing test suite green
```
npm run typecheck
npm run lint
npm run test
npm run build:reliable
npm run test:playwright
npm run test:e2e:bypass
npm run rag:compare
node scripts/verify-report-generation-env.mjs
node scripts/verify-reports-observability.mjs
```
Fix reds only. No new tests. **Source:** GPT-5.5 v2, expanded v4.

### 3.9 — Burst test (rate-limit-aware)
- 3 same-user `/api/reports/start` calls — first two return 202, third returns 429 (per-user limit 3/60s at `src/app/api/reports/start/route.ts:35`). Confirms the limiter works.
- 50 RPS for 60s on `/api/health` via autocannon. p95 ≤ 300ms (calibrated to runbook).
- 5× sequential Ziina create-intents in 30s. All return 200, all 5 distinct intent IDs.
- **Not 20 concurrent paid reports.** v3's burst spec was wrong: bypass uses one `BYPASS_USER_ID` so 20 concurrent would hit per-user rate limit, not stress the queue.
**Source:** GPT-5.5 v4 correction.

### 3.10 — Cost caps, support runbook, privacy text
- Anthropic spend cap at 3× expected daily, alert at 80%.
- Inngest concurrency cap on report function.
- Sentry spike protection on; daily quota set.
- Vercel bandwidth alert at 80% of plan.
- Upstash Redis confirmed in production (else rate-limit silently falls back to in-memory per `src/lib/api/rateLimit.ts:34`).
- Support runbook: 2h SLA paid / 8h SLA free, four monitoring tabs (Sentry, Vercel, Supabase, Ziina), five standard macros (paid-no-report, retry-failed, wrong-birth, refund, Hindi-availability).
- Privacy text update if Sentry ships: list Sentry as sub-processor. If PostHog ships, list it + analytics consent banner for IN/UK/EEA.
**Source:** Opus v3 (cost, support), GPT-5.5 v4 (Upstash + privacy sequencing).

---

## 4. Items removed from earlier P0 lists (with reason)

| Item | Removed where | Reason |
|---|---|---|
| Extract `orchestrator.ts` modules | v3 from v1 | High regression risk in launch window |
| Extract `/api/reports/start` modules | v3 from v1 | Same |
| Scaffold `next-intl` routes | v3 from v1 | Blast radius on auth, payments, sitemap |
| 12 new E2E specs | v3 from v1 | Existing tests sufficient for launch |
| Python pytest at 70% coverage | v3 from v1 | New test infra is itself a risk |
| Admin refund route | v3 from v1 | Manual SOP through Ziina dashboard |
| k6 at 200 RPS | v3 from v1 | Wrong metric for LLM workflow |
| Placeholder testimonials | v3 from v1 | Banned outright (v2 bright line) |
| Currency switcher widget | v3 from v1 | Auto-geo-currency already wired |
| Dashboard tab rebuild | v3 from v1 | Tabs already exist |
| Onboarding 3-step refactor | v3 from v1 | Already 3-step |
| Dashboard "Generate" CTA add | **v5 from v3** | CTAs already exist at four locations (v4 catch) |
| Report failed-state retry/trace UI | **v5 from v3** | Already present at `report/[id]/page.tsx:1081,1116` (v4 catch) |
| `approx_birth_time` flag persistence | **v5 from v3** | UI already warns; pipeline change not free; defer to post-launch (v4 catch) |
| LCP ≤2.0s mobile fast-3G as hard gate | **v5 from v3** | Optimization target, not no-go (v4 calibration) |
| 20-VU report-start burst | **v5 from v3** | Conflicts with per-user rate limit; replaced with 3-same-user test (v4 catch) |
| PostHog unconditional P0 | **v5 from v3** | Needs privacy + consent path; ship only if consent ready by Sun 15:00 (v4 catch) |
| Mon 04:00 content audit | **v5 from v3** | Too late to recover before 06:00 launch; moved to Sun 23:00–Mon 00:30 (v4 catch) |

---

## 5. Final timeline (18 hours, anchor Sun 12:00 IST)

| Time IST | Owner | Work | Gate at end |
|---|---|---|---|
| Sun 12:00–12:45 | Release Captain | Freeze scope, assign lanes, env checklist | P0 board locked |
| Sun 12:45–14:15 | Platform | `/api/health`, Sentry + PII scrubbers + CSP, env verifier | Health JSON works on staging; Sentry test event visible |
| Sun 14:15–15:30 | Domain | Citation prompt + extractor + UI patch | No verse citation unless metadata present |
| Sun 15:00 | Privacy | **Decision point: is PostHog ready (privacy text + consent)?** | If no → PostHog out of Mon launch |
| Sun 15:30–16:30 | Marketing/UI | Remove Hero fake stats, footer support email, optional Hindi waitlist (static only) | Landing proof honest |
| Sun 16:30–18:00 | Payments | Ziina create-intent → verify smoke, duplicate idempotency, RLS check | No double-finalize |
| Sun 18:00–19:30 | Reports | Free + paid/bypass report smoke + PDF | One paid/bypass complete |
| Sun 19:30–21:00 | QA | typecheck, lint, vitest, RAG compare, reliable build | All required commands green |
| Sun 21:00–22:00 | Browser QA | Playwright matrix, mobile screenshots, Lighthouse, console | No blocking UI/mobile issue |
| Sun 22:00–23:00 | Operations | Cost caps active, support macros, privacy text | Runbook ready |
| **Sun 23:00–Mon 00:30** | **Aarsh + Domain reviewer** | **Content gate: Aarsh reads one paid report end-to-end; reviewer spot-checks two more** | **Content approval / NO-GO** |
| Mon 00:30–02:00 | Release Captain | Go/no-go review | **Final launch decision** |
| Mon 02:00–04:00 | Platform | Production deploy, `/api/health` prod, one production bypass report | Production smoke green |
| Mon 04:00–06:00 | All | Watch Sentry/Vercel/Supabase/Ziina; support inbox open | **Launch at 06:00** |
| Mon 06:00–23:59 | All | Active support per §3.10 SLAs | Stable launch day |

**Fallback launch: Mon 18:00 IST** if any P0 gate red at Mon 02:00. Do not lower gates to preserve the 06:00 date.

---

## 6. Approval gates (final answer: 2)

After reading v4's argument that the third gate is what gives the launch its actual safety, and that the timeline anchor of Sun 23:00 (not Mon 04:00) leaves real recovery time, the final answer is **two binding approval gates** plus one optional staging review:

1. **Sun 23:00 → Mon 00:30 — Content gate (Aarsh + domain reviewer).** Reads one paid report end-to-end. Spot-checks two more. Approve / no-go.
2. **Mon 00:30 → 02:00 — Final go/no-go (Aarsh).** All gates green or written waiver? Launch 06:00 or fallback 18:00.

Optional but cheap: a Sun 22:00 staging URL review (5 min). Not a binding gate; if Aarsh is around, look. If not, the content gate at 23:00 covers it.

**Why two not three:** v3's separate "positioning copy approval Sat evening" gate is already past (it's Sunday morning). The work it would have approved (Hero fake stats removal, hero copy, pricing text, refund text) is in the §3.5 + §3.10 P0 items and gets reviewed as part of the content gate.

---

## 7. Risk register (deduped, severity-ranked)

| Risk | Severity | Source | Mitigation |
|---|:---:|---|---|
| Hallucinated scripture verse on paid report | **Critical** | v3 elevated, v4 confirmed | §3.4 code patch + manual audit |
| Hero `TRUST_STATS` ships unchanged ("12,000+ charts", "★ 4.8") | **Critical** | v4 | §3.5 remove or replace |
| Mahadasha calculation edge case on first paid user | High | v3 | Content audit on 3 reports; fast refund SOP |
| Anthropic API outage during launch | High | v1 | Mid-stream fallback exists; Inngest retries |
| Anthropic spend spike | Medium | v3 | §3.10 spend cap + alert |
| Sentry/PostHog CSP misconfig drops events silently | Medium | v3, v4 | §3.3 CSP update before SDK; verify staging events in <60s |
| Ziina webhook intermittency | Medium | v1, v2 | Redirect verify is primary; webhook optional per `webhook/route.ts:35` |
| First paid user stuck >5 min generating | High | v2, v3 | Health + logs + 30-min support trigger |
| Upstash absent in prod → in-memory rate-limit fallback | Medium | v4 | §3.10 verify Upstash live |
| Support overflow Mon 02:00–08:00 IST | High | v3 | §3.10 runbook + Sentry/Vercel/Supabase/Ziina tabs open |
| Privacy policy stale w/r/t Sentry/PostHog | Medium | v3, v4 | §3.3 update before SDK; PostHog gated on consent |
| Inngest backlog > worker capacity | Medium | v3 | §3.10 concurrency cap |
| Citation parser drops valid source-only marker → empty footnote | **High** | v4 | §3.4 extractor patch |
| Footer missing support email | Low | v4 | §3.5 add link |
| Mobile keyboard hides submit on iOS | Medium | v1 | Playwright mobile run at Sun 21:00 |
| Lighthouse mobile <85 on landing | Low | v4 | Fix obvious asset only; do not redesign |
| Hindi waitlist component activates locale routing accidentally | Low | v3 | Static component only; no route registration |

---

## 8. Lane assignments (5 lanes, disjoint write scopes)

| Lane | Owner | Write scope | Read-only |
|---|---|---|---|
| Release Captain | Architect / Aarsh | `.launch-plan/`, runbook | Everything |
| Platform | Backend agent | `/api/health/route.ts`, `next.config.mjs` (CSP), Sentry config, env diffs, cost caps | Pipeline files |
| Payments | Backend agent | Ziina smoke scripts, refund SOP | Payment files |
| Domain | Jyotish QA | Citation prompts, `extractCitations.ts`, `ScriptureFootnotes.tsx`, audit reports | Orchestrator |
| Product/UI | Frontend agent | `Hero.tsx`, `Footer.tsx`, landing copy, privacy page text | Reports/payments |

**Critical write ordering:** Platform must ship CSP update **before** Sentry init in production, or telemetry drops silently.
**Forbidden cross-edits:** No lane edits `orchestrator.ts` or `/api/reports/start/route.ts` without Release Captain approval.

---

## 9. Acceptance criteria (every P0 has a measurable pass)

| P0 | Pass = |
|---|---|
| 3.1 Freeze | No diff on `orchestrator.ts` or `start/route.ts` between Sun 12:00 and Mon 06:00 |
| 3.2 Env verify | `verify-report-generation-env.mjs` exits 0 against prod env |
| 3.3 Health + Sentry | `/api/health` returns 200 with all deps healthy; deliberate test exception appears in Sentry within 30s; no PII in event |
| 3.4 Citation | All footnotes in 3 audit reports tie to retrieved metadata; no invented verse numbers |
| 3.5 Hero + footer | TRUST_STATS removed or replaced with provable claims; `support@vedichour.com` visible in footer |
| 3.6 Payment | Create-intent → verify → paid row; duplicate verify idempotent; no client-side paid write |
| 3.7 Report smoke | Free + paid/bypass report complete with all domain fields and PDF |
| 3.8 Test suite | typecheck, lint, vitest, build, playwright, e2e:bypass, rag:compare all green |
| 3.9 Burst | 3-same-user gets {202, 202, 429}; health 50 RPS p95 ≤300ms; 5× Ziina intent → 5 distinct IDs |
| 3.10 Ops | Cost caps live; Upstash confirmed; support runbook printed; privacy text updated; macros drafted |

---

## 10. Rubric self-score

| Dimension | v5 score | Justification |
|---|:---:|---|
| 1. Feasibility in remaining window | 9 | 10 P0 items, ~18h, every item under 90 min of focused work |
| 2. Technical depth | 9 | File:line cites for every action; LOC verified against this checkout |
| 3. Sequencing | 9 | Health + CSP before SDK; citation patch before content audit; content gate at 23:00 not 04:00 |
| 4. Testing rigour | 8 | Existing suite + payment idempotency + content audit + correct burst test; new tests deferred |
| 5. Domain fidelity | 9 | Lahiri/dasha/hora/Choghadiya/Rahu Kaal all gated; citation truth as code change |
| 6. UX / design realism | 9 | No surface rebuilds; only the three real bugs (Hero stats, citation UI, footer email) touched |
| 7. i18n / market fit | 9 | English-first, INR/AED/USD already auto-geo, Hindi waitlist optional + static |
| 8. Observability | 9 | Sentry definite, PostHog conditional on consent, /api/health shape locked, CSP-before-SDK |
| 9. Risk management | 9 | Three critical risks named; gates with no-go criteria; Mon 18:00 fallback; cost caps |
| 10. Autonomy | 9 | Two binding approvals (content + final); everything else objective |
| **Total** | **89/100** | |

Higher than v3's self-score of 88 because v5 incorporates v4's three concrete catches (Hero, citation code path, content-gate timing) that v3 missed.

---

## 11. Score sheet across all versions

| Dimension | v1 | v2 | v3 | v4 | **v5** |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Feasibility | 5 | 9 | 9 | 9 | **9** |
| 2. Technical depth | 8 | 9 | 9 | 9 | **9** |
| 3. Sequencing | 6 | 9 | 9 | 9 | **9** |
| 4. Testing rigour | 8 | 8 | 8 | 8 | **8** |
| 5. Domain fidelity | 7 | 8 | 9 | 9 | **9** |
| 6. UX realism | 6 | 8 | 9 | 8 | **9** |
| 7. i18n / market fit | 6 | 8 | 9 | 8 | **9** |
| 8. Observability | 8 | 9 | 9 | 8 | **9** |
| 9. Risk management | 6 | 9 | 9 | 9 | **9** |
| 10. Autonomy | 7 | 9 | 8 | 8 | **9** |
| **Total** | **67** | **86** | **88** | **85** | **89** |

v1 score per GPT-5.5 v2 critique. v2/v4 self-scores. v3 self-scored 88; GPT-5.5 v4 critique scored v3 at 79. v5 self-scored, awaiting v6 audit.

---

## 12. Pattern observations across the loop

**What each model is observably better at — final reading:**

| Strength | Opus 4.7 | GPT-5.5 xhigh |
|---|:---:|:---:|
| Strategic framing & narrative | ✅ | adequate |
| File-level / line-level accuracy | weaker (v1 wrong; v3 partial) | **✅ strongest** |
| Ruthless triage / scope cutting | weaker (v1 had 14 P0) | **✅ v2 cut to 8** |
| Operational depth (cost, support, runbook, privacy) | **✅ v3 added** | weaker |
| Compliance / jurisdictional thinking | **✅ v3 DPDP** | adopted v3's framing |
| Domain-protective gates (citation truth) | **✅ v3 elevated** | refined to code patch |
| Finding hidden launch bugs in the codebase | weaker | **✅ v4 found Hero, citation extractor, footer** |
| Bright-line policy rules (no fake proof) | weaker (v1 permissive) | **✅ v2 origin** |
| Calibrating timeline to actual window | weaker | **✅ v4: 18h not 24h** |
| Recognising current-state CTAs already exist | weaker | **✅ v4 dashboard CTA catch** |
| Consolidating fairly (this v5) | testing now | testing in v6 |

**Net pattern.** Opus is consistently stronger at narrative, strategic framing, and adding operational nets (cost, support, performance, compliance). GPT-5.5 is consistently stronger at file-level repo reading, ruthless triage, and catching things that already exist or don't exist in code. **Both passes are necessary; neither model alone produced the v5 plan.**

---

## 13. The single most important paragraph

The launch goal is **not** "finish the roadmap." It is **not** "build the world's top 0.001% product in 18 hours" — that ambition was an aspiration that produced the wrong plan (v1) and got corrected to the right plan through this loop. The launch goal is: **no user pays Ziina and receives an ungrounded, broken, unobservable, or unrecoverable Vedic astrology report.** Everything in this plan is downstream of that single sentence. The Hero fake stats removal, the citation code patch, the content audit at Sun 23:00, the rate-limit-aware burst test, the cost caps, the support runbook — all of it serves that one goal.

If a P0 gate is red at Mon 02:00 IST, the launch shifts to Mon 18:00 IST. No exception. No lowered gates. The fallback exists to keep the principle inviolate.

---

## 14. Ready for v6 red-team

This v5 is now ready for GPT-5.5 xhigh to red-team — find what we missed, find what we over-engineered, find what the loop's collaborative bias glossed over.

**End of v5.**
