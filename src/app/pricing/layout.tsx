import type { Metadata } from 'next';

const description = 'Create your free Vedic birth chart with no sign-up or payment card. Check availability of written readings and access reports already in your account.';

export const metadata: Metadata = {
  title: { absolute: 'Pricing and Availability | VedicHour' },
  description,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing and Availability | VedicHour', description, url: '/pricing', type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'VedicHour' }],
  },
  twitter: { card: 'summary_large_image', title: 'Pricing and Availability | VedicHour', description, images: ['/opengraph-image'] },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const rawUrl = (process.env.NEXT_PUBLIC_URL ?? '').trim();
  const siteUrl = (!rawUrl || rawUrl.startsWith('http://localhost') ? 'https://www.vedichour.com' : rawUrl).replace(/\/+$/, '');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@graph': [
          { '@type': 'WebPage', '@id': `${siteUrl}/pricing#webpage`, url: `${siteUrl}/pricing`, name: 'VedicHour pricing and availability', description, inLanguage: 'en' },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Pricing and availability', item: `${siteUrl}/pricing` },
          ] },
        ],
      }) }} />
      {children}
    </>
  );
}
