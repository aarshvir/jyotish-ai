# Scoring Protocol

Rubric frozen on 2026-10-15 before scenario grades were assigned. Baseline: `dfb774a972430790fa565dfe5d4529c2e5d3796f`. Scores are synthetic, source-audited heuristic judgments about affordances and constraints, not observed task-success rates, satisfaction or predictive validity. Read the independent research-operations review for judgments recorded before other grades.

| Dimension ID | Dimension | Weight |
|---|---|---:|
| purpose | Understanding purpose and value | 15 |
| fit | Fit to customer need | 10 |
| action | Entry and next-action clarity | 10 |
| result | Usefulness of the first result | 15 |
| effort | Required effort (higher means less unnecessary effort) | 15 |
| continuity | Continuity and repeat use | 10 |
| pricing | Pricing and availability clarity | 10 |
| visual | Visual quality and accessibility | 5 |
| trust | Trust and control | 5 |
| recovery | Recovery and support | 5 |

Weights must sum to 100. Every dimension uses the following anchors; only multiples of 25 are assigned, without scenario-ID offsets or random variation:

| Anchor | Meaning |
|---:|---|
| 0 | Inspected source definitively provides no path to the stated need, or contradicts a necessary condition. Not a substitute for unknown behavior. |
| 25 | Material mismatch, hidden gate, discarded work or misleading certainty obstructs the intended journey. |
| 50 | Partial relevant affordance with substantial effort, unclear availability, narrow continuity or generic recovery. |
| 75 | Clear relevant source path and useful controls, with runtime validation or material secondary limitations remaining. |
| 100 | Complete relevant path, controls and edge-case evidence, independently verified for this scenario. No baseline source-only dimension qualifies. |

Unknown = blank score, evidence or an evidence-gap reference, status unknown and bounds [0,100]. Known source-only scores receive a conservative epistemic interval of +/-12.5, clamped to [0,100]. These intervals are judgment bounds, not statistical confidence intervals. Rendered visual quality/accessibility is blank for all baseline rows; HTML/CSS presence cannot prove usability or contrast. Runtime-result reliability, provider eligibility and real-user comprehension remain unverified even when a source affordance is scored.

For known dimension set K, observed-weight score = sum(w*d)/sum(w for K). Evidence coverage = sum(w for K)/100. Lower/upper full-rubric bounds = sum(w*dimension_bound)/100, including unknown bounds. The observed-weight score is NOT a full 100%-covered score. Subgroups average scenario scores equally within each stratum; evidence coverage and bounds are reported beside them. Scenario counts are balanced experimental design, not estimated audience shares.

Audience-mix sensitivity uses declared alternative group shares; unknown dimensions remain unknown in every mix. Dimension sensitivity doubles one dimension's weight and renormalizes to 100, without changing any grades. No forecasted point gains are promised.

Before and after remain separate: baseline scores are immutable against the production commit. Post-implementation fields remain blank/pending until primary supplies version, relevant source diffs and verification artifacts. Tests may justify a source reassessment only within their evidenced scope; they do not establish real-user performance.

Separate SEO readiness, business readiness and investor evidence assessments must not be included in the CX weighted score. Synthetic scenarios cannot establish demand, retention, conversion or willingness to pay.

Reproduce baseline with `node scripts/customer-experience-assessment.mjs`; validate without rewriting with `node scripts/customer-experience-assessment.mjs --check`. Node standard library only. The script owns generated CSVs and the section below, not other workers' artifacts. The immutable baseline score/evidence columns are compared to existing scorecards on every run; reviewer-count metadata is allowed to change. Six separate AI reviewers are now reported, including Mendel's release/security review. Human users remain zero; resolved inherited models remain unreported.

## Evidence-Gated Post Mode

Use `node scripts/customer-experience-assessment.mjs --post docs/audits/customer-experience-overhaul/2026-10-15/RELEASES/RECEIPT.json` after primary's final checks; `--check --post PATH` reproduces without writes. PATH may instead be a Markdown local-verification receipt containing exactly one fenced JSON object. Primary owns EVIDENCE.md and RELEASES. This generator does not create, invent or attest the release receipt.

