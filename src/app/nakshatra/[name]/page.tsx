import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { NAKSHATRAS, getNakshatra } from '@/content/nakshatras';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';

export function generateStaticParams() {
  return NAKSHATRAS.map((n) => ({ name: n.slug }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const n = getNakshatra(params.name);
  if (!n) return {};
  return {
    title: n.title,
    description: n.description,
    keywords: n.keywords,
    alternates: { canonical: `/nakshatra/${n.slug}` },
    openGraph: { title: n.title, description: n.description, type: 'article', images: ['/opengraph-image'] },
  };
}

export default function NakshatraPage({ params }: { params: { name: string } }) {
  const n = getNakshatra(params.name);
  if (!n) notFound();

  const facts: [string, string][] = [
    ['Ruling planet', n.lord],
    ['Deity', n.deity],
    ['Symbol', n.symbol],
    ['Gana', n.gana],
    ['Nadi', n.nadi],
    ['Yoni', n.yoni],
    ['Zodiac range', n.signRange],
  ];

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/nakshatra" className="font-body text-body-sm text-dust hover:text-star transition-colors">← All nakshatras</Link>
        <p className="section-eyebrow mt-3 mb-2">Nakshatra #{n.order} of 27</p>
        <h1 className="text-display-md font-display text-star mb-6">{n.name} Nakshatra</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-md bg-cosmos border border-horizon/40 p-3">
              <div className="font-mono text-mono-sm text-dust uppercase tracking-wider">{k}</div>
              <div className="font-display text-lg text-amber">{v}</div>
            </div>
          ))}
        </div>

        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: n.html }}
        />

        {n.faqs?.length > 0 && <FaqSection faqs={n.faqs} heading="Frequently asked" />}

        <div className="mt-12 text-center">
          <Link href="/nakshatra-finder" className="btn-primary inline-block px-7 py-3">Find your nakshatra free →</Link>
        </div>
      </main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: n.title,
            description: n.description,
            mainEntityOfPage: absUrl(`/nakshatra/${n.slug}`),
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour' },
            keywords: n.keywords.join(', '),
          },
          ...(n.faqs?.length ? [faqPageLd(n.faqs)] : []),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Nakshatras', path: '/nakshatra' },
            { name: `${n.name} Nakshatra`, path: `/nakshatra/${n.slug}` },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
