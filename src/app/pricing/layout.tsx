import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Pricing — VedicHour' },
  description:
    'Free birth chart — no card. Upgrade to 7-day, monthly, or annual hourly forecasts. One-time payments, no subscriptions. 24-hour refund.',
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
    title: 'Pricing — VedicHour',
    description:
      'Free birth chart, plus one-time hourly forecast plans. 7-day, monthly, annual. No subscriptions.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — VedicHour',
    description:
      'Free birth chart, plus one-time hourly forecast plans. 7-day, monthly, annual. No subscriptions.',
  },
  other: {
    'og:price:amount': '9.99',
    'og:price:currency': 'USD',
    'product:price:amount': '9.99',
    'product:price:currency': 'USD',
  },
};

const RAW_SITE_URL = process.env.NEXT_PUBLIC_URL ?? '';
const SITE_URL = (RAW_SITE_URL.startsWith('http://localhost') || RAW_SITE_URL === ''
  ? 'https://www.vedichour.com'
  : RAW_SITE_URL
).trim().replace(/\/+$/, '');

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/pricing#webpage`,
      url: `${SITE_URL}/pricing`,
      name: 'VedicHour pricing',
      description:
        'Free birth chart plus one-time hourly forecast plans. 7-day, monthly, annual.',
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
      name: 'Hourly forecast plans',
      description: 'Free birth chart and paid hourly forecast plans from VedicHour.',
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
