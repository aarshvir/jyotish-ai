import { db, logRun, activeLessonRules } from '../db';
import { generateText, extractJson, GenerateError } from '../generate';
import { BRAND_BRIEF } from '../brand';
import { fallbackPack, lintPack, type CopyPack, type IdeaRow } from '../copy/fallbacks';

function topIdeas(n: number): IdeaRow[] {
  return db()
    .prepare(`SELECT id, slug, title, angle, category, score FROM ideas ORDER BY score DESC LIMIT ?`)
    .all<IdeaRow>(n);
}

function saveDraft(ideaId: number, kind: string, language: string, body: unknown, lintPass: boolean, report: string): void {
  db()
    .prepare(
      `INSERT INTO drafts (idea_id, kind, language, body_json, lint_pass, lint_report) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(ideaId, kind, language, JSON.stringify(body), lintPass ? 1 : 0, report);
}

function promptFor(idea: IdeaRow, reject?: string): string {
  const lessons = activeLessonRules('script').map((r) => `- ${r}`).join('\n');
  return `${BRAND_BRIEF}

LESSONS:
${lessons}

Write a full copy pack for this idea as ONE JSON object, no markdown:
{
  "script_en": { "hook": "first 1.5s, one concrete beat", "lines": ["..."], "cta": "...", "duration_sec": 32 },
  "script_hi": { "hook": "...", "lines": ["..."], "cta": "...", "duration_sec": 32 },
  "script_hinglish": { "hook": "...", "lines": ["..."], "cta": "...", "duration_sec": 32 },
  "carousel": [ { "kicker": "", "headline": "", "body": "" } ],
  "blog": { "slug": "engine-...", "title": "", "description": "", "html": "<p>...</p>", "faqs": [ { "q": "", "a": "" } ] },
  "ads": [ { "name": "meta-1", "primary": "", "headline": "", "description": "" } ]
}

Rules:
- Hook in the first sentence. One idea. One CTA.
- Hindi is Devanagari, rewritten idiomatically, not a translation of the English and not Roman Hindi. Hinglish is Roman mixed speech.
- Carousel: 7 or 8 slides, one thought each. Last slide is vedichour.com + the disclaimer.
- Blog must be useful if the product did not exist. No fake statistics. No testimonials you cannot name.
- Ads: 3 variants. No second-person diagnosis of the viewer. No personal-attribute questions.
- Varied sentence length. A clock time or a lived Indian detail in every script.
- Do not use em-dashes. Do not use unlock/elevate/delve/journey/leverage.

IDEA:
title: ${idea.title}
angle: ${idea.angle}
category: ${idea.category}

${reject ? `PREVIOUS DRAFT FAILED LINT:\n${reject}\nWrite it again. Do not repeat the failing phrases.` : ''}
JSON only.`;
}

function asPack(raw: unknown): CopyPack {
  const p = raw as CopyPack;
  if (!p?.script_en?.hook || !p.script_hi?.hook || !p.script_hinglish?.hook) throw new Error('pack missing scripts');
  if (!Array.isArray(p.carousel) || p.carousel.length < 6) throw new Error('carousel too short');
  if (!p.blog?.html) throw new Error('pack missing blog');
  if (!Array.isArray(p.ads) || p.ads.length < 3) throw new Error('need 3 ads');
  return p;
}

async function generatePack(idea: IdeaRow): Promise<{ pack: CopyPack; via: string; lint: ReturnType<typeof lintPack> }> {
  let reject = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, via } = await generateText(promptFor(idea, reject), { timeoutMs: 90_000 });
      const pack = asPack(extractJson(text));
      const lint = lintPack(pack);
      if (lint.verdict !== 'block') return { pack, via: `${via}#${attempt}`, lint };
      reject = lint.reasons.join('; ');
    } catch (e) {
      reject = String(e instanceof Error ? e.message : e);
      if (e instanceof GenerateError && attempt === 2) break;
    }
  }
  const pack = fallbackPack(idea);
  const lint = lintPack(pack);
  return { pack, via: `fallback:${idea.category} (llm failed: ${reject.slice(0, 180)})`, lint };
}

export async function runCopy(limit = 2): Promise<{ drafts: number; notes: string[] }> {
  const t0 = Date.now();
  const ideas = topIdeas(limit);
  const notes: string[] = [];
  if (!ideas.length) {
    notes.push('no ideas — run insight first');
    logRun('copy', 'skipped', notes[0], Date.now() - t0);
    return { drafts: 0, notes };
  }

  let n = 0;
  for (const idea of ideas) {
    const { pack, via, lint } = await generatePack(idea);
    const pass = lint.verdict !== 'block';
    const report = `${via} | ${lint.verdict} | ${lint.reasons.join('; ')}`;
    saveDraft(idea.id, 'pack', 'multi', pack, pass, report);
    saveDraft(idea.id, 'script_en', 'en', pack.script_en, pass, report);
    saveDraft(idea.id, 'script_hi', 'hi', pack.script_hi, pass, report);
    saveDraft(idea.id, 'script_hinglish', 'hinglish', pack.script_hinglish, pass, report);
    saveDraft(idea.id, 'carousel', 'en', pack.carousel, pass, report);
    saveDraft(idea.id, 'blog', 'en', pack.blog, pass, report);
    saveDraft(idea.id, 'ads', 'en', pack.ads, pass, report);
    n += 7;
    notes.push(`${idea.slug}: ${report}`);
    if (pass) db().prepare(`UPDATE ideas SET status='copy_ready', updated_at=datetime('now') WHERE id=?`).run(idea.id);
  }

  logRun('copy', 'ok', notes.join(' · '), Date.now() - t0);
  return { drafts: n, notes };
}
