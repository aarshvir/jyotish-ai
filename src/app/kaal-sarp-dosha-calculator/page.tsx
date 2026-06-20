import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Kaal Sarp Dosha Calculator — Free Check by Date of Birth',
  description:
    'Check Kaal Sarp Dosha free in seconds. Enter your date, time and place of birth to see if all seven planets sit on one side of the Rahu–Ketu axis, the type, and what it means — no signup.',
  alternates: { canonical: '/kaal-sarp-dosha-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Kaal Sarp Dosha is one of the most talked-about patterns in Vedic astrology, and also one of the most misunderstood. This free calculator uses your exact birth details and the Swiss Ephemeris to check the single thing that defines it: whether all seven classical planets fall on one side of the Rahu–Ketu axis in your chart. You get a clear yes or no, with a plain-English explanation and no fear-mongering.' },
  { h: 'What Kaal Sarp Dosha actually is', p: 'Rahu and Ketu — the Moon’s north and south nodes — always sit exactly opposite each other, forming an axis across the chart. Kaal Sarp Dosha is said to form when the Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn are all “hemmed in” between Rahu and Ketu, with none escaping to the other side. The image is of the seven planets caught inside the serpent, with Rahu as the head (kaal) and Ketu as the tail (sarp).' },
  { h: 'The twelve named types', p: 'Classical tradition names twelve types of Kaal Sarp Yoga by the house Rahu occupies — Anant (Rahu in the 1st), Kulik (2nd), Vasuki (3rd), Shankhpal (4th), Padma (5th), Mahapadma (6th), Takshak (7th), Karkotak (8th), Shankhachur (9th), Ghatak (10th), Vishdhar (11th) and Sheshnag (12th). Each is associated with a different area of life where the chart’s energy tends to concentrate, but the type describes a flavour, not a verdict.' },
  { h: 'Full vs partial (Anshik) Kaal Sarp', p: 'A full Kaal Sarp forms only when every one of the seven planets sits strictly between the nodes. When one or two planets fall just outside the axis, many astrologers read it as partial or Anshik Kaal Sarp — a far milder version. Because the pattern hinges on exact degrees, an accurate birth time matters; this tool checks the planetary spread precisely rather than guessing from your Sun sign alone.' },
  { h: 'How it tends to play out — and remedies', p: 'Practitioners describe Kaal Sarp as making life feel concentrated in waves: stretches of effort that suddenly resolve into breakthroughs, rewarding patience and persistence. It is common, it appears in the charts of many highly successful people, and it is not a barrier to a good life. Where remedies are wanted, the measured ones are Rahu–Ketu peace rituals, the Maha Mrityunjaya mantra, charity and disciplined routine — supports for steadiness, not magic switches.' },
];

const FAQS: Faq[] = [
  { q: 'What is Kaal Sarp Dosha?', a: 'It is a chart pattern said to form when all seven classical planets — Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn — fall on one side of the Rahu–Ketu axis, leaving none on the other side. Enter your birth details above and the calculator checks this for you instantly.' },
  { q: 'What are the 12 types of Kaal Sarp Yoga?', a: 'They are named by the house Rahu sits in: Anant, Kulik, Vasuki, Shankhpal, Padma, Mahapadma, Takshak, Karkotak, Shankhachur, Ghatak, Vishdhar and Sheshnag (Rahu in houses 1 through 12 respectively). Each highlights a different area of life, but the type is a description, not a sentence.' },
  { q: 'What is partial or Anshik Kaal Sarp Dosha?', a: 'Anshik (partial) Kaal Sarp is when one or two planets sit just outside the Rahu–Ketu axis rather than all seven being hemmed in. It is generally read as a much milder version. Because it depends on exact degrees, an accurate birth time gives the most reliable result.' },
  { q: 'Is Kaal Sarp Dosha harmful or dangerous?', a: 'No. It is a common pattern, not a curse, and it appears in the charts of many accomplished people. At most it describes a tendency for life to move in concentrated waves that reward persistence. Treat it as a factor to understand, not something to fear.' },
  { q: 'What are the remedies for Kaal Sarp Dosha?', a: 'The measured, traditional supports include Rahu–Ketu shanti rituals, chanting the Maha Mrityunjaya mantra, giving to charity and keeping a disciplined daily routine. These are aids to steadiness and patience rather than instant fixes, and no remedy is required for a successful life.' },
  { q: 'How does this calculator check Kaal Sarp Dosha?', a: 'It computes your full chart from your date, time and place of birth using the Swiss Ephemeris, locates Rahu and Ketu, and tests whether all seven planets fall on one side of that axis. It then tells you yes or no with a short explanation.' },
  { q: 'Is this Kaal Sarp Dosha calculator free?', a: 'Yes, completely free with no login. For a full plain-English birth-chart reading with Kaal Sarp shown in context alongside your dashas and other yogas, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Kaal Sarp Dosha"
      h1="Kaal Sarp Dosha Calculator —"
      h1Accent="Free Check"
      intro="Find out instantly whether your chart carries Kaal Sarp Dosha. Enter your birth details and we check whether all seven planets sit on one side of the Rahu–Ketu axis, then explain what it means in plain English — no fear, no signup."
      view="kaalsarp"
      ctaHref="/kundali"
      ctaLabel="See Kaal Sarp in your full Kundli"
      proseHeading="Understanding Kaal Sarp Dosha"
      proseId="kaal-sarp-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Kaal Sarp dosha — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Kaal Sarp Dosha Calculator',
          path: '/kaal-sarp-dosha-calculator',
          description: 'Free Kaal Sarp Dosha calculator. Checks whether all seven planets fall on one side of the Rahu–Ketu axis by date of birth and explains the result.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to check Kaal Sarp Dosha',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can locate Rahu, Ketu and all seven planets.',
            'See instantly whether Kaal Sarp Dosha is present and what it means.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Kaal Sarp Dosha Calculator', path: '/kaal-sarp-dosha-calculator' },
        ]),
      ]}
    />
  );
}
