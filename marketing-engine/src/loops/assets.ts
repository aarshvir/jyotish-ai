import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun } from '../db';
import { OUT_DIR } from '../paths';
import { preflight } from '../policy/preflight';
import { renderCarousel } from '../render/carousel';
import { captureSampleReport } from '../render/screencap';
import { speak } from '../render/tts';
import { composeVideo } from '../render/compose';
import type { CopyPack, IdeaRow, ScriptBody } from '../copy/fallbacks';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function latestPack(ideaId: number): CopyPack | null {
  const row = db()
    .prepare(`SELECT body_json, lint_pass FROM drafts WHERE idea_id=? AND kind='pack' ORDER BY id DESC LIMIT 1`)
    .get(ideaId) as { body_json: string; lint_pass: number } | undefined;
  if (!row || !row.lint_pass) return null;
  return JSON.parse(row.body_json) as CopyPack;
}

function scriptWords(s: ScriptBody): string {
  return [s.hook, ...s.lines, s.cta].join(' ');
}

export async function runAssets(): Promise<{ assets: number; notes: string[] }> {
  const t0 = Date.now();
  const notes: string[] = [];
  const idea = db()
    .prepare(`SELECT id, slug, title, angle, category, score FROM ideas WHERE status='copy_ready' ORDER BY score DESC LIMIT 1`)
    .get() as IdeaRow | undefined;
  if (!idea) {
    notes.push('no copy_ready idea');
    logRun('assets', 'skipped', notes[0], Date.now() - t0);
    return { assets: 0, notes };
  }
  const pack = latestPack(idea.id);
  if (!pack) {
    notes.push(`${idea.slug}: no lint-passing pack`);
    logRun('assets', 'skipped', notes[0], Date.now() - t0);
    return { assets: 0, notes };
  }

  const dir = resolve(OUT_DIR, today(), idea.slug);
  mkdirSync(dir, { recursive: true });
  const spoken = scriptWords(pack.script_en);
  const words = spoken.split(/\s+/).filter(Boolean).length;

  const capture = await captureSampleReport(dir);
  notes.push(`captured ${capture.url}`);

  let ttsMeta: { provider: 'sapi' | 'piper' | 'elevenlabs'; voiceName: string; durationSec: number; gender: 'male' | 'female' | 'unknown' } | null = null;
  let wav: string | null = null;
  try {
    const tts = await speak(spoken, dir);
    wav = tts.wav;
    ttsMeta = { provider: tts.provider, voiceName: tts.voiceName, durationSec: tts.durationSec, gender: tts.gender };
  } catch (e) {
    notes.push(`TTS: ${e instanceof Error ? e.message : e}`);
  }
  try {
    preflight({
      voice: ttsMeta ? { provider: ttsMeta.provider, gender: ttsMeta.gender } : { provider: 'none', gender: 'unknown' },
      captureUrl: capture.url,
      script: spoken,
      durationSec: ttsMeta?.durationSec || pack.script_en.duration_sec,
      words,
      context: 'ad',
    });
  } catch (e) {
    notes.push(`PREFLIGHT: ${e instanceof Error ? e.message : e}`);
  }

  const slides = await renderCarousel(pack.carousel, resolve(dir, 'carousel'));
  notes.push(`carousel ${slides.length} slides`);

  const duration = ttsMeta?.durationSec || pack.script_en.duration_sec;
  const cuts: { aspect: string; w: number; h: number; file: string }[] = [
    { aspect: '9:16', w: 1080, h: 1920, file: resolve(dir, 'reel-9x16.mp4') },
    { aspect: '1:1', w: 1080, h: 1080, file: resolve(dir, 'feed-1x1.mp4') },
    { aspect: '16:9', w: 1920, h: 1080, file: resolve(dir, 'yt-16x9.mp4') },
  ];
  for (const c of cuts) {
    try {
      composeVideo({
        still: capture.png,
        audio: wav,
        durationSec: duration,
        captions: spoken,
        outFile: c.file,
        width: c.w,
        height: c.h,
      });
      db().prepare(`INSERT INTO assets (idea_id, kind, aspect, path, manifest_json) VALUES (?,?,?,?,?)`).run(
        idea.id,
        'video',
        c.aspect,
        c.file,
        JSON.stringify({ tts: ttsMeta, capture: capture.url }),
      );
    } catch (e) {
      notes.push(`${c.aspect} compose failed: ${e instanceof Error ? e.message.slice(0, 180) : e}`);
    }
  }

  for (const png of slides) {
    db().prepare(`INSERT INTO assets (idea_id, kind, aspect, path, manifest_json) VALUES (?,?,?,?,?)`).run(
      idea.id,
      'carousel_slide',
      '4:5',
      png,
      JSON.stringify({ idea: idea.slug }),
    );
  }

  const publishable = Boolean(wav);
  const manifest = {
    idea: idea.slug,
    title: idea.title,
    captured: capture.url,
    tts: ttsMeta,
    slides: slides.length,
    publishable,
    do_not_publish: publishable ? false : 'VOICE_MISSING_OR_FAILED',
    disclaimer: 'For reflection and planning, not certainty.',
  };
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  db().prepare(`UPDATE ideas SET status='assets_ready', updated_at=datetime('now') WHERE id=?`).run(idea.id);
  logRun('assets', 'ok', notes.join(' · '), Date.now() - t0);
  return { assets: slides.length + cuts.length, notes };
}
