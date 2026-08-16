# REVIEW — same-tuesday-two-windows

## VERDICT

```
VERDICT: BLOCK
REASON:  3 blocker-severity finding(s); 2 lens(es) returned "block" (human-view (play + listen), hard-rules (deterministic))
REEL:    same-tuesday-two-windows · 31.2s · 1080x1920
PASSES:  3 (0 internal · 0 GPT cross-review · 3 deterministic)
FINDINGS: 3 blocker · 1 major · 0 minor · 0 nit
COST:    $0.0000 (CLI subscriptions are $0; only the paid fallback bills)
STATUS:  awaiting owner approval — nothing publishes until `npm run approve same-tuesday-two-windows`
```

## Passes

| lens | stage | by | verdict | one-liner |
|---|---|---|---|---|
| human-view (play + listen) | deterministic | ffmpeg | **BLOCK** | Unwatchable as a phone viewer: 1 listen/watch blocker(s). |
| hard-rules (deterministic) | deterministic | regex | **BLOCK** | 2 owner hard-rule violation(s) proven from the artifacts. |
| pre-flight (retro, on the creative plan) | deterministic | rules | **SHIP** | The plan this reel came from passes pre-flight. |

## Findings


### BLOCKER

- **[n/a]** Cannot watch this reel like a human. No playable final.mp4. Looked at: /workspace/marketing-agent/output/reels/same-tuesday-two-windows/final.mp4 · MISSING on this machine. Claimed laptop file: C:\Users\aarsh\Downloads\jyotish-ai\marketing-agent\output\reels\same-tuesday-two-windows\final.mp4. Reading publish.json is not viewing — that is how a mute dry card shipped as "PASS — audio present".
  - **fix:** Render a live presenter reel, keep final.mp4 next to publish.json, play it with sound on, then re-run `npm run loop:review`. Never mark ready_to_post from metadata.
  - _needs re-render (costs money) · raised by: human-view_
- **[n/a]** render verification: cannot watch: claimed video path is not on this machine and output/reels/same-tuesday-two-windows/final.mp4 is missing
  - **fix:** Play the mp4. If it is mute or a placeholder, re-render with audible speech. Do not post.
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[n/a]** render verification: legacy PASS — audio present was a mute-AAC lie (hasAudio on the container)
  - **fix:** Play the mp4. If it is mute or a placeholder, re-render with audible speech. Do not post.
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_

### MAJOR

- **[n/a]** render verification: human-view: do not post until a live audible presenter reel exists next to this pack
  - **fix:** Re-render or re-encode to spec.
  - _needs re-render (costs money) · raised by: hard-rules_

## Fix queue (auto-fixable, $0)

The render/assembly path can consume these without spending anything (also in `fix_queue.json` and the `fix_queue` table):

- [n/a] render verification: cannot watch: claimed video path is not on this machine and output/reels/same-tuesday-two-windows/final.mp4 is missing → Play the mp4. If it is mute or a placeholder, re-render with audible speech. Do not post.
- [n/a] render verification: legacy PASS — audio present was a mute-AAC lie (hasAudio on the container) → Play the mp4. If it is mute or a placeholder, re-render with audible speech. Do not post.

## Owner decision

```
npm run approvals                       # see everything waiting
npm run approve same-tuesday-two-windows
npm run reject  same-tuesday-two-windows "why it is wrong"
```

A rejection is filed as a lesson so the same mistake cannot come back.

_Generated 2026-08-16T20:00:31.709Z · run c75c8b7d_