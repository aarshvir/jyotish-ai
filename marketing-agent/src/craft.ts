/**
 * Reel craft law — visual/audio/storyboard principles from config/reel-craft.json.
 * Complements config/playbook.json (retention research). When they conflict on look/sound/
 * storyboard gates, reel-craft wins; playbook wins on platform-retention claims.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CRAFT_FILE = resolve(ROOT, 'config', 'reel-craft.json');

export interface CraftPrinciple {
  id: string;
  category: string;
  principle: string;
  detail: string;
  source: string;
  verifiedOn: string;
  confidence: string;
}

export interface ReelCraft {
  version: string;
  updatedOn: string;
  northStar: string;
  principles: CraftPrinciple[];
  storyboardGate: string;
  neverGenerateVisual: string[];
  neverGenerateCopy: string[];
}

const EMPTY: ReelCraft = {
  version: '0.0.0',
  updatedOn: 'never',
  northStar: '',
  principles: [],
  storyboardGate: '',
  neverGenerateVisual: [],
  neverGenerateCopy: [],
};

/** Read craft config. Never throws — malformed file must not take the creative loop down. */
export function loadReelCraft(): ReelCraft {
  try {
    const j = JSON.parse(readFileSync(CRAFT_FILE, 'utf8'));
    const principles = (Array.isArray(j?.principles) ? j.principles : [])
      .map((e: Record<string, unknown>) => ({
        id: String(e?.id ?? '').trim(),
        category: String(e?.category ?? 'visual').trim(),
        principle: String(e?.principle ?? '').trim(),
        detail: String(e?.detail ?? '').trim(),
        source: String(e?.source ?? 'unsourced').trim(),
        verifiedOn: String(e?.verifiedOn ?? 'unknown').trim(),
        confidence: String(e?.confidence ?? 'inherited').trim(),
      }))
      .filter((e: CraftPrinciple) => e.id && e.principle);
    return {
      version: String(j?.version ?? '0.0.0'),
      updatedOn: String(j?.updatedOn ?? 'unknown'),
      northStar: String(j?.northStar ?? ''),
      principles,
      storyboardGate: String(j?.storyboardTemplate?.gate ?? ''),
      neverGenerateVisual: Array.isArray(j?.neverGenerate?.visualTropes)
        ? j.neverGenerate.visualTropes.map(String)
        : [],
      neverGenerateCopy: Array.isArray(j?.neverGenerate?.copyTropes)
        ? j.neverGenerate.copyTropes.map(String)
        : [],
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[craft] config/reel-craft.json unreadable (${msg.slice(0, 80)}) — prompts run without it.`);
    return EMPTY;
  }
}

/**
 * Prompt block for ideate/script. Empty string when nothing loaded so callers can
 * interpolate unconditionally.
 */
export function craftBlock(
  categories?: string[],
  heading = 'REEL CRAFT LAW — visual/audio/storyboard (config/reel-craft.json; wins over playbook on look/sound)',
): string {
  const c = loadReelCraft();
  const rows = categories?.length
    ? c.principles.filter((e) => categories.includes(e.category))
    : c.principles;
  if (!rows.length && !c.northStar) return '';

  const body = rows
    .map(
      (e) =>
        `- [${e.category}${e.confidence === 'verified' ? '' : ` · ${e.confidence.toUpperCase()}`}] ${e.principle}\n` +
        `    ${e.detail}\n` +
        `    (source: ${e.source} · last checked ${e.verifiedOn})`,
    )
    .join('\n');

  const never =
    c.neverGenerateVisual.length || c.neverGenerateCopy.length
      ? `\nNEVER GENERATE (hard reject):\n` +
        [...c.neverGenerateVisual.slice(0, 12), ...c.neverGenerateCopy.slice(0, 8)]
          .map((x) => `- ${x}`)
          .join('\n')
      : '';

  const gate = c.storyboardGate ? `\nSTORYBOARD GATE: ${c.storyboardGate}` : '';

  return (
    `${heading} (craft v${c.version}, updated ${c.updatedOn}):\n` +
    (c.northStar ? `NORTH STAR: ${c.northStar}\n` : '') +
    `${body}${never}${gate}\n`
  );
}
