import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { POSTS, getPost } from '@/content/blog';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';
import { UNLOCK_7DAY_HREF, UNLOCK_FREE_HREF } from '@/lib/pricing';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

/** Brand suffix is dropped when the title is already long, so the full title is not cut mid-word. */
function searchTitle(post: { title: string; seoTitle?: string }) {
  const t = post.seoTitle ?? post.title;
  return t.length + ' | VedicHour'.length <= 62 ? { absolute: `${t} | VedicHour` } : { absolute: t };
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  // The per-post image route draws Latin text only, so Hindi posts use the site card.
  const ogImage = post.lang === 'hi' ? '/opengraph-image' : `/blog/${post.slug}/opengraph-image`;
  const shareTitle = post.seoTitle ?? post.title;
  const alt = post.alternateSlug ? getPost(post.alternateSlug) : undefined;
  return {
    title: searchTitle(post),
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
      // hreflang only when a real translation exists, in both directions.
      ...(alt
        ? {
            languages: {
              [post.lang === 'hi' ? 'hi' : 'en']: `/blog/${post.slug}`,
              [alt.lang === 'hi' ? 'hi' : 'en']: `/blog/${alt.slug}`,
              'x-default': `/blog/${post.lang === 'hi' ? alt.slug : post.slug}`,
            },
          }
        : {}),
    },
    openGraph: {
      title: shareTitle,
      description: post.description,
      type: 'article',
      url: `/blog/${post.slug}`,
      images: [ogImage],
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: ['VedicHour'],
      tags: post.keywords,
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: post.description,
      images: [ogImage],
    },
  };
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function htmlToText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Internal link-backs from every article to the free calculator that answers the same
 * question. Matched on slug + title + keywords so a new post is wired up without any
 * extra field. Most specific tool first; at most five links.
 */
const TOOL_RULES: { test: RegExp; href: string; label: string }[] = [
  { test: /sade[- ]?sati|dhaiya|panoti|saturn/i, href: '/sade-sati-calculator', label: 'Sade Sati calculator: is it running for you?' },
  { test: /manglik|mangal|kuja/i, href: '/manglik-dosha-calculator', label: 'Manglik Dosha calculator' },
  { test: /kaal[- ]?sarp/i, href: '/kaal-sarp-dosha-calculator', label: 'Kaal Sarp Dosha calculator' },
  { test: /dasha|mahadasha|antardasha/i, href: '/vimshottari-dasha-calculator', label: 'Vimshottari Dasha calculator: your current period' },
  { test: /nakshatra|birth star|gandanta|pada/i, href: '/nakshatra-finder', label: 'Nakshatra calculator: find your birth star' },
  { test: /moon sign|rashi|chandra/i, href: '/moon-sign-calculator', label: 'Moon sign calculator' },
  { test: /lagna|ascendant|rising sign|houses?\b|bhava/i, href: '/lagna-calculator', label: 'Lagna calculator: find your ascendant' },
  { test: /match|milan|compat|nadi|bhakoot|gun\b|guna|synastry|vivah|marriage/i, href: '/synastry', label: 'Kundli matching (Gun Milan)' },
  { test: /muhurat|muhurta|hora\b|choghadiya|rahu kaal|panchang|abhijit|brahma|gulika|yamaganda|planetary hour/i, href: '/hora', label: 'Planetary hours (hora) explained' },
];

function relatedTools(post: { slug: string; title: string; keywords: string[] }) {
  const hay = `${post.slug.replace(/-/g, ' ')} ${post.title} ${post.keywords.join(' ')}`;
  const tools: { href: string; label: string }[] = [];
  for (const r of TOOL_RULES) {
    if (r.test.test(hay) && !tools.some((t) => t.href === r.href)) tools.push({ href: r.href, label: r.label });
  }
  tools.splice(3);
  tools.push({ href: UNLOCK_FREE_HREF, label: 'Free Kundli: Lagna, Moon sign, birth star and dasha' });
  if (/kundli|kundali|chart|birth|houses?\b/i.test(hay)) {
    tools.push({ href: '/kundali', label: 'Deep Kundli report: your full birth chart' });
  }
  tools.push({ href: UNLOCK_7DAY_HREF, label: 'Your own hour-by-hour forecast' });
  return tools.slice(0, 5);
}

