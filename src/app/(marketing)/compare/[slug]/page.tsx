import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { COMPARISONS, getComparison } from '@/content/comparisons';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = getComparison(params.slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: {
      title: c.title,
      description: c.description,
      url: `/compare/${c.slug}`,
      type: 'article',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: c.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.title,
      description: c.description,
      images: ['/opengraph-image'],
    },
  };
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const c = getComparison(params.slug);
  if (!c) notFound();

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/free-kundli" className="font-body text-body-sm text-dust hover:text-star transition-colors">← Free Kundli &amp; tools</Link>
        <h1 className="text-display-md font-display text-star mt-3 mb-4">{c.h1}</h1>
        <p className="text-body-lg text-dust leading-relaxed mb-8">{c.intro}</p>
        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mb-4 [&_em]:text-dust [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_table]:text-body-sm [&_th]:text-left [&_th]:text-star [&_th]:font-display [&_th]:border-b [&_th]:border-horizon/50 [&_th]:py-2 [&_th]:px-3 [&_td]:border-b [&_td]:border-horizon/20 [&_td]:py-2 [&_td]:px-3 [&_td]:align-top"
          dangerouslySetInnerHTML={{ __html: c.html }}
        />
        <FaqSection faqs={c.faqs} heading="Frequently asked" />
        <div className="mt-12 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">See your own chart, free</p>
          <div className="flex justify-center">
            <Link href="/free-kundli" className="btn-primary">Get your free Kundli →</Link>
          </div>
        </div>

        {COMPARISONS.some((o) => o.slug !== c.slug) && (
          <nav aria-label="Related comparisons" className="mt-10">
            <h2 className="font-display text-xl text-star mb-3">Related comparisons</h2>
            <ul className="list-disc pl-6 space-y-1.5 font-body text-body-md text-dust">
              {COMPARISONS.filter((o) => o.slug !== c.slug).map((o) => (
                <li key={o.slug}>
                  <Link href={`/compare/${o.slug}`} className="text-amber underline">{o.h1}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: c.h1, path: `/compare/${c.slug}` },
          ]),
          faqPageLd(c.faqs),
        ]}
      />
      <Footer />
    </div>
  );
}
