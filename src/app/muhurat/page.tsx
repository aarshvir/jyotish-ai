import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { faqPageLd, breadcrumbLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Shubh Muhurat — How to Choose an Auspicious Time the Vedic Way',
  description:
    'A plain-English guide to shubh muhurat — how Vedic astrology chooses an auspicious time using the panchang, and how to read clearer vs heavier windows for everyday planning.',
  keywords: [
    'shubh muhurat',
    'auspicious time',
    'muhurat astrology',
    'muhurat for business',
    'best time vedic astrology',
    'panchang muhurat',
  ],
  alternates: { canonical: '/muhurat' },
  openGraph: {
    title: 'Shubh Muhurat — Choosing an Auspicious Time the Vedic Way',
    description:
      'How Vedic astrology chooses a shubh muhurat from the panchang — and how to read clearer and heavier windows for planning.',
    url: '/muhurat',
    type: 'article',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Shubh muhurat — Vedic auspicious timing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shubh Muhurat — Choosing an Auspicious Time the Vedic Way',
    description: 'A plain-English guide to shubh muhurat and Vedic timing.',
    images: ['/opengraph-image'],
  },
};

const FAQS: Faq[] = [
  {
    q: 'What is a shubh muhurat?',
    a: 'A shubh muhurat is a span of time chosen, using the panchang, as supportive for beginning something. It is selected by weighing factors like the tithi, nakshatra, yoga, karana and weekday, along with the planetary hour. It is a tradition of planning with awareness, not a guarantee of the outcome.',
  },
  {
    q: 'How is a muhurat calculated?',
    a: 'Traditionally an astrologer reads the five panchang elements (tithi, nakshatra, yoga, karana, vara) together with the planetary hour and the relevant house lords for whatever is being timed, then identifies windows that are supportive and ones to avoid. For an important event it is usually weighed against your own birth chart too.',
  },
  {
    q: 'Do I need an astrologer, or can software do it?',
    a: 'For everyday timing awareness, software is a useful starting point. For a major life event — a wedding, a business launch, griha pravesh — a knowledgeable astrologer who can weigh your specific chart is still the most thorough route. Treat any tool as support for that judgment, not a replacement.',
  },
  {
    q: 'Does a good muhurat guarantee success?',
    a: 'No. A muhurat is about choosing supportive timing and acting with awareness — never a promise about results. Preparation, effort and circumstances all matter. VedicHour frames timing as clearer and heavier windows for reflection and planning, not certainty.',
  },
  {
    q: 'How does VedicHour help with timing?',
    a: 'VedicHour rates the planetary hours of your day — all 18 hourly windows — against your own chart, as clearer or heavier, computed with the Swiss Ephemeris and Lahiri ayanamsa. It is a personal day-to-day timing lens; for a formal event muhurat, pair it with an astrologer.',
  },
];

export default function MuhuratPage() {
  const SITE_URL = 'https://www.vedichour.com';

  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 relative z-10 w-full">
        <p className="section-eyebrow mb-2">Vedic timing · plain English</p>
        <h1 className="text-display-md font-display text-star mb-4">Shubh muhurat: choosing an auspicious time</h1>
        <p className="text-body-lg text-dust leading-relaxed mb-8">
          A <strong className="text-star">shubh muhurat</strong> is a time chosen, the Vedic way, as
          supportive for beginning something — a journey, a purchase, a new venture. It is one of the oldest
          and most practical uses of Jyotish. Here is how it works in plain English, and an honest view of
          what it can and cannot do.
        </p>

        <article className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-star [&_h2]:mt-9 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-star [&_a]:text-amber [&_a]:underline">
          <h2>What muhurat actually is</h2>
          <p>
            Muhurat is the practice of selecting timing. Rather than asking only <em>what</em> the chart
            says, it asks <em>when</em> — which windows of a day or week are supportive for a particular
            beginning, and which are better left alone. It is timing chosen with care, in the same spirit as
            picking a calm sea to set sail rather than a storm.
          </p>

          <h2>The panchang behind a muhurat</h2>
          <p>
            A muhurat is read from the five limbs of the panchang, plus the planetary hour:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Tithi</strong> — the lunar day.</li>
            <li><strong>Nakshatra</strong> — the Moon&apos;s lunar mansion.</li>
            <li><strong>Yoga</strong> and <strong>Karana</strong> — Sun–Moon combinations and half-tithis.</li>
            <li><strong>Vara</strong> — the weekday and its planetary ruler.</li>
            <li>The <Link href="/hora">hora</Link> — the planetary hour within the day.</li>
          </ul>
          <p>
            For something important, these are weighed against your own birth chart — your Moon, your running{' '}
            <Link href="/vimshottari-dasha-calculator">dasha</Link>, and the house lords relevant to what you
            are timing — so the same calendar day can suit two people differently.
          </p>

          <h2>Where software helps — and where it doesn&apos;t</h2>
          <p>
            For day-to-day timing awareness, a tool is genuinely useful: it can show you the rhythm of your
            day at a glance. For a formal life-event muhurat — a wedding, a business launch, griha pravesh —
            an astrologer who can weigh your full chart is still the most thorough route. The honest framing
            is that software is a starting point and a second lens, not a substitute for that judgment, and
            never a guarantee of how things turn out.
          </p>

          <h2>A personal timing grid for everyday planning</h2>
          <p>
            This is where VedicHour fits. It rates the planetary hours of your day — all 18 hourly windows —
            as <strong>clearer</strong> or <strong>heavier</strong> against your own chart, computed with the
            Swiss Ephemeris and the Lahiri ayanamsa. Read a clearer window as a good time for focused or
            important work, and a heavier one as a cue to prepare or go gentle. It is timing awareness for
            planning a day — not a promise, and not a replacement for an astrologer on the big decisions.
          </p>

          <h2>See your own windows</h2>
          <p>
            Generate your <Link href="/free-kundli">free Kundli</Link> to see a sample hour-by-hour grid, read
            the underlying idea in <Link href="/hora">what is a hora</Link>, or open a full{' '}
            <Link href="/kundali">report</Link> for daily windows across a longer horizon.
          </p>

          <p className="text-body-sm">
            <strong className="text-star">For reflection and planning only.</strong> Not medical, legal,
            financial, or emergency advice.
          </p>
        </article>

        <FaqSection faqs={FAQS} heading="Shubh muhurat — FAQ" />

        <div className="mt-12 card border border-amber/30 rounded-card p-6 text-center">
          <p className="font-display text-headline-sm text-star mb-3">Find your clearer windows</p>
          <div className="flex justify-center">
            <Link href="/free-kundli" className="btn-primary">Get your free Kundli →</Link>
          </div>
        </div>
      </main>

      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Shubh muhurat', path: '/muhurat' },
          ]),
          faqPageLd(FAQS),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Shubh Muhurat — Choosing an Auspicious Time the Vedic Way',
            description:
              'How Vedic astrology chooses a shubh muhurat from the panchang, and how to read clearer vs heavier windows for planning.',
            author: { '@type': 'Organization', name: 'VedicHour' },
            publisher: { '@type': 'Organization', name: 'VedicHour', '@id': `${SITE_URL}#organization` },
            mainEntityOfPage: `${SITE_URL}/muhurat`,
          },
        ]}
      />
      <Footer />
    </div>
  );
}
