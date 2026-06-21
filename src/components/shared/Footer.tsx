import Link from 'next/link';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';

const READINGS = [
  { href: '/pricing', label: 'Hour-by-Hour Forecast' },
  { href: '/kundali', label: 'Deep Kundli Report' },
  { href: '/synastry', label: 'Kundli Matching (Gun Milan)' },
  { href: '/horoscope/aries', label: 'Daily Horoscope' },
];

const TOOLS = [
  { href: '/free-kundli', label: 'Free Kundli' },
  { href: '/manglik-dosha-calculator', label: 'Manglik Dosha Calculator' },
  { href: '/sade-sati-calculator', label: 'Sade Sati Calculator' },
  { href: '/vimshottari-dasha-calculator', label: 'Dasha Calculator' },
  { href: '/nakshatra-finder', label: 'Nakshatra Finder' },
  { href: '/moon-sign-calculator', label: 'Moon Sign Calculator' },
  { href: '/lagna-calculator', label: 'Lagna Calculator' },
  { href: '/kaal-sarp-dosha-calculator', label: 'Kaal Sarp Dosha' },
];

const LEARN = [
  { href: '/blog', label: 'Blog' },
  { href: '/nakshatra', label: 'The 27 Nakshatras' },
  { href: '/dasha', label: 'Vimshottari Dasha' },
  { href: '/predictions', label: 'Life Predictions' },
  { href: '/compare/best-free-ai-kundli', label: 'Compare alternatives' },
];

const COMPANY = [
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/account', label: 'Your data' },
];

const linkCls =
  'hover:text-star transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button';

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="font-mono text-mono-sm uppercase tracking-wider text-dust mb-3">{title}</h3>
      <ul className="space-y-2 font-body text-body-sm text-dust">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className={linkCls}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-horizon/40 py-12 md:py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10 pb-8 border-b border-horizon/30">
          <h3 className="font-display text-headline-sm text-star mb-1">Weekly Vedic timing tips</h3>
          <p className="font-body text-body-sm text-dust/70 mb-3">Hour-by-hour guidance, new tools, and seasonal forecasts — no spam.</p>
          <NewsletterSignup source="footer" />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <span className="font-display font-semibold text-lg tracking-wide text-star/70">VedicHour</span>
            <p className="mt-2 font-body text-body-sm text-dust max-w-[14rem]">
              Your life, decoded hour by hour — Vedic astrology with{' '}
              <a
                href="https://www.astro.com/swisseph/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-star transition-colors"
              >
                Swiss Ephemeris
              </a>{' '}
              precision.
            </p>
          </div>
          <Col title="Readings" links={READINGS} />
          <Col title="Free Tools" links={TOOLS} />
          <Col title="Learn" links={LEARN} />
          <Col title="Company" links={COMPANY} />
        </nav>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-horizon/30 pt-6">
          <a href="mailto:support@vedichour.com" className={`font-body text-body-sm text-dust ${linkCls}`}>
            support@vedichour.com
          </a>
          <p className="font-mono text-mono-sm text-dust tracking-wider">© {new Date().getFullYear()} VedicHour</p>
        </div>
      </div>
    </footer>
  );
}
