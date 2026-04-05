import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const cormorant = localFont({
  src: [
    { path: '../../public/fonts/cormorant-garamond-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = localFont({
  src: [
    { path: '../../public/fonts/dm-sans-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: '../../public/fonts/jetbrains-mono-latin-400-normal.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VedicHour — Vedic Astrology, Hour by Hour',
  description:
    'AI-powered Vedic astrology forecasts with hourly precision. Know exactly when to act — and when to rest.',
  applicationName: 'VedicHour',
  appleWebApp: {
    capable: true,
    title: 'VedicHour',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#080C18',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
