import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Nakshatra Finder — Free Birth Star (Janma Nakshatra) Calculator by DOB',
  description:
    'Find your Janma Nakshatra (birth star) free in seconds. Enter your date, time and place of birth and we locate the Moon among the 27 nakshatras, plus your pada — no signup.',
  alternates: { canonical: '/nakshatra-finder' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Your nakshatra, or birth star, is one of the oldest and most personal markers in Vedic astrology. This free finder uses your exact birth details to locate where the Moon sat at the moment you were born, then names your Janma Nakshatra and its pada — the same starting point a Vedic astrologer uses to read your chart.' },
  { h: 'What a nakshatra is', p: 'A nakshatra is one of 27 lunar mansions — equal slices of the zodiac, each spanning 13°20’. The Moon travels through all 27 in roughly a month, spending about a day in each. The nakshatra the Moon occupied at your birth is your Janma Nakshatra, and in much of Indian tradition it is considered an even more intimate signature than your Sun or Moon sign.' },
  { h: 'The 27 nakshatras and their padas', p: 'The cycle runs from Ashwini through Revati, and each nakshatra is divided into four quarters called padas of 3°20’ each. Your pada (1 to 4) refines the reading — it ties your birth star to a specific navamsa division and traditionally shapes the first sound suggested for a child’s name. So a complete result is not just the nakshatra, but the nakshatra and its pada together.' },
  { h: 'Ruling planet, deity and temperament', p: 'Every nakshatra has a ruling planet (which begins your Vimshottari dasha sequence), a presiding deity and a symbol — for example Rohini is ruled by the Moon, Magha by Ketu, Pushya by Saturn. These associations are read as gentle indicators of temperament, natural strengths and inclinations, not fixed fate. Vedic tradition treats them as tendencies to understand and work with, never as a verdict.' },
  { h: 'Why your nakshatra matters', p: 'The birth star does real work in a chart. It sets the starting planet and balance of your Vimshottari dasha — the planetary-period timeline used for prediction — and it is central to Gun Milan, the eight-factor compatibility scoring used in marriage matching. Knowing your nakshatra is the foundation for both, which is why it is one of the first things calculated from a horoscope.' },
];

const FAQS: Faq[] = [
  { q: 'What is a nakshatra?', a: 'A nakshatra is one of the 27 lunar mansions in Vedic astrology, each a 13°20’ slice of the zodiac. Your Janma Nakshatra (birth star) is simply the one the Moon was passing through at the exact moment you were born.' },
  { q: 'Do I need my birth time to find my nakshatra?', a: 'A birth time helps accuracy, because the Moon moves about one nakshatra per day and can change stars within a single date. If you know your time, enter it; if not, noon is used as an estimate, which is usually close but may be off near a nakshatra boundary.' },
  { q: 'What is a pada?', a: 'A pada is one of the four quarters that make up each nakshatra, spanning 3°20’ each. Your pada (1–4) pinpoints where in the nakshatra the Moon fell, links it to a navamsa sign, and traditionally guides the first syllable of a name.' },
  { q: 'What is the difference between a nakshatra and a rashi?', a: 'A rashi is your Moon sign — one of the 12 zodiac signs the Moon occupies. A nakshatra is a finer division: there are 27 of them, and roughly two and a quarter nakshatras fit inside each rashi. The nakshatra gives a more detailed reading than the sign alone.' },
  { q: 'Why does my nakshatra matter?', a: 'It is the basis of two core tools: the Vimshottari dasha system, which builds your predictive planetary-period timeline from the nakshatra’s ruling planet, and Gun Milan, the marriage-compatibility scoring that compares two birth stars.' },
  { q: 'How many nakshatras are there?', a: 'There are 27 nakshatras, running in order from Ashwini to Revati, each ruled by a planet and associated with a deity and symbol. Some traditions also reference a 28th, Abhijit, but the standard scheme used here is 27.' },
  { q: 'Is this nakshatra finder free?', a: 'Yes, completely free with no login. For your nakshatra shown in context within a full plain-English birth-chart reading, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Janma Nakshatra"
      h1="Nakshatra Finder —"
      h1Accent="Your Birth Star"
      intro="Discover your Janma Nakshatra — the lunar mansion the Moon occupied when you were born. Enter your birth details and we locate it among the 27 nakshatras and tell you your pada, in plain English — no fate-talk, no signup."
      view="nakshatra"
      ctaHref="/kundali"
      ctaLabel="See your nakshatra in your full Kundli"
      proseHeading="Understanding your nakshatra (birth star)"
      proseId="nakshatra-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Nakshatra — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Nakshatra Finder',
          path: '/nakshatra-finder',
          description: 'Free Janma Nakshatra (birth star) finder. Locates the Moon among the 27 nakshatras and gives your pada by date, time and place of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to find your nakshatra',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can locate the Moon precisely.',
            'See your Janma Nakshatra and pada instantly, with what they mean.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Nakshatra Finder', path: '/nakshatra-finder' },
        ]),
      ]}
    />
  );
}
