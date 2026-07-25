/**
 * Proof for the localized-caption path: renders Devanagari caption plates in Chromium and
 * overlays them onto an already-rendered reel through the REAL assembly code (finish()).
 *
 * Why this exists: this ffmpeg's libass does no Indic complex shaping (pre-base i-matra never
 * reorders, reph never lifts, conjuncts never ligate), so localized reels take the Chromium
 * plate path instead. This script is how you re-verify that path after touching localize.ts,
 * and it costs $0 — no Sarvam, sync.so or fal calls.
 *
 *   npx tsx scripts/verify-localized-captions.ts <slug> [lang]
 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../src/db/index';
import { renderCaptionPlates, plateOverlayGraph, LANGUAGES } from '../src/render/localize';
import { finish, verifyOutput } from '../src/render/assemble';
import { resolveTools, probeDuration } from '../src/render/ffmpeg';
import type { CreativeScript } from '../src/render/types';

// Deliberately chosen to exercise every shaping feature libass gets wrong:
// i-matra (दिन, विधि), reph (सूर्य), conjuncts (क्षण, स्वागत), below-base (मूड).
const SAMPLE = {
  hi: {
    hook: 'आपका दिन एक मूड नहीं है',
    lines: ['हर दिन में अठारह planetary hours होते हैं', 'क्षण, विधि और सूर्य की गति', 'स्वागत है VedicHour में'],
    cta: 'मुफ़्त Kundli — bio में link',
  },
  ta: {
    hook: 'உங்கள் நாள் ஒரே மனநிலை அல்ல',
    lines: ['ஒவ்வொரு நாளிலும் பதினெட்டு planetary hours', 'VedicHour உங்கள் நேரத்தை காட்டுகிறது'],
    cta: 'இலவச Kundli — bio-வில் link',
  },
} as const;

async function main() {
  const slug = process.argv[2] ?? 'the-18-hours-presenter';
  const lang = (process.argv[3] ?? 'hi') as keyof typeof SAMPLE;
  const spec = LANGUAGES[lang];
  const sample = SAMPLE[lang];
  if (!spec || !sample) throw new Error(`no sample text for "${lang}" (have: ${Object.keys(SAMPLE).join(', ')})`);

  const outDir = resolve(ROOT, 'output', 'reels', slug);
  const stitched = resolve(outDir, 'work', 'stitched.mp4');
  if (!existsSync(stitched)) {
    throw new Error(`${stitched} not found — run \`npm run loop:render -- --dry --keep\` first so the intermediates survive.`);
  }

  const { ffprobe } = resolveTools();
  const totalSec = await probeDuration(ffprobe, stitched);
  const work = resolve(outDir, `_captiontest-${lang}`);
  mkdirSync(work, { recursive: true });

  const each = (totalSec - 5.2) / sample.lines.length;
  const plan = [
    { text: sample.hook, start: 0, end: 2.6, kind: 'hook' as const },
    ...sample.lines.map((text, i) => ({ text, start: 2.6 + i * each, end: 2.6 + (i + 1) * each, kind: 'caption' as const })),
    { text: sample.cta, start: totalSec - 2.6, end: totalSec, kind: 'cta' as const },
  ];

  console.log(`[captiontest] ${spec.label} (${spec.nativeName}) — ${plan.length} plates`);
  const plates = await renderCaptionPlates(plan, resolve(work, 'plates'));

  const outPath = resolve(work, `final-${lang}.mp4`);
  const creative = { hook: sample.hook, cta: sample.cta } as CreativeScript;
  await finish({
    stitched, work, outPath, creative, segments: [], totalSec, music: null,
    plates: plateOverlayGraph(plates, 'pbase', 'v'),
  });

  const v = await verifyOutput(outPath, totalSec, resolve(work, 'frames'), 4);
  console.log(`[captiontest] ${v.ok ? 'PASS' : 'PROBLEMS: ' + v.problems.join('; ')}`);
  console.log(`[captiontest] ${outPath}`);
  for (const f of v.frames) console.log(`[captiontest]   ${f}`);
}

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(1);
});
