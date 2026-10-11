import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StarField } from '@/components/ui/StarField';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, breadcrumbLd, faqPageLd, type Faq } from '@/lib/seo/jsonLd';
import { TRANSIT_DATA_DATE } from '@/content/transits';
import {
  HOUSE_TOPICS,
  PLANET_SANSKRIT,
  SIGN_ORDER,
  SIGN_SANSKRIT,
  cap,
  describeVisit,
  fmtDate,
  houseFromMoon,
  isSign,
  isSlowPlanet,
  saturnPressure,
  statusFor,
  todayIST,
  visitsFor,
  type SignSlug,
  type SlowPlanet,
} from '@/lib/seo/transits';

// Dates are static data; the "now / next" sentence is the only thing that changes, daily.
export const revalidate = 86400;

interface Props {
  params: { planet: string; sign: string };
}

const PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'] as const;

// Only the four slow planets have a transit worth a page of its own: they stay in a sign for
// months to years, so the dates are the answer. Sun, Moon, Mars, Mercury and Venus change sign
// every few days to weeks, so a per-sign page cannot hold a stable answer. Those stay reachable
// but are marked noindex and left out of the sitemap.
const FAST_ESSENCE: Record<string, string> = {
  sun: 'the Sun (Surya) stands for vitality, authority and the sense of self.',
  moon: 'the Moon (Chandra) stands for the mind, mood and everyday comfort.',
  mars: 'Mars (Mangal) stands for drive, courage and conflict handled well or badly.',
  mercury: 'Mercury (Budha) stands for speech, learning, trade and quick thinking.',
  venus: 'Venus (Shukra) stands for relationships, comfort and the arts.',
};

const SIGN_NOTE: Record<string, string> = {
  aries: 'Mesha is a cardinal fire sign ruled by Mars: starting things, directness, speed.',
  taurus: 'Vrishabha is a fixed earth sign ruled by Venus: steadiness, comfort, accumulated resources.',
  gemini: 'Mithuna is a mutable air sign ruled by Mercury: speech, curiosity, short trips.',
  cancer: 'Karka is a cardinal water sign ruled by the Moon: feeling, home, memory, care.',
  leo: 'Simha is a fixed fire sign ruled by the Sun: leadership, creativity, pride.',
  virgo: 'Kanya is a mutable earth sign ruled by Mercury: detail, service, routine.',
  libra: 'Tula is a cardinal air sign ruled by Venus: balance, partnership, negotiation.',
  scorpio: 'Vrischika is a fixed water sign ruled by Mars: depth, privacy, intensity.',
  sagittarius: 'Dhanu is a mutable fire sign ruled by Jupiter: belief, learning, long journeys.',
  capricorn: 'Makara is a cardinal earth sign ruled by Saturn: structure, ambition, responsibility.',
  aquarius: 'Kumbha is a fixed air sign ruled by Saturn: networks, ideas, shared causes.',
  pisces: 'Meena is a mutable water sign ruled by Jupiter: imagination, compassion, letting go.',
};

const PLANET_NOTE: Record<SlowPlanet, string> = {
  saturn:
    'Saturn (Shani) is the slowest of the visible planets, about two and a half years in each sign. Classical gochara rules treat it as easier from the 3rd, 6th and 11th houses counted from your Moon, and as a period that asks for patience when it passes the 12th, 1st and 2nd (Sade Sati) or the 4th and 8th (Dhaiya).',
  jupiter:
    'Jupiter (Guru) takes about a year in each sign and stands for growth, learning and goodwill. Classical gochara rules read it as supportive from the 2nd, 5th, 7th, 9th and 11th houses counted from your Moon, and as neutral to mixed elsewhere.',
  rahu: 'Rahu is not a planet but the point where the Moon’s path crosses the Sun’s, moving backwards through the zodiac for about eighteen months in each sign. It is read as strong appetite and unusual routes in the area of life it touches. Ketu always sits in the opposite sign.',
  ketu: 'Ketu is the opposite point to Rahu, always six signs away from it, and moves backwards for about eighteen months in each sign. It is read as detachment and narrowing of focus in the area of life it touches.',
};

