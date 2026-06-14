import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Vimshottari Dasha Calculator — Free Current Mahadasha & Antardasha by DOB | VedicHour',
  description:
    'Find your current Vimshottari Mahadasha and Antardasha in seconds. Enter your date, time and place of birth to see the running planetary period and your full 120-year dasha timeline — no signup.',
  alternates: { canonical: '/vimshottari-dasha-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Vimshottari Dasha is the timing system at the heart of Jyotish — a 120-year cycle of planetary periods that shows which planet is steering your life at any given moment. This free calculator uses your birth details and the Swiss Ephemeris to find your birth Moon’s nakshatra, then works out the exact Mahadasha and Antardasha you are running now, along with your full timeline.' },
  { h: 'What a dasha actually is', p: 'A dasha is a stretch of time ruled by one of nine planets. The system divides 120 years among them in a fixed order, so life unfolds as a sequence of planetary chapters. The planet running its period tends to bring its themes forward — its houses, the things it signifies and the parts of your chart it touches all become more active. A dasha does not dictate fate; it simply colours which area of life is most alive right now.' },
  { h: 'Mahadasha and Antardasha (bhukti)', p: 'The Mahadasha is the major period, the headline planet for that span of years. Inside each Mahadasha runs a series of sub-periods called Antardasha or bhukti, each ruled by one of the nine planets in the same Vimshottari order. So you are always living under two layers at once — the major planet and the sub-planet — and their combination is what gives a period its particular flavour and timing.' },
  { h: 'How it is calculated from your birth star', p: 'Vimshottari is anchored to the Moon’s nakshatra at birth (your janma nakshatra). The lord of that nakshatra sets which Mahadasha you were born into, and how far the Moon had travelled through it decides how much of that first period was already used up. From that starting point the periods simply follow the fixed planetary order and lengths, which is why an accurate birth time matters for precise dates.' },
  { h: 'Why your current period matters', p: 'Two people with similar charts can experience very different years simply because they are running different dashas. Knowing your current Mahadasha and Antardasha helps you read why certain themes feel loud now and when the emphasis is likely to shift. This tool shows your running period plus the full Mahadasha timeline so you can see what has passed and what is ahead.' },
];

const FAQS: Faq[] = [
  { q: 'What is Vimshottari Dasha?', a: 'Vimshottari Dasha is the most widely used planetary-period system in Vedic astrology. It divides a 120-year cycle among the nine planets in a fixed order, so your life unfolds as a sequence of planetary periods that help time when different themes come forward.' },
  { q: 'What does my current Mahadasha mean?', a: 'Your current Mahadasha is the major planetary period you are living through now. Its themes — the houses it rules and what the planet signifies in your chart — tend to become more prominent during that span, shaping what feels important and where your energy goes.' },
  { q: 'What is an Antardasha (bhukti)?', a: 'An Antardasha, also called a bhukti, is a sub-period running inside the larger Mahadasha. Each Mahadasha is divided into Antardashas ruled by all nine planets in turn, so the running Mahadasha and Antardasha together fine-tune the timing and flavour of a period.' },
  { q: 'How is Vimshottari Dasha calculated?', a: 'It is calculated from the Moon’s nakshatra at birth. The nakshatra lord determines the Mahadasha you start in, and the Moon’s exact position within that nakshatra decides how much of the first period was already elapsed at birth. From there the periods follow the fixed Vimshottari order and lengths.' },
  { q: 'Do I need my exact birth time?', a: 'For precise dasha start and end dates, yes — the Moon moves quickly, so birth time affects its nakshatra position and the balance of your first period. Even without a known time you can get a useful current Mahadasha, but exact times give the most reliable transition dates.' },
  { q: 'What are the planetary period lengths?', a: 'The Vimshottari Mahadasha lengths are: Ketu 7 years, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19 and Mercury 17 — adding up to the full 120-year cycle.' },
  { q: 'Is this calculator free?', a: 'Yes, completely free with no login. For a plain-English reading of how your current dasha plays out across the next few years, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Vimshottari Dasha"
      h1="Vimshottari Dasha Calculator —"
      h1Accent="Your Current Mahadasha"
      intro="See exactly which planetary period is running your life right now. Enter your birth details and we find your birth Moon’s nakshatra, calculate your current Mahadasha and Antardasha, and lay out your full 120-year timeline — in plain English, no signup."
      view="dasha"
      ctaHref="/kundali"
      ctaLabel="See your 5-year dasha outlook"
      proseHeading="Understanding Vimshottari Dasha"
      proseId="vimshottari-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Vimshottari dasha — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Vimshottari Dasha Calculator',
          path: '/vimshottari-dasha-calculator',
          description: 'Free Vimshottari Dasha calculator. Finds your current Mahadasha and Antardasha from your birth Moon’s nakshatra and shows the full 120-year timeline by date of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to find your current Vimshottari Dasha',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can locate your birth Moon’s nakshatra.',
            'See your current Mahadasha and Antardasha instantly, plus the full dasha timeline.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Vimshottari Dasha Calculator', path: '/vimshottari-dasha-calculator' },
        ]),
      ]}
    />
  );
}
