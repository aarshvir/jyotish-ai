import { spawn } from 'node:child_process';

export { resolveTools, run, probeDuration, buildAss, TEXT_SHADOW, GRADE, BLOOM, GRAIN, wordmarkFilter, progressFilter, FONT, FONTS, TTS_HELPER } from '../loops/video';
export type { Seg, AssLayout } from '../loops/video';

/**
 * stdout-capturing sibling of `run()` from loops/video.ts. Used for ffprobe queries where we
 * need the answer, not just the exit code. Same rules as the v3.1 renderer: spawn the exe
 * directly, never through a shell, so Windows quoting can't bite us.
 */
export function runTool(exe: string, args: string[], cwd?: string, timeoutMs = 120000): Promise<string> {
  return new Promise((res, rej) => {
    const child = spawn(exe, args, { cwd, windowsHide: true });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      rej(new Error(`${exe} timed out`));
    }, timeoutMs);
    child.stdout?.on('data', (d) => (out += d.toString()));
    child.stderr?.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      rej(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? res(out) : rej(new Error(`${exe} exit ${code}: ${err.slice(-360)}`));
    });
  });
}

/** Like `runTool` but hands back stderr too, and never rejects on a non-zero exit.
 *  ffmpeg writes filter metadata (signalstats etc.) to stderr, not stdout. */
export function runCapture(exe: string, args: string[], timeoutMs = 120000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((res) => {
    const child = spawn(exe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', () => {
      clearTimeout(timer);
      res({ stdout, stderr, code: -1 });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      res({ stdout, stderr, code: code ?? -1 });
    });
  });
}

export interface Probe {
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  hasAudio: boolean;
  codec: string;
}

/** Full stream probe — used to verify every clip before and after assembly. */
export async function probeVideo(ffprobe: string, file: string): Promise<Probe> {
  const raw = await runTool(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate:format=duration', '-of', 'json', file]);
  const j = JSON.parse(raw);
  const v = (j.streams ?? []).find((s: any) => s.codec_type === 'video');
  const a = (j.streams ?? []).find((s: any) => s.codec_type === 'audio');
  const [num, den] = String(v?.avg_frame_rate ?? '0/1').split('/').map(Number);
  return {
    width: Number(v?.width ?? 0),
    height: Number(v?.height ?? 0),
    durationSec: Number(j.format?.duration ?? 0),
    fps: den ? Math.round((num / den) * 100) / 100 : 0,
    hasAudio: Boolean(a),
    codec: String(v?.codec_name ?? 'none'),
  };
}
