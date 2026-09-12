import Script from 'next/script';
import { ga4Id } from '@/lib/analytics/trackingIds';

/**
 * Google Analytics 4. Renders nothing unless NEXT_PUBLIC_GA_ID is a valid G-XXXXXXXXXX
 * Measurement ID, so it is safe to ship before the ID is configured.
 * Loaded afterInteractive so it never blocks first paint. PostHog remains the
 * primary product analytics; GA4 is here for SEO-tool detection + Search Console
 * cross-checks. CSP for googletagmanager.com / google-analytics.com is in
 * next.config.mjs.
 */
// Validated for the same reason as the Meta Pixel id: it is pasted into an inline string literal.
const GA_ID = ga4Id(process.env.NEXT_PUBLIC_GA_ID);

export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
