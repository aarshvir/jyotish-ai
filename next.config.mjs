/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', '@react-pdf/renderer'],
  },
};

export default nextConfig;