The receipt must bind a final version/tag to a complete manifest of all source files used by enabled rules. Working-tree files are hashed as bytes. Git mode requires ref+40-character commit equality and hashes the corresponding git-show bytes. The sorted manifest digest is SHA256 of each `path + NUL + sha256`, joined with LF and a final LF, sorted by `path.localeCompare(otherPath, 'en')`. Each executed-check record and PNG screenshot must bind that same manifest. A changed local source file, moved tag, changed artifact digest, missing marker, failed check, unmatched scope or missing final attestation rejects the run before any output writes.

Calculator rules require ChartTool, BirthDetailsInput, tools/birth/chart/requests/storage and tools/chart/geocode API routes in the manifest, not just headline markers. Chart-first also requires landingCopy. Commercial denial requires availability plus both mutation routes; unavailable-offer-copy requires availability, aiVisibility and pricing page. Task-help requires help page, HelpSearch and articles. Include all additional dependencies and source/test files actually covered by primary's final receipt; these minimum paths are enforced by the generator.

Each check needs an exact artifact JSON pointer to an individual `passed`/`expected` result, not `/stats` totals. Scope explicitly lists devices, task kinds, visits, entry pages and allowed constraint flags; optional scenario IDs narrow it further. Empty flags means no extra constraints covered, not all constraints. No channel, device or condition outside that scope receives a new grade. Matched rules additionally need changed source anchors and specific passed affordance checks. Dependency mode distinguishes real chart backend, mocked dependencies, injected-504/real-retry and public navigation.

Final receipt also requires checksum-bound PNG screenshots at widths 1440, 390 and 320, actual PNG-width validation, declared no-overflow and an executed `layout-basic` check ID. Screenshots/basic layout cannot grade screen readers, contrast, keyboard behavior or full accessibility; visual remains unknown. Source-only post anchors are conservatively capped at 75; this mode never generates 100 scores. All post grades remain synthetic heuristics, even when a narrowly scoped test corroborates the affordance.

Only supported changed dimensions get a post score, bounds, source/check evidence IDs and rule rationale. Other post dimension scores remain blank/not-reassessed; visual stays blank/unknown. An effective post composite explicitly carries forward unreassessed baseline dimensions with their original uncertainty and reports newly evidenced weight separately. It is not a new 400-executed-scenario score. Post aggregates cover group, channel, intent, device and first/return, plus audience/dimension sensitivity; unchanged cells are not silently promoted to verified. No predicted point gain is assigned to a proposed feature.

Default baseline regeneration refuses to erase an existing verified post phase; rerun with its receipt. Post mode is currently limited to verified-local status, not a deployment approval. Privacy-policy, analytics-consent, account-error/deletion and general numerical-validation improvements have no automatic post rule here while their tests/source remain pending. Extend a rule only after inspecting the actual changed source and scope, not to meet a target.

| Rule | Required passed affordances | Eligible kinds | Dimensions reassessed (75 source anchor) |
|---|---|---|---|
| chart-first-entry | chart-known | discover, facts | purpose, action, pricing |
| birth-time-clarity | unknown-no-api, approximate-provisional | facts, verdict, partner, deep | trust, recovery; not numerical accuracy |
| city-choice | city-choice-required, city-edit-invalidates | facts, verdict, partner, deep | action, trust |
| free-verdict | anonymous-doshas-no-lead-write | facts, verdict; excludes uncertain/missing/boundary/offline | fit, result, effort, pricing, trust |
| opt-in-draft-restore | save-seven-days, refresh-no-extra-api, edit-clears-result, clear-calculator-key | facts, verdict; excludes cross-device/new-session/storage/offline/uncertain/missing/boundary | continuity, effort |
| device-save-control | no-default-save, clear-calculator-key | facts, verdict; excludes storage/cross-device | trust for local saving, not analytics consent |
| retry-retains-input | synthetic-504-real-retry | facts, verdict; excludes offline/missing/uncertain | recovery |
| commercial-denial | paid-default-disabled, authenticated-mutation-no-provider-no-write | pricing, payment, forecast, deep | trust; no eligibility approval |
| unavailable-offer-copy | unavailable-offer-visible, paid-schema-suppressed | pricing, discover, forecast, deep | pricing |
| task-help | help-route-and-task-search | help; excludes screen-reader/zoom | purpose, fit, action, result, effort, recovery |

