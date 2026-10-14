# Account Continuity and Help: Independent Review

Recorded 2026-10-15 before implementation and before reading any other reviewer grades. Source: the brief, bounded implementation plan and current local code. One independent worker performed four disciplinary review lenses; these are not four independent reviewers. No live customer records, paid generation, billing or email were exercised.

## Baseline Findings

### Database Architect

- Preserve `reports.user_id = authenticated user.id`, `user_profiles.id = authenticated user.id`, the protected dashboard route, and authenticated account APIs. No service-role client, schema changes, migrations, deletion or ownership bypass is needed.
- Dashboard retrieves forecasts directly, and Kundli/match summaries through `/api/user/charts`. Those are distinct records and must remain retrievable without a new purchase.
- Profile and payment failures are currently converted to blank/default data. Chart retrieval failures disappear entirely. Distinguish unavailable data from a successful empty response, and never overwrite account preferences with fabricated fallback values.
- `/api/user/charts` itself converts table/query errors to empty arrays and relies on existing RLS. UI cannot distinguish those server-side failures without an out-of-scope API change. Preserve this limitation in the release record.
- Browser quiz state (`vh_quiz_state_v1`), onboard drafts (`vh_onboard_draft`) and funnel drafts (`vh_q_state_v1:<slug>`) are not account reports. Clearing these must leave auth sessions, payments, report IDs and account records untouched.

### Customer-Support Reviewer

- Empty dashboard asks for a new forecast; subscription, Kundli, compatibility and pricing promotions dominate before existing reports. Replace unavailable purchase prompts with free chart, sample and retrieval help.
- Dashboard has no task-based help. Add searchable articles covering free charts, unknown/uncertain time, choosing a city, terminology, edit/save/clear, existing reports, unavailable offers, calculation versus generated interpretation, privacy and troubleshooting.
- Settings fields lack explicit label associations. Loading, filter and failure states need accessible announcements and clear next actions.
- Saved report cards call a report still generating after 30 minutes "Failed" and offer "Retry". Age is not proof of failure, and opening a report is not a retry. Describe delayed generation truthfully without starting a duplicate paid task.
- Current login supports email/password, Google, confirmation links and password reset. Error translation returns unknown provider text verbatim, misclassifies every password-related error as a length error, and offers arbitrary one-minute rate-limit timing.
- Existing login client has unhandled network exceptions and a second URL decoding step that can throw on malformed percent text. Login shell must continue to have no submitting credential fields before hydration.

### QA Engineer

- Add focused tests for auth error classification, task search/content, scoped browser-draft clearing and continuity ownership/no-upsell contracts.
- Verify anonymous help/privacy/free routes; mocked authenticated empty/returning/partial-failure dashboard; desktop and narrow mobile layouts; keyboard search and article navigation; storage-denied errors; auth errors and safe redirects. No synthetic browser action may send a real reset email or initiate generation.
- Build/typecheck and existing auth/ownership regressions are meaningful checks, not proof of production readiness. Record actual checks and unresolved integrations separately.

### Lifecycle / Email Strategist (Draft Only)

- Do not promise weekly emails, receipt delivery, instant recovery, automated renewal, response SLAs, or a resend button that the product does not provide.
- Optional draft service copy: "Your existing reports are in your account. Sign in with the same email or Google account you used before. You can also try the free chart without purchasing anything."
- Optional draft recovery copy: "Open the latest confirmation or reset link. Check spam. If the link expired, return to sign-in and request a new password-reset link. Do not share passwords or reset links with support."
- Service-link consent and optional marketing consent remain separate; no campaign or mail was sent and no notification implementation is part of this worker's scope.

## Small Real-User Observation Plan

Recruit six consenting adults: two first-time chart users, two returning customers with existing reports, and two people with uncertain birth times. Include three mobile sessions and at least one keyboard-only session. Use participant-approved details or a fictional example; do not record passwords, email addresses, full birth details or report content.

Observe without coaching: find a free chart; locate time/city assistance; explain one result term; find an existing report; distinguish a device draft from an account record; clear only the device draft; recover from a mocked retrieval failure. Ask participants to explain what is available and whether a purchase is required. Stop before email delivery, real checkout, account deletion or generation.

Record task completion, time, first wrong turn, assistance needed, confidence and any misunderstanding of storage/availability. Fix critical misunderstandings before release. These are planned observations, not completed research or evidence of a 95+ score.

## Implementation and Verification

Completed locally within the original ownership, plus the owner's explicit expansion to `src/app/api/user/charts/route.ts` and its recovery tests for the concrete P2 finding. Baseline findings above are preserved; actionable release-security findings were read only after this baseline was written and after the owner's authorization.

### Changes

