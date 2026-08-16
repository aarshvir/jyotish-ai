import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, BRAND_BRIEF, utm, landingPath } from '../brand';

const REELS = resolve(ROOT, 'media', 'reels');
const OUT = resolve(ROOT, 'output');
const SCRIPTS_FILE = resolve(ROOT, 'config', 'reel-scripts.json');

interface ReelScript {
  slug: string;
  title: string;
  product: string;
  hook: string;
  beats: string[];
  voiceover: string;
  cta: string;
}

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram Reel', source: 'instagram', medium: 'reel' },
  { key: 'youtube', label: 'YouTube Short', source: 'youtube', medium: 'short' },
  { key: 'tiktok', label: 'TikTok', source: 'tiktok', medium: 'video' },
  { key: 'facebook', label: 'Facebook Reel', source: 'facebook', medium: 'reel' },
] as const;

function landingFor(product: string): string {
  return landingPath(product);
}

function captionPrompt(s: ReelScript): string {
  return `${BRAND_BRIEF}

Write per-platform social captions for a VedicHour faceless reel.
Reel: ${s.title}
Hook: ${s.hook}
On-screen beats: ${s.beats.join(' / ')}

For EACH platform write a caption in that platform's voice/length (Instagram: warm + 1-2 emoji; YouTube Short: punchy first line; TikTok: casual hook-first; Facebook: a touch more explanatory) ending with the exact tagline "${BRAND.taglineClose}", plus 8-12 relevant lowercase hashtags. Do NOT put any URL in the caption (the link is attached separately). Stay strictly on-brand (no best/worst, no guarantees, no luck/outcome claims).

Output STRICT JSON, nothing else:
{"instagram":{"caption":"...","hashtags":["#vedichour","..."]},"youtube":{"caption":"...","hashtags":["..."]},"tiktok":{"caption":"...","hashtags":["..."]},"facebook":{"caption":"...","hashtags":["..."]}}`;
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

/** L3 — package each rendered reel into post-ready, policy-linted, UTM-tagged platform posts. */
export async function runPublishPrep(): Promise<void> {
  const loop = 'publish-prep';
  if (isKilled()) {
    console.log(`[publish] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  if (!existsSync(REELS)) {
    console.log('[publish] no rendered reels yet.');
    logRun({ loop, status: 'skipped', detail: 'no reels' });
    return;
  }
  const scripts: ReelScript[] = JSON.parse(readFileSync(SCRIPTS_FILE, 'utf8')).reels;
  const dirs = readdirSync(REELS).filter((d) => existsSync(resolve(REELS, d, `${d}.mp4`)));
  const manifest: any[] = [];
  let packaged = 0;

  for (const slug of dirs) {
    const pubPath = resolve(REELS, slug, 'publish.json');
    if (existsSync(pubPath)) {
      manifest.push(JSON.parse(readFileSync(pubPath, 'utf8')));
      continue;
    }
    const s = scripts.find((x) => x.slug === slug);
    if (!s) {
      console.warn(`[publish] no script for ${slug}, skipping`);
      continue;
    }
    try {
      const res = await brain(captionPrompt(s), { tier: 'bulk', loop });
      const parsed = parseJsonBlock(res.text);
      if (!parsed) throw new Error('could not parse caption JSON');
      const landing = landingFor(s.product);
      const platforms: any = {};
      let anyFlag = false;
      for (const p of PLATFORMS) {
        const block = parsed[p.key] ?? {};
        const caption = String(block.caption ?? '').trim();
        const hashtags = Array.isArray(block.hashtags) ? block.hashtags.slice(0, 12) : [];
        const verdict = await lint(caption);
        if (verdict.verdict !== 'pass') anyFlag = true;
        platforms[p.key] = {
          caption,
          hashtags,
          link: utm(landing, p.source, p.medium, 'launch_video'),
          linter: verdict.verdict,
          linter_reason: verdict.reason,
        };
      }
      const entry = {
        slug,
        title: s.title,
        product: s.product,
        video: resolve(REELS, slug, `${slug}.mp4`),
        platforms,
        status: anyFlag ? 'needs_review' : 'ready_to_post',
      };
      writeFileSync(pubPath, JSON.stringify(entry, null, 2));
      manifest.push(entry);
      packaged++;
      if (anyFlag) {
        enqueueApproval({ item: `Reel captions: ${s.title}`, lane: 'B', linter_verdict: 'flag', linter_reason: 'a platform caption needs review', channel: 'reel' });
      }
      console.log(`[publish] packaged ${slug} → ${entry.status} (4 platforms)`);
    } catch (e: any) {
      console.error(`[publish] ${slug} failed: ${String(e?.message ?? e).slice(0, 160)}`);
    }
  }

  writeFileSync(resolve(OUT, 'publish-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[publish] manifest: ${manifest.length} reels (${packaged} newly packaged) → output/publish-manifest.json`);
  console.log('[publish] All post-ready locally. Actual upload is the OAuth-gated step (deferred).');
  logRun({ loop, status: 'ok', detail: `${manifest.length} reels, ${packaged} new` });
  writeHeartbeat(loop, `${manifest.length} reels packaged`);
}