Illustrative pending receipt schema, not execution evidence. Empty placeholders, pending status and final=false intentionally fail validation. Only primary's truthful final receipt may enable rules:

```json
{
  "format_version": 1,
  "verification_status": "pending",
  "real_users_observed": 0,
  "source": {
    "kind": "working-tree",
    "final": false,
    "version": "",
    "manifest_sha256": "",
    "files": [{ "path": "src/components/tools/ChartTool.tsx", "sha256": "" }]
  },
  "checks": [{
    "id": "P-CHART-KNOWN",
    "kind": "executed-check",
    "source_manifest_sha256": "",
    "artifact": "artifacts/customer-experience/task-results.json",
    "artifact_sha256": "",
    "pointer": "/suites/0/specs/0/tests/0/results/0/status",
    "expected": "passed",
    "conditions": "Actual checked condition, viewport, state and task; not a claimed general pass",
    "dependency_mode": "real-chart-backend",
    "affordances": ["chart-known"],
    "scope": {
      "devices": ["desktop"],
      "task_kinds": ["facts"],
      "visits": ["first"],
      "entry_pages": ["/free-kundli"],
      "allowed_flags": []
    }
  }],
  "screenshots": [{
    "viewport_width": 1440,
    "artifact": "artifacts/customer-experience/final-desktop.png",
    "artifact_sha256": "",
    "source_manifest_sha256": "",
    "overflow": false,
    "layout_check_id": "P-LAYOUT-DESKTOP"
  }],
  "enabled_rules": ["chart-first-entry"]
}
```

Add real 390/320 screenshots and their specific passed layout checks, all relevant manifest files, and only actually executed prerequisite checks/rules. A test suite's total passing count is not an individual-check selector. The source, receipt and artifact hashes make the reassessment reproducible without mutating customers, sending emails or invoking a model. Executed-test counters remain separate until overlap can be resolved.

The generator runs 12 in-memory verifier unit cases: accepted protocol fixture; missing final attestation; wrong manifest; source drift; artifact drift; failed executed-check selector; missing 320 screenshot; unknown rule; missing prerequisite; matching scope; excluded device; excluded uncertainty flag. These are tests of the audit code, not browser journeys, releases or customer evidence. Their simulated source/check/image bytes stay in memory, and fixture evidence IDs are removed before published artifacts. No actual post receipt has been processed yet.

<!-- GENERATED-ASSESSMENT:START -->
## Generated Validation

Baseline: `dfb774a972430790fa565dfe5d4529c2e5d3796f`. Exact scenarios: **400**; A/B/C/X: **100 each**. Contexts: **20**; distinct tasks: **100**; each task has **4 substantive states/constraints**. Duplicate context/task/state/constraint tuples: **0**. Scorecard rows: **400**; capability rows: **24**. Ten weights sum to **100**. CSV quote/newline roundtrip, all evidence IDs and baseline anchor markers validated. No random scores or ID offsets.

Overall observed-weight synthetic heuristic: **55.87/100**, mean evidence coverage **88.875%**, full-rubric judgment bounds **[39.14, 72.14]**. Full-coverage score remains blank. This is not an observed customer experience rating.

Equal scenario sampling does not represent audience prevalence. The factorial design deliberately probes shared mechanisms; repeated anchor grades are expected and do not turn the rows into independent empirical observations. Channel/device/first-return comparisons are confounded by different selected tasks and states, not causal effects. Hypothetical assistant/social variants name possible referral contexts, not verified referrals.

Executed baseline browser tasks (primary): **29**, basic passes **27**. Includes **28 public route navigations** (14 routes x 1440/390 widths) and **1 fictional public chart API call**, not 29 completed funnels. /help returned 404 twice; initial free-kundli time was 12:00 twice; one API returned chart facts and locked null doshas. Real users: **0**. Account/payment mutations and model-generation calls: **0**. Reviewer total: **6 separate AI reviewers**, per primary handoff including Mendel release/security; 20 role responsibilities are not 20 reviewers. Research-operations worker count: **1**. Resolved inherited model: **unreported**.

