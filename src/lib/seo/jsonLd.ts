/**
 * Structured-data (JSON-LD) builders. The verified competitive edge: the big
 * incumbents (AstroSage, Prokerala) ship little-to-no schema on their tool/money
 * pages, so FAQPage + SoftwareApplication + HowTo + BreadcrumbList here win rich
 * results and AI-Overview citations they don't get. Never emit fabricated
 * Review/AggregateRating — that violates Google's spam policy.
 */

const RAW = process.env.NEXT_PUBLIC_URL ?? '';
export const SITE_URL = (RAW.startsWith('http://localhost') || RAW === ''
  ? 'https://www.vedichour.com'
  : RAW
).trim().replace(/\/+$/, '');

export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export type Faq = { q: string; a: string };

export function faqPageLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}

export function softwareAppLd(opts: {
  name: string;
  path: string;
  description: string;
  /** USD price string, '0' for free tools. */
  price?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: opts.name,
    url: absUrl(opts.path),
    applicationCategory: 'LifestyleApplication',
    applicationSubCategory: 'Astrology',
    operatingSystem: 'Web Browser',
    description: opts.description,
    offers: {
      '@type': 'Offer',
      price: opts.price ?? '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}

export function howToLd(opts: { name: string; description?: string; steps: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: s,
    })),
  };
}

/** Article structured data with real dates. dateModified is what AI crawlers use to prefer a fresher source. */
export function articleLd(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: absUrl(opts.path),
    mainEntityOfPage: absUrl(opts.path),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: { '@type': 'Organization', name: 'VedicHour', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'VedicHour', url: SITE_URL },
  };
}
