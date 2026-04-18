# Pillar 3 — Cosmic Forge UX (Live Telemetry + North-Indian Rasi Chart)

**Status:** blocked on Pillar 1 (needs per-phase `step.run` names so telemetry has real labels) and preferably Pillar 2 (so the chart annotation shows real citations).

---

## Goal

The wait becomes the sell. A user watching the "generating" screen sees a real-time, terminal-style feed of phase names ticking by, their North-Indian rasi chart assembling with planets snapping into houses as calculation completes, and zero anxiety that the process stalled.

**Acceptance:**

1. `GeneratingScreen` consumes Supabase Realtime events on `reports` row + the existing SSE stream at `/api/reports/[id]/stream` — no HTTP polling in the main loop (keepalive only).
2. Phase telemetry lines are **real phase names** from Inngest's `step.run('phase:ephemeris', ...)` calls, not a rotating fake-message list.
3. A North-Indian rasi chart SVG renders on the report page (`NativityCard.tsx`), with planetary glyphs that animate (via framer-motion) from off-canvas into their correct house between 300–800ms each, staggered, when the nativity data arrives.
4. Zero Lighthouse regression on LCP; animations run at ≥ 55fps on mid-range mobile (tested via Chrome DevTools mobile emulation → Performance tab).

---

## Files Cursor will change / create

### Realtime consumer

- `src/app/(app)/report/[id]/page.tsx` — remove `startPollingForReport` main loop. On mount:
  - Open SSE connection to `/api/reports/[id]/stream`; push each `event: phase` frame into a `telemetryLines` state (keep last 8 lines visible, full history in a scroll-up drawer).
  - Subscribe to Supabase Realtime for `UPDATE` on `reports where id=eq.<id>`; on every change recompute `displayProgress` and `status`.
  - Keep a 15s watchdog: if no frame and no realtime event in 15s, fall back to one `/api/reports/[id]/status` fetch.
- `src/components/report/LiveTelemetry.tsx` — new. Renders the terminal-style line stack; supports `type: 'phase' | 'info' | 'warn' | 'done'` coloring.

### Phase name contract

- `src/lib/reports/phases/*.ts` — each phase begins with `await dbSetProgress(reportId, phaseSlug, pct)` where `phaseSlug` is a stable human-readable string:
  - `"ephemeris:fetching"`, `"ephemeris:parsing"`
  - `"nativity:lagna-analysis"`, `"nativity:yoga-detection"`, `"nativity:synthesis"`
  - `"daily:score-computation"`, `"daily:commentary-batch-1/3"`, `"daily:commentary-batch-2/3"`, `"daily:commentary-batch-3/3"`
  - `"hourly:muhurta-grid"`, `"hourly:commentary-batch-1/6"` … `"hourly:commentary-batch-6/6"` (always 18 buckets/day — locked contract)
  - `"months:synthesis"`, `"weeks:synthesis"`, `"finalize:persist"`
- `src/lib/reports/orchestrator.ts` — the thin compatibility wrapper must emit the same phase slugs so dev-inline runs look identical to Inngest runs.

### North-Indian rasi chart

- `src/components/chart/RasiChartNorthIndian.tsx` — new. Pure SVG component:
  - 1:1 square, 4 diamonds + 8 triangles = 12 house regions following standard North-Indian layout (lagna at top-center diamond, proceeding counter-clockwise).
  - Props: `lagna: ZodiacSign`, `planets: Array<{ name, sign, house, retrograde, combust, exalted, debilitated }>`.
  - Uses deterministic `getHousePolygon(houseNum)` geometry.
  - Each planet is a `<motion.g>` with `initial={{ x: <off-canvas>, opacity: 0 }}`, `animate={{ x: <targetX>, opacity: 1 }}`, `transition={{ delay: planetIndex * 0.12, duration: 0.55, ease: 'easeOut' }}`.
  - Retrograde shown as subscript "R"; combust as amber halo; exalt/debilitate as small chevron.
