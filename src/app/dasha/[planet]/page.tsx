import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { DASHAS, getDasha } from '@/content/dashas';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, faqPageLd, breadcrumbLd } from '@/lib/seo/jsonLd';

export function generateStaticParams() {
  return DASHAS.map((d) => ({ planet: d.slug }));
}

export function generateMetadata({ params }: { params: { planet: string } }): Metadata {
  const d = getDasha(params.planet);
  if (!d) return {};
  return {
    title: `${d.title} | VedicHour`,
    description: d.description,
    keywords: d.keywords,
    alternates: { canonical: `/dasha/${d.slug}` },
    openGraph: { title: d.title, description: d.description, type: 'article' },
  };
}

export default function DashaPage({ params }: { params: { planet: string } }) {
  const d = getDasha(params.planet);
  if (!d) notFound();

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/dasha" className="font-body text-body-sm text-dust hover:text-star transition-colors">← All dasha periods</Link>
        <p className="section-eyebrow mt-3 mb-2">Vimshottari Mahadasha · {d.years} years</p>
        <h1 className="text-display-md font-display text-star mb-6">{d.planet} Mahadasha</h1>

        <article
          className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: d.html }}
        />

        {d.faqs?.length > 0 && <FaqSection faqs={d.faqs} heading="Frequently asked" />}

        <div className="mt-12 text-center">
          <Link href="/vimshottari-dasha-calculator" className="btn-primary inline-block px-7 py-3">Find your current dasha free →</Link>
        </div>
      </main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: d.title,
            description: d.description,
            mainEntityOfPage: absUrl(`/dasha/${d.slug}`),
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour' },
            keywords: d.keywords.join(', '),
          },
          ...(d.faqs?.length ? [faqPageLd(d.faqs)] : []),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Dasha Periods', path: '/dasha' },
            { name: `${d.planet} Mahadasha`, path: `/dasha/${d.slug}` },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