Additional verification counters are separate: Copernicus/public-experience reports 10 supplementary public browser checks; Pauli/calculation-security reports 7 mocked browser regressions within 108 new regressions. Primary task-results.json checkpoint 2026-10-14T20:35:34.486Z records 21/21 local tasks across 1440/390/320, replacing the earlier 2-task desktop checkpoint. These cover chart/save/restore/edit/clear, unknown refusal, city choice, injected failure/real retry, help/device clear, availability/auth and layout. Do not sum baseline29, supplementary10, mocked7 or primary21 into a unique-task total: overlap, dependencies and source freshness differ. Final source/build, privacy/auth-error and analytics-consent verification remain pending.

Browser artifact execution timestamp: 2026-10-14T20:12:35.967Z; SHA256 60d7821a4854aa96cdeb9d62692818ad2dc91262fd79111b927e2f909784d4c5. Source grades were predefined independently; browser evidence corroborates only named baseline observations. All 400 scenario_browser_executed fields are no.

## By Group

| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |
|---|---:|---:|---:|---|
| A | 100 | 57.87 | 92.30 | [42.19, 72.96] |
| B | 100 | 59.07 | 84.20 | [39.73, 76.30] |
| C | 100 | 53.70 | 91.10 | [37.91, 69.31] |
| X | 100 | 52.83 | 87.90 | [36.75, 70.00] |

## By Channel

| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |
|---|---:|---:|---:|---|
| assistant-hypothetical | 36 | 55.72 | 87.64 | [38.59, 72.48] |
| blog-guide | 31 | 56.11 | 86.94 | [38.15, 72.72] |
| bookmark | 72 | 55.14 | 89.65 | [39.05, 71.33] |
| branded-search | 31 | 56.54 | 91.29 | [40.75, 72.06] |
| deep-link | 26 | 54.95 | 88.85 | [38.56, 71.39] |
| direct | 32 | 58.12 | 90.31 | [41.41, 73.67] |
| friend | 33 | 55.41 | 87.88 | [38.37, 72.05] |
| paid-ad-hypothetical | 33 | 55.96 | 88.64 | [39.11, 72.22] |
| problem-search | 25 | 55.75 | 86.80 | [37.92, 72.55] |
| professional-creator | 33 | 54.71 | 89.24 | [38.24, 70.89] |
| social-hypothetical | 48 | 56.57 | 89.06 | [39.93, 72.85] |

## By Intent

| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |
|---|---:|---:|---:|---|
| account-deletion | 4 | 58.59 | 80.00 | [36.88, 76.88] |
| article-bridge | 4 | 61.84 | 95.00 | [46.88, 75.63] |
| auth-recovery | 12 | 69.92 | 80.00 | [45.94, 85.94] |
| availability | 12 | 59.66 | 90.83 | [43.02, 74.90] |
| calendar | 4 | 58.59 | 80.00 | [36.88, 76.88] |
| career-reflection | 4 | 51.56 | 80.00 | [31.25, 71.25] |
| chart-depth | 12 | 52.41 | 83.75 | [33.28, 70.47] |
| city-correction | 8 | 60.90 | 88.75 | [42.97, 76.41] |
| compatibility | 16 | 52.38 | 94.06 | [37.54, 66.99] |
| correction | 12 | 57.95 | 93.75 | [42.55, 72.24] |
| daily-timing | 8 | 57.62 | 80.00 | [36.09, 76.09] |
| dasha | 20 | 59.38 | 94.25 | [44.16, 73.47] |
| data-control | 4 | 60.94 | 80.00 | [38.75, 78.75] |
| data-export | 4 | 58.59 | 80.00 | [36.88, 76.88] |
| date-context | 4 | 62.89 | 80.00 | [40.31, 80.31] |
| day-choice | 4 | 65.79 | 95.00 | [50.63, 79.38] |
| effort-expectation | 4 | 40.63 | 80.00 | [22.50, 62.50] |
| example | 20 | 65.46 | 92.50 | [49.06, 79.69] |
| factor-breakdown | 12 | 52.52 | 95.00 | [38.02, 66.77] |
| first-chart | 28 | 59.10 | 92.68 | [43.19, 73.68] |
| generation-recovery | 4 | 50.00 | 80.00 | [30.00, 70.00] |
| generation-status | 4 | 50.00 | 80.00 | [30.00, 70.00] |
| kaal-sarp | 4 | 42.76 | 95.00 | [28.75, 57.50] |
| lagna | 8 | 57.32 | 93.13 | [41.64, 71.80] |
| location | 4 | 62.89 | 80.00 | [40.31, 80.31] |
| manglik | 16 | 42.60 | 95.00 | [28.59, 57.34] |
| method | 8 | 68.42 | 95.00 | [53.13, 81.88] |
| monthly-context | 4 | 60.53 | 95.00 | [45.63, 74.38] |
| moon | 12 | 58.44 | 95.00 | [43.65, 72.40] |
| nakshatra | 8 | 57.40 | 95.00 | [42.66, 71.41] |
| next-action | 4 | 40.63 | 80.00 | [22.50, 62.50] |
| offer | 4 | 40.63 | 80.00 | [22.50, 62.50] |
| partner-input | 4 | 52.30 | 95.00 | [37.81, 66.56] |
| payment-status | 4 | 53.13 | 80.00 | [32.50, 72.50] |
| pdf | 8 | 58.98 | 80.00 | [37.19, 77.19] |
| privacy | 12 | 68.42 | 95.00 | [53.13, 81.88] |
| profile-correction | 4 | 60.94 | 80.00 | [38.75, 78.75] |
| renewal | 8 | 54.49 | 80.00 | [33.59, 73.59] |
| retrieve | 8 | 61.52 | 80.00 | [39.22, 79.22] |
| retrieve-chart | 4 | 66.80 | 80.00 | [43.44, 83.44] |
| retrieve-pair | 8 | 59.77 | 80.00 | [37.81, 77.81] |
| sade-sati | 4 | 42.76 | 95.00 | [28.75, 57.50] |
| safe-boundary | 16 | 68.42 | 95.00 | [53.13, 81.88] |
| share | 8 | 59.62 | 87.50 | [40.78, 75.16] |
| support | 20 | 7.81 | 80.00 | [3.13, 36.25] |
| timing-method | 4 | 68.42 | 95.00 | [53.13, 81.88] |
| tracking-control | 4 | 68.42 | 95.00 | [53.13, 81.88] |
| vocabulary | 4 | 60.53 | 95.00 | [45.63, 74.38] |
| weekly-context | 4 | 65.79 | 95.00 | [50.63, 79.38] |

## By Device

| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |
|---|---:|---:|---:|---|
| desktop | 190 | 56.42 | 88.26 | [39.33, 72.80] |
| mobile | 195 | 55.67 | 89.23 | [39.16, 71.88] |
| tablet | 15 | 51.41 | 92.00 | [36.63, 67.17] |

## First Versus Return

| Slice | N | Observed-weight heuristic | Evidence coverage % | Full-rubric judgment bounds |
|---|---:|---:|---:|---|
| first | 230 | 55.10 | 90.22 | [39.06, 71.10] |
| returning | 170 | 56.91 | 87.06 | [39.26, 73.56] |

## Lowest Situations

| Scenario | Context | Task | Constraint | Heuristic | Coverage % | Bounds |
|---|---|---|---|---:|---:|---|
| B097 | B05 | support | Provider timeout during existing report | 7.81 | 80 | [3.125, 36.25] |
| B098 | B05 | support | Refresh after progress appeared | 7.81 | 80 | [3.125, 36.25] |
| B099 | B05 | support | Session expiry during wait | 7.81 | 80 | [3.125, 36.25] |
| B100 | B05 | support | Uncertain historical checkout return | 7.81 | 80 | [3.125, 36.25] |
| C057 | C03 | support | Low-score concern from family | 7.81 | 80 | [3.125, 36.25] |
| C058 | C03 | support | Urgent relationship certainty request | 7.81 | 80 | [3.125, 36.25] |
| C059 | C03 | support | Missing time and fearful terminology | 7.81 | 80 | [3.125, 36.25] |
| C060 | C03 | support | Returning reader unwilling to give email | 7.81 | 80 | [3.125, 36.25] |
| X037 | X02 | support | Screen-reader-only interaction | 7.81 | 80 | [3.125, 36.25] |
| X038 | X02 | support | Keyboard at 200 percent zoom | 7.81 | 80 | [3.125, 36.25] |
| X039 | X02 | support | Limited English on narrow phone | 7.81 | 80 | [3.125, 36.25] |
| X040 | X02 | support | Reduced-motion returning reader | 7.81 | 80 | [3.125, 36.25] |