- `/dashboard` is now a server page: genuine missing sessions redirect to sign-in with a validated dashboard tab, while real auth-service errors retain retry. It passes `isCommercialCheckoutEnabled()` to the client and subscription card; no commercial environment module is imported by either client component.
- Client dashboard logic lives in `src/components/dashboard/AccountDashboard.tsx`. Existing forecasts, Kundli readings, matches and payments remain available. Unavailable purchases and marketing teasers are absent from empty states; free chart, example and retrieval help are the next actions. Original report/profile owner filters, authenticated APIs and account records are preserved.
- Slow generation is delayed rather than automatically failed. Existing-access forecast actions remain separate from renewal offers, which require the server flag. No generation or renewal was exercised.
- Profile-read errors disable preference saving to prevent fallback values overwriting existing preferences. Settings have associated labels and clarify that changing defaults does not rewrite old reports. No customer preferences were changed during testing.
- The authorized charts API fix adds explicit `unavailable.kundali` and `unavailable.synastry` flags, explicit authenticated-owner filters in addition to RLS, and no-store responses. Each query catches its own database errors/rejections. A successful collection survives the other failing. No database mutation or schema change was made.
- `SavedChartsPanel` retains the last successfully fetched items per failed collection, including HTTP/network failures, and provides retry/refresh. `SavedChartLists` shows unavailable/stale guidance, never a false empty-state message for a failed read. Genuine successful-empty responses do show the appropriate empty state.
- `/help` has search, topic filters, a recoverable empty search and 13 task articles with actual route actions. Both `/help#birth-time` and `/help#compatibility` work; preferred dedicated routes are `/help/birth-time` and `/help/compatibility`. The free-chart article is a short, accessible text walkthrough of the actual task, not a simulated video.
- Help was aligned with the calculator worker's actual implementation: known/approximate/unknown time choices; unknown time stops calculation rather than substituting noon; approximate results are provisional at the entered estimate; opt-in draft/result saving lasts up to 7 days; editing invalidates results; restored results are timestamped snapshots.
- Chart privacy distinguishes device, account, optional email delivery and provider processing. Clear controls include `CALCULATOR_STORAGE_KEY`, onboard/quiz session keys and only the known funnel-draft prefix. Auth, payment references, currency and unrelated storage survive. Confirmation, focus restoration and storage-denial feedback are present.
- Login uses a new scoped client component, preserving supported email/password, Google, signup confirmation, safe redirect and password-reset flows. The old `_LoginForm.tsx` is untouched and no longer used by the page. Network exceptions release busy states; already-decoded URL errors are not decoded again; unknown auth details are not reflected raw. The server shell has no submitting credential inputs.

### Checks Actually Executed

- Focused Vitest: **10 files, 110 tests passed**. This includes **13** route/real-list-render/merge tests for saved-chart recovery, **28** help/storage tests, **23** auth-error tests, **10** account contracts, plus existing login-shell, route-protection, delivery-auth, safe-redirect, entitlement and subscription-period regressions. Database, auth and account writes are mocked.
- Browser: **14 tests passed**, desktop 1280x720 and Pixel 5 mobile, against the existing local Next server at `http://127.0.0.1:3100`, using installed Edge with Playwright. Verified search/reset, dedicated help routes, both task anchors, clear confirmation/cancel, exact calculator/quiz/onboard removal and preservation, denied storage, missing-session redirect, literal-percent auth errors, mocked credential failure and mocked password-reset network failure. All external requests and local API requests were blocked except explicitly mocked auth responses. No mail was sent.
- Public help, birth-time article, chart privacy and login screenshots were captured with no horizontal overflow, then inspected visually. Evidence is in `artifacts/continuity-browser-3100/help-account-continuity-ow-45aa9-render-nonblank-screenshots-{mobile,desktop}/`.
- `git diff --check` passed on owned product paths. Whole-repo typecheck passed after the server auth guard and after the charts API implementation. The final run found only concurrent out-of-scope Set-iteration errors at `src/lib/analytics/consent.ts:33` and `:147`; the primary engineer was informed. Final whole-repo typecheck/build remain primary-owned.
- Initial Playwright launch lacked the bundled Chromium executable; tests were rerun successfully using installed Edge. A requested rerun at port 3110 failed with connection refused because that port was not listening; the final passing rerun used 3100. This is a local server availability limit, not a passing 3110 check.

### Remaining Limits

- No authenticated real-customer browser session, production account mutation, real mail delivery, billed model call, purchase, commit, push or deployment occurred. Returning chart-list rendering and continuity are tested through mocked actual route execution and actual React list rendering, not a live customer account.
- The pre-existing payment-history API can still translate its own database error into an empty array. This worker exposes HTTP/transport failures but was not authorized to change that separate API contract. Likewise subscription-status lookup can represent schema-read issues as absent access depending on its existing helpers; those APIs are outside this worker's scope.
- Account/email/provider deletion still requires the existing privacy contact; no self-serve deletion, resend-confirmation backend, response-time guarantee, provider-retention guarantee or notification campaign was invented. Legal/privacy policy review remains outside this implementation.
- The six-user observation plan above remains a plan. No user interviews, synthetic score inflation, overall release approval or deployed verification is claimed.
