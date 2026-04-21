#!/usr/bin/env node
/**
 * Walk `data/scriptures/` recursively for `.md` files (excluding `_raw`, `_chunks.json`), split into ~350-word
 * chunks, emit `data/scriptures/_chunks.json` for `npm run embed:chunks` / Inngest refresh.
 *
 * Front-matter (YAML between --- lines) may include: source, chapter, chapter_title
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'data', 'scriptures');
const OUT = path.join(BASE, '_chunks.json');

function walkMd(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === '_raw' || name === '_chunks.json') continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkMd(p, acc);
    else if (name.endsWith('.md') && name.toUpperCase() !== 'README.MD') acc.push(p);
  }
  return acc;
}

function parseFrontmatter(raw0) {
  const raw = raw0.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!raw.startsWith('---\n')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) return { meta: {}, body: raw };
  const fm = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const meta = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body };
}

function chunkWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i += maxWords) {
    out.push(words.slice(i, i + maxWords).join(' '));
  }
  return out.length ? out : [''];
}

function main() {
  mkdirSync(BASE, { recursive: true });
  const files = walkMd(BASE);
  const chunks = [];
  let seq = 0;
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const rel = path.relative(BASE, file).replace(/\\/g, '/');
    const { meta, body } = parseFrontmatter(raw);
    const source = meta.source || 'Brihat Parashara Hora Shastra';
    const chapter = meta.chapter || rel.replace(/\.md$/, '');
    const topicBase = meta.chapter_title || chapter;
    const parts = chunkWords(body, 350);
    parts.forEach((text, i) => {
      const id = `md-${createHash('sha256')
        .update(`${rel}:${i}:${text.slice(0, 64)}`)
        .digest('hex')
        .slice(0, 24)}`;
      const content_hash = createHash('sha256').update(text, 'utf8').digest('hex');
      chunks.push({
        id,
        topic: `${topicBase} (part ${i + 1})`,
        source,
        chapter,
        verse_range: `${rel}#${i + 1}`,
        text,
        keywords: ['scripture', 'chunk', chapter],
        content_hash,
      });
      seq++;
    });
  }
  writeFileSync(OUT, JSON.stringify(chunks, null, 2), 'utf8');
  console.log(`[chunk-scriptures] wrote ${chunks.length} chunks from ${files.length} files → ${path.relative(ROOT, OUT)}`);
}

main();
