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

  // Serve local fonts — no Google Fonts network dependency at build time
  serverExternalPackages: [
    '@anthropic-ai/sdk',
    '@react-pdf/renderer',
    'openai',
    '@google/generative-ai',
    'razorpay',
  ],

  // Security & caching headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://checkout.razorpay.com https://cdn.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://maps.googleapis.com https://api.opencagedata.com https://api.razorpay.com https://lumberjack.razorpay.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://api.razorpay.com",
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
  },
};

export default nextConfig;