function relatedPosts(slug: string, keywords: string[], n = 3) {
  const kw = new Set(keywords.map((k) => k.toLowerCase()));
  return POSTS.filter((p) => p.slug !== slug)
    .map((p) => ({ p, overlap: p.keywords.filter((k) => kw.has(k.toLowerCase())).length }))
    .sort((a, b) => b.overlap - a.overlap || b.p.date.localeCompare(a.p.date))
    .slice(0, n)
    .map((x) => x.p);
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const related = relatedPosts(post.slug, post.keywords);
  const tools = relatedTools(post);
  // Wrap each table so wide ones scroll sideways on a phone instead of being clipped.
  const bodyHtml = post.html.replace(/<table/g, '<div class="table-scroll"><table').replace(/<\/table>/g, '</table></div>');
  const articleBody = htmlToText(post.html);
  const wordCount = articleBody ? articleBody.split(' ').length : 0;

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/blog" className="font-body text-body-sm text-dust hover:text-star transition-colors">← All articles</Link>
        <h1 lang={post.lang === 'hi' ? 'hi' : undefined} className="text-display-md font-display text-star mt-3 mb-2">{post.title}</h1>
        <p className="font-mono text-mono-sm text-dust mb-8">
          {post.updated && post.updated !== post.date ? (
            <>Updated <time dateTime={post.updated}>{fmt(post.updated)}</time></>
          ) : (
            <time dateTime={post.date}>{fmt(post.date)}</time>
          )}
          {' '}· {post.readingTimeMin} min read · By the <Link href="/about" className="underline hover:text-star">VedicHour editorial team</Link>
        </p>

        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-7 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_.table-scroll]:overflow-x-auto [&_.table-scroll]:my-6 [&_.table-scroll_table]:my-0 [&_.table-scroll_table]:min-w-full [&_p]:mb-4 [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_table]:text-body-sm [&_th]:text-left [&_th]:text-star [&_th]:font-display [&_th]:border-b [&_th]:border-horizon/50 [&_th]:py-2 [&_th]:px-3 [&_td]:border-b [&_td]:border-horizon/20 [&_td]:py-2 [&_td]:px-3 [&_td]:align-top"
          lang={post.lang === 'hi' ? 'hi' : undefined}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {post.sources && post.sources.length > 0 && (
          <aside className="mt-10 border-t border-horizon/30 pt-6 font-body text-body-sm text-dust">
            <h2 className="font-display text-lg text-star mb-2">Sources and method</h2>
            <ul className="list-disc pl-6 space-y-1">
              {post.sources.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
            <p className="mt-3">
              Chart calculations use the Swiss Ephemeris with the Lahiri ayanamsa. How we write and check
              articles is on the <Link href="/about" className="text-amber underline">about page</Link>.
            </p>
          </aside>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 font-body text-body-sm text-dust">
          <span>Share:</span>
          <a
            href={`https://x.com/intent/tweet?url=${encodeURIComponent(absUrl(`/blog/${post.slug}`))}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber underline hover:text-amber-light transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${absUrl(`/blog/${post.slug}`)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber underline hover:text-amber-light transition-colors"
          >
            Share on WhatsApp
          </a>
        </div>

        {post.faqs && post.faqs.length > 0 && <FaqSection faqs={post.faqs} heading="Frequently asked" />}

        <div className="mt-14 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">Ready to decode your own hours?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={UNLOCK_7DAY_HREF} className="btn-primary">Unlock my hour-by-hour forecast →</Link>
            <Link href={UNLOCK_FREE_HREF} className="btn-secondary">Or start with the free chart</Link>
          </div>
          <p className="font-body text-body-sm text-dust mt-4">
            Your own hour-by-hour forecast starts with a <Link href={UNLOCK_7DAY_HREF} className="text-amber underline">2-minute quiz</Link>.
          </p>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-xl text-star mb-4">Related tools</h2>
          <ul className="list-disc pl-6 space-y-1.5 font-body text-body-md text-dust">
            {tools.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="text-amber underline">{t.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {related.length > 0 && (
          <div className="mt-14">
            <h2 className="font-display text-xl text-star mb-4">Keep reading</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group card-interactive p-4 block">
                  <div className="font-display text-base text-star group-hover:text-amber-light transition-colors leading-snug">{r.title}</div>
                  <div className="font-mono text-mono-sm text-dust mt-1">{r.readingTimeMin} min read</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-14 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">Get weekly Vedic timing tips</p>
          <div className="flex justify-center"><NewsletterSignup source={`blog:${post.slug}`} /></div>
        </div>
      </main>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.seoTitle ?? post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.updated ?? post.date,
            image: absUrl(post.lang === 'hi' ? '/opengraph-image' : `/blog/${post.slug}/opengraph-image`),
            author: { '@type': 'Organization', name: 'VedicHour', url: absUrl('/about') },
            publisher: {
              '@type': 'Organization',
              name: 'VedicHour',
              url: absUrl('/'),
              logo: { '@type': 'ImageObject', url: absUrl('/icons/icon-512.png') },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/blog/${post.slug}`) },
            keywords: post.keywords.join(', '),
            wordCount,
            inLanguage: post.lang === 'hi' ? 'hi' : 'en',
          },
          ...(post.faqs && post.faqs.length ? [faqPageLd(post.faqs)] : []),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