Low dedicated-help entries identify an absent journey, not a score for every existing support option. Low uncertain-time and privacy-gated entries identify shared mechanisms worth fixing.

## Audience-Mix Sensitivity

| Declared mix | A/B/C/X shares % | Heuristic | Coverage % | Bounds |
|---|---|---:|---:|---|
| balanced design | 25/25/25/25 | 55.87 | 88.88 | [39.14, 72.14] |
| first-chart heavy | 55/20/15/10 | 56.98 | 90.06 | [40.51, 72.79] |
| return-timing heavy | 15/55/20/10 | 57.19 | 87.16 | [39.43, 73.77] |
| relationship heavy | 15/20/55/10 | 55.31 | 89.58 | [38.80, 71.33] |
| constraint stress | 15/20/15/50 | 54.96 | 88.30 | [38.34, 71.60] |

## Dimension Sensitivity

Double one dimension weight and renormalize all weights to 100; no changed grades. Unknowns remain blank, not imputed.

| Doubled dimension | Heuristic | Coverage % | Bounds |
|---|---:|---:|---|
| purpose | 57.76 | 90.33 | [41.51, 73.38] |
| fit | 56.06 | 89.89 | [39.76, 71.98] |
| action | 56.47 | 89.70 | [40.09, 72.44] |
| result | 55.65 | 86.09 | [37.67, 72.72] |
| effort | 56.52 | 90.07 | [40.18, 72.34] |
| continuity | 53.70 | 89.89 | [37.51, 69.78] |
| pricing | 55.35 | 89.43 | [39.10, 71.71] |
| visual | 55.87 | 84.64 | [37.28, 73.47] |
| trust | 55.68 | 89.17 | [39.17, 71.96] |
| recovery | 55.45 | 89.40 | [39.00, 71.59] |

## Separate Readiness Scorecards

| Scorecard | Source observations | Unknown evidence | Numeric score |
|---|---|---|---|
| SEO readiness | E16 metadata/assistant content and private-path policy present; free-verdict copy conflict | Indexation, current search traffic, performance and assistant inclusion unverified | Unassigned; do not blend into CX |
| Business readiness | E09-E11 price book/manual renewal/retired-sale guards present; local default-off gate reported | UAE licence/provider eligibility, verified serving costs, refunds/support burden, demand and retention | Unassigned; commercial activation unresolved |
| Investor evidence | Coherent provisional groups and deterministic/interpretive separation | No observed demand, verified cohort retention or unit economics | Unassigned; not inferable from synthetic scenarios |

## Post-Implementation

Pending primary final source version and checksum-bound verification receipt/screenshots. All post numeric fields remain blank. Working-source improvements and differently scoped checks are recorded in CURRENT-STATE.md but do not authorize numeric reassessment by themselves. Use --post RECEIPT only after the documented verification gate is satisfied.

## Evidence Registry

