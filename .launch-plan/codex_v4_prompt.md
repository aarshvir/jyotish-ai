# Task for GPT-5.5 (xhigh reasoning) — Final validation + v4

You previously produced v2 (your own plan + critique of Opus v1). Opus has now produced v3 at `.launch-plan/plan_v3_opus_revised.md` which:
- Acknowledges your factual corrections (currency, dashboard tabs, onboarding state, citation surfacing, LOC, Ziina webhook semantics).
- Adopts most of your scope cuts (no orchestrator refactor, no next-intl scaffold, no fake testimonials, dashboard tabs already exist).
- Adds five items you missed or under-weighted: (a) content-correctness gate as a third approval, (b) explicit performance budget with numbers, (c) cost guardrails on Anthropic + Inngest + Sentry, (d) support runbook with first-response SLAs, (e) DPA/PII compliance for Sentry+PostHog including DPDP cookie consent for India.
- Pushes back on you on two points: (1) preparing `messages/en.json` without activating it is fine, (2) a 20-VU burst test against staging is worth doing even though heavy load tests are wrong.

## Your task (two files)

1. **`.launch-plan/plan_v4_gpt55_final.md`** — your final iteration of the plan. This is the version you would actually execute. It should:
   - Adopt anything from v3 you think is correct.
   - Reject anything from v3 you think is wrong, with reasons.
   - Add anything you think v3 still misses.
   - Provide a tight 12–18 hour final timeline (assume execution starts now: Sunday 2026-05-17 morning IST, launch is Monday 06:00 IST).
   - Score itself on the same 10-dimension rubric.
   - Be ≥2000 words. Markdown.

2. **`.launch-plan/plan_v4_gpt55_critique_of_v3.md`** — your critique of v3.
   - Section-by-section verdict on v3.
   - Factual errors if any (cite `path:line`).
   - Items v3 over-reaches on.
   - Items v3 still misses.
   - Five sharpest disagreements.
   - Score v3 1–10 on each rubric dimension.
   - ≤2500 words.

## Rubric (same as v2)

Score on these dimensions 1–10:
1. Feasibility in remaining window
2. Technical depth
3. Sequencing
4. Testing rigour
5. Domain fidelity (Vedic astrology)
6. UX / design ambition vs realism
7. i18n / market fit
8. Observability
9. Risk management
10. Autonomy

## Constraints

- Read access to whole repo; write access only inside `.launch-plan/`.
- Time window: launch is Monday 2026-05-18 06:00 IST. Today is Sunday 2026-05-17. Roughly 18 hours remain.
- Plan must be realistic for the remaining window. If you think the window is too short for a safe launch, say so explicitly and propose Monday 18:00 IST as a fallback.
- Cite `path:line` for any factual claim about the repo.
- Be direct. Disagree freely. No filler.

## Domain reminder

Vedic / Jyotish — Lahiri ayanamsa, lagna = ascendant rashi, hora = planetary hour, Vimshottari dasha. Citation hygiene rule: if a retrieved chunk lacks verse metadata, the model must not invent verse numbers — cite source title only.

When done, exit. Do not edit source code outside `.launch-plan/`.
