import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { POSTS } from '../content/blog';
import { GET as sitemapGET } from '../app/api/sitemap/route';

/**
 * SEO guardrails. These exist because the blog is extended by the marketing agent without
 * a human reading every <title>, and because search engines cut long titles and snippets.
 */

const ROOT = process.cwd();

describe('blog search snippets', () => {
  it('has a title that fits a search result (60 characters or fewer)', () => {
    const tooLong = POSTS.filter((p) => (p.seoTitle ?? p.title).length > 60).map(
      (p) => `${p.slug} (${(p.seoTitle ?? p.title).length})`,
    );
    expect(tooLong, `Add a shorter "seoTitle": ${tooLong.join(', ')}`).toEqual([]);
  });

  it('has a meta description of 160 characters or fewer', () => {
    const tooLong = POSTS.filter((p) => p.description.length > 160).map((p) => `${p.slug} (${p.description.length})`);
    expect(tooLong, `Trim description: ${tooLong.join(', ')}`).toEqual([]);
  });

  it('has an updated date that is not before the publish date', () => {
    const bad = POSTS.filter((p) => p.updated && p.updated < p.date).map((p) => p.slug);
    expect(bad).toEqual([]);
  });

  it('has no two posts with the same search title', () => {
    const titles = POSTS.map((p) => (p.seoTitle ?? p.title).toLowerCase());
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('sitemap.xml', () => {
  it('lists every URL once and includes every blog post', async () => {
    const xml = await sitemapGET().text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
    for (const p of POSTS) {
      expect(locs, `sitemap is missing /blog/${p.slug}`).toContain(`https://www.vedichour.com/blog/${p.slug}`);
    }
  });

  it('only lists static pages that exist in the app', async () => {
    const xml = await sitemapGET().text();
    const paths = Array.from(xml.matchAll(/<loc>https:\/\/www\.vedichour\.com([^<]*)<\/loc>/g), (m) => m[1] || '/');
    // Dynamic sections are generated from content; the rest must have a page file.
    const dynamicPrefixes = ['/blog/', '/nakshatra/', '/dasha/', '/predictions/', '/compare/', '/horoscope/', '/transit/'];
    const missing: string[] = [];
    for (const path of paths) {
      if (dynamicPrefixes.some((d) => path.startsWith(d))) continue;
      const rel = path === '/' ? '' : path;
      const candidates = [
        join(ROOT, 'src/app', rel, 'page.tsx'),
        join(ROOT, 'src/app/(marketing)', rel, 'page.tsx'),
      ];
      if (!candidates.some((c) => existsSync(c))) missing.push(path);
    }
    expect(missing, `in sitemap but no page file: ${missing.join(', ')}`).toEqual([]);
  });
});
