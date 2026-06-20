import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Moon Sign Calculator — Free Rashi by Date of Birth (Vedic)',
  description:
    'Find your Vedic Moon sign (Rashi / Chandra Rashi) in seconds. Enter your date, time and place of birth to see the sign the Moon occupied at birth in the sidereal zodiac — no signup.',
  alternates: { canonical: '/moon-sign-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Your Moon sign — called Rashi or Chandra Rashi in Vedic astrology — is the zodiac sign the Moon occupied at the moment of your birth, measured in the sidereal (Vedic) zodiac. This free calculator uses your exact birth details and the Swiss Ephemeris to find that sign precisely, the same Rashi an astrologer uses as the starting point of a reading.' },
  { h: 'What the Moon sign represents', p: 'In Jyotish the Moon stands for the mind, emotions and inner temperament — how you feel, react and find comfort, rather than the outer identity the Sun describes. Because the Moon moves quickly, it changes sign roughly every two to two-and-a-half days, so your Rashi is sensitive to your actual date of birth and gives a personal, fast-moving picture of your nature.' },
  { h: 'Why Jyotish weights the Moon so heavily', p: 'Vedic astrology treats the Moon sign as the practical centre of the chart. Your daily and yearly rashifal (horoscope) is read from the Rashi, not the Sun sign, and Gun Milan — the eight-factor compatibility scoring used in marriage matching — is built almost entirely on the Moon sign and the birth Nakshatra. Knowing your true Rashi is the first step to reading either one correctly.' },
  { h: 'Rashi vs Sun sign', p: 'The sign most people call “their sign” in the newspaper is the Sun sign — where the Sun sat at birth. The Rashi is where the Moon sat, and the two are usually different. Vedic practice leads with the Moon sign because it tracks the mind and emotions more closely, while the Sun sign describes will, vitality and the public self. Both are real placements; they simply describe different layers of you.' },
  { h: 'Why your Vedic result can differ from a Western sign', p: 'Vedic astrology uses the sidereal zodiac, tied to the fixed stars, while Western astrology uses the tropical zodiac, tied to the seasons. The two have drifted apart by about 24 degrees over the centuries (the ayanamsha), so a Vedic placement often falls one sign earlier than the Western one. That is why your Vedic Moon sign here may not match a Sun sign you have seen elsewhere — it is a different zodiac and a different planet, not an error.' },
];

const FAQS: Faq[] = [
  { q: 'What is my Moon sign?', a: 'Your Moon sign (Rashi) is the zodiac sign the Moon occupied at your birth in the sidereal Vedic zodiac. Enter your date, time and place of birth above and the calculator returns your exact Rashi along with your birth Nakshatra.' },
  { q: 'Can I find my Moon sign by date of birth alone?', a: 'Often yes, but not always. The Moon changes sign every two to two-and-a-half days, so on most dates the date alone is enough. If you were born on a day the Moon crossed from one sign to the next, the birth time decides which Rashi applies — so adding your time gives a reliable answer.' },
  { q: 'Is the Moon sign the same as the Sun sign?', a: 'No. The Sun sign is where the Sun sat at birth (the sign most horoscope columns use); the Rashi is where the Moon sat. They are usually different. Vedic astrology reads the Moon sign first because it reflects the mind and emotions, while the Sun sign reflects vitality and the outer self.' },
  { q: 'Why does my Vedic Moon sign differ from my Western sign?', a: 'Vedic astrology uses the sidereal zodiac fixed to the stars, while Western astrology uses the tropical zodiac fixed to the seasons. The roughly 24-degree gap between them (the ayanamsha) often shifts a placement back by one sign, so the two systems can give different results for the same birth.' },
  { q: 'Why does the Moon sign matter so much in Vedic astrology?', a: 'Your rashifal (daily and yearly horoscope) is read from the Moon sign, and Gun Milan — the marriage-compatibility scoring — depends mainly on the Moon sign and Nakshatra. Because the Moon governs the mind, the Rashi is the practical anchor for most everyday Jyotish.' },
  { q: 'Do I need an exact birth time for my Rashi?', a: 'A precise time is helpful but rarely essential for the Moon sign, since the Moon stays in one sign for over two days. It matters only when birth falls near a sign change. An exact time is more important for the ascendant (Lagna) and the house positions.' },
  { q: 'Is this calculator free?', a: 'Yes, completely free with no login. For a full plain-English birth-chart reading that places your Moon sign in the context of your whole chart, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Chandra Rashi"
      h1="Moon Sign (Rashi) Calculator —"
      h1Accent="Free"
      intro="Find your Vedic Moon sign in seconds. Enter your birth details and we calculate the exact Rashi the Moon occupied at birth in the sidereal zodiac — the sign Jyotish uses for your horoscope and compatibility, explained in plain English with no signup."
      view="moonsign"
      ctaHref="/kundali"
      ctaLabel="See your full Vedic chart"
      proseHeading="Understanding your Moon sign (Rashi)"
      proseId="moon-sign-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Moon sign — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Moon Sign Calculator',
          path: '/moon-sign-calculator',
          description: 'Free Vedic Moon sign (Rashi / Chandra Rashi) calculator. Finds the sidereal sign the Moon occupied at birth, by date, time and place of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to find your Moon sign',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can locate the Moon precisely.',
            'See your Vedic Moon sign (Rashi) instantly, with your birth Nakshatra.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Moon Sign Calculator', path: '/moon-sign-calculator' },
        ]),
      ]}
    />
  );
}
