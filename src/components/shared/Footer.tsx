import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';

const groups = [
  { title: 'Explore', links: [
    { href: '/free-kundli', label: 'Free birth chart' },
    { href: '/moon-sign-calculator', label: 'Moon sign' },
    { href: '/nakshatra-finder', label: 'Birth star' },
    { href: '/vimshottari-dasha-calculator', label: 'Dasha periods' },
    { href: '/sample-report', label: 'Example reading' },
  ] },
  { title: 'Understand', links: [
    { href: '/methodology', label: 'Calculation method' },
    { href: '/blog', label: 'Journal' },
    { href: '/about', label: 'About VedicHour' },
    { href: '/pricing', label: 'Pricing and availability' },
    { href: '/help', label: 'Help' },
  ] },
  { title: 'Your account', links: [
    { href: '/dashboard', label: 'Your reports' },
    { href: '/account', label: 'Account and saved details' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/refund', label: 'Refund policy' },
  ] },
];

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-grid">
          <div>
            <Link href="/" className="public-wordmark"><Compass size={24} aria-hidden="true" /><span>VedicHour</span></Link>
            <p className="mt-4 max-w-xs public-body">A place to explore your Vedic chart, understand the method and reflect with care.</p>
            <a href="mailto:support@vedichour.com" className="public-text-link mt-5">Contact support <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          {groups.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="public-footer-heading">{title}</h2>
              <ul>{links.map(({ href, label }) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="public-footer-bottom">
          <p>Astrology is an interpretive tradition, not a guarantee of outcomes or professional advice.</p>
          <p>&copy; {new Date().getFullYear()} VedicHour</p>
        </div>
      </div>
    </footer>
  );
}
