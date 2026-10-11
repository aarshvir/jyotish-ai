import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL, absUrl, breadcrumbLd } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'About VedicHour: How We Calculate and Write',
  description:
    'How VedicHour calculates charts (Swiss Ephemeris, Lahiri ayanamsa), where AI is used, what we will not predict, and how to report an error.',
  alternates: { canonical: '/about' },
};

const SOURCES = [
  'Brihat Parashara Hora Shastra, the main classical reference for houses, dashas and yogas.',
  'Phaladeepika, for results of planets in signs and houses and for transit rules.',
  'Muhurta Chintamani, for the rules of choosing an auspicious time.',
  'The Swiss Ephemeris (Astrodienst) for planetary positions, with the Lahiri (Chitra Paksha) ayanamsa.',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main
        id="main-content"
        className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full font-body text-body-md text-dust leading-relaxed"
      >
        <p className="section-eyebrow mb-3">About</p>
        <h1 className="text-display-md font-display text-star mb-6">How VedicHour calculates and writes</h1>

        <p className="mb-4">
          VedicHour is a Vedic astrology (Jyotish) timing tool. The calculators are free: your Lagna, Moon sign, birth
          star and current dasha, with no sign-up. The paid part is an hour-by-hour forecast built from your own chart.
          This page explains what is computed, what is written, and what we will not claim.
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">What is calculated</h2>
        <p className="mb-4">
          Every chart is computed from your date, time and place of birth with the Swiss Ephemeris, in the sidereal
          zodiac, using the Lahiri ayanamsa. Dashas follow the Vimshottari system. Hora, choghadiya and Rahu Kaal are
          counted from the actual sunrise and sunset at the place. These are calculations, not opinions: the same birth
          details always give the same chart, and you can check them against any other tool that uses Lahiri.
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">Where AI is used</h2>
        <p className="mb-4">
          In a paid forecast, a language model writes the commentary from numbers that were already computed. It is not
          allowed to invent planetary positions or dates. We also use AI tools to help draft and edit the articles on
          this site. Positions, transit dates and dasha periods in articles come from the ephemeris, not from memory,
          and we date-stamp an article whenever we change facts in it.
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">What we will not predict</h2>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>We do not predict death, serious illness, accidents, divorce or &ldquo;curses&rdquo;.</li>
          <li>
            We do not predict the sex of an unborn child. Sex determination is prohibited in India under the PCPNDT Act.
          </li>
          <li>We do not give medical, legal or financial advice, and we do not sell remedies or gemstones.</li>
        </ul>
        <p className="mb-4">
          Doshas such as Manglik, Kaal Sarp and Sade Sati are described as patterns in a chart and as periods that ask
          for patience, not as verdicts.
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">What astrology can and cannot do</h2>
        <p className="mb-4">
          The astronomy behind a chart is exact. The interpretation on top of it is a traditional, interpretive
          practice, and it has not been shown to predict events in controlled studies. We treat it as a structured way
          to think about timing and effort, and we say so. Read it for reflection, and decide important things with
          good judgement and qualified professionals. For a fuller take, see{' '}
          <Link href="/blog/is-astrology-real-honest-answer" className="text-amber underline">
            Is astrology real?
          </Link>
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">Traditional references</h2>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">Found a mistake?</h2>
        <p className="mb-4">
          Write to{' '}
          <a href="mailto:support@vedichour.com" className="text-amber underline">
            support@vedichour.com
          </a>{' '}
          with the page and what looks wrong. We fix factual errors and show the new date at the top of the article.
          For how your birth details are stored, read the{' '}
          <Link href="/privacy" className="text-amber underline">
            privacy policy
          </Link>
          .
        </p>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/free-kundli" className="btn-primary">
            Try the free Kundli
          </Link>
          <Link href="/blog" className="btn-secondary">
            Read the guides
          </Link>
        </div>
      </main>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            '@id': `${absUrl('/about')}#webpage`,
            url: absUrl('/about'),
            name: 'About VedicHour',
            isPartOf: { '@id': `${SITE_URL}#website` },
            about: { '@id': `${SITE_URL}#organization` },
            inLanguage: 'en',
          },
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]),
        ]}
      />
      <Footer />
    </div>
  );
}
