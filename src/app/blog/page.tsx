import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { POSTS } from '@/content/blog';
import { JsonLd } from '@/components/seo/JsonLd';
import { absUrl, breadcrumbLd } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Jyotish Blog — Vedic Astrology Guides | VedicHour',
  description:
    'In-depth, plain-English Vedic astrology guides: kundli matching, Manglik & Sade Sati, reading your birth chart, Vedic vs Western astrology, and more.',
  alternates: { canonical: '/blog' },
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-12">
          <p className="section-eyebrow mb-3">Jyotish Journal</p>
          <h1 className="text-display-md font-display text-star mb-4">Vedic Astrology, <span className="text-amber">Explained Clearly</span></h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Plain-English guides to kundli, matching, doshas, dashas, and timing — written to actually help, not to confuse.
          </p>
        </div>

        <div className="space-y-4">
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group card-interactive p-6 block">
              <h2 className="font-display text-2xl text-star group-hover:text-amber-light transition-colors mb-1.5">{p.title}</h2>
              <p className="font-body text-body-sm text-dust leading-relaxed mb-2">{p.description}</p>
              <span className="font-mono text-mono-sm text-dust/50">{fmt(p.date)} · {p.readingTimeMin} min read</span>
            </Link>
          ))}
        </div>
      </main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            '@id': `${absUrl('/blog')}#blog`,
            url: absUrl('/blog'),
            name: 'VedicHour Jyotish Blog',
            blogPost: POSTS.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: absUrl(`/blog/${p.slug}`),
              datePublished: p.date,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${absUrl('/blog')}#collection`,
            url: absUrl('/blog'),
            name: 'Jyotish Blog — Vedic Astrology Guides',
            isPartOf: { '@id': `${absUrl('/blog')}#blog` },
            hasPart: POSTS.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: absUrl(`/blog/${p.slug}`),
              datePublished: p.date,
            })),
          },
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
