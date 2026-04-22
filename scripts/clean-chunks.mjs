#!/usr/bin/env node
/**
 * Filters OCR-garbled chunks from data/scriptures/_chunks.json.
 *
 * The Santhanam PDF chunks were processed by a noisy OCR scanner and contain
 * large amounts of non-ASCII characters (e.g. "{QeqttT{rr}", "rqfv rarrc").
 * VedPuran and legacy curated chunks are clean Unicode.
 *
 * Strategy: keep a chunk if its text has <15% non-ASCII characters.
 * Output: data/scriptures/_chunks_clean.json
 *
 * Run: node scripts/clean-chunks.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_NON_ASCII_RATIO = 0.15;

function nonAsciiRatio(text) {
  if (!text || text.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) count++;
  }
  return count / text.length;
}

const inputPath = resolve('data/scriptures/_chunks.json');
const outputPath = resolve('data/scriptures/_chunks_clean.json');

const chunks = JSON.parse(readFileSync(inputPath, 'utf8'));
console.log(`Total chunks in _chunks.json: ${chunks.length}`);

const clean = [];
const garbled = [];
for (const chunk of chunks) {
  const ratio = nonAsciiRatio(chunk.text ?? '');
  if (ratio < MAX_NON_ASCII_RATIO) {
    clean.push(chunk);
  } else {
    garbled.push({ id: chunk.id, source: chunk.source, ratio: ratio.toFixed(3) });
  }
}

console.log(`Clean chunks (ratio < ${MAX_NON_ASCII_RATIO}): ${clean.length}`);
console.log(`Filtered out (garbled): ${garbled.length}`);

// Show breakdown by source
const bySource = {};
for (const c of clean) {
  bySource[c.source] = (bySource[c.source] || 0) + 1;
}
console.log('\nClean chunks by source:');
for (const [src, count] of Object.entries(bySource)) {
  console.log(`  ${src}: ${count}`);
}

if (garbled.length > 0) {
  console.log('\nTop 5 filtered examples:');
  garbled.slice(0, 5).forEach(g => console.log(`  [${g.ratio}] ${g.id} (${g.source})`));
}

if (!DRY_RUN) {
  writeFileSync(outputPath, JSON.stringify(clean, null, 2), 'utf8');
  console.log(`\nWrote ${clean.length} clean chunks to ${outputPath}`);
} else {
  console.log('\n[dry-run] No files written.');
}