- `src/components/chart/RasiChartSouthIndian.tsx` — new. Square 4x4 grid variant; same prop API.
- `src/components/chart/houseGeometry.ts` — pure math module, fully unit-tested.
- `src/components/report/NativityCard.tsx` — add a toggle "North | South" that swaps chart components; persist choice in localStorage.

### Polish

- `src/components/report/GeneratingScreen.tsx` — extract from the page file for testability; add sub-component `PhaseProgressBar` with per-phase segments (not one global bar).
- `src/app/(app)/report/[id]/loading.tsx` — skeleton that matches the GeneratingScreen silhouette so there is no layout jump.

---

## Cursor does

1. Define the phase-slug enum in `src/lib/reports/phases/slugs.ts`; update all phase files from Pillar 1 to emit these exact strings.
2. Update the SSE route `src/app/api/reports/[id]/stream/route.ts` to forward `generation_step` + `generation_progress` on every DB change; frame format: `event: phase\ndata: {"slug":"...","pct":42,"t":<ms>}\n\n`.
3. Build `LiveTelemetry.tsx` and the Realtime consumer in the report page. Unit test the watchdog fallback with fake timers.
4. Build `houseGeometry.ts` with helper functions and tests (`getHousePolygon`, `getPlanetAnchor`, `getPlanetStackOffset` for multiple planets in one house).
5. Build `RasiChartNorthIndian.tsx` + `RasiChartSouthIndian.tsx`. Storybook optional; for now, add a dev preview route `src/app/(dev)/chart-preview/page.tsx` gated to `NODE_ENV !== 'production'`.
6. Integrate both into `NativityCard.tsx` with toggle.
7. Add framer-motion variants: `hidden | visible` with staggered `transition`; test on mobile emulation.
8. Extract `GeneratingScreen` into its own component; add `PhaseProgressBar` with segments for each of the 7 phases.
9. `npx tsc --noEmit`, lint, test.

---

## You do

### 1. Decide chart style default

Question for you in chat: "Should the default be **North Indian** or **South Indian**?" (Most of India's professional astrologers use North Indian; Tamil Nadu / SriLanka users prefer South Indian.) Cursor will set the default accordingly; users can still toggle. Reply in chat before Cursor starts step 5.

### 2. Supply a brand font for telemetry (optional but recommended)

1. Go to https://fonts.google.com/ → search **"JetBrains Mono"** → click "Download family".
2. Unzip; drag `JetBrainsMono-Regular.woff2` into `src/app/fonts/` in VS Code.
3. Tell Cursor in chat "font uploaded" and it will wire it into `LiveTelemetry.tsx`. If you skip this, Cursor falls back to the system `ui-monospace` stack.

### 3. Visual QA after deploy

1. Open https://www.vedichour.com, purchase a 7-day report with a Ziina test card.
2. On the generating screen, record a 60s screen capture (built-in Xbox Game Bar on Windows: `Win+G` → Record). Review:
   - Telemetry lines appear every 1–3s, not bursting at the end.
   - Phase labels are human-readable ("hourly: commentary batch 4/6"), not numeric IDs.
   - Progress bar has visible per-phase segment boundaries.
3. Open the completed report → Nativity section → toggle between North and South chart; both should render in <50ms with planets animating in.
4. On mobile (DevTools → toggle device toolbar → Pixel 7 profile → CPU throttling 4×) repeat and confirm no jank.

### 4. Rollback

- If the rasi chart performs poorly on low-end devices: set Vercel env `CHART_ANIMATIONS=false`; framer-motion animations short-circuit to static renders.
- If SSE is unstable behind a corporate proxy: the 15s polling watchdog already covers this; no action needed.

---

## Acceptance check

```powershell
npx tsc --noEmit
```

Manual browser:

- DevTools → Network → filter `stream` → see one long-lived `/api/reports/<id>/stream` connection with periodic `phase` frames.
- DevTools → Network → filter `ws` → see one Supabase websocket with `postgres_changes` subscription.
- DevTools → Performance → record 10s during generation → frame rate ≥ 55fps.

---

## Out of scope for Pillar 3

- Upsell UI / pricing changes (Pillar 4).
- Any server work beyond the SSE forwarding tweak.
