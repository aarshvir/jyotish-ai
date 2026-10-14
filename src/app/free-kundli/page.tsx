import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Free Kundli Online by Date of Birth and Time',
  description:
    'Make your free Janam Kundli in seconds. Enter your date, time and place of birth to see Lagna, Moon sign, birth star and running dasha. No sign-up.',
  alternates: { canonical: '/free-kundli' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'A Kundli — or Janam Kundali — is your Vedic birth chart: a map of the sky at the exact moment and place you were born. This free tool computes it instantly from your birth details and gives you the core readings most people look for first: your ascendant (Lagna), Moon sign (Rashi), birth star (Nakshatra), Sun sign, the dasha period you are currently in, and whether your chart carries the Manglik, Kaal Sarpa or Sade Sati flags.' },
  { h: 'What a Janam Kundali actually is', p: 'A Janam Kundali plots the positions of the Sun, Moon and planets across the twelve houses and twelve zodiac signs at your birth. VedicHour follows the standard Indian method, measuring from where the stars actually sit in the sky, so the chart matches what a traditional astrologer would cast. The ascendant rising on the eastern horizon at your birth time anchors the whole chart, which is why an accurate time matters.' },
  { h: 'What your free chart shows', p: 'See your rising sign, Moon sign, birth star, Sun sign and current planetary period. Traditional Manglik, Kaal Sarpa and Sade Sati checks are included without an email wall. If a required transit cannot be retrieved, that check is marked unavailable rather than absent. These are chart facts and traditional classifications, not guaranteed personal outcomes.' },
  { h: 'Reading beyond the facts', p: 'The example reading shows how calculated chart information can be interpreted in plain English. It belongs to a fictional reader and is not a prediction about you. New paid readings are currently unavailable; reports already in an account remain accessible.' },
  { h: 'Related free tools', p: 'If you want to focus on one factor, VedicHour also offers free single-purpose tools: Kundli Matching (Gun Milan) for compatibility, plus dedicated Manglik, Sade Sati, Vimshottari Dasha, Nakshatra, Moon Sign and Lagna calculators. Each uses the same engine as this chart, so the results stay consistent across every tool.' },
];

const FAQS: Faq[] = [
  { q: 'What is a Kundli or Janam Kundali?', a: 'A Kundli (Janam Kundali) is your Vedic birth chart — a snapshot of the Sun, Moon and planets across the twelve houses at the exact time and place you were born. It is the foundation of every Vedic astrology reading.' },
  { q: 'Is this Kundli really free?', a: 'Yes. Chart facts and available traditional dosha checks need no account, email or card. A personal hourly forecast is not included in the free chart calculation.' },
  { q: 'Do I need my exact birth time?', a: 'Enter a known time, or mark a time you actually know as approximate. The rising sign and houses are time-sensitive; the Moon sign and birth star can also change during a day. If you do not know a time, this calculator explains the limitation and does not substitute noon.' },
  { q: 'Can I buy a written report?', a: 'New paid readings are currently unavailable. You can use the free calculators, read an example and open reports already in your account.' },
  { q: 'How accurate is the chart?', a: 'Positions are calculated using Swiss Ephemeris and the Lahiri sidereal convention. Their usefulness depends on correct birth inputs and timezone handling. Astrological interpretations are traditional meanings, not scientifically established predictions. See the methodology page for assumptions and limitations.' },
  { q: 'What is the difference between a Kundli and a daily horoscope?', a: 'A daily horoscope is a short, general forecast based only on your Sun or Moon sign. A Kundli is your complete personal birth chart, unique to your exact moment of birth, and is what astrologers actually analyse for life-area readings.' },
  { q: 'How is Vedic astrology different from Western astrology?', a: 'Vedic charts commonly use a sidereal zodiac and systems such as nakshatra and dasha. Many Western charts use a tropical zodiac referenced to the equinoxes. Both use astronomical positions; their chosen zodiac reference changes the sign labels. VedicHour uses the Lahiri sidereal convention.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Janam Kundali"
      h1="Free Vedic Birth Chart"
      intro="Enter your birth date, time and city to see your rising sign, Moon sign, birth star and current planetary period. No account, email or card required."
      view="fullchart"
      ctaHref="/sample-report"
      ctaLabel="Read an example interpretation"
      proseHeading="Your Vedic birth chart, explained"
      proseId="kundli-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Free Kundli — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Free Kundli (Janam Kundali) Generator',
          path: '/free-kundli',
          description: 'Free Vedic birth chart (Janam Kundali) generator. Shows your Lagna, Moon sign, Nakshatra, Sun sign, current dasha and Manglik / Kaal Sarpa / Sade Sati flags by date, time and place of birth — sidereal, Lahiri ayanamsa, Swiss Ephemeris.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to generate your free Kundli',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can cast your sidereal chart.',
            'See your Lagna, Moon sign, Nakshatra, Sun sign, current dasha and dosha flags instantly.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Free Kundli', path: '/free-kundli' },
        ]),
      ]}
    />
  );
}
