import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain, type Tier } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';

const APP_BLOG_DIR = resolve(ROOT, '..', 'src', 'content', 'blog');
const STAGE_DIR = resolve(ROOT, 'output', 'blog');
const TOPICS_FILE = resolve(ROOT, 'config', 'blog-topics.json');

interface Topic {
  slug: string;
  title: string;
  product: string;
  angle: string;
  keywords: string[];
}

interface Parsed {
  description: string;
  keywords: string[];
  html: string;
  faqs: { q: string; a: string }[];
}

const camel = (slug: string) =>
  slug.split('-').map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Slugs already published in the live app blog index. */
function publishedSlugs(): Set<string> {
  const idx = resolve(APP_BLOG_DIR, 'index.ts');
  if (!existsSync(idx)) return new Set();
  const src = readFileSync(idx, 'utf8');
  const slugs = new Set<string>();
  for (const m of src.matchAll(/from\s+['"]\.\/([a-z0-9-]+)['"]/g)) slugs.add(m[1]);
  return slugs;
}

/** Slugs already staged in output/blog (drafted, awaiting promote). */
function stagedSlugs(): Set<string> {
  if (!existsSync(STAGE_DIR)) return new Set();
  return new Set(readdirSync(STAGE_DIR).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')));
}

function pickTopic(): Topic | null {
  const { topics } = JSON.parse(readFileSync(TOPICS_FILE, 'utf8')) as { topics: Topic[] };
  const taken = new Set([...publishedSlugs(), ...stagedSlugs()]);
  return topics.find((t) => !taken.has(t.slug)) ?? null;
}

function blogPrompt(t: Topic): string {
  return `You are the lead content writer for VedicHour (vedichour.com), a Vedic astrology platform.
Write a complete, original, genuinely useful SEO blog article.

BRAND VOICE: warm, credible, specific, plain-English. Never fear-based, never spammy, no hype. We sell clarity and timing, not anxiety. Educational first.

TOPIC: ${t.title}
ANGLE: ${t.angle}
PRIMARY KEYWORDS to weave in naturally (don't stuff): ${t.keywords.join(', ')}

REQUIREMENTS:
- 1200-1700 words. BODY HTML ONLY — no <h1> (the page renders the title as H1).
- Use <h2> for sections, <h3> for sub-sections, <p>, <ul><li>, <strong>. Open with ONE bold-sentence answer wrapped in <p><strong>...</strong></p>.
- Include 4-6 internal links spread naturally through the article (descriptive anchor text), using ONLY these exact root-relative paths: <a href="/free-kundli">, <a href="/kundali">, <a href="/pricing">, <a href="/synastry">. Do NOT invent any other URLs.
- Include the promo code NEWUSER30 (30% off the first paid report) in a clear call-to-action TWICE: once mid-article and once near the end, naturally.
- Vedic astrology is sidereal. Be accurate.
- ABSOLUTELY NO guarantees, miracle/100% claims, or health/financial/relationship promises. No fear-mongering.

OUTPUT EXACTLY in this structure and nothing else (no markdown fences):
DESCRIPTION: <meta description, max 155 chars>
KEYWORDS: keyword one | keyword two | keyword three | keyword four | keyword five
---HTML---
<the body HTML here>
---FAQ---
Q: <question>
A: <answer>
Q: <question>
A: <answer>
Q: <question>
A: <answer>
---END---`;
}

function parseDraft(raw: string): Parsed | null {
  const description = (/DESCRIPTION:\s*(.+)/i.exec(raw)?.[1] ?? '').trim().slice(0, 158);
  const kwLine = (/KEYWORDS:\s*(.+)/i.exec(raw)?.[1] ?? '').trim();
  const htmlM = /---HTML---([\s\S]*?)---FAQ---/i.exec(raw);
  if (!htmlM) return null;
  const html = htmlM[1].trim();
  if (html.length < 400) return null;
  const keywords = kwLine ? kwLine.split('|').map((s) => s.trim()).filter(Boolean) : [];
  const faqBlock = /---FAQ---([\s\S]*?)(?:---END---|$)/i.exec(raw)?.[1] ?? '';
  const faqs: { q: string; a: string }[] = [];
  for (const m of faqBlock.matchAll(/Q:\s*([\s\S]*?)\s*A:\s*([\s\S]*?)(?=\n\s*Q:|$)/gi)) {
    const q = m[1].trim();
    const a = m[2].trim();
    if (q && a) faqs.push({ q, a });
  }
  return { description, keywords, html, faqs };
}

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words / 200));
}

function buildPost(t: Topic, p: Parsed) {
  return {
    slug: t.slug,
    title: t.title,
    description: p.description,
    keywords: p.keywords.length ? p.keywords : t.keywords,
    date: todayISO(),
    readingTimeMin: readingTime(p.html),
    html: p.html,
    ...(p.faqs.length ? { faqs: p.faqs } : {}),
  };
}

function stagePost(post: ReturnType<typeof buildPost>): string {
  if (!existsSync(STAGE_DIR)) mkdirSync(STAGE_DIR, { recursive: true });
  const file = resolve(STAGE_DIR, `${post.slug}.ts`);
  const body = `import type { BlogPost } from '@/content/blog/types';\n\nexport const post: BlogPost = ${JSON.stringify(post, null, 2)};\n`;
  writeFileSync(file, body);
  return file;
}

function recordContent(
  post: ReturnType<typeof buildPost>,
  t: Topic,
  verdict: string,
  reason: string,
  cli: string,
  file: string,
  status: string,
) {
  db()
    .prepare(
      `INSERT INTO content_library (asset, type, product, script_source, status, meta)
       VALUES (@asset, 'blog', @product, @src, @status, @meta)`,
    )
    .run({
      asset: file,
      product: t.product,
      src: `topic-backlog:${t.slug}`,
      status,
      meta: JSON.stringify({ slug: post.slug, title: post.title, description: post.description, keywords: post.keywords, words: readingTime(post.html) * 200, cli, verdict, reason }),
    });
}

/** L1 — draft one blog article, policy-lint it, and stage it for promotion. */
export async function runBlogLoop(opts: { tier?: Tier } = {}): Promise<void> {
  const loop = 'blog';
  if (isKilled()) {
    console.log(`[blog] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  try {
    const topic = pickTopic();
    if (!topic) {
      console.log('[blog] No unpublished topics left in the backlog.');
      logRun({ loop, status: 'skipped', detail: 'backlog empty' });
      writeHeartbeat(loop, 'backlog empty');
      return;
    }
    console.log(`[blog] Drafting: "${topic.title}"`);
    const draft = await brain(blogPrompt(topic), { tier: opts.tier ?? 'smart', loop });
    const parsed = parseDraft(draft.text);
    if (!parsed) throw new Error(`could not parse draft from ${draft.cli} (len ${draft.text.length})`);

    const post = buildPost(topic, parsed);
    const verdict = await lint(`${post.title}\n${post.description}\n${post.html}`);
    const status = verdict.verdict === 'block' ? 'archived' : 'ready';
    const file = stagePost(post);
    recordContent(post, topic, verdict.verdict, verdict.reason, draft.cli, file, status);

    if (verdict.verdict === 'flag') {
      enqueueApproval({ item: `Blog: ${post.title}`, lane: 'B', linter_verdict: 'flag', linter_reason: verdict.reason, channel: 'blog' });
    }

    const words = post.readingTimeMin * 200;
    console.log(
      `[blog] ${verdict.verdict.toUpperCase()} — "${post.title}"\n` +
        `       ~${words} words via ${draft.cli} (${draft.durationMs}ms) | linter: ${verdict.reason}\n` +
        `       staged: ${file}`,
    );
    if (verdict.verdict === 'block') console.log('[blog] BLOCKED by policy-linter — not promotable. Review the topic/output.');
    else console.log(`[blog] To publish to the live site: npm run blog:promote ${post.slug}`);
    writeHeartbeat(loop, `${verdict.verdict}: ${post.slug}`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[blog] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}

/** Promote a staged post into the live app: copy the file + register it in index.ts. */
export function promoteBlog(slug?: string): void {
  if (!existsSync(STAGE_DIR)) throw new Error('no output/blog staging dir — run npm run loop:blog first');
  const staged = readdirSync(STAGE_DIR).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, ''));
  if (!staged.length) throw new Error('nothing staged to promote');
  const target = slug ?? staged[staged.length - 1];
  const stagedFile = resolve(STAGE_DIR, `${target}.ts`);
  if (!existsSync(stagedFile)) throw new Error(`staged post not found: ${target} (have: ${staged.join(', ')})`);

  // Refuse to promote anything the linter blocked.
  const row = db().prepare(`SELECT status FROM content_library WHERE asset = ? ORDER BY id DESC LIMIT 1`).get(stagedFile) as { status?: string } | undefined;
  if (row?.status === 'archived') throw new Error(`"${target}" was blocked by the policy-linter — not promoting.`);

  copyFileSync(stagedFile, resolve(APP_BLOG_DIR, `${target}.ts`));

  const idxPath = resolve(APP_BLOG_DIR, 'index.ts');
  let idx = readFileSync(idxPath, 'utf8');
  const alias = camel(target);
  if (idx.includes(`from './${target}'`) || idx.includes(`from "./${target}"`)) {
    console.log(`[promote] ${target} already registered in index.ts`);
  } else {
    const importLine = `import { post as ${alias} } from './${target}';\n`;
    const lastImport = idx.lastIndexOf('import { post as');
    const insertAt = idx.indexOf('\n', lastImport) + 1;
    idx = idx.slice(0, insertAt) + importLine + idx.slice(insertAt);
    idx = idx.replace(/(export const POSTS: BlogPost\[\] = \[\r?\n)/, `$1  ${alias},\n`);
    writeFileSync(idxPath, idx);
  }

  db().prepare(`UPDATE content_library SET status='published', updated_at=datetime('now') WHERE asset = ?`).run(stagedFile);
  console.log(`[promote] Published "${target}" → ${resolve(APP_BLOG_DIR, `${target}.ts`)} and registered in index.ts`);
  console.log('[promote] Commit + deploy the app to make it live. (Verify the build first.)');
}
