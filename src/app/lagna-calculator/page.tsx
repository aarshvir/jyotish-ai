import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Lagna Calculator — Free Ascendant / Rising Sign by Date & Time of Birth',
  description:
    'Find your Lagna (ascendant / rising sign) free. Enter your exact date, time and place of birth and we calculate the sign rising on the eastern horizon — the anchor of your Vedic chart. No signup.',
  alternates: { canonical: '/lagna-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Your Lagna — also called the ascendant or rising sign — is the zodiac sign climbing over the eastern horizon at the exact moment you were born. This free calculator uses your birth details to work out that sign to the minute, which becomes the starting point and frame for your entire Vedic chart.' },
  { h: 'What the Lagna actually is', p: 'As the Earth turns, a new zodiac sign rises in the east roughly every two hours. The Lagna is simply whichever sign — and degree — was rising at your birth time and place. It marks the cusp of the 1st house and sets the layout for all twelve houses that follow, so it shapes how every planet in your chart is read.' },
  { h: 'Why the Lagna anchors the chart, not the Sun sign', p: 'Western horoscopes lead with the Sun sign, but Vedic astrology (Jyotish) builds the chart from the Lagna. The ascendant fixes the 1st house — the self, body and temperament — and from there each house governs a real area of life: family, home, partnership, career and so on. Without the Lagna there are no houses, which is why it sits at the heart of any genuine reading.' },
  { h: 'Lagna vs Rashi (Moon sign)', p: 'These are two different anchor points and people often confuse them. The Lagna is the sign rising in the east and depends on your exact birth time. The Rashi is your Moon sign — the sign the Moon occupied at birth — which moves far more slowly and changes only every two to two-and-a-half days. Many traditional readings consider both: the Lagna for the outer life and self, the Rashi for the emotional and inner nature.' },
  { h: 'Why exact birth time matters — and what to do without it', p: 'Because the Lagna shifts about every two hours, even a 15-to-20-minute error can move you to a neighbouring sign and rotate every house. Aim for the time on your birth certificate or hospital record. If your time is genuinely unknown, treat the Lagna as provisional: some astrologers use a Sun-rising (Surya Lagna) or Moon-rising (Chandra Lagna) chart instead, or perform birth-time rectification by matching known life events to the chart.' },
];

const FAQS: Faq[] = [
  { q: 'What is a Lagna in astrology?', a: 'The Lagna, or ascendant, is the zodiac sign that was rising on the eastern horizon at the exact moment and place of your birth. It marks the 1st house of your chart and frames how all twelve houses and the planets within them are interpreted.' },
  { q: 'What is the difference between Lagna and Rashi?', a: 'The Lagna is your rising sign — the sign coming up in the east at birth — and it changes roughly every two hours. The Rashi is your Moon sign, the sign the Moon was in at birth, and it changes only every couple of days. They are usually different signs and are read together for a fuller picture.' },
  { q: 'Why do I need an exact birth time for the Lagna?', a: 'The rising sign moves about one sign every two hours, so a small error in the recorded time can push you into a neighbouring Lagna and shift every house. An accurate time — ideally from a birth certificate or hospital record — is essential for a reliable ascendant.' },
  { q: 'What if I do not know my birth time?', a: 'You can still explore your chart, but treat the Lagna as approximate. Some astrologers fall back to a Sun-rising or Moon-rising chart, while others use birth-time rectification, matching the timing of major life events to narrow down the likely ascendant.' },
  { q: 'How often does the Lagna change?', a: 'A new sign rises in the east roughly every two hours, so the Lagna cycles through all twelve signs over about a 24-hour day. The exact duration of each rising sign varies a little by latitude and time of year.' },
  { q: 'Is the ascendant the same as the rising sign?', a: 'Yes — ascendant, rising sign and Lagna all refer to the same thing: the sign on the eastern horizon at birth. Vedic astrology usually uses the Sanskrit term Lagna and measures from where the stars actually sit, while Western astrology says rising sign and measures from the seasons, so the named sign can differ between the two systems.' },
  { q: 'Is this Lagna calculator free?', a: 'Yes, it is completely free with no login. For a full plain-English reading of your ascendant, houses and planetary periods, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Lagna / Ascendant"
      h1="Lagna (Ascendant) Calculator —"
      h1Accent="Free"
      intro="Find the sign that was rising in the east when you were born — the anchor of your whole Vedic chart. Enter your exact date, time and place of birth and we calculate your Lagna (ascendant) instantly, in plain English — no signup."
      view="lagna"
      ctaHref="/kundali"
      ctaLabel="See your full Vedic chart"
      proseHeading="Understanding your Lagna (ascendant)"
      proseId="lagna-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Lagna & ascendant — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Lagna (Ascendant) Calculator',
          path: '/lagna-calculator',
          description: 'Free Lagna calculator. Finds your ascendant — the sign rising on the eastern horizon at birth — from your exact date, time and place of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to find your Lagna (ascendant)',
          steps: [
            'Enter your date of birth.',
            'Enter your exact birth time and place so we can find the sign rising in the east.',
            'See your Lagna (ascendant) and its degree instantly, with what it means for your chart.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Lagna Calculator', path: '/lagna-calculator' },
        ]),
      ]}
    />
  );
}
