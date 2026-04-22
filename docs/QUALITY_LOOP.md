# 100-wave quality loop (no new paid tools)

Repeatable diagnostics for VedicHour: **up to 100 waves**, early exit when gates pass. Uses only this repo, Playwright, Vitest, and Cursor agents—no extra SaaS signups.

## One-shot automated gate

From the repo root (after `npm install`):

```bash
npx playwright install chromium
npm run quality-wave
```

This runs, in order:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. `npm run test` (Vitest)
5. `npm run test:e2e` — **skipped** unless `BYPASS_SECRET` is set in `.env.local` (or `E2E_BYPASS` in the environment). Uses the same server URL as Playwright via `E2E_BASE_URL`.
6. `npx playwright test` — UI smoke ([e2e/smoke.spec.ts](../e2e/smoke.spec.ts)).

The script starts **`npm run start`** after the build (production server on port 3000). To use a server you already started:

```bash
set SKIP_SERVE=1
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
npm run quality-wave
```

Skip the long report pipeline test only:

```bash
set SKIP_REPORT_E2E=1
npm run quality-wave
```

## Parallel “agents” (Cursor)

Run **agents 1–4 in parallel** (readonly). Merge outputs into one `quality-wave-N.md`, then run **agent 5** (fixes), then **agent 6** (re-run `npm run quality-wave` or individual steps).

### Agent 1 — UX (heuristics)

**Prompt template:** Using Nielsen-style heuristics, audit these routes for clarity, errors, empty states, and recovery: `/`, `/pricing`, `/login`, `/onboard` (logged-out redirect), `/synastry`, `/refund`. Output a table: `P0|P1|P2|P3`, route, issue, repro.

### Agent 2 — User flows / screens

**Prompt template:** Map the happy paths: landing → pricing → signup/login → onboard → report; note any broken transition or missing deep link. List each screen and whether it requires auth.

### Agent 3 — Visual / typography

**Prompt template:** Check Tailwind tokens, `font-display` / `font-body` / `font-mono`, spacing and contrast at **375 / 768 / 1280** width. Flag overflow, illegible text, or broken layout. Reference Playwright screenshots under `artifacts/test-results` after a failed run.

### Agent 4 — Report pipeline + LLM

**Prompt template:**

1. Confirm `npm run quality-wave` or at least `SKIP_SERVE=1` + `npm run test:e2e` + Playwright against **`next start`** (not `next dev` for long report tests on Windows).
2. **Anthropic vs fallback:** Server logs emit one JSON line per successful LLM call:

   ```text
   {"type":"llm_audit","stage":"nativity","provider":"anthropic","model":"claude-sonnet-4-6","ts":"..."}
   ```

   Grep: `"type":"llm_audit"` in the terminal output during a report run.

3. **Forced fallback (optional, local only):** If `OPENAI_API_KEY` or `GEMINI_API_KEY` is already configured, temporarily rename `ANTHROPIC_API_KEY` in `.env.local` (or set an invalid value), run one report generation, confirm logs show `provider":"openai"` or `gemini` for stages such as `nativity` or `forecast_narrative`. Restore the Anthropic key afterward.

### Agent 5 — Fix

**Prompt template:** Address only **P0/P1** from the merged wave doc; minimal diffs; match existing code style.

### Agent 6 — Validation

Run `npm run quality-wave` (or `npx tsc --noEmit && npm run lint && npm run build && npm run test && npx playwright test`). Sign off the wave or open the next iteration.

## Merge template (`quality-wave-N.md`)

Use one file per wave after agents 1–4 finish:

```markdown
# Quality wave N — YYYY-MM-DD

## Agent 1 — UX (P0–P3)
| Severity | Route | Issue | Repro |
|----------|-------|-------|-------|

## Agent 2 — Flows
- Broken transitions:
- Missing screens:

## Agent 3 — Visual
- Typography / layout:

## Agent 4 — Report / LLM
- quality-wave or test:e2e: PASS / FAIL
- llm_audit lines observed (`grep llm_audit` on server log):

## Merged backlog (fix agent)
- P0:
- P1:

## Validation (agent 6)
- Commands run:
- Result:
```

## Loop rules

- **Wave index:** `N = 1 … 100`.
- **Early exit:** No P0/P1 and `npm run quality-wave` succeeds.
- **Polish-only waves:** If only P2/P3 remain, you may stop the loop and track leftovers in the backlog.
- **Playwright:** Default per-test timeout is **90s** (see [playwright.config.ts](../playwright.config.ts)) so a cold `next dev` compile on the first mobile run does not flake.

## Artifacts

- Playwright HTML report: `artifacts/playwright-report` (gitignored).
- Screenshots / traces: `artifacts/test-results` (gitignored).
