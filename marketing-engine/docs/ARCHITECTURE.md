# Architecture (one page)

Seven loops, one SQLite file (`marketing-engine/data/engine.db`), one command: `npm run cycle`.

| Loop | When | What it does | Spend |
|---|---|---|---|
| 1 Insight | daily, inside cycle | Ranks five seeds. Score = demand × emotion × distance × product fit. Quiz categories come from `src/lib/quiz/questions.ts`. No verbatim user text. Reddit, Quora, and Google autocomplete are not scraped. | $0 |
| 2 Copy | after insight | Lints English, Hinglish, Hindi, carousel, blog, email, and three ads. A personal-attribute ad must fail. | $0 |
| 3 Assets | after copy | Chrome captures live `/start` and `/sample-report`. Kokoro (`am_michael`) speaks each sentence, and the shot for that sentence is already on the named hour. ffmpeg builds 9:16, 1:1, 16:9 and carousel slides. Mute output, or a second of dead air, throws. | $0 |
| 4 Distribute | after assets | Writes the blog into `src/content/blog`, RSS, email files, and `ready-to-post/`. Does not call Instagram or YouTube. | $0 |
| 5 Paid | after measure | Exports Meta and Google campaign JSON at the spend gate. Never imports them. | $0 until you fund an account |
| 6 Measure | before paid | Records paying customers = 0 when no warehouse is connected. Writes `out/dashboard.html` and `out/digest.md`. | $0 |
| 7 Learn | last | Appends `learnings.md`. With no reach, ranks do not move. | $0 |

Schedule: `npm run cycle` on a machine with Chrome and the Kokoro weights, including after a UI change so the capture is re-shot. The GitHub workflow is manual (`workflow_dispatch`) until `marketing-agent`'s scheduler is turned off. Two schedulers posting one brand was the 2026-09-08 failure.

State is the SQLite tables `ideas`, `drafts`, `assets`, `measurements`, `runs`.

## What the brief assumed, and the product does not do

There is no card-required free trial. `src/lib/subscriptions/period.ts` says Ziina cannot charge a card twice (no saved cards, no mandates). A subscription is a paid period you choose again. Free calculators need no card. Monthly is $41.99 / ₹3,999 (`sub_monthly` in `src/lib/ziina/server.ts`). Marketing copy in this engine says that, and the lint rejects "free trial".

No anonymised onboarding-answer warehouse is wired. Idea scores are labeled priors.

ElevenLabs is not configured. The reel voice is Kokoro `am_michael` (neural male). There is no on-camera person in the file: this environment has no render key, and a generated face would be presented as a person who is not there. The manifest says so.
