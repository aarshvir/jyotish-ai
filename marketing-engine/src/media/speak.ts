import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGINE_ROOT } from '../paths';
import { run } from '../shell';

/** Shipped reel voice. A neural male, not a formant synthesizer. */
export const VOICE_ENGINE = 'kokoro-v1.0 am_michael';
export const VOICE_SPEED = 1;

export function kokoroDir(): string {
  return process.env.KOKORO_DIR ?? resolve(ENGINE_ROOT, 'vendor', 'kokoro');
}

export interface SpeechLine {
  id: string;
  text: string;
  out: string;
}

/** Synthesize every line in one process so the model loads once. */
export async function speakLines(lines: SpeechLine[]): Promise<void> {
  const pending = lines.filter((line) => {
    const marker = `${line.out}.txt`;
    return !(existsSync(line.out) && existsSync(marker) && readFileSync(marker, 'utf8') === line.text);
  });
  if (pending.length === 0) return;

  const dir = kokoroDir();
  const model = resolve(dir, 'kokoro-v1.0.onnx');
  const voices = resolve(dir, 'voices-v1.0.bin');
  if (!existsSync(model) || !existsSync(voices)) {
    throw new Error(
      `Kokoro weights missing in ${dir}. Download kokoro-v1.0.onnx and voices-v1.0.bin from the kokoro-onnx model-files-v1.0 release. Refusing a formant voice.`,
    );
  }

  const job = resolve(dir, 'speak-job.json');
  writeFileSync(
    job,
    JSON.stringify({
      model_dir: dir,
      voice: 'am_michael',
      speed: VOICE_SPEED,
      lang: 'en-us',
      lines: pending.map((line) => ({ text: line.text, out: line.out })),
    }),
  );
  await run('python3', [resolve(ENGINE_ROOT, 'src', 'media', 'kokoro_speak.py'), job]);
  for (const line of pending) {
    if (!existsSync(line.out)) throw new Error(`voice file missing after Kokoro: ${line.id}`);
    writeFileSync(`${line.out}.txt`, line.text);
  }
}
