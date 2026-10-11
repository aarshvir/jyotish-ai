import { POSTS } from '@/content/blog';
import { NAKSHATRAS } from '@/content/nakshatras';
import { DASHAS } from '@/content/dashas';
import { PREDICTIONS } from '@/content/predictions';
import { COMPARISONS } from '@/content/comparisons';
import { METHOD_REVIEWED } from '@/lib/seo/methodology';

const SITE_URL = 'https://www.vedichour.com';

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const STATIC_ROUTES = [
  { path: '/',         changefreq: 'daily',   priority: '1.0'  },
  { path: '/kundali',  changefreq: 'weekly',  priority: '0.9'  },  // Deep Kundali product landing
  { path: '/synastry', changefreq: 'weekly',  priority: '0.9'  },  // Matchmaking / Gun Milan landing
  { path: '/pricing',  changefreq: 'weekly',  priority: '0.95' },
  { path: '/sample-report', changefreq: 'monthly', priority: '0.9' },  // Public full-day sample report (ad landing)
  { path: '/methodology', changefreq: 'monthly', priority: '0.7', lastmod: METHOD_REVIEWED },
  { path: '/hora',     changefreq: 'monthly', priority: '0.7'  },  // Wave-3 category explainer (planetary hours)
  { path: '/muhurat',  changefreq: 'monthly', priority: '0.7'  },  // Wave-3 category explainer (auspicious timing)
  { path: '/about',    changefreq: 'monthly', priority: '0.6'  },  // Methodology / E-E-A-T page
  { path: '/refund',   changefreq: 'monthly', priority: '0.5'  },
  { path: '/privacy',  changefreq: 'monthly', priority: '0.4'  },
  { path: '/terms',    changefreq: 'monthly', priority: '0.4'  },
];

// Free calculator tool pages — the highest-ROI SEO surface (the niche ranks tools).
const TOOL_ROUTES = [
  '/free-kundli',
  '/manglik-dosha-calculator',
  '/sade-sati-calculator',
  '/vimshottari-dasha-calculator',
  '/nakshatra-finder',
  '/moon-sign-calculator',
  '/lagna-calculator',
  '/kaal-sarp-dosha-calculator',
].map((path) => ({ path, changefreq: 'weekly', priority: path === '/free-kundli' ? '0.85' : '0.8' }));

// Transit pages exist only for the four slow planets, where the dates are the answer (see
// src/content/transits.ts). Sun, Moon, Mars, Mercury and Venus change sign in days to weeks, so
// their per-sign pages are noindex and not listed. The /transit hub lists where each planet is now.
const SLOW_TRANSIT_PLANETS = ['saturn', 'jupiter', 'rahu', 'ketu'];
const TRANSIT_ROUTES = [
  { path: '/transit', changefreq: 'weekly', priority: '0.8' },
  ...SLOW_TRANSIT_PLANETS.flatMap((planet) =>
    SIGNS.map((sign) => ({
      path: `/transit/${planet}/${sign}`,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ),
];

// lastmod is the last substantive edit (updated) when we have one, otherwise the publish date.
const lastEdit = (p: (typeof POSTS)[number]) => p.updated ?? p.date;
const BLOG_ROUTES = [
  { path: '/blog', changefreq: 'daily', priority: '0.7', lastmod: POSTS.map(lastEdit).sort().at(-1) },
  ...POSTS.map((p) => ({ path: `/blog/${p.slug}`, changefreq: 'weekly', priority: '0.7', lastmod: lastEdit(p) })),
];

// Programmatic reference hubs + leaves (nakshatras, dasha periods, life predictions).
const REFERENCE_ROUTES = [
  { path: '/nakshatra', changefreq: 'weekly', priority: '0.75' },
  ...NAKSHATRAS.map((n) => ({ path: `/nakshatra/${n.slug}`, changefreq: 'monthly', priority: '0.7' })),
  { path: '/dasha', changefreq: 'weekly', priority: '0.75' },
  ...DASHAS.map((d) => ({ path: `/dasha/${d.slug}`, changefreq: 'monthly', priority: '0.7' })),
  { path: '/predictions', changefreq: 'weekly', priority: '0.75' },
  ...PREDICTIONS.map((p) => ({ path: `/predictions/${p.slug}`, changefreq: 'monthly', priority: '0.7' })),
];

// Comparison / "alternative" pages — mid-tail commercial-intent SEO surface.
const COMPARE_ROUTES = [
  { path: '/compare', changefreq: 'weekly', priority: '0.7', lastmod: COMPARISONS.map((c) => c.updated).sort().slice(-1)[0] },
  ...COMPARISONS.map((c) => ({
    path: `/compare/${c.slug}`,
    changefreq: 'monthly',
    priority: '0.65',
    lastmod: c.updated,
  })),
];

const ALL_ROUTES = [...STATIC_ROUTES, ...TOOL_ROUTES, ...BLOG_ROUTES, ...REFERENCE_ROUTES, ...COMPARE_ROUTES, ...TRANSIT_ROUTES];

export function GET() {
  // Only emit <lastmod> where we have a REAL date (blog posts carry p.date). Stamping
  // every URL with request-time "now" is inaccurate and Google ignores unreliable
  // lastmod, so omit it for static/reference routes rather than fake a fresh date.
  const urls = ALL_ROUTES.map((r) => {
    const lm = (r as { lastmod?: string }).lastmod;
    const lastmodTag = lm ? `\n    <lastmod>${lm}</lastmod>` : '';
    return `  <url>\n    <loc>${SITE_URL}${r.path}</loc>${lastmodTag}\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
