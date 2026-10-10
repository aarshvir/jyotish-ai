import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { REEL_BEATS, isReportShot, shotKey } from '../../config/beats';
import { logRun } from '../db';
import { assembleReel, cutAspect, maxSilenceSec, meanVolumeDb, type Segment } from '../media/compose';
import { captureFilm } from '../media/shots';
import { VOICE_ENGINE, speakLines } from '../media/speak';
import { ENGINE_ROOT } from '../paths';
import { run } from '../shell';

const IDEA = 'two-slots-same-tuesday';

function dayDir(): string {
  const day = new Date().toISOString().slice(0, 10);
  return resolve(ENGINE_ROOT, 'out', day, IDEA);
}

export async function runAssets(db: DatabaseSync): Promise<string> {
  const dir = dayDir();
  const film = resolve(dir, 'film');
  rmSync(film, { recursive: true, force: true });
  mkdirSync(film, { recursive: true });
  const voiceDir = resolve(dir, 'voice');
  mkdirSync(voiceDir, { recursive: true });

  await speakLines(REEL_BEATS.map((beat) => ({
    id: beat.id,
    text: beat.speech,
    out: resolve(voiceDir, `${beat.id}.wav`),
  })));

  const captured = await captureFilm(film);
  const segments: Segment[] = [];
  for (let i = 0; i < REEL_BEATS.length; i++) {
    const beat = REEL_BEATS[i];
    const glide = captured.glides.get(i);
    if (glide) {
      segments.push({ kind: 'glide', dir: glide.dir, frames: glide.frames });
    } else if (i > 0) {
      const prev = captured.stills.get(shotKey(REEL_BEATS[i - 1].shot));
      if (!prev) throw new Error(`missing still before ${beat.id}`);
      const hardCut = !(isReportShot(REEL_BEATS[i - 1].shot) && isReportShot(beat.shot));
      segments.push({ kind: 'hold', still: prev.png, seconds: hardCut ? 0.16 : 0.1 });
    }
    const still = captured.stills.get(shotKey(beat.shot));
    if (!still) throw new Error(`missing still for ${beat.id} (${shotKey(beat.shot)})`);
    segments.push({
      kind: 'speech',
      still: still.png,
      wav: resolve(voiceDir, `${beat.id}.wav`),
      caption: beat.caption,
      beatId: beat.id,
    });
  }
  const slate = captured.stills.get('slate');
  if (!slate) throw new Error('missing end slate');
  segments.push({ kind: 'hold', still: slate.png, seconds: 0.4 });

  const reel = resolve(dir, 'reel-9x16.mp4');
  const timeline = await assembleReel(film, segments, reel);
  const mean = await meanVolumeDb(reel);
  const silence = await maxSilenceSec(reel);
  if (mean < -32) throw new Error(`reel is too quiet at ${mean} dB`);
  if (silence >= 0.95) throw new Error(`dead air of ${silence.toFixed(2)}s`);

  const square = resolve(dir, 'reel-1x1.mp4');
  const wide = resolve(dir, 'reel-16x9.mp4');
  await cutAspect(reel, square, 'square');
  await cutAspect(reel, wide, 'wide');

  const manifest = {
    idea: IDEA,
    voice: {
      engine: VOICE_ENGINE,
      speed: 1,
      meanVolumeDb: mean,
      maxSilenceSec: silence,
      durationSec: timeline.duration,
      note: 'Kokoro am_michael, a neural male voice, reading the public sample. No on-camera person: this machine has no render API key, and a fake face would be a lie. The picture is the live site, framed to the sentence.',
    },
    picture: {
      report: 'https://www.vedichour.com/sample-report',
      quiz: 'https://www.vedichour.com/start',
      sample: 'Monday · Bangalore. Day score 70. 9–10 scores 94. Noon scores 49. 5–6 scores 98. Quiz: Work and money, then changing jobs.',
      sync: 'Each sentence is its own shot. Scrolls land before the score is spoken. Captions use those boundaries.',
    },
    beats: timeline.cues,
    files: {
      reel9x16: reel,
      reel1x1: square,
      reel16x9: wide,
      carousel: captured.carouselDir,
    },
    humanView: 'Play reel-9x16.mp4 with sound. The morning card must be on screen while he says 94, noon while he says 49, and 5 to 6 while he says 98.',
  };
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  mkdirSync(resolve(ENGINE_ROOT, 'staged'), { recursive: true });
  writeFileSync(resolve(ENGINE_ROOT, 'staged', 'manifest.json'), JSON.stringify(manifest, null, 2));

  const now = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO assets (idea_slug, kind, path, created_at) VALUES (?, ?, ?, ?)`);
  ins.run(IDEA, 'reel-9x16', reel, now);
  ins.run(IDEA, 'carousel', captured.carouselDir, now);
  logRun(db, 'assets', 'ok', `reel ${timeline.duration.toFixed(1)}s mean ${mean.toFixed(1)} dB silence ${silence.toFixed(2)}s, ${VOICE_ENGINE}`);

  if (existsSync('/opt/cursor/artifacts')) {
    const artifact = '/opt/cursor/artifacts';
    copyFileSync(reel, resolve(artifact, 'reel_9x16.mp4'));
    copyFileSync(resolve(captured.carouselDir, 'slide_1.png'), resolve(artifact, 'carousel_slide_1.png'));
    const morning = captured.stills.get('hour:09:00–10:00');
    const evening = captured.stills.get('hour:17:00–18:00');
    const quiz = captured.stills.get('quiz:concern');
    if (morning) copyFileSync(morning.png, resolve(artifact, 'beat_morning.png'));
    if (evening) copyFileSync(evening.png, resolve(artifact, 'beat_evening.png'));
    if (quiz) copyFileSync(quiz.png, resolve(artifact, 'beat_quiz.png'));
    copyFileSync(slate.png, resolve(artifact, 'beat_slate.png'));
    for (const cue of timeline.cues) {
      const mid = ((cue.start + cue.end) / 2).toFixed(3);
      const frame = resolve(artifact, `reel_${cue.beatId}.jpg`);
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', mid, '-i', reel, '-frames:v', '1', frame]);
    }
  }
  return dir;
}
