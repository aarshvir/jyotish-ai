import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Free Kundli Online by Date of Birth & Time — Instant Vedic Birth Chart',
  description:
    'Generate your free Janam Kundali online. Enter your date, time and place of birth to see your Lagna, Moon sign, Nakshatra, Sun sign, current dasha and Manglik / Kaal Sarpa / Sade Sati flags — instant, free, no signup.',
  alternates: { canonical: '/free-kundli' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'A Kundli — or Janam Kundali — is your Vedic birth chart: a map of the sky at the exact moment and place you were born. This free tool computes it instantly from your birth details and gives you the core readings most people look for first: your ascendant (Lagna), Moon sign (Rashi), birth star (Nakshatra), Sun sign, the dasha period you are currently in, and whether your chart carries the Manglik, Kaal Sarpa or Sade Sati flags.' },
  { h: 'What a Janam Kundali actually is', p: 'A Janam Kundali plots the positions of the Sun, Moon and planets across the twelve houses and twelve zodiac signs at your birth. VedicHour follows the standard Indian method, measuring from where the stars actually sit in the sky, so the chart matches what a traditional astrologer would cast. The ascendant rising on the eastern horizon at your birth time anchors the whole chart, which is why an accurate time matters.' },
  { h: 'What your free chart shows', p: 'The free snapshot gives you a clear, plain-English summary: your Lagna and Rashi, your Nakshatra and its pada, your Vedic Sun sign, your running Vimshottari mahadasha, and a quick yes or no on the three doshas people most often ask about. It is enough to understand the foundations of your chart and to confirm your core placements before going deeper.' },
  { h: 'What the deep report adds', p: 'The free chart is a snapshot; the paid deep Kundli report is the full reading. It covers seven life areas — career, money, relationships, health, family, education and spiritual path — with divisional charts (vargas) for finer detail and a five-year outlook built on your dasha sequence. Everything is written in plain language, with the astrology shown so you can see how each conclusion was reached.' },
  { h: 'Related free tools', p: 'If you want to focus on one factor, VedicHour also offers free single-purpose tools: Kundli Matching (Gun Milan) for compatibility, plus dedicated Manglik, Sade Sati, Vimshottari Dasha, Nakshatra, Moon Sign and Lagna calculators. Each uses the same engine as this chart, so the results stay consistent across every tool.' },
];

const FAQS: Faq[] = [
  { q: 'What is a Kundli or Janam Kundali?', a: 'A Kundli (Janam Kundali) is your Vedic birth chart — a snapshot of the Sun, Moon and planets across the twelve houses at the exact time and place you were born. It is the foundation of every Vedic astrology reading.' },
  { q: 'Is this Kundli really free?', a: 'Yes, completely free with no login and no card. You get your Lagna, Moon sign, Nakshatra, Sun sign, current dasha and the Manglik / Kaal Sarpa / Sade Sati flags instantly. The full plain-English deep report is a separate one-time option.' },
  { q: 'Do I need my exact birth time?', a: 'For the most accurate chart, yes. The ascendant (Lagna) and house placements depend on the birth time, and even a few minutes can shift the rising sign. Your Moon sign and Nakshatra are more forgiving, so the chart is still useful if your time is approximate.' },
  { q: 'What is included free versus the paid report?', a: 'The free chart shows your core placements — Lagna, Rashi, Nakshatra, Sun sign, current dasha and the three main doshas. The paid deep report adds readings across seven life areas, divisional (varga) charts and a five-year outlook based on your dasha sequence.' },
  { q: 'How accurate is the chart?', a: 'Planetary positions are worked out to the minute, following the same standards a traditional Indian astrologer uses. Accuracy then depends mostly on how precise your birth time and place are.' },
  { q: 'What is the difference between a Kundli and a daily horoscope?', a: 'A daily horoscope is a short, general forecast based only on your Sun or Moon sign. A Kundli is your complete personal birth chart, unique to your exact moment of birth, and is what astrologers actually analyse for life-area readings.' },
  { q: 'How is Vedic astrology different from Western astrology?', a: 'Vedic astrology measures from where the stars actually sit in the sky, while Western astrology measures from the seasons. Because of this, your Vedic Sun sign is often one sign earlier than your Western one, and Vedic charts lean heavily on the Moon, Nakshatras and dasha periods.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Janam Kundali"
      h1="Free Kundli —"
      h1Accent="Your Vedic Birth Chart, Instantly"
      intro="Generate your free Janam Kundali in seconds. Enter your date, time and place of birth and we cast your Vedic chart — showing your Lagna, Moon sign, Nakshatra, Sun sign, current dasha and the Manglik, Kaal Sarpa and Sade Sati flags. No signup, no card."
      view="fullchart"
      ctaHref="/kundali"
      ctaLabel="Get your deep Kundli report"
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
