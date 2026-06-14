import type { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { currencyFromHeader, getDisplayPrice } from '@/lib/pricing';
import { KundaliForm } from './KundaliForm';
import { JsonLd } from '@/components/seo/JsonLd';
import KundaliSamplePreview from '@/components/landing/KundaliSamplePreview';
import { SeoProse, FaqSection } from '@/components/seo/SeoSection';
import { faqPageLd, breadcrumbLd, softwareAppLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Deep Kundali Report — Your Full Vedic Birth Chart | VedicHour',
  description:
    'A deep, personalized Vedic birth report — your full chart read across career & money, marriage & intimacy, health, children and family, a year-by-year outlook for the next 5 years, and the classical checks (Manglik, Kaal Sarpa, Sade Sati). Computed with the Swiss Ephemeris. $9.99 / ₹899.',
  alternates: { canonical: '/kundali' },
};

const POINTS = [
  { t: 'Every area of life', d: 'Career & money, marriage & intimacy, health, children, and family — each read directly from your chart in plain English, not generic horoscope filler.' },
  { t: 'Your next 5 years', d: 'A year-by-year outlook driven by your exact planetary periods (dasha) — what each year emphasises and how to make the most of it.' },
  { t: 'The classical checks', d: 'Manglik, Kaal Sarpa and Sade Sati assessed from real Swiss Ephemeris calculations — explained clearly, never with fear.' },
];

const KUNDALI_SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Your Kundli — also called a Janam Kundali or Vedic birth chart — is a precise map of where every planet sat in the sky at the exact moment and place you were born. VedicHour computes it with the Swiss Ephemeris using the sidereal zodiac and the Lahiri Ayanamsa, the same standard professional Jyotish astrologers use. Here is what a full reading covers.' },
  { h: 'The twelve houses (bhavas)', p: 'Your chart is divided into twelve houses, each governing an area of life — the 1st (self and body), 2nd (money and family), 4th (home and mother), 7th (marriage and partnership), 10th (career and status), and so on. The planets sitting in, and ruling, each house shape how that part of your life unfolds. Your deep report reads all twelve in plain English.' },
  { h: 'Manglik (Mangal) Dosha', p: 'Manglik, or Mangal, Dosha occurs when Mars sits in the 1st, 2nd, 4th, 7th, 8th or 12th house — checked from your ascendant, Moon and Venus. It is traditionally weighed in marriage matching. Classical texts also list many cancellations, and two Manglik partners are considered to offset it, so being Manglik is rarely the obstacle it is feared to be. Your report explains your exact placement without scare tactics.' },
  { h: 'Kaal Sarpa Dosha', p: 'Kaal Sarpa Dosha forms when all seven classical planets fall on one side of the Rahu–Ketu axis. There are twelve named types depending on which houses Rahu and Ketu occupy. It is associated with intensity and delayed-then-sudden results. Your report identifies whether it is present, which type, and whether it is partial.' },
  { h: 'Sade Sati', p: 'Sade Sati is the roughly seven-and-a-half-year period when Saturn transits the sign before, the sign of, and the sign after your Moon — in three phases of about two and a half years each. It is a time of maturing and restructuring, not simply misfortune. Your report shows whether you are currently in it and which phase.' },
  { h: 'Vimshottari Dasha — the timing system', p: 'Vedic astrology times events through the Vimshottari Dasha, a 120-year cycle of planetary periods (mahadasha) and sub-periods (antardasha) calculated from your birth Moon’s nakshatra. Your current period tells you which themes are active now. The deep report includes a year-by-year outlook for the next five years driven by these periods.' },
  { h: 'Lagna and Nakshatra', p: 'Your Lagna (ascendant) is the sign rising on the eastern horizon at birth — it frames the whole chart and changes about every two hours, which is why birth time matters. Your Janma Nakshatra is the lunar mansion the Moon occupied at birth, one of 27, and shapes temperament and compatibility.' },
];

