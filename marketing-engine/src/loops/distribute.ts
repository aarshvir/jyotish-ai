import { mkdirSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun } from '../db';
import { OUT_DIR, READY_DIR, PARENT_ROOT } from '../paths';
import { BRAND, utm } from '../brand';
import { envOn } from '../env';
import type { CopyPack, IdeaRow } from '../copy/fallbacks';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function latestPack(ideaId: number): CopyPack | null {
  const row = db()
    .prepare(`SELECT body_json, lint_pass FROM drafts WHERE idea_id=? AND kind='pack' ORDER BY id DESC LIMIT 1`)
    .get(ideaId) as { body_json: string; lint_pass: number } | undefined;
  if (!row || !row.lint_pass) return null;
  return JSON.parse(row.body_json) as CopyPack;
}

export async function runDistribute(): Promise<{ packages: number; notes: string[] }> {
  const t0 = Date.now();
  const notes: string[] = [];
  const idea = db()
    .prepare(`SELECT id, slug, title, angle, category, score FROM ideas WHERE status='assets_ready' ORDER BY score DESC LIMIT 1`)
    .get() as IdeaRow | undefined;
  if (!idea) {
    notes.push('no assets_ready idea');
    logRun('distribute', 'skipped', notes[0], Date.now() - t0);
    return { packages: 0, notes };
  }
  const pack = latestPack(idea.id);
  if (!pack) {
    notes.push('no pack');
    logRun('distribute', 'skipped', notes[0], Date.now() - t0);
    return { packages: 0, notes };
  }

  const day = today();
  const srcDir = resolve(OUT_DIR, day, idea.slug);
  const ready = resolve(READY_DIR, day, idea.slug);
  mkdirSync(ready, { recursive: true });

  if (existsSync(resolve(srcDir, 'carousel'))) {
    mkdirSync(resolve(ready, 'carousel'), { recursive: true });
    for (const f of readdirSync(resolve(srcDir, 'carousel')).filter((x) => x.endsWith('.png'))) {
      copyFileSync(resolve(srcDir, 'carousel', f), resolve(ready, 'carousel', f));
    }
  }
  for (const f of ['reel-9x16.mp4', 'feed-1x1.mp4', 'yt-16x9.mp4', 'manifest.json']) {
    const p = resolve(srcDir, f);
    if (existsSync(p)) copyFileSync(p, resolve(ready, f));
  }

  const link = utm(BRAND.landing.sampleReport, 'instagram', 'organic', idea.slug);
  const bodyLines = pack.script_en.lines.filter((l) => l.trim() !== pack.script_en.hook.trim());
  const caption = `${pack.script_en.hook}

${bodyLines.join(' ')}

${pack.script_en.cta}

${BRAND.disclaimer}
${link}`;
  const hashtags = '#VedicHour #muhurat #kundli #hora #jyotish';
  const why = `Highest-scoring idea today (${idea.score.toFixed(2)}). Angle: ${idea.angle}`;
  const igNote =
    'Instagram Graph API can publish Reels/carousels AFTER App Review + a professional account. Until then this folder is one tap from your phone. Unofficial IG bots are not built (ban risk).';
  const ytNote =
    'YouTube Data API uploads from unaudited projects are forced private (Google, videos.insert). Public is a Studio click after the API audit.';

  writeFileSync(
    resolve(ready, 'POST.txt'),
    [
      `WHY: ${why}`,
      `BEST TIME (IST, weekday): 19:30–21:30 — when this audience is actually on the phone, not a fabricated "algorithm hour".`,
      `CAPTION:\n${caption}`,
      `HASHTAGS: ${hashtags}`,
      `INSTAGRAM: ${igNote}`,
      `YOUTUBE: ${ytNote}`,
      `THREADS: Official Threads posts API exists; same human tap until Tech Provider verification.`,
      `DO NOT: auto-post via unofficial apps. DO NOT open /pricing in the creative.`,
    ].join('\n\n'),
    'utf8',
  );

  const blogDir = resolve(OUT_DIR, day, idea.slug, 'blog');
  mkdirSync(blogDir, { recursive: true });
  const blogTs = blogModule(pack);
  writeFileSync(resolve(blogDir, `${pack.blog.slug}.ts`), blogTs);
  writeFileSync(resolve(ready, 'blog.ts'), blogTs);

  if (envOn('AUTO_PUBLISH_BLOG')) {
    const dest = resolve(PARENT_ROOT, 'src', 'content', 'blog', `${pack.blog.slug}.ts`);
    writeFileSync(dest, blogTs);
    notes.push(`blog promoted to ${dest}`);
  } else {
    notes.push('blog staged (AUTO_PUBLISH_BLOG=0). Promote by copying blog.ts into src/content/blog/ and registering it in index.ts.');
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>VedicHour</title>
<link>${BRAND.domain}</link>
<description>Timing notes. For reflection, not certainty.</description>
<item>
  <title>${escXml(pack.blog.title)}</title>
  <link>${BRAND.domain}/blog/${pack.blog.slug}</link>
  <description>${escXml(pack.blog.description)}</description>
  <pubDate>${new Date().toUTCString()}</pubDate>
</item>
</channel></rss>`;
  writeFileSync(resolve(OUT_DIR, 'feed.xml'), rss);

  const emails = resolve(OUT_DIR, 'email', idea.slug);
  mkdirSync(emails, { recursive: true });
  writeFileSync(
    resolve(emails, 'sequence.html'),
    emailSequence(idea, pack),
    'utf8',
  );
  notes.push('email sequence staged — not sent (no list bought, no auto-send).');

  const ins = db().prepare(
    `INSERT INTO packages (idea_id, channel, status, folder, caption, hashtags, best_time, why, policy_note) VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  ins.run(idea.id, 'instagram', 'needs_click', ready, caption, hashtags, '19:30-21:30 IST', why, igNote);
  ins.run(idea.id, 'youtube', 'needs_click', ready, pack.blog.title, '', 'after API audit, then Studio public', why, ytNote);
  ins.run(idea.id, 'blog', envOn('AUTO_PUBLISH_BLOG') ? 'staged_in_app' : 'staged', blogDir, pack.blog.title, '', 'on promote', why, 'On-site publish is allowed; gated by AUTO_PUBLISH_BLOG.');
  ins.run(idea.id, 'rss', 'automated', resolve(OUT_DIR, 'feed.xml'), pack.blog.title, '', 'now', why, 'Public RSS is allowed.');

  db().prepare(`UPDATE ideas SET status='packaged', updated_at=datetime('now') WHERE id=?`).run(idea.id);
  notes.push(`ready-to-post: ${ready}`);
  logRun('distribute', 'ok', notes.join(' · '), Date.now() - t0);
  return { packages: 4, notes };
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blogModule(pack: CopyPack): string {
  return `import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: ${JSON.stringify(pack.blog.slug)},
  title: ${JSON.stringify(pack.blog.title)},
  description: ${JSON.stringify(pack.blog.description)},
  keywords: ['vedic timing', 'hora', 'muhurat', 'VedicHour'],
  date: ${JSON.stringify(today())},
  readingTimeMin: 6,
  html: ${JSON.stringify(pack.blog.html)},
  faqs: ${JSON.stringify(pack.blog.faqs)},
};
`;
}

function emailSequence(idea: IdeaRow, pack: CopyPack): string {
  return `<!doctype html><html><body style="font-family:Georgia,serif;color:#1E1726;background:#FBF7F1;padding:24px">
<p>Subject ideas (not sent):</p>
<ol>
<li>${escXml(pack.script_en.hook)}</li>
<li>The hour the mail actually left</li>
<li>Your day is not one mood</li>
</ol>
<p>${escXml(pack.script_en.lines.join(' '))}</p>
<p><a href="${utm(BRAND.landing.sampleReport, 'email', 'lifecycle', idea.slug)}">See a sample day</a></p>
<p style="font-size:12px;color:#66596F">${escXml(BRAND.disclaimer)}</p>
</body></html>`;
}

