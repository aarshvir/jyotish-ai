import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { PREDICTIONS, getPrediction } from '@/content/predictions';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';

export function generateStaticParams() {
  return PREDICTIONS.map((p) => ({ area: p.slug }));
}

export function generateMetadata({ params }: { params: { area: string } }): Metadata {
  const p = getPrediction(params.area);
  if (!p) return {};
  return {
    title: `${p.title} | VedicHour`,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/predictions/${p.slug}` },
    openGraph: { title: p.title, description: p.description, type: 'article', images: ['/opengraph-image'] },
  };
}

export default function PredictionPage({ params }: { params: { area: string } }) {
  const p = getPrediction(params.area);
  if (!p) notFound();

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/predictions" className="font-body text-body-sm text-dust hover:text-star transition-colors">← All life-area readings</Link>
        <h1 className="text-display-md font-display text-star mt-3 mb-6">{p.title}</h1>

        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: p.html }}
        />

        {p.faqs?.length > 0 && <FaqSection faqs={p.faqs} heading="Frequently asked" />}

        <div className="mt-12 text-center">
          <Link href="/free-kundli" className="btn-primary inline-block px-7 py-3">Get your free Kundli →</Link>
        </div>
      </main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: p.title,
            description: p.description,
            mainEntityOfPage: absUrl(`/predictions/${p.slug}`),
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour' },
            keywords: p.keywords.join(', '),
          },
          ...(p.faqs?.length ? [faqPageLd(p.faqs)] : []),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Predictions', path: '/predictions' },
            { name: p.title, path: `/predictions/${p.slug}` },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
