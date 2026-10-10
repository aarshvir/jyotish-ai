import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { BLOG_DESCRIPTION, BLOG_HTML, BLOG_TITLE, CAPTION, EMAILS } from '../../config/pieces';
import { logRun } from '../db';
import { ENGINE_ROOT, REPO_ROOT } from '../paths';
import { utm } from './paid';

const SLUG = 'two-meeting-times-same-tuesday';

function writeBlog(): string {
  const file = resolve(REPO_ROOT, 'src/content/blog', `${SLUG}.ts`);
  const src = `import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: ${JSON.stringify(SLUG)},
  title: ${JSON.stringify(BLOG_TITLE)},
  description: ${JSON.stringify(BLOG_DESCRIPTION)},
  keywords: ['two meeting times', 'planetary hours', 'vedic timing', 'vedichour'],
  date: '2026-10-10',
  readingTimeMin: 5,
  html: ${JSON.stringify(BLOG_HTML)},
  faqs: [
    {
      q: 'Can a chart tell me which of two meeting times to take?',
      a: 'It can score the hours on your chart so you can compare them. That score is a planning aid. It does not decide the meeting, and it does not promise the outcome.',
    },
    {
      q: 'Does VedicHour charge my card every month on its own?',
      a: 'No. Ziina does not keep a card mandate. You pay for a month or a year at the price on the page. A later period starts only when you pay again.',
    },
  ],
};
`;
  writeFileSync(file, src);
  const indexPath = resolve(REPO_ROOT, 'src/content/blog/index.ts');
  let index = readFileSync(indexPath, 'utf8');
  const imp = `import { post as twoMeetingTimesSameTuesday } from './${SLUG}';`;
  if (!index.includes(imp)) {
    index = index.replace(
      "import { post as gandantaJunctionsExplained } from './gandanta-junctions-explained';",
      `import { post as gandantaJunctionsExplained } from './gandanta-junctions-explained';\n${imp}`,
    );
    index = index.replace('export const POSTS: BlogPost[] = [\n', 'export const POSTS: BlogPost[] = [\n  twoMeetingTimesSameTuesday,\n');
    writeFileSync(indexPath, index);
  }
  return file;
}

export function runDistribute(db: DatabaseSync): void {
  const ready = resolve(ENGINE_ROOT, 'ready-to-post');
  mkdirSync(ready, { recursive: true });
  const blog = writeBlog();
  const link = utm('/start', 'instagram', 'organic', SLUG);

  writeFileSync(
    resolve(ready, 'instagram.md'),
    `# Instagram / Threads — your tap

Do not auto-post. Instagram's terms forbid automated access that is not their API. The official publish API (\`instagram_content_publish\`) needs a professional account and, for an app that posts for a business, App Review. This folder is the one-click pack until that review exists. Even then, this engine will not call media_publish. You press publish.

**Why this one:** Two times on one Tuesday is a concrete decision. The reel shows the live quiz and the sample report, with sound. Listen before you post. The English voice is espeak-ng, not a person.

**When:** Evenings in India are a reasonable guess. We have no measured audience hours yet, so do not treat a clock time as data.

**Link sticker:** ${link}

**Caption**

${CAPTION}

**Hashtags**

#vedichour #timing
`,
  );

  writeFileSync(
    resolve(ready, 'youtube.md'),
    `# YouTube — staged, not uploaded

\`videos.insert\` is allowed with OAuth scope youtube.upload. Projects created after 28 July 2020 lock those uploads to private until YouTube's API audit. Default quota is on the order of a handful of uploads a day (an insert is 1600 units against a ~10,000 unit daily default).

No refresh token is in this environment. Nothing was uploaded.

**Title:** Two times. One Tuesday.

**Description:** A sun-sign line cannot split 10:00 and 17:00. VedicHour scores eighteen windows a day for thirty days after a quiz. Planning aid, not a job offer. You pay for the month. The card is not charged again by itself.

${utm('/start', 'youtube', 'short', SLUG)}

For reflection and planning, not certainty.
`,
  );

  const mailDir = resolve(ENGINE_ROOT, 'out', 'email');
  mkdirSync(mailDir, { recursive: true });
  for (const e of EMAILS) {
    writeFileSync(resolve(mailDir, `${e.id}.txt`), `Subject: ${e.subject}\n\n${e.body}\n`);
  }

  const rssItem = `<item><title>${BLOG_TITLE}</title><link>https://www.vedichour.com/blog/${SLUG}</link><description>${BLOG_DESCRIPTION}</description></item>`;
  writeFileSync(
    resolve(ENGINE_ROOT, 'out', 'feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>VedicHour</title><link>https://www.vedichour.com/blog</link>${rssItem}</channel></rss>\n`,
  );

  logRun(db, 'distribute', 'ok', `blog ${blog}; instagram and youtube staged; email files written; no API publish`);
  if (!existsSync(blog)) throw new Error('blog file missing after distribute');
}
