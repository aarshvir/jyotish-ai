import type { Metadata } from 'next';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FreeKundli from '@/components/landing/FreeKundli';
import SampleReportPreview from '@/components/landing/SampleReportPreview';
import FAQ from '@/components/landing/FAQ';
import { FAQS } from '@/lib/faq-data';
import FinalCTA from '@/components/landing/FinalCTA';
import { FREE_CHART_DESCRIPTION } from '@/lib/landingCopy';

const PAGE_DESCRIPTION = `${FREE_CHART_DESCRIPTION} No sign-up or payment card. Read a calculated example and understand the method.`;

export const metadata: Metadata = {
  title: { absolute: 'VedicHour | Free Vedic Birth Chart' },
  description: PAGE_DESCRIPTION,
  keywords: [
    'Jyotish',
    'Jyotish AI',
    'Jyotish forecast',
    'free Kundli',
    'Kundli',
    'AI Kundli',
    'Janam Kundali',
    'online kundli',
    'Vedic forecast',
    'Vedic astrology',
    'astrology report',
    'birth chart',
    'hora forecast',
    'choghadiya',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VedicHour | Free Vedic Birth Chart',
    description: PAGE_DESCRIPTION,
    url: '/',
    type: 'website',
    // Re-declared here because a page-level openGraph REPLACES (not merges
    // with) the root layout's openGraph, which would otherwise drop the image.
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'VedicHour' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VedicHour | Free Vedic Birth Chart',
    description: PAGE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_URL ?? '';
  return (raw.startsWith('http://localhost') || raw === ''
    ? 'https://www.vedichour.com'
    : raw
  ).trim().replace(/\/+$/, '');
}

export default async function LandingPage() {
  const SITE_URL = getSiteUrl();

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: 'VedicHour | Free Vedic Birth Chart',
    description: PAGE_DESCRIPTION,
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: {
      '@type': 'Thing',
      name: 'Jyotish Astrology',
      alternateName: ['Vedic astrology', 'Hindu astrology', 'Kundli', 'Janam Kundali'],
      description:
        'Jyotish is an Indian astrology tradition using sidereal planetary positions and systems such as Vimshottari Dasha for interpretation.',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#free-kundli', '#faq', 'h1', 'h2'],
    },
    inLanguage: 'en',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="public-experience">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Hero />
      <SampleReportPreview />
      <FreeKundli />
      <HowItWorks />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