export function generateStaticParams() {
  const params: Array<{ planet: string; sign: string }> = [];
  for (const planet of PLANETS) for (const sign of SIGN_ORDER) params.push({ planet, sign });
  return params;
}

export function generateMetadata({ params }: Props): Metadata {
  const { planet, sign } = params;
  if (!isSign(sign) || !(PLANETS as readonly string[]).includes(planet)) return {};
  const P = cap(planet);
  const S = cap(sign);
  const canonical = `/transit/${planet}/${sign}`;

  if (!isSlowPlanet(planet)) {
    return {
      title: { absolute: `${P} in ${S}: What It Means | VedicHour` },
      description: `What ${P} in ${S} stands for in Vedic astrology, and why a fast planet's sign matters less than your Moon sign and dasha.`,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const title = `${P} in ${S}: Transit Dates and Meaning`;
  const description =
    planet === 'saturn'
      ? `When Saturn is in ${S} in the Vedic zodiac, which house that is from each Moon sign, and who has Sade Sati or Dhaiya.`
      : planet === 'jupiter'
        ? `When Jupiter is in ${S} in the Vedic zodiac, which house that is from each Moon sign, and where it is traditionally supportive.`
        : `When ${P} is in ${S} in the Vedic zodiac, and which house that is from each Moon sign. ${planet === 'rahu' ? 'Ketu sits opposite.' : 'Rahu sits opposite.'}`;
  return {
    title: { absolute: `${title} | VedicHour` },
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article', images: ['/opengraph-image'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
    keywords: [`${planet} in ${sign}`, `${planet} transit ${sign}`, `${planet} gochar ${sign}`, `${PLANET_SANSKRIT[planet]} ${SIGN_SANSKRIT[sign]}`],
  };
}

function statusSentence(planet: SlowPlanet, sign: SignSlug, today: string): string {
  const P = cap(planet);
  const S = cap(sign);
  const st = statusFor(planet, sign, today);
  switch (st.kind) {
    case 'in': {
      const later = st.visit.segments.filter((s) => s[0] > st.segment[0]);
      const base = `${P} is in ${S} today. It entered on ${fmtDate(st.segment[0])} and is due to leave on ${fmtDate(st.segment[1])}.`;
      return later.length
        ? `${base} It then moves ahead, turns retrograde and is back in ${S} from ${later.map((s) => `${fmtDate(s[0])} to ${fmtDate(s[1])}`).join(' and again ')}.`
        : base;
    }
    case 'dip': {
      const upcoming = st.visit.segments.find((s) => s[0] > today);
      return `${P} is in the previous sign today, on a retrograde stretch, and returns to ${S} on ${upcoming ? fmtDate(upcoming[0]) : fmtDate(st.visit.end)}. The whole stay in ${S} runs from ${fmtDate(st.visit.start)} to ${fmtDate(st.visit.end)}.`;
    }
    case 'next':
      return `${P} is not in ${S} today. Its next stay starts on ${fmtDate(st.visit.start)} and ends on ${fmtDate(st.visit.end)}.`;
    case 'past':
      return `${P} is not in ${S} today. Its last stay ended on ${fmtDate(st.visit.end)}, and the next one falls after the dates listed here.`;
    default:
      return `${P} does not enter ${S} in the dates covered on this page.`;
  }
}

function FastPlanetPage({ planet, sign }: { planet: string; sign: SignSlug }) {
  const P = cap(planet);
  const S = cap(sign);
  return (
    <div className="min-h-[100svh] bg-space flex flex-col items-center py-24 px-6 relative overflow-hidden">
      <StarField />
      <div className="max-w-3xl w-full relative z-10">
        <h1 className="text-display-md font-display text-star mb-6 text-center">
          {P} in {S}: what it means
        </h1>
        <div className="card bg-cosmos/80 border-horizon mb-8 p-8 text-left space-y-4 text-dust text-sm leading-relaxed">
          <p>In Vedic astrology, {FAST_ESSENCE[planet]}</p>
          <p>{SIGN_NOTE[sign]}</p>
          <p>
            {P} changes sign too quickly for its sign alone to say much. What matters more is which house {S} is from
            your Moon sign, and which dasha you are running. Start with the slow planets, which move for months or years:
            see <Link href="/transit" className="text-amber underline">where Saturn, Jupiter, Rahu and Ketu are now</Link>.
          </p>
          <p>
            <Link href="/moon-sign-calculator" className="text-amber underline">Find your Moon sign</Link> or{' '}
            <Link href="/vimshottari-dasha-calculator" className="text-amber underline">your current dasha</Link>, both free.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TransitPage({ params }: Props) {
  const { planet, sign } = params;
  if (!isSign(sign) || !(PLANETS as readonly string[]).includes(planet)) notFound();
  if (!isSlowPlanet(planet)) return <FastPlanetPage planet={planet} sign={sign} />;

  const P = cap(planet);
  const S = cap(sign);
  const today = todayIST();
  const visits = visitsFor(planet, sign);
  const sentence = statusSentence(planet, sign, today);
  const pressure = planet === 'saturn' ? saturnPressure(sign) : null;
  const supportive = planet === 'jupiter' ? new Set([2, 5, 7, 9, 11]) : null;
  const gain = planet === 'saturn' ? new Set([3, 6, 11]) : null;
  const sadeSet = pressure ? new Set(pressure.sadeSati.map((x) => x.house)) : null;
  const dhaiyaSet = pressure ? new Set(pressure.dhaiya.map((x) => x.house)) : null;

  const rows = SIGN_ORDER.map((moon) => {
    const house = houseFromMoon(moon, sign);
    let tag = '';
    if (sadeSet?.has(house)) tag = 'Sade Sati';
    else if (dhaiyaSet?.has(house)) tag = 'Dhaiya';
    else if (gain?.has(house)) tag = 'Traditionally easier';
    else if (supportive?.has(house)) tag = 'Traditionally supportive';
    return { moon, house, tag };
  });

  const nodeCompanion = planet === 'rahu' || planet === 'ketu';
  const opposite = SIGN_ORDER[(SIGN_ORDER.indexOf(sign) + 6) % 12];

  const faqs: Faq[] = [
    {
      q: `When is ${P} in ${S}?`,
      a: `${sentence} Dates are in Indian time, in the sidereal (Lahiri) zodiac.${visits.length > 1 ? ` Other stays: ${visits.map(describeVisit).join('; ')}.` : ''}`,
    },
    {
      q: `Which Moon signs are affected when ${P} is in ${S}?`,
      a:
        planet === 'saturn' && pressure
          ? `Sade Sati runs for ${pressure.sadeSati.map((x) => cap(x.sign)).join(', ')} Moon signs, and Dhaiya for ${pressure.dhaiya.map((x) => cap(x.sign)).join(' and ')}. Every other Moon sign has Saturn in a different house, as the table shows.`
          : `Every Moon sign is touched, in a different house. The table on this page shows the house for each Moon sign, counted from the Moon.`,
    },
    {
      q: 'Why do other sites show slightly different dates?',
      a: 'Three things move a date: the ayanamsa (Lahiri here; others differ by a fraction of a degree), whether Rahu and Ketu use the mean or the true node (mean here, as most Indian panchangs do), and the time zone, because an ingress late at night can fall on the next day elsewhere.',
    },
  ];

  const title = `${P} in ${S}: Transit Dates and Meaning`;

  return (
    <div className="min-h-[100svh] bg-space py-20 px-5 sm:px-8 relative overflow-hidden">
      <StarField />
      <div className="max-w-3xl mx-auto relative z-10 font-body text-body-md text-dust leading-relaxed">
        <p className="section-eyebrow mb-3">
          {PLANET_SANSKRIT[planet]} in {SIGN_SANSKRIT[sign]} · Dates checked {fmtDate(TRANSIT_DATA_DATE)}
        </p>
        <h1 className="text-display-md font-display text-star mb-6">{title}</h1>

        <p className="text-body-lg text-star mb-4">
          <strong>{sentence}</strong>
        </p>
        <p className="mb-8">
          This is the sidereal (Vedic) zodiac with the Lahiri ayanamsa, so the sign can differ from the Western tropical
          sign. Dates are Indian time. {SIGN_NOTE[sign]}
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">Every stay of {P} in {S}</h2>
        <ul className="list-disc pl-6 space-y-1 mb-2">
          {visits.map((v) => (
            <li key={v.start}>{describeVisit(v)}</li>
          ))}
        </ul>
        <p className="text-body-sm mb-8">
          {planet === 'rahu' || planet === 'ketu'
            ? `${P} moves backwards, so each stay is one unbroken stretch.`
            : `A planet that turns retrograde can step back into the previous sign for a few months, which is why a stay can have more than one part.`}
        </p>

        <h2 className="font-display text-2xl text-star mt-10 mb-3">What it means for your Moon sign</h2>
        <p className="mb-4">{PLANET_NOTE[planet]}</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 pr-3">Your Moon sign</th>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 px-3">House</th>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 pl-3">That house covers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.moon}>
                  <td className="border-b border-horizon/20 py-2 pr-3 align-top">
                    {cap(r.moon)} <span className="text-dust/70">({SIGN_SANSKRIT[r.moon]})</span>
                  </td>
                  <td className="border-b border-horizon/20 py-2 px-3 align-top">{r.house}</td>
                  <td className="border-b border-horizon/20 py-2 pl-3 align-top">
                    {HOUSE_TOPICS[r.house]}
                    {r.tag ? <span className="block text-amber text-mono-sm">{r.tag}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nodeCompanion ? (
          <p className="mb-6">
            {planet === 'rahu' ? `While Rahu is in ${S}, Ketu is in ${cap(opposite)}.` : `While Ketu is in ${S}, Rahu is in ${cap(opposite)}.`}{' '}
            <Link href={`/transit/${planet === 'rahu' ? 'ketu' : 'rahu'}/${opposite}`} className="text-amber underline">
              See the {planet === 'rahu' ? 'Ketu' : 'Rahu'} in {cap(opposite)} page
            </Link>
            .
          </p>
        ) : null}

        <p className="mb-8">
          Counting from your Moon sign is the traditional way to read a transit (gochara). It is one layer. Your running
          dasha and your Lagna change how any transit lands, and none of this is a guarantee. Use it to plan with a little
          more awareness, not to expect a particular result.
        </p>

        <div className="card bg-cosmos/80 border-horizon p-6 mb-4">
          <p className="text-star mb-3">Check your own Moon sign first, then read the row that matches it.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
            <Link href="/moon-sign-calculator" className="text-amber underline">Moon sign calculator</Link>
            {planet === 'saturn' ? <Link href="/sade-sati-calculator" className="text-amber underline">Sade Sati calculator</Link> : null}
            <Link href="/vimshottari-dasha-calculator" className="text-amber underline">Dasha calculator</Link>
            <Link href="/free-kundli" className="text-amber underline">Free Kundli</Link>
            <Link href="/transit" className="text-amber underline">All current transits</Link>
          </div>
        </div>
        <p className="text-body-sm mb-2">
          Want this read against your own chart and dasha, hour by hour?{' '}
          <Link href="/start" className="text-amber underline">Start with the 2-minute quiz</Link>.
        </p>

        <FaqSection faqs={faqs} />
      </div>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description: `Transit dates and house-from-Moon table for ${P} in ${S} in the Vedic zodiac.`,
            dateModified: TRANSIT_DATA_DATE,
            author: { '@type': 'Organization', name: 'VedicHour', url: absUrl('/') },
            publisher: { '@type': 'Organization', name: 'VedicHour', url: absUrl('/') },
            mainEntityOfPage: absUrl(`/transit/${planet}/${sign}`),
            inLanguage: 'en',
          },
          faqPageLd(faqs),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Planet transits', path: '/transit' },
            { name: `${P} in ${S}`, path: `/transit/${planet}/${sign}` },
          ]),
        ]}
      />
    </div>
  );
}
