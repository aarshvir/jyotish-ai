# VedicHour marketing engine

On 2026-09-08 this folder was reduced to a tombstone because a second engine was fighting `marketing-agent/`. This tree is a founder-requested reset (2026-10-10). It does not post, and the GitHub workflow is `workflow_dispatch` only so it cannot double-publish beside `marketing-agent`.

`npm run cycle` ranks ideas, lints copy, records the live site, stages posts, and refuses ad spend.

```bash
cd marketing-engine
npm install
npm test
npm run cycle
```

Needs Chrome (`CHROME_PATH` or `/usr/bin/google-chrome-stable`), ffmpeg, and espeak-ng. No API keys.

Read `docs/ARCHITECTURE.md` and `docs/PLATFORM_RULES.md` before posting anything.

Play `out/<date>/two-slots-same-tuesday/reel-9x16.mp4` with sound. The voice is espeak-ng on purpose. If it is mute, the cycle should have thrown.
