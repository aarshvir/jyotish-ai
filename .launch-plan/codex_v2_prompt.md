# Task for GPT-5.5 (xhigh reasoning)

You are the second-opinion architect for vedichour.com, a Vedic astrology SaaS shipping on Monday 2026-05-18. Today is Saturday 2026-05-16. Window ~48 hours.

The product owner is Aarsh. He has asked the world's top 0.001% architect/coder/designer/UX/astrology-domain expert (you) to:

1. **Write your OWN independent plan** for the 48-hour launch — strategic, sequenced, with technical specs.
2. **Critique the Opus 4.7 plan** at `.launch-plan/plan_v1_opus.md`.

## Constraints

- You have read access to the whole repository at the working directory.
- You have write access only inside `.launch-plan/`.
- You must produce two files:
  - `.launch-plan/plan_v2_gpt55_own.md` — your independent plan, ≥2500 words, structured like a launch playbook. Cover product/market research, knowledge/RAG, testing, refactor loop, dashboard UX, marketing, payments, i18n, onboarding, observability, agent topology, day-by-day timeline, go/no-go gates, risks, post-launch roadmap.
  - `.launch-plan/plan_v2_gpt55_critique.md` — your critique of `plan_v1_opus.md`, structured as: section-by-section verdict, missing items, over-reach items, factual errors, sharpest five disagreements, scoring on a 10-point rubric I describe below.

## Rubric (use this exact rubric in both files)

Score each plan on these dimensions, 1–10 each, with one-sentence justification:

1. **Feasibility in 48h** — can it actually ship Monday?
2. **Technical depth** — file-level changes, schemas, contracts named?
3. **Sequencing** — are dependencies and parallelism handled?
4. **Testing rigour** — defence in depth, adversarial coverage, load model?
5. **Domain fidelity (Vedic astrology)** — does the plan show understanding of lagna, dasha, ayanamsa, hora, RAG citation hygiene?
6. **UX / design ambition vs realism** — top-decile in 48h?
7. **i18n / market fit** — Hindi handled honestly, currency handled?
8. **Observability** — Sentry, PostHog, alerting, health endpoints?
9. **Risk management** — explicit gates, rollback, known unknowns?
10. **Autonomy** — can it run with ≤2 user approvals?

## Style requirements

- Be direct. No filler. No marketing language. No emojis.
- Disagree when you disagree. Don't sandbag to be polite.
- If Opus 4.7 is wrong on a fact (the audit revealed: Ziina not Razorpay, pgvector already wired, scripture corpus exists, Inngest in place, Playwright + vitest in place), call it out specifically.
- If Opus is too conservative or too aggressive, say which and by how much.
- Cite files with `path:line` where relevant — you have repo read access.

## Output discipline

- Markdown, headings, tables welcome.
- Each file <8000 words.
- Save them yourself with the apply tool / shell — do not just print to stdout.

## Domain reminder

This is Vedic astrology, not Western. Lahiri ayanamsa is the convention. Lagna = ascendant rashi. Hora = planetary hour (24/day, 12 day + 12 night). Choghadiya = 8 muhurtas of ~90 min. Rahu Kaal is a daily inauspicious window. Dasha = Vimshottari 120-year cycle. RAG corpus references Brihat Parashara Hora Shastra and similar texts. Cite these properly; do not invent.

When you are done, stop and exit. Do not modify source code outside `.launch-plan/`.
