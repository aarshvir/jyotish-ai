import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { POSTS, getPost } from '../content/blog';

/**
 * Guards the blog registry against the desync that broke the production build
 * twice (PR #69, #71): the marketing agent (blog:promote) adds an import to
 * index.ts without committing the module file, or commits a module without
 * wiring it into the index. The first case fails the Vercel build; the second
 * silently drops a post from /blog. Both are caught here, in test:regression,
 * before they ever reach a deploy.
 */
const BLOG_DIR = join(process.cwd(), 'src', 'content', 'blog');

describe('blog index <-> module files stay in sync', () => {
  // If any imported module were missing, importing POSTS above would already
  // fail to compile — this asserts the registry actually loaded with content.
  it('loads a non-empty set of posts', () => {
    expect(Array.isArray(POSTS)).toBe(true);
    expect(POSTS.length).toBeGreaterThan(0);
  });

  it('every post module file on disk is referenced by index.ts', () => {
    const indexSrc = readFileSync(join(BLOG_DIR, 'index.ts'), 'utf8');
    // Match both single- and double-quoted relative imports: from './x' | from "./x"
    const imported = new Set(
      Array.from(indexSrc.matchAll(/from\s+['"]\.\/([a-z0-9-]+)['"]/g), (m) => m[1]),
    );
    const moduleFiles = readdirSync(BLOG_DIR)
      .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')
      .map((f) => f.replace(/\.ts$/, ''));

    const orphans = moduleFiles.filter((f) => !imported.has(f));
    expect(orphans, `blog modules on disk but NOT imported in index.ts: ${orphans.join(', ')}`).toEqual([]);
  });

  it('every post has the required fields and a resolvable slug', () => {
    for (const p of POSTS) {
      expect(typeof p.slug, `slug for "${p.title}"`).toBe('string');
      expect(p.slug.length).toBeGreaterThan(0);
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(typeof p.description).toBe('string');
      expect(Array.isArray(p.keywords)).toBe(true);
      expect(typeof p.date).toBe('string');
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(typeof p.readingTimeMin).toBe('number');
      expect(typeof p.html).toBe('string');
      expect(p.html.length).toBeGreaterThan(0);
      // getPost (used by the [slug] route) must resolve every listed post.
      expect(getPost(p.slug)?.slug).toBe(p.slug);
    }
  });

  it('has no duplicate slugs', () => {
    const slugs = POSTS.map((p) => p.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(dupes, `duplicate blog slugs: ${dupes.join(', ')}`).toEqual([]);
  });
});
