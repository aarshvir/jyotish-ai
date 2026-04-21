/**
 * CLI: embed `data/scriptures/_chunks.json` into Supabase (requires OPENAI + Supabase env).
 * Run `node scripts/chunk-scriptures.mjs` first to build chunks from markdown.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
try {
  const envContent = readFileSync(resolve('.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}
import { runScriptureEmbedRefresh } from '../src/lib/rag/embedChunksJob';

const n = parseInt(process.argv[2] || '500', 10);
runScriptureEmbedRefresh(Number.isFinite(n) ? n : 500)
  .then((r) => {
    console.log('[run-embed-chunks]', r);
    process.exit(r.error ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
