# SUPERSEDED — do not run anything in this folder

**2026-09-08.** This was a parallel build of a second marketing engine. It is no longer the
engine. `marketing-agent/` is, and there is now exactly one, because two of them produced two
different answers to the same question and the owner had to arbitrate between them.

**Do not run its scheduler.** `.github/workflows/marketing-engine.yml` must not be merged or
enabled: two schedulers posting from one brand is how the same idea ships twice in different
words. If that workflow is still on a branch somewhere, delete it there.

## What was ported into `marketing-agent/`, and where it went

| From here | To | Note |
|---|---|---|
| `src/render/carousel.ts` | `marketing-agent/src/render/carousel.ts` + `src/loops/carousel.ts` | Re-cut to `docs/DESIGN_SYSTEM.md` (two canvases, self-hosted fonts) and given a fit pass that refuses to write a clipped slide. `npm run loop:carousel -- <slug>` |
| `src/loops/paid.ts` + test | `marketing-agent/src/loops/paid.ts` + test | Facts now read live from Supabase `ziina_payments` instead of a local snapshot table. Prints HOLD. `npm run loop:paid` |
| `src/sources/firstparty.ts` | `marketing-agent/src/sources/firstparty.ts` | Counts only; the per-context hash was dropped as a re-identifier. Feeds `state/sense.json`. `npm run loop:firstparty` |
| `docs/POLICY.md` | `marketing-agent/docs/PLATFORM_POLICY.md` | Citations kept. Its Reddit finding is now enforced in code: `REDDIT_COMMERCIAL_LICENSE`, default off. |

## What was deliberately NOT ported

- **The reel format.** Windows SAPI "Microsoft David" narration over a screen recording is the
  exact thing the owner rejected as sounding AI-generated. `marketing-agent` uses the presenter's
  Veo native in-shot voice, which is both free and the quality bar.
- **`src/generate.ts`.** It falls through to the metered Anthropic API. The subscription-first
  law (`CLAUDE.md` §3) says the `brain()` CLI router handles text reasoning at $0.
- **The duplicate insight / copy / distribute / measure / learn loops.** `marketing-agent`
  already has these, with the owner's 37 filed lessons, the fal budget ledger, and the preflight
  gates wired into them.

Everything below is the original README, kept for reference only.

---

# VedicHour Marketing Engine

Always-on marketing for [vedichour.com](https://www.vedichour.com). Seven loops, one SQLite file, four human actions left to you.

You do: (1) tap Publish on Instagram/carousels, (2) create and fund ad accounts, (3) approve spend increases, (4) approve anything that makes a factual or astrological claim.

Everything else runs here.

---

## What this is not

This is not the older `marketing-agent/` reel factory. That pipeline spent money on renders before catching defects that were already in the JSON. This engine **hard-blocks on the plan** (voice, capture URL, jargon, banned claims, AI-voice tics) **before** any paid API is called.

---

## One-time setup (about 12 minutes)

1. Open a terminal in this folder: `marketing-engine`.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Leave keys blank unless you already have them. The engine runs on free public sources + local tools without keys.
4. Run `npm run doctor`. You want `ffmpeg: ok` and `sqlite: ok`. Playwright comes from the parent app (`jyotish-ai/node_modules`). Claude CLI is used for copy if it is already installed (you pay for Claude Max; this does not add a metered bill).
5. Run `npm run tick`. That is one full day: ideas → copy → assets → ready-to-post pack → dashboard.

Success looks like: a file `out/dashboard.html` opens in your browser and shows ranked ideas, a script that passed the voice lint, and a `ready-to-post/` folder with caption + hashtags + "why this one".

**Do this first:** `npm run doctor` then `npm run tick`.

---

## Daily (after setup)

The GitHub Action `.github/workflows/marketing-engine.yml` runs at 05:30 India time. Or, on this machine:

```
npm run tick
```

Then open `out/dashboard.html`. If a row says **needs your click**, open `ready-to-post/<date>/<slug>/` and post from your phone.

---

## The seven loops

| Loop | Command | What it does |
|---|---|---|
| 1 Insight | `npm run loop:insight` | Pulls first-party categories + legal public signals, ranks a backlog |
| 2 Copy | `npm run loop:copy` | Scripts (EN/HI/Hinglish), carousel, blog, 3 ads. Rejects AI-slop in code |
| 3 Assets | `npm run loop:assets` | Carousel PNGs, sample-report screen capture, 9:16 / 1:1 / 16:9 cuts |
| 4 Distribute | `npm run loop:distribute` | Blog + RSS staged; Instagram/Reels packed for one tap |
| 5 Paid | `npm run loop:paid` | Meta/Google import files. Spend stays **hold** until real paying customers exist |
| 6 Measure | `npm run loop:measure` | Funnel snapshot, CAC/LTV only from real payments, weekly digest |
| 7 Learn | `npm run loop:learn` | Re-ranks ideas, appends `learnings.md` |

---

## What is automated vs what needs your click

See `docs/POLICY.md` for the platform-by-platform table (API allowed / App Review / ban risk). Short version:

- **Automated:** idea ranking, copy + lint, carousels, product capture of `/sample-report`, blog draft, RSS, email draft, ad CSV export, dashboard, weekly learning.
- **Your tap:** Instagram, Threads, Reels. YouTube stays **private/unlisted** until the Google Cloud project passes the YouTube API audit.
- **Your approval:** any astrological claim, any spend above ₹0, any ad going live.
- **Never built:** Reddit scrape, Google autocomplete scrape, Instagram unofficial bots, auto-publish that skips you.

---

## Cost (starting month)

| Item | Cost |
|---|---|
| This engine, SQLite, ffmpeg, Playwright, Windows SAPI or Piper TTS | $0 |
| Claude / Gemini / Codex CLIs you already pay for | $0 extra |
| ElevenLabs | $0 unless you set `ELEVENLABS_ENABLED=1` and a **male** voice id |
| Reddit commercial API | not used |
| Meta/Google ads | $0 until you approve the spend ladder in the dashboard |

If a paid tool is missing, the engine **fails that step out loud** (it will not silently ship a female neural voice or a pricing-page scroll).

---

## Hard rules baked into code

- No invented testimonials, counts, or search volumes.
- Framing: *for reflection and planning, not certainty.*
- Ads never assert the viewer's personal attributes ("struggling in your marriage?").
- Product footage is the **hour-slot report**, never `/pricing`, `/checkout`, `/payment`, `/onboard`.
- No Swiss Ephemeris / Lahiri / ayanamsa / sidereal / whole-sign / vimshottari in **ad** copy.
- Birth data and verbatim onboarding questions never leave the first-party classifier. Ideas store category counts only.
