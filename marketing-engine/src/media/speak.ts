import { writeFileSync } from 'node:fs';
import { run } from '../shell';

export async function speak(text: string, wavPath: string, voice: string, wordsPerMinute = 132): Promise<void> {
  const txt = wavPath + '.txt';
  writeFileSync(txt, text);
  await run('espeak-ng', ['-v', voice, '-s', String(wordsPerMinute), '-w', wavPath, '-f', txt]);
}
