# PUBLISH — HR sent two slots

> **DO NOT POST** — status `failed_verification`. Play the mp4 with sound on before anything else. Verification failed or the waveform is not audible.

**Manual publish sheet.** This pack was rebuilt after a human-view audit. The previous sheet claimed `ready_to_post_manually` and `PASS — audio present` because the container had a silent AAC stream. That is not a watchable reel.

Video: missing on this machine. Claimed laptop path: `C:\Users\aarsh\Downloads\jyotish-ai\marketing-agent\output\reels\same-tuesday-two-windows\final.mp4` · 31.2s · 1080x1920

## Human view (2026-08-16)

- Could not play the Windows `final.mp4` from the Cloud workspace.
- Watched the matching-duration dry cut: navy/gold **PRESENTER FRAME** cards, label `Google Veo 3.1 Fast (dry)`, captions including **DO ALAG WINDOWS.**
- ffmpeg: mean volume **-91.0 dB**, silence **0.0–31.2s**. Mute.
- Tracked copy was stub Hinglish; tracked links went to `/pricing`. Both are now rewritten below for the *next* live render — still **do not paste** until you watch an audible presenter file.

## YouTube Short

**Title**
```
HR sent 10am and 5pm. Same Tuesday.
```

**Description**
```
HR sent two slots.

HR sent 10am and 5pm. Same Tuesday. Same call. Not the same hour. See both windows on VedicHour.com. Free to start.

VedicHour rates all 18 hours of your day against your own birth chart, real astronomical data — the same math a careful astrologer uses, explained in plain English, no jargon.

Start free: https://www.vedichour.com/onboard?plan=free&utm_source=youtube&utm_medium=short&utm_campaign=launch_video&utm_content=same-tuesday-two-windows
See the sample: https://www.vedichour.com/sample-report?utm_source=youtube&utm_medium=short&utm_campaign=launch_video&utm_content=same-tuesday-two-windows
Use NEWUSER30 for 30% off your first paid report.

For reflection and planning only. Not medical, legal, financial, or emergency advice.

#vedicastrology #hourlytiming #kundli #vedichour
```

**Tags** (comma-separated, paste into the tags box)
```
vedic astrology, hourly timing, kundli, vedichour
```

## Instagram Reel / TikTok / Facebook Reel

**Caption** (identical across all three; the link goes in bio / link sticker)
```
HR sent two slots. Same Tuesday. Same call. Not the same hour.

Your chart already knows which window is clearer. VedicHour scores all 18 hours of your day against your birth chart — real astronomical data, the same math a careful astrologer uses.

Read the sample: vedichour.com/sample-report

Your Life, Decoded Hour by Hour.
```

**Hashtags**
```
#vedichour #vedictiming
```

## Tracked links (UTM-tagged — use these, not bare vedichour.com)

| Platform | Link |
|---|---|
| Instagram | https://www.vedichour.com/sample-report?utm_source=instagram&utm_medium=reel&utm_campaign=launch_video&utm_content=same-tuesday-two-windows |
| YouTube | https://www.vedichour.com/sample-report?utm_source=youtube&utm_medium=short&utm_campaign=launch_video&utm_content=same-tuesday-two-windows |
| TikTok | https://www.vedichour.com/sample-report?utm_source=tiktok&utm_medium=video&utm_campaign=launch_video&utm_content=same-tuesday-two-windows |
| Facebook | https://www.vedichour.com/sample-report?utm_source=facebook&utm_medium=reel&utm_campaign=launch_video&utm_content=same-tuesday-two-windows |

## Generation cost

| Shot | Role | Model | Billed | Cost |
|---|---|---|---|---|
| s1-open | presenter | Google Veo 3.1 Fast | 8s | $1.2000 |
| s2-hero | broll_hero | Kling 3.0 Standard | 5s | $0.4200 |
| s3-product | product | Product screen capture | 6s | $0.0000 |
| s4-broll | broll | Wan 2.7 | 4s | $0.4000 |
| s5-close | presenter_close | Google Veo 3.1 Fast | 6s | $0.9000 |
| **Total** | | | **29s** | **$2.92** plan · **$0.42** recorded on the last laptop run (Kling only) |

## Verification

PROBLEMS: cannot watch the claimed laptop file from this machine; legacy `PASS — audio present` was a mute-AAC lie (`hasAudio` on the container). Cloud dry sibling: mean -91.0 dB, 31.2s of silence, PRESENTER FRAME cards. Do not post.

On the laptop with `marketing-agent/.env`: `npm run preflight -- same-tuesday-two-windows` (CLEAN) → `npm run approve same-tuesday-two-windows` → `npm run loop:render -- same-tuesday-two-windows` (estimate $2.92, cap $4). Then **play `final.mp4` with sound on** and `npm run loop:review -- same-tuesday-two-windows`.
