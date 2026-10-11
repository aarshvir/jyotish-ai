import type { Metadata } from 'next';
import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';
import { COMPARISONS } from '@/content/comparisons';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbLd, absUrl } from '@/lib/seo/jsonLd';

const TITLE = 'Vedic Astrology Apps & Sites Compared';
const DESCRIPTION =
  'Honest comparisons of Vedic astrology sites and apps: AstroSage, Prokerala, AstroTalk, Astroyogi, AI and human astrologers, Kundli matching and dosha calculators.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/compare' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/compare', type: 'website' },
};

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function CompareIndexPage() {
  const list = [...COMPARISONS].sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <Link href="/free-kundli" className="font-body text-body-sm text-dust hover:text-star transition-colors">← Free Kundli &amp; tools</Link>
        <h1 className="text-display-md font-display text-star mt-3 mb-4">{TITLE}</h1>
        <p className="text-body-lg text-dust leading-relaxed mb-8">
          There is no single best astrology site; it depends on what you want. Each guide below gives a short answer first, says where the other option is stronger, and dates the facts it quotes from competitors&rsquo; own pages.
        </p>
        <ul className="space-y-6">
          {list.map((c) => (
            <li key={c.slug} className="card border border-amber/20 rounded-card p-5">
              <h2 className="font-display text-xl text-star mb-1">
                <Link href={`/compare/${c.slug}`} className="text-amber underline">{c.h1}</Link>
              </h2>
              <p className="font-body text-body-md text-dust leading-relaxed">{c.verdict}</p>
              <p className="font-body text-body-sm text-dust mt-2">Updated {longDate(c.updated)}</p>
            </li>
          ))}
        </ul>
      </main>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path: '/compare' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: TITLE,
            itemListElement: list.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.h1,
              url: absUrl(`/compare/${c.slug}`),
            })),
          },
        ]}
      />
    </div>
  );
}
