import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Pricing — Free Kundli & AI Jyotish Forecast | VedicHour' },
  description:
    'Free Kundli — no card needed. Upgrade to 7-day, monthly, or annual AI Jyotish forecast. One-time payments, no subscriptions. 24-hour refund.',
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
    title: 'Pricing — Free Kundli & AI Jyotish Forecast | VedicHour',
    description:
      'Free Kundli, plus one-time Jyotish forecast plans. 7-day, monthly, annual Vedic astrology reports. No subscriptions.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Free Kundli & AI Jyotish Forecast | VedicHour',
    description:
      'Free Kundli, plus one-time Jyotish forecast plans. 7-day, monthly, annual Vedic astrology reports. No subscriptions.',
  },
  other: {
    'og:price:amount': '9.99',
    'og:price:currency': 'USD',
    'product:price:amount': '9.99',
    'product:price:currency': 'USD',
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
