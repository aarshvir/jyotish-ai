# Bounded Release Plan

Initial diagnosis recorded before edits. Baseline is verified production commit dfb774a.

1. **One understandable entry:** shorten the homepage around VedicHour, the free birth chart, a concrete sample and a clear next step. Remove redundant promotional sections and unsupported comparisons.
2. **Honest free result:** remove the calculator email wall and implicit newsletter enrollment. Preserve optional consent-based delivery in its existing dedicated flow.
3. **Reliable birth details:** require deliberate time entry; offer explicit uncertainty without inventing a time; confirm city selection; validate dates and coordinates; make stale requests and provider timeouts recoverable.
4. **Continuity with control:** preserve non-account work appropriately, expose editing and clearing, improve returning account empty states and navigation, and keep account data scoped to its owner.
5. **Availability before persuasion:** distinguish free capabilities, existing entitlements and unavailable commercial offers. Keep checkout activation behind explicit commercial readiness; do not activate payments.
6. **Readable product surfaces:** improve neutral visual tokens, contrast, density, mobile navigation, field help, loading/error states and result hierarchy using the existing Next/React stack.
7. **Task-based support and discovery:** implement useful help with search, link relevant articles to tasks, clarify calculation versus interpretation, and repair misleading metadata.
8. **Release proof:** test regressions and changed journeys; independently review; record source, screenshots, counts, deployment and unresolved dependencies.

Primary engineer owns integration, commercial gates, verification harness and release records. Parallel workers have disjoint file ownership for public experience, calculator/input reliability, account/help continuity, research/scenario generation and growth drafts. Review roles are distributed across actual agent executions; role count is not reviewer count.

Release gate: typecheck, appropriate tests, production build, browser flows and no unresolved significant safety or integrity finding. Do not claim deployed or live verified merely because a build passes. Paid generation, real billing, outbound mail and authenticated production account mutation are outside synthetic/browser test scope unless separately evidenced.
