# Release 01: Coherent Free Experience

Status: final local implementation tested and independently reviewed. Ready to publish; not yet deployed at this checkpoint. Exact source and live verification will be recorded in RELEASES/03-live-verification.md after publication.

Baseline source and production rollback: dfb774a972430790fa565dfe5d4529c2e5d3796f, dpl_HDo6n8DPc1tjSfGTJ5XYY6S9pW3D. Immediate original-local rollback: 241610c7f90c58c9340698fba5c3649751c7f71c. See BRIEF.md and the private sibling backup's ROLLBACK-INSTRUCTIONS.md.

## Behavioral Changes

- Name the free chart output accurately and show a real calculated example for a fictional reader.
- Remove the calculator email/blur wall and implicit newsletter enrollment.
- Deliberate time/certainty and city selection, validated dates/times/coordinates, explicit unknown/approximate limits, bounded requests and stale-response protection.
- Optional device-only calculator save, seven-day expiry on access, restore/edit/clear and scoped privacy controls.
- Existing account retrieval, sign-in recovery and failure states; keep owner filtering and entitlements.
- Default-off new commercial checkout; clear free/paid availability in visible offers, server payment guards, metadata, JSON-LD and assistant summaries.
- Task-based searchable help, clear calculation/interpretation distinction, refreshed foundational guides and optional captioned actual walkthrough.
- Optional analytics controls and accurate privacy disclosures without an extra required onboarding step.

No database schema migration, customer-data deletion, ad/outreach launch, purchased capacity or payment activation is part of this release. Existing paid/completed report access is not disabled by the new purchase gate. Restoring source cannot restore a database or external service state.

## Required Gates

1. Final typecheck, unit/contract regressions, lint and production build.
2. Desktop/mobile/narrow browser tasks and public-route sweeps against the production build.
3. Significant independent findings closed; final diff includes analytics/retrieval/content changes.
4. Exact commit and rollback refs recorded before deployment.
5. READY production deployment SHA matches the release, followed by versioned live free-task/offer/help/ownership-boundary checks.
6. Update request ledger, evidence and scoped post-implementation scorecards. Real-user and paid-eligibility gaps remain explicit.

## Local Gate Results

- Production build and typecheck passed. Lint passed with unchanged legacy warnings, no errors. Local background-job webhook fails closed without its signing key; not a production configuration attestation.
- 108 test files, 1,173 tests passed, zero skipped/failed, including optional mocked browser fixtures. Raw: artifacts/customer-experience/final-unit-tests.json.
- Production-build task run: 33/33 passed at 1440/390/320, eleven journeys per width. Raw: artifacts/customer-experience/task-results.json.
- Public production-build sweep: 35/35 passed at desktop/mobile across seventeen routes plus fictional chart API. Raw: artifacts/customer-experience/after-local/journeys.json.
- All three independent security/recovery findings closed. Account export/delete integrity checked with isolated mocks, not real deletions. Source/file rollback separately restored and verified.
- No schema migration, customer deletion, paid model batch, campaign launch or purchase. Existing account entitlements remain guarded and available in source; new checkout defaults off.
