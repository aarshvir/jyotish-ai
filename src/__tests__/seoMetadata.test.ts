import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { POSTS } from '../content/blog';
import { NAKSHATRAS } from '../content/nakshatras';
import { DASHAS } from '../content/dashas';
import { PREDICTIONS } from '../content/predictions';
import { COMPARISONS } from '../content/comparisons';
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

/**
 * Voice and safety guardrails for article copy. These are blunt on purpose: they catch the
 * phrases that make copy read as machine-written, and the kinds of statement the site never makes.
 */
const postText = (p: (typeof POSTS)[number]) =>
  `${p.title} ${p.description} ${p.html} ${(p.faqs ?? []).map((f) => `${f.q} ${f.a}`).join(' ')}`;

describe('article voice', () => {
  const BANNED = /\b(delve[sd]?|tapestry|fast-paced world|embark on|testament to|dive into|deep dive|ever-evolving|game-changer|holistic)\b/i;

  it('avoids stock AI phrases', () => {
    const hits = POSTS.filter((p) => BANNED.test(postText(p))).map((p) => `${p.slug}: ${postText(p).match(BANNED)?.[0]}`);
    expect(hits).toEqual([]);
  });

  // Pages that AI assistants already cite. They are kept exactly as published so the quoted text
  // and URLs stay stable; rewrite them only after checking that citations survive.
  const FROZEN = new Set([
    'best-vedic-astrology-platforms-2026',
    'best-ai-vedic-astrology-app-2026',
    'career-astrology-10th-house',
  ]);

  it('does not overuse em dashes (4 or fewer per article; cited pages are frozen)', () => {
    const many = POSTS.filter((p) => !FROZEN.has(p.slug)).map((p) => ({ slug: p.slug, n: (postText(p).match(/—|&mdash;|&#8212;/g) ?? []).length })).filter((x) => x.n > 4);
    expect(many).toEqual([]);
  });

  it('never predicts death, divorce or the sex of a child', () => {
    const RE = /will (die|divorce|be widowed)|sex of (the|your|an unborn|a) (unborn )?child|gender of the (unborn )?child|baby (boy|girl) (is|will)/i;
    const hits = POSTS.filter((p) => RE.test(postText(p))).map((p) => p.slug);
    expect(hits).toEqual([]);
  });
});

describe('article internal links', () => {
  const STATIC_DIRS = ['src/app', 'src/app/(marketing)'];
  const known = new Set(POSTS.map((p) => p.slug));

  function resolves(href: string): boolean {
    const path = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
    if (path === '/') return true;
    if (path.startsWith('/blog/')) return known.has(path.slice('/blog/'.length));
    const dynamic: Record<string, string[]> = {
      '/nakshatra/': NAKSHATRAS.map((n) => n.slug),
      '/dasha/': DASHAS.map((d) => d.slug),
      '/predictions/': PREDICTIONS.map((x) => x.slug),
      '/compare/': COMPARISONS.map((c) => c.slug),
    };
    for (const [prefix, slugs] of Object.entries(dynamic)) {
      if (path.startsWith(prefix)) return slugs.includes(path.slice(prefix.length));
    }
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'transit' && parts.length === 3) {
      return ['saturn', 'jupiter', 'rahu', 'ketu'].includes(parts[1]) && parts[2].length > 2;
    }
    return STATIC_DIRS.some((d) => existsSync(join(ROOT, d, ...parts, 'page.tsx')));
  }

  it('only links to pages that exist', () => {
    const broken: string[] = [];
    for (const p of POSTS) {
      for (const m of Array.from(p.html.matchAll(/href="(\/[^"]*)"/g))) {
        if (!resolves(m[1])) broken.push(`${p.slug} -> ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
