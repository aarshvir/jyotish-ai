import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { faqPageLd, breadcrumbLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'What Is a Hora? Planetary Hours & Vedic Day Timing',
  description:
    'A plain-English guide to the hora (planetary hour) in Vedic astrology — how planetary hours, choghadiya and Rahu Kaal divide the day, and how to read clearer vs heavier windows.',
  keywords: [
    'what is hora',
    'planetary hours vedic',
    'hora timing',
    'hora astrology',
    'choghadiya',
    'rahu kaal',
    'vedic day timing',
  ],
  alternates: { canonical: '/hora' },
  openGraph: {
    title: 'What Is a Hora? Planetary Hours in Vedic Timing',
    description:
      'How the planetary hour (hora), choghadiya and Rahu Kaal divide the day — and how to read clearer and heavier windows for planning.',
    url: '/hora',
    type: 'article',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Planetary hours (hora) in Vedic astrology' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What Is a Hora? Planetary Hours in Vedic Timing',
    description: 'A plain-English guide to the hora and Vedic day timing.',
    images: ['/opengraph-image'],
  },
};

const FAQS: Faq[] = [
  {
    q: 'What is a hora in Vedic astrology?',
    a: 'A hora is a planetary hour — a division of the day ruled by one of the seven classical planets in a fixed traditional sequence. The ruling planet is said to colour the tone of that stretch of time, which is why horas are used for everyday timing.',
  },
  {
    q: 'How is a hora different from choghadiya?',
    a: 'Both divide the day for timing, but in different schemes. The hora system assigns each period a planetary ruler in sequence; choghadiya groups the day and night into named bands. They are complementary lenses on the same day, not rivals.',
  },
  {
    q: 'What is Rahu Kaal?',
    a: 'Rahu Kaal is a daily period traditionally treated as cautionary — a window many people avoid starting important new activities in. It is one input among several, and in Jyotish it is read for awareness rather than as a guarantee of difficulty.',
  },
  {
    q: 'Are some hours lucky and others unlucky?',
    a: 'That is not how VedicHour frames it. Instead of lucky or unlucky, we read each hour as a clearer or heavier window for reflection and planning — timing awareness, never a promise about outcomes.',
  },
  {
    q: 'How does VedicHour use horas?',
    a: 'VedicHour rates the planetary hours of your day — all 18 hourly windows — against your own birth chart, marking each as clearer or heavier. It is computed with the Swiss Ephemeris and the Lahiri ayanamsa, and it is personal to you rather than a generic city-wide table.',
  },
];

export default function HoraPage() {
  const SITE_URL = 'https://www.vedichour.com';

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <p className="section-eyebrow mb-2">Vedic timing · plain English</p>
        <h1 className="text-display-md font-display text-star mb-4">What is a hora?</h1>
        <p className="text-body-lg text-dust leading-relaxed mb-8">
          A <strong className="text-star">hora</strong> is a planetary hour — a slice of the day governed
          by one of the seven classical planets. In Vedic astrology it is the building block of day-to-day
          timing: the idea that the rhythm of a day is not flat, but moves through clearer and heavier
          stretches. Here is what that means, and how to read it without fear or fortune-telling.
        </p>

        <article className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline">
          <h2>The planetary hour, simply</h2>
          <p>
            Classical Jyotish divides the day into planetary hours, each assigned a ruler from the seven
            visible planets in a fixed traditional sequence. The ruling planet is said to lend its quality
            to that period — a steadier, more reflective tone under some, a busier or heavier tone under
            others. None of this is about luck. It is closer to reading the weather of a day: useful for
            deciding when to push and when to ease off.
          </p>

          <h2>Hora, choghadiya and Rahu Kaal</h2>
          <p>
            You will see three timing ideas come up together, and they work as complementary lenses on the
            same day:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 [&_a]:text-amber [&_a]:underline">
            <li><strong>Hora</strong> — the planetary hour and its ruler.</li>
            <li><strong>Choghadiya</strong> — named bands that group the day and night.</li>
            <li><strong>Rahu Kaal</strong> — a daily cautionary window many prefer not to begin new things in.</li>
          </ul>
          <p>
            Traditional almanacs and panchang tools show these the same way for everyone in a city. That is
            a fine reference, but it is impersonal — two people with very different birth charts get an
            identical table.
          </p>

          <h2>From a generic table to a personal grid</h2>
          <p>
            VedicHour reads timing against <em>your</em> chart instead of the city&apos;s. It rates the
            planetary hours of your day — all 18 hourly windows — as <strong>clearer</strong> or{' '}
            <strong>heavier</strong>, drawing on your Lagna, Moon and running dasha, and computes everything
            with the Swiss Ephemeris and the Lahiri ayanamsa. The result is a grid that is specific to you,
            written in plain English. For a worked example of this approach, see{' '}
            <Link href="/compare/best-app-for-vedic-timing">the best app for Vedic timing</Link>.
          </p>

          <h2>How to use it — awareness, not certainty</h2>
          <p>
            Read a clearer window as a good time to schedule focused or important work, and a heavier window
            as a cue to go gentle, prepare, or leave room for friction. It is a structured second lens for
            planning a demanding day — when to hold the difficult conversation, start the long drive, or
            launch the thing — never a guarantee about how it will turn out. For a single major decision, a
            human astrologer who can weigh your full chart is still the most thorough route.
          </p>

          <h2>See your own timing</h2>
          <p>
            Generate your <Link href="/free-kundli">free Kundli</Link> to see a sample hour-by-hour grid for
            your chart, or check your <Link href="/vimshottari-dasha-calculator">current dasha</Link> to
            understand the longer planetary period your timing sits inside. A full forecast with daily
            windows is a one-time <Link href="/kundali">report</Link>.
          </p>

          <p className="text-body-sm">
            <strong className="text-star">For reflection and planning only.</strong> Not medical, legal,
            financial, or emergency advice.
          </p>
        </article>

        <FaqSection faqs={FAQS} heading="Hora &amp; Vedic timing — FAQ" />

        <div className="mt-12 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">Read your day, hour by hour</p>
          <div className="flex justify-center">
            <Link href="/free-kundli" className="btn-primary">Get your free Kundli →</Link>
          </div>
        </div>
      </main>

      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'What is a hora?', path: '/hora' },
          ]),
          faqPageLd(FAQS),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'What Is a Hora? Planetary Hours in Vedic Timing',
            description:
              'A plain-English guide to the hora (planetary hour), choghadiya and Rahu Kaal, and how to read clearer vs heavier windows.',
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour', '@id': `${SITE_URL}#organization` },
            mainEntityOfPage: `${SITE_URL}/hora`,
          },
        ]}
      />
      <Footer />
    </div>
  );
}
