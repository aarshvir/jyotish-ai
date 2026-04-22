/**
 * Post-fix regression guard: TypeScript, ESLint, Vitest (exit non-zero on first failure).
 * Usage: node scripts/regression-check.mjs
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  { name: 'tsc', cmd: 'npx', args: ['tsc', '--noEmit'] },
  { name: 'eslint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'vitest', cmd: 'npm', args: ['run', 'test'] },
];

let code = 0;
for (const { name, cmd, args } of steps) {
  console.log(`\n=== regression: ${name} ===\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: repoRoot });
  if (r.status !== 0) {
    console.error(`\nregression-check: ${name} failed with exit ${r.status}`);
    code = r.status ?? 1;
    break;
  }
}
process.exit(code);
