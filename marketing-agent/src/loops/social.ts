import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, BRAND_BRIEF, utm, landingPath } from '../brand';

const SOCIAL = resolve(ROOT, 'output', 'social');
const THEMES = resolve(ROOT, 'config', 'social-themes.json');

interface Theme {
  slug: string;
  topic: string;
  angle: string;
  product: string;
  pillar: number;
}

function landingFor(product: string): string {
  return landingPath(product);
}

function prompt(t: Theme): string {
  return `${BRAND_BRIEF}

Write social posts for VedicHour about: ${t.topic}
Angle: ${t.angle}
Pillar: ${BRAND.pillars[t.pillar - 1]}

For EACH platform, in that platform's voice, on-brand, ending with the exact tagline "${BRAND.taglineClose}". Do NOT include any URL (the link is attached separately). Instagram + Facebook may use 1-2 tasteful emoji; X must be <= 270 characters; LinkedIn is a touch more professional.

Output STRICT JSON, nothing else:
{"instagram":{"caption":"...","hashtags":["#vedichour","..."]},"x":{"post":"..."},"facebook":{"post":"..."},"linkedin":{"post":"..."}}`;
}

function parseJsonBlock(raw: string): any | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

const TEXT_OF: Record<string, (b: any) => string> = {
  instagram: (b) => String(b?.caption ?? ''),
  x: (b) => String(b?.post ?? ''),
  facebook: (b) => String(b?.post ?? ''),
  linkedin: (b) => String(b?.post ?? ''),
};
const MEDIUM_OF: Record<string, string> = { instagram: 'post', x: 'post', facebook: 'post', linkedin: 'post' };

/** L3 (organic social) — generate platform posts for each theme, policy-linted, staged. */
export async function runSocialLoop(): Promise<void> {
  const loop = 'social';
  if (isKilled()) {
    console.log(`[social] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  mkdirSync(SOCIAL, { recursive: true });
  const themes: Theme[] = JSON.parse(readFileSync(THEMES, 'utf8')).themes;
  const done = new Set(readdirSync(SOCIAL).filter((f) => f.endsWith('.json') && f !== 'social-bank.json').map((f) => f.replace(/\.json$/, '')));

  let made = 0;
  for (const t of themes) {
    if (done.has(t.slug)) continue;
    try {
      const res = await brain(prompt(t), { tier: 'code', loop });
      const parsed = parseJsonBlock(res.text);
      if (!parsed) throw new Error('could not parse social JSON');
      const landing = landingFor(t.product);
      const platforms: any = {};
      let anyFlag = false;
      for (const key of ['instagram', 'x', 'facebook', 'linkedin']) {
        const block = parsed[key] ?? {};
        const text = TEXT_OF[key](block).trim();
        const verdict = await lint(text);
        if (verdict.verdict !== 'pass') anyFlag = true;
        platforms[key] = {
          text,
          hashtags: Array.isArray(block.hashtags) ? block.hashtags.slice(0, 12) : undefined,
          link: utm(landing, key, MEDIUM_OF[key], 'social'),
          linter: verdict.verdict,
          linter_reason: verdict.reason,
        };
      }
      const entry = { slug: t.slug, topic: t.topic, product: t.product, pillar: t.pillar, platforms, status: anyFlag ? 'needs_review' : 'ready_to_post' };
      writeFileSync(resolve(SOCIAL, `${t.slug}.json`), JSON.stringify(entry, null, 2));
      db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
        .run(resolve(SOCIAL, `${t.slug}.json`), 'social', t.product, `social-theme:${t.slug}`, anyFlag ? 'flagged' : 'ready', JSON.stringify({ slug: t.slug, topic: t.topic, status: entry.status }));
      if (anyFlag) enqueueApproval({ item: `Social: ${t.topic}`, lane: 'B', linter_verdict: 'flag', linter_reason: 'a platform post needs review', channel: 'social' });
      made++;
      console.log(`[social] ${t.slug} → ${entry.status}`);
    } catch (e: any) {
      console.error(`[social] ${t.slug} failed: ${String(e?.message ?? e).slice(0, 140)}`);
    }
  }

  // master bank
  const bank = readdirSync(SOCIAL).filter((f) => f.endsWith('.json') && f !== 'social-bank.json').map((f) => JSON.parse(readFileSync(resolve(SOCIAL, f), 'utf8')));
  writeFileSync(resolve(SOCIAL, 'social-bank.json'), JSON.stringify(bank, null, 2));
  console.log(`[social] ${bank.length} themes staged (${made} new) → output/social/social-bank.json`);
  logRun({ loop, status: 'ok', detail: `${bank.length} themes, ${made} new` });
  writeHeartbeat(loop, `${bank.length} social themes`);
}
