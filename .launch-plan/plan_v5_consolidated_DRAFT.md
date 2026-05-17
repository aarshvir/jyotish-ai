# Plan v5 — Consolidated Best-Path (DRAFT — slots populated after v4 lands)

**Author:** Claude Opus 4.7 (1M ctx), consolidating v1 (Opus) + v2 (GPT-5.5 own) + v3 (Opus revised) + v4 (GPT-5.5 final)
**Discipline:** Pure consolidation. No new ideas. Every item attributed to its source.
**Status:** DRAFT — sections marked [V4-PENDING] fill after Codex v4 returns.

---

## 1. Provenance — who said what

| Item | v1 (Opus) | v2 (GPT-5.5) | v3 (Opus) | v4 (GPT-5.5) | Decision |
|---|:---:|:---:|:---:|:---:|---|
| Production env verification via `.env.example` walkthrough | — | ✅ | ✅ adopted | [V4] | **IN** |
| `/api/health` endpoint with explicit dep shape | proposed shapeless | ✅ defined shape | ✅ adopted | [V4] | **IN** |
| Sentry + PostHog with CSP update | ✅ named tools | ✅ added CSP step | ✅ adopted + PII rule | [V4] | **IN** |
| Citation truthfulness audit | retrieval@5 only | "soften display" | ✅ promoted to P0 launch-blocker | [V4] | **IN (Opus push)** |
| Payment smoke + idempotency proof | partial | ✅ explicit | ✅ adopted | [V4] | **IN** |
| Free + paid report smoke with field assertions | ✅ | ✅ stronger | ✅ adopted | [V4] | **IN** |
| Existing test suite all green | ✅ | ✅ explicit commands | ✅ adopted | [V4] | **IN** |
| UX polish on onboarding/dashboard/report | proposed rebuild | ✅ polish-only | ✅ adopted + named edits | [V4] | **IN** |
| English-first + Hindi waitlist | scaffold next-intl | ✅ no scaffold | ✅ adopted + msgs/en.json prep allowed | [V4] | **IN** |
| orchestrator.ts extraction | ✅ P0 | ❌ explicitly forbidden | ❌ adopted forbid | [V4] | **OUT (Opus reversed)** |
| `next-intl` route restructuring | ✅ P0 | ❌ explicitly forbidden | ❌ adopted forbid | [V4] | **OUT (Opus reversed)** |
| 12 new E2E specs | ✅ P0 | ❌ overreach | ❌ deferred to P1 | [V4] | **OUT (Opus reversed)** |
| Placeholder testimonials / fake counters | "if real not ready" | ❌ banned outright | ❌ adopted ban | [V4] | **OUT (Opus reversed)** |
| Admin refund route | ✅ P0 | ❌ manual SOP only | ❌ adopted SOP only | [V4] | **OUT (Opus reversed)** |
| k6/autocannon at 50 VU / 200 RPS | ✅ P0 | ❌ wrong metric | ❌ replaced with §6 burst test | [V4] | **OUT (replaced)** |
| Content correctness gate (3rd approval) | — | — | ✅ Opus added | [V4] | **IN (Opus new in v3)** |
| Performance budget with numbers | partial | mentioned runbook only | ✅ explicit table | [V4] | **IN (Opus new in v3)** |
| Cost guardrails (Anthropic, Inngest, Sentry quotas) | — | — | ✅ Opus added | [V4] | **IN (Opus new in v3)** |
| Support runbook + first-response SLAs | — | mentioned email only | ✅ Opus added | [V4] | **IN (Opus new in v3)** |
| DPA / PII compliance + DPDP cookie consent | partial | "no PII in events" | ✅ explicit | [V4] | **IN (Opus new in v3)** |
| 20-VU burst test on staging | — | rejected load tests | ✅ pushed back | [V4] | **IN (Opus push)** |
| `messages/en.json` prep without activation | — | "no scaffold" | ✅ refined: prep ok, no read | [V4] | **IN (refined)** |
| Five-lane agent topology (Release Captain + 4) | 6-agent topology | ✅ 5-lane | ✅ adopted | [V4] | **IN (GPT-5.5 model)** |
| Three approval gates (vs two) | 2 | 2 | 3 | [V4] | **IN (Opus push)** |

