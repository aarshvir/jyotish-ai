import type { DatabaseSync } from 'node:sqlite';
import {
  AD_VARIANTS,
  BLOG_HTML,
  CAPTION,
  CAROUSEL,
  EMAILS,
  ENGLISH_SCRIPT,
  HINDI_SCRIPT,
  HINGLISH_SCRIPT,
} from '../../config/pieces';
import { logRun } from '../db';
import { lintCopy, type LintOpts } from '../voice';

const IDEA = 'two-slots-same-tuesday';

interface Draft {
  kind: string;
  lang: string;
  body: string;
  opts: LintOpts;
  /** When false, a lint failure is the expected gate, not a broken run. */
  expectPass: boolean;
}

export function runCopy(db: DatabaseSync): { passed: number; failed: number } {
  const drafts: Draft[] = [
    { kind: 'script', lang: 'en', body: ENGLISH_SCRIPT, opts: { kind: 'script', lang: 'en' }, expectPass: true },
    { kind: 'script', lang: 'hinglish', body: HINGLISH_SCRIPT, opts: { kind: 'script', lang: 'hinglish' }, expectPass: true },
    { kind: 'script', lang: 'hi', body: HINDI_SCRIPT, opts: { kind: 'script', lang: 'hi' }, expectPass: true },
    { kind: 'caption', lang: 'en', body: CAPTION, opts: { kind: 'caption', lang: 'en' }, expectPass: true },
    {
      kind: 'carousel',
      lang: 'en',
      body: CAROUSEL.map((s, i) => `${i + 1}. ${s.title}. ${s.body}`).join('\n'),
      opts: { kind: 'carousel', lang: 'en' },
      expectPass: true,
    },
    { kind: 'blog', lang: 'en', body: BLOG_HTML, opts: { kind: 'blog', lang: 'en' }, expectPass: true },
    ...EMAILS.map((e) => ({
      kind: 'email',
      lang: 'en',
      body: `${e.subject}\n\n${e.body}`,
      opts: { kind: 'email' as const, lang: 'en' as const },
      expectPass: true,
    })),
    ...AD_VARIANTS.map((a) => ({
      kind: `ad:${a.id}`,
      lang: 'en',
      body: a.text,
      opts: { kind: 'ad' as const, lang: 'en' as const },
      expectPass: a.ship,
    })),
  ];

  db.prepare(`DELETE FROM drafts WHERE idea_slug = ?`).run(IDEA);
  const insert = db.prepare(
    `INSERT INTO drafts (idea_slug, kind, lang, body, ok, errors, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  let passed = 0;
  let failed = 0;
  const now = new Date().toISOString();
  for (const d of drafts) {
    const result = lintCopy(d.body, d.opts);
    const gateOk = result.ok === d.expectPass;
    if (!gateOk) {
      failed++;
      throw new Error(`copy gate mismatch for ${d.kind}/${d.lang}: lint ok=${result.ok} expected ${d.expectPass}. ${result.errors.join('; ')}`);
    }
    if (result.ok) passed++;
    else failed++;
    insert.run(IDEA, d.kind, d.lang, d.body, result.ok ? 1 : 0, result.errors.join(' | '), now);
  }
  logRun(db, 'copy', 'ok', `${passed} drafts passed lint, ${failed} rejected on purpose (personal-attribute ad).`);
  return { passed, failed };
}
