import { StarField } from '@/components/ui/StarField';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Props {
  params: { planet: string; sign: string };
}

const PLANETS = [
  'sun',
  'moon',
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
  'rahu',
  'ketu',
] as const;

const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

// Short qualitative summary injected into copy — keeps 108 pages from looking identical
// to Google while staying factually Jyotish-accurate.
const PLANET_ESSENCE: Record<string, string> = {
  sun: 'soul, authority, father, vitality, government — Surya governs the Atma and the 1st/5th/10th house themes of self-expression and recognition.',
  moon: 'mind, mother, emotions, public image, comfort — Chandra governs the 4th house and nourishes your inner life.',
  mars: 'courage, ambition, brothers, real estate, surgery — Mangal rules Aries and Scorpio, signifies the 3rd/6th/10th Karakas.',
  mercury: 'intellect, speech, commerce, communication, youth — Budha rules Gemini and Virgo, signifies the 10th Karaka.',
  jupiter: 'wisdom, dharma, wealth, children, teachers — Guru rules Sagittarius and Pisces and signifies the 2nd/5th/9th/11th Karakas.',
  venus: 'relationships, luxury, arts, vehicles, marriage — Shukra rules Taurus and Libra and signifies the 7th Karaka.',
  saturn: 'discipline, karma, longevity, work, servants — Shani rules Capricorn and Aquarius and signifies the 6th/8th/10th/12th Karakas.',
  rahu: 'obsession, foreign lands, unconventional paths, sudden gains — the North Node amplifies whichever house it occupies.',
  ketu: 'moksha, detachment, past-life skills, sudden losses — the South Node represents spiritual liberation and research.',
};

const SIGN_ESSENCE: Record<string, string> = {
  aries: 'Mesha — cardinal fire, ruled by Mars. Initiation, competitive drive, new ventures.',
  taurus: 'Vrishabha — fixed earth, ruled by Venus. Stability, comfort, accumulated resources.',
  gemini: 'Mithuna — mutable air, ruled by Mercury. Communication, analysis, short trips.',
  cancer: 'Karka — cardinal water, ruled by the Moon. Emotion, home, memory, caretaking.',
  leo: 'Simha — fixed fire, ruled by the Sun. Leadership, creativity, paternal authority.',
  virgo: 'Kanya — mutable earth, ruled by Mercury. Service, health, detail, devotion.',
  libra: 'Tula — cardinal air, ruled by Venus. Partnership, balance, negotiation.',
  scorpio: 'Vrischika — fixed water, ruled by Mars. Depth, occult, transformation, inheritance.',
  sagittarius: 'Dhanu — mutable fire, ruled by Jupiter. Dharma, long journeys, higher learning.',
  capricorn: 'Makara — cardinal earth, ruled by Saturn. Achievement, discipline, public status.',
  aquarius: 'Kumbha — fixed air, ruled by Saturn. Networks, innovation, collective causes.',
  pisces: 'Meena — mutable water, ruled by Jupiter. Compassion, imagination, moksha.',
};

export function generateMetadata({ params }: Props): Metadata {
  const { planet, sign } = params;
  const pName = planet.charAt(0).toUpperCase() + planet.slice(1);
  const sName = sign.charAt(0).toUpperCase() + sign.slice(1);
  const title = `${pName} Transit in ${sName} — Vedic Jyotish Meaning`;
  const description = `What ${pName} transiting ${sName} means for your Jyotish birth chart. Get a personalised AI Vedic astrology forecast with Lagna, Dasha & hourly windows.`;

  return {
    title: { absolute: `${title} | VedicHour` },
    description,
    alternates: { canonical: `/transit/${planet}/${sign}` },
    keywords: [
      `${planet} in ${sign}`,
      `${planet} transit ${sign}`,
      `${pName} Jyotish`,
      `Vedic ${planet} transit`,
      `${planet} ${sign} forecast`,
      `Kundli ${planet} ${sign}`,
    ],
    openGraph: {
      title: `${title} | VedicHour`,
      description,
      url: `/transit/${planet}/${sign}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | VedicHour`,
      description,
    },
  };
}

export async function generateStaticParams() {
  // Full 9 planets × 12 signs = 108 SSG pages for long-tail SEO.
  const params: Array<{ planet: string; sign: string }> = [];
  for (const planet of PLANETS) {
    for (const sign of SIGNS) {
      params.push({ planet, sign });
    }
  }
  return params;
}

