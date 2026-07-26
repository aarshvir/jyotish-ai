import type { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { currencyFromHeader, getDisplayPrice } from '@/lib/pricing';
import { SynastryForm } from './SynastryForm';
import { JsonLd } from '@/components/seo/JsonLd';
import SynastrySamplePreview from '@/components/landing/SynastrySamplePreview';
import { SeoProse, FaqSection } from '@/components/seo/SeoSection';
import { faqPageLd, breadcrumbLd, softwareAppLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Kundli Matching & Marriage Compatibility (Gun Milan) — VedicHour',
  description:
    'Free-to-start Vedic matchmaking. Enter two birth details and get your 36-point Ashtakoot Gun Milan score with a full eight-fold compatibility breakdown. $9.99 / ₹899.',
  alternates: { canonical: '/synastry' },
};

const STEPS = [
  { n: '36', label: 'point compatibility score' },
  { n: '8', label: 'areas of life compared' },
  { n: '2 min', label: 'instant result' },
];

const SYNASTRY_SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Kundli Matching — known as Gun Milan or Ashtakoot Milan — is the classical Vedic method for checking marriage compatibility between two birth charts. It compares the Moon’s position in both charts across eight factors (kootas) worth 36 points (gunas) in total. VedicHour computes it instantly from both sets of birth details.' },
  { h: 'The eight kootas (36 gunas)', p: 'The 36 points are split across eight kootas, each scoring a different dimension of compatibility: Varna (1 — ego and outlook), Vashya (2 — mutual attraction), Tara (3 — health and well-being), Yoni (4 — physical and intimate compatibility), Graha Maitri (5 — mental and intellectual bond), Gana (6 — temperament), Bhakoot (7 — emotional bond and family welfare) and Nadi (8 — health and progeny). Your full breakdown shows the score and meaning of each.' },
  { h: 'What score is good?', p: 'The total runs from 0 to 36. As a guide: below 18 is a weak match worth a careful review, 18 to 24 is acceptable, 25 to 32 is very good, and 33 to 36 is excellent. The total is not the whole story — a low Bhakoot or Nadi score, or a Manglik mismatch, matters more than a couple of missing points elsewhere.' },
  { h: 'Manglik and Nadi dosha', p: 'Two checks carry extra weight. Nadi dosha occurs when both partners share the same Nadi (worth 8 points — the most of any koota) and is taken seriously for health and progeny, though it has classical cancellations. Manglik (Mangal) dosha — a Mars placement — is checked separately; when both partners are Manglik it is considered to cancel out. Your reading flags both clearly.' },
  { h: 'Does it matter for a love marriage?', p: 'Matching is best used as insight, not a veto. A lower score highlights areas to be conscious of together — temperament, health, finances — rather than a reason to call things off. Many happy marriages have modest scores, and remedies exist for specific doshas.' },
];

const SYNASTRY_FAQS: Faq[] = [
  { q: 'What is Gun Milan / Kundli Matching?', a: 'Gun Milan (Ashtakoot Milan) is the classical Vedic system for checking marriage compatibility between two birth charts. It scores eight factors based on the Moon’s position, totalling 36 points (gunas).' },
  { q: 'How many gunas are needed for marriage?', a: 'As a guide, 18 or more out of 36 is acceptable, 25+ is very good and 33+ is excellent; below 18 is a weak match worth reviewing. The breakdown matters more than the total — Bhakoot, Nadi and Manglik checks carry extra weight.' },
  { q: 'What are the eight kootas?', a: 'Varna (1), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakoot (7) and Nadi (8) — together 36 points. Each scores a different dimension, from temperament and intellect to health, intimacy and family welfare.' },
  { q: 'What is Nadi dosha?', a: 'Nadi dosha occurs when both partners share the same Nadi, costing all 8 of its points. It is taken seriously for health and children, though classical texts list cancellations. Your reading flags it and explains the context.' },
  { q: 'Does kundli matching matter for a love marriage?', a: 'It is best used as insight rather than a veto. A lower score points to areas to be mindful of — temperament, health, finances — not a reason to call things off. Many happy marriages have modest scores, and remedies exist for specific doshas.' },
  { q: 'Do I need exact birth times for both people?', a: 'Gun Milan is based on the Moon’s sign and nakshatra, which need the birth date and ideally the time and place for precision. The more exact the birth details, the more reliable the Yoni, Gana and Nadi scores.' },
  { q: 'Is the compatibility score free?', a: 'Yes — you get your 36-point Gun Milan score for free. The full eight-fold koota breakdown, Manglik and Nadi checks and the plain-English verdict are a one-time $9.99 / ₹899.' },
  { q: 'What if our score is low?', a: 'A low score is a prompt to understand specific areas, not a verdict on the relationship. The breakdown shows exactly which kootas are weak, classical remedies where relevant, and what to be conscious of together.' },
];

export default async function SynastryPage() {
  const currency = currencyFromHeader((await headers()).get('x-currency'));
  const priceLabel = getDisplayPrice('synastry', currency);
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Kundli Matching · Gun Milan</p>
          <h1 className="text-display-md font-display text-star mb-4">
            Kundli Matching &amp; <span className="text-amber">Gun Milan</span> — Free Compatibility Check
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Enter both birth details and get your <strong className="text-star">36-point compatibility score</strong> with
            a full breakdown across eight areas of life — temperament, mindset, health, and more. The classical
            Ashtakoot Gun Milan that Indian families have used for generations, computed instantly.
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-7">
            {STEPS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl sm:text-3xl text-amber">{s.n}</div>
                <div className="font-mono text-mono-sm text-dust max-w-[8rem]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <Suspense fallback={<p className="text-center text-dust">Loading form…</p>}>
          <SynastryForm priceLabel={priceLabel} />
        </Suspense>

        <SynastrySamplePreview />

        <SeoProse heading="How Gun Milan (Kundli Matching) works" id="gun-milan-explained">
          {SYNASTRY_SECTIONS.map((s) => (
            <div key={s.h || 'intro'}>
              {s.h ? <h3>{s.h}</h3> : null}
              <p>{s.p}</p>
            </div>
          ))}
        </SeoProse>

        <FaqSection faqs={SYNASTRY_FAQS} heading="Kundli matching — frequently asked" />
      </main>

      <JsonLd
        data={[
          softwareAppLd({
            name: 'VedicHour Kundli Matching (Gun Milan)',
            path: '/synastry',
            description:
              'Free 36-point Ashtakoot Gun Milan (Kundli matching) for two birth charts. Get your compatibility score free, then unlock the full eight-koota breakdown, Manglik and Nadi dosha checks and a plain-English verdict.',
            price: '9.99',
          }),
          faqPageLd(SYNASTRY_FAQS),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Kundli Matching', path: '/synastry' },
          ]),
        ]}
      />

      <Footer />
    </div>
  );
}
