/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites run BEFORE Next.js file-system route matching,
      // so they override any built-in /sitemap.xml route from the App Router.
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: '/api/sitemap',
        },
      ],
      afterFiles: [
        {
          source: '/.well-known/assetlinks.json',
          destination: '/api/well-known/assetlinks',
        },
      ],
      fallback: [],
    };
  },


  // Compress all responses
  compress: true,

  // Security & caching headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Force HTTPS for 2 years incl. subdomains — blocks SSL-stripping / downgrade
          // MITM that could intercept Supabase session cookies or the Ziina payment
          // redirect. No 'preload' (that's a hard-to-reverse preload-list commitment).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Cross-origin isolation headers. COOP isolates our browsing context
          // but ...allow-popups keeps OAuth/payment popups working. CORP is
          // 'cross-origin' (NOT same-origin) so social scrapers can still fetch
          // /opengraph-image. COEP is deliberately OMITTED — 'require-corp'
          // would break the Ziina payment iframe and PostHog assets.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // maps.googleapis.com / api.opencagedata.com removed — geocoding + LLM calls
              // run server-side, no client code calls these origins. Tightens the
              // script-injection surface (script-src) with no functional loss.
              "script-src 'self' 'unsafe-inline' https://pay.ziina.com https://eu-assets.i.posthog.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api-v2.ziina.com https://pay.ziina.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net",
              "worker-src 'self' blob:",
              "frame-src https://pay.ziina.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Immutable cache for hashed Next.js static chunks
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Short-lived cache for public images/fonts
      {
        source: '/(.*)\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: [
      '@anthropic-ai/sdk',
      '@react-pdf/renderer',
      'openai',
      '@google/generative-ai',
    ],
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/scriptures/**/*'],
      '/opengraph-image': ['./assets/og-noto-sans.ttf'],
      '/blog/[slug]/opengraph-image': ['./assets/og-noto-sans.ttf'],
    },
  },
};

export default nextConfig;