export default function TransitSEOPage({ params }: Props) {
  const { planet, sign } = params;

  const pName = planet.charAt(0).toUpperCase() + planet.slice(1);
  const sName = sign.charAt(0).toUpperCase() + sign.slice(1);
  const title = `What ${pName} Transit in ${sName} Means for Your Birth Chart`;
  const SITE_URL = 'https://www.vedichour.com';
  const planetEssence = PLANET_ESSENCE[planet] ?? '';
  const signEssence = SIGN_ESSENCE[sign] ?? '';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Transit Reports', item: `${SITE_URL}/transit` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${pName} in ${sName}`,
        item: `${SITE_URL}/transit/${planet}/${sign}`,
      },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: `Personalised Vedic astrology (Jyotish) analysis of ${pName} transiting ${sName} based on your exact Lagna, Moon sign and active Dasha period.`,
    author: { '@type': 'Organization', name: 'VedicHour' },
    publisher: { '@type': 'Organization', name: 'VedicHour' },
  };

  return (
    <div className="min-h-[100svh] bg-space flex flex-col items-center py-24 px-6 relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <StarField />

      <div className="max-w-3xl w-full relative z-10">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-pill border border-amber/20 bg-amber/[0.04]">
            <span className="font-mono text-mono-sm text-amber tracking-[0.15em] uppercase">
              Vedic Astrology Transit Report
            </span>
          </div>
        </div>

        <h1 className="text-display-lg font-display text-star mb-6 text-center">{title}</h1>

        <p className="font-body text-body-lg text-dust/80 leading-relaxed mb-10 max-w-2xl mx-auto text-center">
          The transit of {pName} through the sign of {sName} creates a powerful cosmic shift. If
          you have your Ascendant (Lagna) or Moon in specific houses, this transit will dramatically
          alter your career, relationships, and health.
        </p>

        <div className="card bg-cosmos/80 border-horizon mb-10 p-8 text-left">
          <h2 className="text-headline-md text-star mb-4 border-b border-horizon/30 pb-4">
            The essence of {pName} in Vedic astrology
          </h2>
          <p className="text-dust text-sm leading-relaxed">
            {pName} ({planet === 'sun' ? 'Surya' : planet === 'moon' ? 'Chandra' : planet === 'mars' ? 'Mangal' : planet === 'mercury' ? 'Budha' : planet === 'jupiter' ? 'Guru' : planet === 'venus' ? 'Shukra' : planet === 'saturn' ? 'Shani' : planet === 'rahu' ? 'Rahu' : 'Ketu'}) in Jyotish governs {planetEssence}
          </p>
        </div>

        <div className="card bg-cosmos/80 border-horizon mb-10 p-8 text-left">
          <h2 className="text-headline-md text-star mb-4 border-b border-horizon/30 pb-4">
            {sName} as a sign
          </h2>
          <p className="text-dust text-sm leading-relaxed">{signEssence}</p>
        </div>

        <div className="card bg-cosmos/80 border-horizon mb-10 p-8 text-left">
          <h2 className="text-headline-md text-star mb-4 border-b border-horizon/30 pb-4">
            Is {pName} in {sName} favourable for you?
          </h2>
          <p className="text-dust text-sm mb-6 leading-relaxed">
            Generic horoscopes summarise transits for millions of people based on Sun signs. Vedic
            astrology (Jyotish) mathematically tracks all 9 planets specifically for your exact
            birth time and geospatial coordinates down to the minute — then interprets {pName}&apos;s
            movement through {sName} against your natal chart&apos;s Lagna, Navamsa, active
            Mahadasha/Antardasha, and the 27 Nakshatras.
          </p>
          <p className="text-dust text-sm mb-6 leading-relaxed">
            That&apos;s why a single transit (like {pName} in {sName}) can mean career liftoff for
            one person and restructuring for another — the house position from your individual
            Ascendant changes the entire interpretation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8">
            <Link
              href={`/onboard?transit=${planet}_${sign}`}
              className="btn-primary w-full sm:w-auto px-8 py-3"
            >
              Generate My Personalised Jyotish Report
            </Link>
          </div>
          <p className="text-dust/60 text-xs text-center mt-4">
            Free Kundli • 30-day hourly forecast • Swiss Ephemeris accuracy
          </p>
        </div>
      </div>
    </div>
  );
}
