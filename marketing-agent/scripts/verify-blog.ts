import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// Imports the LIVE app blog index (and therefore every post) to prove it still loads.
const here = dirname(fileURLToPath(import.meta.url));
const idx = resolve(here, '..', '..', 'src', 'content', 'blog', 'index.ts');
const m: any = await import(pathToFileURL(idx).href);

console.log('POSTS count:', m.POSTS.length);
const malformed = m.POSTS.filter((p: any) => !p.slug || !p.title || !p.html || !p.date);
console.log('malformed posts:', malformed.length);

const slug = process.argv[2];
if (slug) {
  const p = m.getPost(slug);
  console.log('promoted post:', p ? `OK — "${p.title}" (${p.readingTimeMin}min, ${p.keywords.length} keywords, ${p.faqs?.length ?? 0} FAQs)` : 'NOT FOUND');
}
