import Link from 'next/link';
import { UNLOCK_FREE_HREF } from '@/lib/pricing';

/**
 * FreeKundli — the free-start section. One product promise, not a keyword cluster.
 */

const KUNDLI_FEATURES = [
  {
    title: 'Birth chart',
    desc: 'Rising sign, Moon sign, and all nine planets across twelve houses — the chart a careful astrologer would start from.',
  },
  {
    title: 'Rising sign & Moon sign',
    desc: 'The two placements that shape how the rest of the chart is read. Named in English, with the Sanskrit next to them.',
  },
  {
    title: 'Current life period',
    desc: 'Which planetary chapter you are in right now — the backdrop the hourly windows sit on.',
  },
  {
    title: 'Hourly windows (sample)',
    desc: 'A slice of today scored hour by hour. Upgrade for the full 7- or 30-day forecast plus a 12-month outlook.',
  },
];

export default function FreeKundli() {
  return (
    <section
      id="free-kundli"
      aria-labelledby="free-kundli-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <div>
            <p className="section-eyebrow mb-3">Free · No Card Required</p>
            <h2
              id="free-kundli-heading"
              className="font-body font-semibold text-star text-display-sm leading-tight mb-4"
            >
              Your chart, free.{' '}
              <span className="text-amber">The hours come next.</span>
            </h2>
            <p className="font-body text-body-lg text-dust leading-relaxed mb-6">
              Enter birth date, time, and city. In about a minute you get your Vedic birth chart
              in plain English — then a sample of today&apos;s hourly windows so you can see how
              the product actually reads.
            </p>
            <p className="font-body text-body-md text-dust/80 leading-relaxed mb-8">
              No astrologer on a call. No card. The paid report is the same chart, stretched across
              every hour of the days you buy.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={UNLOCK_FREE_HREF}
                rel="nofollow"
                className="btn-primary text-base px-8 py-3.5"
              >
                Get the free chart →
              </Link>
              <Link
                href="/pricing"
                className="btn-secondary text-base px-8 py-3.5"
              >
                Compare plans
              </Link>
            </div>

            <p className="mt-4 font-mono text-mono-sm text-dust">
              Full birth chart · current life period · 100% free
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {KUNDLI_FEATURES.map((f) => (
              <div
                key={f.title}
                className="card p-5"
              >
                <div className="text-amber text-lg mb-2">✦</div>
                <h3 className="font-body font-semibold text-star text-title-md mb-1.5">
                  {f.title}
                </h3>
                <p className="font-body text-body-sm text-dust leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

        </div>

        <div className="mt-14 max-w-4xl mx-auto">
          <div className="card p-7 md:p-9">
            <h3 className="font-body text-headline-md text-star mb-4">
              What you are actually getting
            </h3>
            <div className="space-y-3 font-body text-body-md text-dust leading-relaxed">
              <p>
                A <strong className="text-star">Kundli</strong> is a Vedic birth chart: the nine
                planets mapped at your exact birth moment. VedicHour computes that chart from
                real astronomical data — the same math a careful astrologer uses — then writes
                the reading in English you can act on.
              </p>
              <p>
                The paid forecast is not a new chart. It is your chart scored into{' '}
                <strong className="text-star">eighteen hourly windows a day</strong>: clearer
                hours to take the meeting, heavier hours to leave it. Reflection and planning,
                not a promise about what will happen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
