import { describe, it, expect } from 'vitest';
import { COMPARISONS, getComparison } from '@/content/comparisons';
import { GET as sitemap } from '@/app/api/sitemap/route';

const RETIRED = [/\$9\.99/, /\$19\.99/, /\$49\.99/, /₹\s?799\b/, /pay once/i, /no subscription/i, /NEWUSER30/, /money-back/i, /one-time (payment|report|purchase)/i, /free report/i];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('comparison articles', () => {
  it('there are at least 12, with unique slugs', () => {
    expect(COMPARISONS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(COMPARISONS.map((c) => c.slug)).size).toBe(COMPARISONS.length);
    for (const slug of ['astrotalk-alternative', 'astroyogi-alternative', 'ai-astrologer-vs-human-astrologer', 'vedic-vs-western-astrology']) {
      expect(getComparison(slug), slug).toBeTruthy();
    }
  });

  it.each(COMPARISONS.map((c) => [c.slug, c] as const))('%s is complete and citable', (_slug, c) => {
    // The short answer AI engines lift first.
    expect(c.verdict.length).toBeGreaterThanOrEqual(80);
    expect(c.verdict.length).toBeLessThanOrEqual(480);
    expect(c.verdict).toMatch(/[.]$/);
    // Real dates, in order.
    expect(c.published).toMatch(ISO);
    expect(c.updated).toMatch(ISO);
    expect(c.updated >= c.published).toBe(true);
    expect(Number.isNaN(new Date(`${c.updated}T00:00:00Z`).getTime())).toBe(false);
    // Structure.
    expect(c.title.length).toBeLessThanOrEqual(90);
    expect(c.description.length).toBeLessThanOrEqual(200);
    expect(c.keywords.length).toBeGreaterThanOrEqual(3);
    expect(c.faqs.length).toBeGreaterThanOrEqual(3);
    for (const f of c.faqs) {
      expect(f.q.endsWith('?')).toBe(true);
      expect(f.a.length).toBeGreaterThan(40);
    }
    expect(c.html).not.toMatch(/<h1/i);
    expect(c.html).toMatch(/<h2>/);
    expect(c.html).toMatch(/for reflection and planning only/i);
    // Nothing that stopped being true.
    const all = `${c.title} ${c.description} ${c.intro} ${c.verdict} ${c.html} ${c.faqs.map((f) => f.a).join(' ')}`;
    for (const re of RETIRED) expect(all, String(re)).not.toMatch(re);
    // A day has 24 planetary hours; the product scores 18 hourly slots. Never claim "18 planetary hours".
    expect(all).not.toMatch(/18 (planetary )?hours|all 18 horas/i);
  });

  it('every internal link points at a page that exists in the sitemap or a known route', async () => {
    const known = new Set(['/free-kundli', '/kundali', '/pricing', '/synastry', '/lagna-calculator', '/moon-sign-calculator', '/nakshatra-finder', '/vimshottari-dasha-calculator', '/manglik-dosha-calculator', '/sade-sati-calculator', '/kaal-sarp-dosha-calculator', '/sample-report', '/compare']);
    for (const c of COMPARISONS) known.add(`/compare/${c.slug}`);
    const re = /href="(\/[^"#?]*)"/g;
    for (const c of COMPARISONS) {
      for (let m = re.exec(c.html); m; m = re.exec(c.html)) {
        expect(known.has(m[1]), `${c.slug} links to ${m[1]}`).toBe(true);
      }
    }
  });

  it('competitor facts are dated, so no page presents an old check as current', () => {
    for (const slug of ['astrotalk-alternative', 'astroyogi-alternative']) {
      expect(getComparison(slug)!.html).toMatch(/checked 11 October 2026/);
    }
  });
});

describe('sitemap lists the comparison hub and every article with its real date', () => {
  it('has /compare and each /compare/<slug> with lastmod = updated', async () => {
    const xml = await (await sitemap()).text();
    expect(xml).toContain('/compare</loc>');
    for (const c of COMPARISONS) {
      const block = xml.split('<url>').find((b) => b.includes(`/compare/${c.slug}</loc>`));
      expect(block, c.slug).toBeTruthy();
      expect(block).toContain(`<lastmod>${c.updated}</lastmod>`);
    }
  });
});
