import Link from 'next/link';

/**
 * TimingBridge — the calculator → product bridge.
 *
 * Free-tool visitors are the site's largest entry cohort but historically
 * dead-ended on the result card: the old CTA sold a feature ("see your full
 * chart") rather than the thing people actually came to decide. This block
 * converts a static chart fact into the timing question the product answers,
 * using concrete decision moments instead of abstractions.
 *
 * Brand rules hold: windows and tendencies, never guaranteed outcomes, never
 * a deterministic "best hour" stated as fact.
 */

const MOMENTS = [
  'The pitch at 11am — or is 4pm the clearer window?',
  'When to raise the promotion conversation with your manager',
  'Which evening to introduce your partner to your parents',
  'The stretch of the day your focus actually holds for deep study',
];

export function TimingBridge({
  anchorLabel = 'Your chart',
  href = '/onboard?plan=7day',
}: {
  /** What the visitor just calculated, e.g. "Your Lagna" — keeps the copy specific. */
  anchorLabel?: string;
  href?: string;
}) {
  return (
    <section
      aria-labelledby="timing-bridge-heading"
      className="mt-8 rounded-card border border-amber/30 bg-nebula/40 p-6 sm:p-8 text-left"
    >
      <p className="font-mono text-mono-sm text-amber/80 uppercase tracking-[0.14em]">
        The part that changes your week
      </p>
      <h2
        id="timing-bridge-heading"
        className="font-display text-headline-lg text-star mt-2"
      >
        {anchorLabel} says <em className="not-italic text-amber">where</em>. Your hours say{' '}
        <em className="not-italic text-amber">when</em>.
      </h2>
      <p className="font-body text-body-md text-dust mt-3">
        A chart is a map. It doesn&rsquo;t tell you which hour of Thursday to actually make the
        call. VedicHour reads your chart against each of the day&rsquo;s 18 planetary hours
        (horas) and tells you, in plain English, which windows run clearer for what &mdash; and
        which ones to leave alone.
      </p>

      <ul className="mt-5 space-y-2.5">
        {MOMENTS.map((m) => (
          <li key={m} className="flex gap-3 font-body text-body-md text-star/90">
            <span aria-hidden="true" className="text-amber shrink-0">
              &#9670;
            </span>
            <span>{m}</span>
          </li>
        ))}
      </ul>

      <p className="font-body text-body-sm text-dust mt-5">
        Traditionally this is a paid sitting with an astrologer, and the calculation takes days.
        The engine works out all 18 windows from your birth details using real astronomical data
        &mdash; the same math a careful astrologer uses.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={href}
          data-track="timing-bridge-cta"
          className="btn-primary inline-block px-7 py-3"
        >
          Unlock my hour-by-hour forecast &rarr;
        </Link>
        <span className="font-mono text-mono-sm text-dust">
          Free Kundli first &middot; 24h money-back on paid
        </span>
      </div>
    </section>
  );
}