[V4-PENDING] Append any new items Codex v4 introduces.

---

## 2. Final P0 (the consolidated list — every plan agreed or Opus added with reason)

**Section adopted intact from v3 §2 with v4 amendments.**

1. Production env verification via `.env.example` walkthrough.
2. Public health endpoint `/api/health`.
3. Sentry + PostHog with CSP update + PII rule.
4. Citation truthfulness audit (3 reports, hard gate on chapter metadata).
5. Payment smoke + idempotency proof.
6. End-to-end free + paid report smoke with field assertions.
7. Existing test suite all green.
8. UX polish on onboarding/dashboard/report (named edits only).
9. Honest English-first launch + Hindi waitlist.

[V4-PENDING] If Codex v4 proposes a 10th item that's launch-blocking, add here with attribution.

---

## 3. Final risk register (deduped union of v1+v2+v3+v4)

| Risk | Source | Mitigation | Severity |
|---|---|---|---|
| Anthropic API outage during launch | v1 | mid-stream fallback + retry UI | High |
| Ziina webhook intermittency | v1 | redirect verify is primary; webhook optional | Medium |
| Sentry/PostHog CSP misconfig silently drops events | v3 | CSP update **before** SDK init | Medium |
| Hallucinated scripture verse on a paid report | v3 | §2.4 audit + §4.1 content gate | **Very High** |
| Anthropic spend spike on launch day | v3 | spend cap + alert | Medium |
| Support overflow Mon morning while Aarsh asleep | v3 | runbook + monitoring posture | High |
| Privacy policy stale w/r/t Sentry+PostHog | v3 | update + DPDP cookie consent for IN | Medium |
| OG image / share preview missing | v3 | Sat quick check | Low |
| Mahadasha calculation off on first paid user | v3 | content audit catches | Very High |
| Inngest backlog grows faster than workers | v3 | burst test + concurrency cap | Medium |
| Broad refactor destabilizes launch | v2 | forbidden until Mon 18:00 | High |
| LLM quota/latency breaks completion | v2 | fallback chain + Inngest retries | High |
| Citation markers invent ch/verse | v2 | manual audit + downgrade display | High |
| Hindi copy damages trust | v2 | English + waitlist | Medium |
| Telemetry blocked by CSP | v2 | `connect-src` update | Medium |
| Exact birth time unknown | v2 | approx-time flag + confidence note | Medium |
| First paid user stuck generating | v2 | health + logs + stale cleanup + SOP | High |
| Mobile keyboard hides submit on iOS | v1 | tested form layout | Medium |

[V4-PENDING] Codex v4 will likely add 1-3 risks not yet on this list.

---

## 4. Final timeline (consolidated — ~18h remaining from Sunday morning)

Adopting v4's window framing once v4 lands. v3 had this draft:

| Block | Window IST | Lanes | Output |
|---|---|---|---|
| A | Sun 02:00–08:00 | Domain/QA, Platform | Env audit, RAG citation audit, two bypass reports, CI green |
| B | Sun 08:00–14:00 | Platform, Payments | /api/health, Sentry+PostHog, CSP, Ziina smoke, refund SOP |
| C | Sun 14:00–18:00 | Product/UI, Domain/QA | Onboarding autosave + approx-time, dashboard CTA, report failed-state, landing copy |
| D | Sun 18:00–22:00 | All | Burst tests, Lighthouse, mobile manual, staging E2E |
| **GATE 2** | Sun 22:00 | Aarsh | Staging review |
| E | Sun 22:00–Mon 04:00 | Domain/QA | Final content audit on 3 paid reports |
| **GATE 3** | Mon 04:00 | Aarsh | Reads one paid report end-to-end |
| F | Mon 04:00–06:00 | Platform | Production deploy, smoke, alerts armed |
| G | Mon 06:00+ | All | Active support coverage |

[V4-PENDING] Replace with v4's timing if it argues for different blocks.

---

## 5. Approvals (final answer)

**Three approvals — minimum.** All other gates are objective (CI green, test pass, content audit pass).

