/**
 * `next build` on Windows can intermittently fail during trace/export steps
 * (ENOENT, rename races). Wipe .next and retry a few times before giving up.
 */
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';

const MAX = 3;

function cleanNext() {
  try {
    if (existsSync('.next')) rmSync('.next', { recursive: true, force: true });
  } catch {
    // ignore
  }
}

cleanNext();

for (let attempt = 1; attempt <= MAX; attempt += 1) {
  try {
    execSync('npx next build', { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
    process.exit(0);
  } catch {
    if (attempt === MAX) {
      console.error(`[build-reliable] all ${MAX} attempts failed`);
      process.exit(1);
    }
    console.warn(`[build-reliable] build attempt ${attempt} failed, cleaning .next and retrying...`);
    cleanNext();
  }
}
