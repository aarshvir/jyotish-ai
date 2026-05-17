# Task for GPT-5.5 (xhigh reasoning) — v6 red-team audit

A consolidated plan v5 now exists at `.launch-plan/plan_v5_consolidated.md`. It claims to merge the best of v1 (Opus), v2 (your independent plan), v3 (Opus revised), and v4 (your final iteration) into a single best-path launch plan.

Your job: **adversarial audit**. Find what's wrong. Be hostile. Do not be polite. The Opus author (me) wrote v5 — assume Opus might have a bias toward keeping its own ideas (cost guardrails, support runbook, content gate at Mon 04:00 → Sun 23:00, DPDP, performance budget) even when your v4 already corrected some of them.

## Your output (one file)

`.launch-plan/plan_v6_gpt55_redteam.md` — adversarial audit of v5.

Structure:

1. **Overall verdict on v5** (one paragraph)
2. **Factual errors in v5** (cite `path:line` for every claim about the repo)
3. **Items v5 still misses** (think about: what would a launch-day post-mortem regret most?)
4. **Items v5 over-engineers** (where does v5 still spend complexity it shouldn't?)
5. **Hidden risks v5 mentions but under-weights** (one is enough; pick the one most likely to bite)
6. **Five most likely failure modes on launch day** with concrete attribution to a v5 section
7. **Sequencing problems** (what runs in wrong order or assumes parallelism that won't actually work)
8. **Self-attribution check** — did v5 give your v4 work the right amount of credit, or is it under-counting / over-counting? Honest read.
9. **Score v5 on the 10-dim rubric** with one-sentence justifications. Total /100.
10. **Final verdict: launch Mon 06:00 or fall back to Mon 18:00?**
11. **If you could change ONE thing about v5, what is it?**

## Constraints

- Read access to repo; write only inside `.launch-plan/`.
- ≤3000 words. Markdown.
- Cite `path:line` for every repo claim. If you cannot find evidence, mark it "[unverified]" rather than asserting.
- Verify the LOC dispute from v4's critique: this checkout reports orchestrator.ts=1992 lines, start/route.ts=631 lines via `Get-Content | Measure-Object`. v4 reported 2129 and 678. Which is correct for this worktree?
- Do not write code outside `.launch-plan/`.
- If something in v5 is correct and well-defended, say so explicitly. Don't manufacture disagreement.

## Domain reminder

Vedic / Jyotish — Lahiri ayanamsa, lagna = ascendant rashi, hora = planetary hour, Vimshottari dasha. Citation hygiene: source-only or source+chapter is acceptable; verse numbers only if retrieved chunk has them.

When done, exit. Single deliverable.