1. Saturday evening: positioning/pricing/refund copy.
2. Sunday 22:00: staging URL smoke.
3. Monday 04:00: content correctness on one paid report.

[V4-PENDING] If v4 argues for a 4th approval, evaluate.

---

## 6. Acceptance criteria per P0 item

| P0 item | How to know it passed |
|---|---|
| Env verification | Production env vars list matches `.env.example` keys; no placeholder secrets |
| `/api/health` | 200 on staging with all deps healthy; 503 on simulated downstream failure |
| Sentry + PostHog | Test exception in staging arrives in Sentry within 30s; PostHog funnel shows ≥1 event per stage on a smoke run |
| Citation audit | All citation markers in 3 sample reports trace to retrieved chunks with chapter metadata, OR display copy downgraded |
| Payment smoke | One Ziina intent → verify → paid row; duplicate verify is idempotent; no client write to `payment_status='paid'` |
| Report smoke | Free + paid report renders Lahiri lagna, dasha lord, hora schedule, Choghadiya, Rahu Kaal, ≥1 citation, PDF |
| Test suite | typecheck + lint + vitest + build:reliable + test:playwright + test:e2e:bypass + rag:compare all green |
| UX polish | Approx-time toggle works; dashboard CTA visible at all states; report failed-state shows trace_id + support email |
| English-first launch | Landing copy reads correctly; Hindi waitlist captures email; no fake testimonials, no fake counters |

---

## 7. Self-scored rubric per version (final scoreboard)

| Dimension | v1 | v2 | v3 | v4 | v5 |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Feasibility in remaining window | 5 | 9 | 9 | [V4] | [V5] |
| 2. Technical depth | 8 | 9 | 9 | [V4] | [V5] |
| 3. Sequencing | 6 | 9 | 9 | [V4] | [V5] |
| 4. Testing rigour | 8 | 8 | 8 | [V4] | [V5] |
| 5. Domain fidelity | 7 | 8 | 9 | [V4] | [V5] |
| 6. UX realism | 6 | 8 | 9 | [V4] | [V5] |
| 7. i18n / market fit | 6 | 8 | 9 | [V4] | [V5] |
| 8. Observability | 8 | 9 | 9 | [V4] | [V5] |
| 9. Risk management | 6 | 9 | 9 | [V4] | [V5] |
| 10. Autonomy | 7 | 9 | 8 | [V4] | [V5] |
| **Total** | **67** | **86** | **88** | [V4] | [V5] |

v1 score from GPT-5.5's critique. v2 self-scored. v3 self-scored. v4 will self-score and score v3. v5 will be scored by Codex v6 audit.

---

## 8. Pattern observations (which model is observably better at what)

| Strength | Opus 4.7 (v1, v3) | GPT-5.5 (v2, v4) |
|---|---|---|
| Strategic framing & narrative | ✅ stronger | adequate |
| File-level accuracy (line numbers, current state) | weaker (v1 had 5+ stale facts) | ✅ stronger |
| Ruthless triage / scope cutting | weaker | ✅ stronger |
| Operational realism (runbooks, support, costs) | ✅ stronger (added in v3) | weaker (didn't propose) |
| Compliance / privacy considerations | ✅ stronger (DPDP, DPA added) | weaker (mentioned PII but not legal) |
| Domain rigour (citation truth as gate, not display) | ✅ stronger (v3 promoted) | weaker (v2 said "soften copy") |
| Pure consolidation discipline | TBD (this v5) | TBD (v4) |
| Defending the existing codebase from premature refactor | weaker (v1 proposed) | ✅ stronger (v2 forbade) |

[V4-PENDING] Re-validate after v4.

---

## 9. The single most important sentence in this entire plan

Adopt the bias from GPT-5.5 v2: **the launch goal is to ship the existing product with confidence, not to turn the launch window into a platform upgrade.** Then layer in the safety net from Opus v3: **a content-correctness gate is mandatory before paid users see paid reports**, because a hallucinated scripture verse in week 1 is worse than launching a day late.

---

[Section to populate after v4 + v6 land — final adoption table from each version's recommendations]