| ID | Kind | Exact anchor | Claim | SHA256 of source/artifact |
|---|---|---|---|---|
| E01 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/landing/Hero.tsx:62` | Free-windows CTA on homepage | 70ad78c8df8a2c13c351343f1faf4d2218afc1e8931273e17fce4398ce5d44b1 |
| E02 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/lib/pricing.ts:26` | Free CTA targets calculator; subscription definitions | 6c9fc650b94008d8c515cbd14010cd737410cb7056e84858d2aa4aff02d645bd |
| E03 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/tools/ChartTool.tsx:38` | Calculator facts, default noon, email lock, transient result and session handoff | 7d68524bec34c9b456b5cf17fb0765c85622fc1337cd533317f8ab7929df5995 |
| E04 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/forms/BirthDetailsInput.tsx:146` | Noon shortcut overstates time-independent precision; first city result selected | e8bed96f474e2af0b859e927ad7e7666b9307a00976b18445a0c4a8d86b3a7d6 |
| E05 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/tools/chart/route.ts:28` | API accepts time without precision metadata; facts endpoint | 0731cb19f927aa6090e88037ffc6e049b817b2e8d527e6924252720802c6d186 |
| E06 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/tools/chart/route.ts:93` | Email reveal writes newsletter subscriber record | 0731cb19f927aa6090e88037ffc6e049b817b2e8d527e6924252720802c6d186 |
| E07 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/lib/onboard/draft.ts:35` | Session-only onboarding input draft; not calculator result retrieval | 62d47f3bd96a2e64c99b1103b1cd54f675fc2b6a98f987721a8cb1363780ae33 |
| E08 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/start/_Quiz.tsx:179` | Quiz progress restore and latest-report renewal prefill | be0c117cdda6e65179e77fbb4495699e45641f3188ee48c3d096d1da9d3c18fe |
| E09 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/pricing/page.tsx:42` | Manual renewal copy and public subscription pricing | 9316382fc2a91ac980e4d759edae74fea7565730aecf6099fe401657d244a385 |
| E10 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/lib/priceBook.ts:169` | Active recommended price set; older cost assumptions remain documentation | a4031b378e07aa6652d1c56871ca5335caab0ddc451ba24d4ab958043031f0e3 |
| E11 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/ziina/create-intent/route.ts:131` | Retired one-time sales rejected; configuration and ownership guards | 403ca6420b714fa0174357920670bfe6141d8b2e2a0a7dee9f36611c62be5637 |
| E12 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/user/charts/route.ts:35` | Account-scoped saved charts; table failures become empty arrays | 642921ce90443cd56b9226aece90aa70cb2f75ee8f173c8fac4aea5b9adb2d87 |
| E13 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/account/export/route.ts:9` | Owner-scoped data export API; no execution here | f85db51824133ba467f2da049aedac22c7ccffb94bb834d4edd83e6b088a5c4e |
| E14 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/account/delete/route.ts:46` | Explicit confirmation and core cleanup failure handling; not transactional | cdbd1484f19f220b3beb47e57352c625a809a225aec566955543d68cb31f85d4 |
| E15 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/methodology/page.tsx:41` | Public method and interpretive-limit disclosure | 61358e5f162f70a86165a062cf73eefe985b0141a46fcb468e11dfa51111030b |
| E16 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/lib/seo/aiVisibility.ts:113` | Crawler boundaries and assistant text; full-results claim conflicts with lock | 646e7b09510116a995283268b93dd1d8e1db5d4c9d5e9b94fa32c28807b7924a |
| E17 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/analytics/PostHogProvider.tsx:99` | Source instrumentation and masking; event delivery not verified | d11b2c8ca329900dac28937ff6c7aedca2909c0ffcfde70a87ac73fce492ecf7 |
| E18 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/login/_LoginForm.tsx:115` | Authentication, recovery and preserved next route | 61120af0af888dea25bc5ee2e556911f2e7be5b942f9eecefa1b704f98419925 |
| E19 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/report/GeneratingScreen.tsx:59` | Progress display with telemetry and feedback; not completion proof | a1e50b99f49ee80b773be3e6bf90327da82fb380693b5816b94cce43a6f736dd |
| E20 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/not-found.tsx:8` | Baseline route inventory has no help page; generic not-found fallback | 3d2f368ef18fddedd75bebc5a96e94b0828fa8810dac0b5d9597c6d385cc769d |
| E21 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/kundali/KundaliForm.tsx:51` | Full compute attempted then facts teaser; form/result not restored | 05e02123e07cf34f30d1f3b5e84fe7c595a1f3d1a9aef8820670839b1e91a495 |
| E22 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/synastry/SynastryForm.tsx:14` | Two birth-detail forms; free total then subscriber factor breakdown | 214e0996cafee34e1eb67c11d6437c649f7f5910517e30167d69a690578ac015 |
| E23 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/chart-privacy/page.tsx:29` | Quiz notice separates service email and optional marketing | 27d2edd5cfcdd59fc14726df0c9a75cc2f45bc9e5832c7f120a4bfd51e4d2a29 |
| E24 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/landing/Testimonials.tsx:62` | Excerpts labelled samples, not customer research | 29caa33653b31acbaeb66b38cb16ef80a4a02f8c3704eb6718921a21feff2ded |
| E25 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/now/route.ts:34` | Timing endpoint current-location/timezone fallback requires verification | c414a351ce48028b9671bcc8a00adb314fe9d4e004858a6d73be87494acae9a9 |
| E26 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/components/shared/ShareResult.tsx:7` | Browser sharing source; privacy/content behavior requires testing | 9978f3fd7211a860041ff36b13ee081befa1b6fc80903a99528c7de2075c8282 |
| E27 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/report/pdf/route.tsx:10` | Authenticated PDF adapter; rendering/delivery unverified | 526926c0697cf55db561a493cffa029c2a36172f64484360de672f209a8b4840 |
| E28 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/api/reports/[id]/calendar/route.ts:2` | Calendar export adapter; timezone delivery unverified | 76e74c92ab74dfbfff811c317f509e6cd43acf55c2a17e397d17f422b0c897ba |
| E29 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/(app)/dashboard/page.tsx:1092` | Dashboard uses email deletion path despite API implementation | cdfeb30e760d363c78f818c9507db01c02f5e712c2f0ffb5797e1b0e04eb2011 |
| E30 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/content/blog/kundli-without-birth-time.ts:8` | Existing time-uncertainty education; article-to-tool consistency required | 8919bd69b6350fc6c18ecd3014fb44e239fc9512052b6a76c8235acdbea31900 |
| E31 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/privacy/page.tsx:31` | General policy lists processors, rights and browser cookie choices; claims are not verified compliance | 553971283e6c5b223da3c4860f1f43c0c90478d4be106fc801ac61c1634dee07 |
| E32 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/hora/page.tsx:47` | Public hora definition distinguishes sunrise-based hora from clock hour | c8f8c26ae5971b7f547bdd729ac4503d924cf3165717f2ce7b55c87d1de162f7 |
| E33 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/what-we-never-say/page.tsx:20` | Public refusal boundary for consequential outcomes | 907d91f598716b890efc2cb451bc7bc97bf72ec6966656840c7b1fee0dbdf07c |
| E34 | baseline-source | `dfb774a972430790fa565dfe5d4529c2e5d3796f:src/app/sample-report/page.tsx:52` | Actual public sample route and output import, not a testimonial | 10ee020a207a644a7f6d6f1e02556ec30dc5218081fddba964baacce48d3256d |
| U01 | evidence gap | `not-executed:rendered-accessibility` | No complete visual, screen-reader, zoom, motion or accessibility evaluation |  |
| U02 | evidence gap | `not-executed:account-provider-result` | Runtime account, paid result, export or provider operation not executed for this scenario |  |
| U03 | evidence gap | `owner-brief:section-12` | UAE licence/permit and provider eligibility unresolved; no activation authority |  |
| B01 | executed-browser-primary | `artifacts/customer-experience/before/journeys.json#before-public-chart-api` | One fictional public chart API returned facts and locked null doshas; not reference-calculation validation | 60d7821a4854aa96cdeb9d62692818ad2dc91262fd79111b927e2f909784d4c5 |
| B02 | executed-browser-primary | `artifacts/customer-experience/before/journeys.json#before-{1440,390}-/free-kundli` | Initial time observed 12:00 at both tested widths | 60d7821a4854aa96cdeb9d62692818ad2dc91262fd79111b927e2f909784d4c5 |
| B03 | executed-browser-primary | `artifacts/customer-experience/before/journeys.json#before-{1440,390}-/help` | Help route returned 404 at both tested widths | 60d7821a4854aa96cdeb9d62692818ad2dc91262fd79111b927e2f909784d4c5 |
| B04 | executed-browser-primary | `artifacts/customer-experience/before/journeys.json#journeys[type=public-route-navigation]` | 28 route navigations, 26 basic passes; no full funnel completion or accessibility proof | 60d7821a4854aa96cdeb9d62692818ad2dc91262fd79111b927e2f909784d4c5 |
<!-- GENERATED-ASSESSMENT:END -->