const KUNDALI_FAQS: Faq[] = [
  { q: 'What is a Kundli (Janam Kundali)?', a: 'A Kundli, or Janam Kundali, is your Vedic birth chart — a snapshot of the planets’ sidereal positions at your exact birth time and place. It is the basis for every Jyotish prediction, from personality to the timing of events.' },
  { q: 'Do I need my exact birth time?', a: 'For the ascendant (Lagna), the houses and dasha timing, yes — the Lagna changes about every two hours. With only your date you still get an accurate Moon sign, nakshatra and planetary signs, but house-based and timing details need a birth time.' },
  { q: 'Is the Kundli free?', a: 'Yes — you can generate your birth chart and see your core facts (Lagna, Moon sign, nakshatra, current dasha and dosha flags) for free. The deep, plain-English report across all life areas with a 5-year outlook is a one-time $9.99 / ₹899.' },
  { q: 'What does the deep report include?', a: 'Your full chart read across character, career & money, relationships, marriage & intimacy, health, children and family; divisional charts (D9, D7, D10); Manglik / Kaal Sarpa / Sade Sati checks; and a year-by-year outlook for the next five years.' },
  { q: 'How accurate is it?', a: 'The astronomy is computed with the Swiss Ephemeris and the Lahiri Ayanamsa — the professional standard — so the chart itself is precise. The interpretation follows classical Parashari principles in plain English. Astrology is for reflection and guidance, not guaranteed outcomes.' },
  { q: 'Does Manglik Dosha stop marriage?', a: 'Rarely. Manglik Dosha is a Mars placement weighed in matching, but classical texts list many cancellations and two Manglik partners offset it. Your report explains your exact situation plainly, without fear.' },
  { q: 'What is Sade Sati?', a: 'Sade Sati is Saturn’s roughly 7.5-year transit around your Moon sign, in three phases. It is a period of discipline and restructuring — challenging at times but also maturing. Your report tells you if and where you are in it.' },
  { q: 'How is Vedic astrology different from Western?', a: 'Vedic (Jyotish) uses the sidereal zodiac fixed to the actual stars; Western uses the tropical zodiac tied to the seasons — so your Vedic Sun or Moon sign is often one sign earlier. Jyotish also emphasises the Moon sign, the nakshatras and the dasha timing system.' },
];

export default async function KundaliPage() {
  const currency = currencyFromHeader((await headers()).get('x-currency'));
  const priceLabel = getDisplayPrice('kundali', currency);
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Kundli · Janam Kundali</p>
          <h1 className="text-display-md font-display text-star mb-4">
            Deep <span className="text-amber">Kundli Analysis</span> — Your Full Vedic Birth Chart
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            A deep, personalized Vedic birth report in plain English — your character, career &amp; money,
            marriage &amp; intimacy, health, children and family, plus a year-by-year outlook for the next
            five years. Computed from your exact birth moment with the Swiss Ephemeris.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
          {POINTS.map((p) => (
            <div key={p.t} className="rounded-card border border-horizon/40 bg-cosmos p-5 text-left">
              <h3 className="font-display text-headline-sm text-amber mb-1.5">{p.t}</h3>
              <p className="font-body text-body-sm text-dust leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>

        <Suspense fallback={<p className="text-center text-dust">Loading form…</p>}>
          <KundaliForm priceLabel={priceLabel} />
        </Suspense>

        <KundaliSamplePreview />

        <SeoProse heading="What your Kundli reveals" id="kundli-explained">
          {KUNDALI_SECTIONS.map((s) => (
            <div key={s.h || 'intro'}>
              {s.h ? <h3>{s.h}</h3> : null}
              <p>{s.p}</p>
            </div>
          ))}
        </SeoProse>

        <FaqSection faqs={KUNDALI_FAQS} heading="Kundli — frequently asked" />
      </main>

      <JsonLd
        data={[
          softwareAppLd({
            name: 'VedicHour Deep Kundli Analysis',
            path: '/kundali',
            description:
              'Generate your free Vedic birth chart (Janam Kundali) and unlock a deep, plain-English Kundli report: seven life areas, divisional charts, Manglik / Kaal Sarpa / Sade Sati checks and a 5-year outlook.',
            price: '9.99',
          }),
          faqPageLd(KUNDALI_FAQS),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Kundli Analysis', path: '/kundali' },
          ]),
        ]}
      />

      <Footer />
    </div>
  );
}
