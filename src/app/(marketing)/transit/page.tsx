import Link from 'next/link';
import type { Metadata } from 'next';
import { StarField } from '@/components/ui/StarField';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection } from '@/components/seo/SeoSection';
import { absUrl, breadcrumbLd, faqPageLd, type Faq } from '@/lib/seo/jsonLd';
import { TRANSIT_DATA_DATE } from '@/content/transits';
import {
  PLANET_SANSKRIT,
  SIGN_ORDER,
  SIGN_SANSKRIT,
  SLOW_PLANETS,
  cap,
  currentSign,
  fmtDate,
  saturnPressure,
  todayIST,
  type SlowPlanet,
} from '@/lib/seo/transits';

// The table is computed from the date, so refresh it daily.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: 'Current Planet Transits (Gochar) | VedicHour' },
  description:
    'Where Saturn, Jupiter, Rahu and Ketu are today in the Vedic zodiac, when each changes sign next, and which Moon signs have Sade Sati.',
  alternates: { canonical: '/transit' },
};

const ORDER: SlowPlanet[] = ['saturn', 'jupiter', 'rahu', 'ketu'];

export default function TransitHubPage() {
  const today = todayIST();
  const rows = ORDER.map((planet) => ({ planet, now: currentSign(planet, today) }));
  const saturn = rows.find((r) => r.planet === 'saturn')?.now ?? null;
  const pressure = saturn ? saturnPressure(saturn.sign) : null;

  const line = (r: (typeof rows)[number]) =>
    r.now
      ? `${cap(r.planet)} is in ${cap(r.now.sign)} (${SIGN_SANSKRIT[r.now.sign]}), since ${fmtDate(r.now.since)}, until ${fmtDate(r.now.until)}`
      : `${cap(r.planet)}: outside the dates covered here`;
  const answer = rows.map(line).join('. ') + '.';

  const faqs: Faq[] = [
    {
      q: 'What is gochar?',
      a: 'Gochar, or gochara, means transit: where the planets are in the sky today, read against your birth chart. The traditional method counts the house each slow planet occupies from your natal Moon sign.',
    },
    {
      q: 'Where is Saturn right now in Vedic astrology?',
      a: saturn
        ? `${cap('saturn')} is in ${cap(saturn.sign)} (${SIGN_SANSKRIT[saturn.sign]}) in the sidereal zodiac, from ${fmtDate(saturn.since)} to ${fmtDate(saturn.until)}.`
        : 'See the table above for the current position.',
    },
    {
      q: 'Why is a planet in a different sign here than in my Western horoscope?',
      a: 'Vedic astrology uses the sidereal zodiac, which is about 24 degrees behind the tropical zodiac used in Western astrology. A planet near the start of a Western sign is usually still in the previous sign here.',
    },
    {
      q: 'Why do other sites show slightly different dates?',
      a: 'Three things move a date: the ayanamsa (Lahiri here), whether Rahu and Ketu use the mean or true node (mean here), and the time zone. Dates on this site are Indian time.',
    },
  ];

  return (
    <div className="min-h-[100svh] bg-space py-20 px-5 sm:px-8 relative overflow-hidden">
      <StarField />
      <div className="max-w-3xl mx-auto relative z-10 font-body text-body-md text-dust leading-relaxed">
        <p className="section-eyebrow mb-3">Gochar · Sidereal zodiac, Lahiri ayanamsa · Indian time</p>
        <h1 className="text-display-md font-display text-star mb-6">Where Saturn, Jupiter, Rahu and Ketu are now</h1>

        <p className="text-body-lg text-star mb-3">
          <strong>As of {fmtDate(today)}: {answer}</strong>
        </p>
        <p className="mb-8">
          These four move slowly, so they set the background for months or years. The fast planets (Sun, Moon, Mars,
          Mercury, Venus) change sign too quickly for a sign page to say much. Dates were computed with the Swiss
          Ephemeris and checked on {fmtDate(TRANSIT_DATA_DATE)}.
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 pr-3">Planet</th>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 px-3">Sign now</th>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 px-3">Entered</th>
                <th className="text-left text-star font-display border-b border-horizon/50 py-2 pl-3">Leaves</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.planet}>
                  <td className="border-b border-horizon/20 py-2 pr-3 align-top">
                    {cap(r.planet)} <span className="text-dust/70">({PLANET_SANSKRIT[r.planet]})</span>
                  </td>
                  <td className="border-b border-horizon/20 py-2 px-3 align-top">
                    {r.now ? (
                      <Link href={`/transit/${r.planet}/${r.now.sign}`} className="text-amber underline">
                        {cap(r.now.sign)} ({SIGN_SANSKRIT[r.now.sign]})
                      </Link>
                    ) : (
                      'n/a'
                    )}
                  </td>
                  <td className="border-b border-horizon/20 py-2 px-3 align-top">{r.now ? fmtDate(r.now.since) : ''}</td>
                  <td className="border-b border-horizon/20 py-2 pl-3 align-top">{r.now ? fmtDate(r.now.until) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pressure && saturn ? (
          <>
            <h2 className="font-display text-2xl text-star mt-10 mb-3">Who has Sade Sati and Dhaiya now</h2>
            <p className="mb-3">
              With Saturn in {cap(saturn.sign)}, <strong>Sade Sati is running for {pressure.sadeSati.map((x) => cap(x.sign)).join(', ')}</strong>{' '}
              Moon signs (Saturn 12th, 1st and 2nd from the Moon), and <strong>Dhaiya for {pressure.dhaiya.map((x) => cap(x.sign)).join(' and ')}</strong>{' '}
              (Saturn 4th and 8th). It is your Moon sign that counts, not your Sun sign.{' '}
              <Link href="/moon-sign-calculator" className="text-amber underline">Find your Moon sign</Link> or{' '}
              <Link href="/sade-sati-calculator" className="text-amber underline">check Sade Sati directly</Link>.
            </p>
          </>
        ) : null}

        <h2 className="font-display text-2xl text-star mt-10 mb-3">Every sign for each slow planet</h2>
        <p className="mb-4">Each page lists every stay in that sign, with dates, and the house it is from each Moon sign.</p>
        <div className="space-y-5 mb-10">
          {SLOW_PLANETS.map((planet) => (
            <div key={planet}>
              <h3 className="font-display text-lg text-amber mb-2">{cap(planet)}</h3>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
                {SIGN_ORDER.map((sign) => (
                  <li key={sign}>
                    <Link href={`/transit/${planet}/${sign}`} className="text-star underline hover:text-amber">
                      {cap(planet)} in {cap(sign)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mb-8">
          Reading a transit from your Moon sign is one layer. Your running dasha and your Lagna change how it lands.
          Try the free{' '}
          <Link href="/vimshottari-dasha-calculator" className="text-amber underline">dasha calculator</Link>, or{' '}
          <Link href="/start" className="text-amber underline">start the 2-minute quiz</Link> for an hour-by-hour read.
        </p>

        <FaqSection faqs={faqs} />
      </div>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': `${absUrl('/transit')}#webpage`,
            url: absUrl('/transit'),
            name: 'Current planet transits (gochar)',
            dateModified: TRANSIT_DATA_DATE,
            inLanguage: 'en',
          },
          faqPageLd(faqs),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Planet transits', path: '/transit' },
          ]),
        ]}
      />
    </div>
  );
}
