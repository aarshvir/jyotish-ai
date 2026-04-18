import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kundli & Jyotish Forecast Pricing — Free Kundli to Annual Oracle',
  description:
    'Free Kundli (no card needed) plus one-time AI Jyotish forecast plans: 7-day, monthly, and annual Vedic astrology reports. Swiss Ephemeris. 48-hour refund.',
  keywords: [
    'free Kundli',
    'AI Kundli price',
    'Jyotish forecast price',
    'Vedic astrology report price',
    'online kundli',
    'Janam Kundali online',
  ],
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Free Kundli & AI Jyotish Forecast Pricing | VedicHour',
    description:
      'Free Kundli, plus one-time Jyotish forecast plans. 7-day, monthly, annual Vedic astrology reports. No subscriptions.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Kundli & AI Jyotish Forecast Pricing | VedicHour',
    description:
      'Free Kundli, plus one-time Jyotish forecast plans. 7-day, monthly, annual Vedic astrology reports. No subscriptions.',
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_URL ?? 'https://www.vedichour.com').trim().replace(/\/+$/, '');

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/pricing#webpage`,
      url: `${SITE_URL}/pricing`,
      name: 'Free Kundli & AI Jyotish Forecast Pricing | VedicHour',
      description:
        'Free Kundli (no card needed) plus one-time AI Jyotish forecast plans. 7-day, monthly, annual Vedic astrology reports.',
      isPartOf: { '@id': `${SITE_URL}#website` },
      breadcrumb: { '@id': `${SITE_URL}/pricing#breadcrumb` },
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/pricing#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE_URL}/pricing` },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Jyotish Forecast & Kundli Plans',
      description: 'Free Kundli and paid AI Jyotish forecast plans from VedicHour.',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Free Kundli (Janam Kundali)', url: `${SITE_URL}/onboard?plan=free` },
        { '@type': 'ListItem', position: 2, name: '7-Day Jyotish Forecast', url: `${SITE_URL}/onboard?plan=7day` },
        { '@type': 'ListItem', position: 3, name: 'Monthly Jyotish Oracle', url: `${SITE_URL}/onboard?plan=monthly` },
        { '@type': 'ListItem', position: 4, name: 'Annual Jyotish Oracle', url: `${SITE_URL}/onboard?plan=annual` },
      ],
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {children}
    </>
  );
}
