'use client';

import Link from 'next/link';
import type { RevealData } from '@/lib/funnel/reveal/compute';
import type { Lang } from '@/lib/funnel/screens';
import { crossCheck } from '@/lib/funnel/crossCheck';
import { factHolds } from '@/lib/funnel/productFacts';

/**
 * Trust devices that can be checked, not claimed:
 *  - the 24-hour refund (a policy page anyone can read),
 *  - the published list of what we never say,
 *  - calculate first, write second,
 *  - a card of the numbers in this chart to compare with any free kundli.
 * No counts, ratings, testimonials or "accuracy" figures appear here, and none will.
 */

type Tone = 'night' | 'paper';

export function TrustRow({ lang, tone }: { lang: Lang; tone: Tone }) {
  const hi = lang === 'hi';
  const night = tone === 'night';
  const text = night ? 'text-dust-light' : 'text-ink-muted';
  const link = night ? 'text-star' : 'text-ink';
  const items: { key: string; text: string; href?: string; cta?: string }[] = [];
  if (factHolds('refund_24h')) {
    items.push({
      key: 'refund',
      text: hi ? 'Kaam ka na lage toh 24 ghante mein poora refund, koi sawal nahi.' : 'Full refund within 24 hours, no questions asked.',
      href: '/refund',
      cta: hi ? 'Refund policy' : 'Refund policy',
    });
  }
  if (factHolds('no_fear_predictions')) {
    items.push({
      key: 'never',
      text: hi
        ? 'Hum samay padhte hain, kismat ki guarantee nahi dete. Maut, bimari, shraap, talaak ya bachche ke ling ki bhavishyavani nahi karte.'
        : 'We read timing, not fate. We never predict death, illness, curses, divorce or a child’s sex.',
      href: '/what-we-never-say',
      cta: hi ? 'Hum kya kabhi nahi kehte' : 'What we never say',
    });
  }
  items.push({
    key: 'compute',
    text: hi
      ? 'Pehle aapka chart nikalta hai, phir likhaai hoti hai. Likhaai sirf wahi batati hai jo nikla hai.'
      : 'Your chart is calculated first. The writing only describes what was calculated.',
  });
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key} className={`flex gap-2 font-body text-body-md leading-[1.6] ${text}`}>
          <span aria-hidden className={night ? 'text-amber-light' : 'text-[#226B48]'}>
            ✓
          </span>
          <span>
            {i.text}
            {i.href && (
              <>
                {' '}
                <Link href={i.href} className={`underline underline-offset-4 ${link}`}>
                  {i.cta}
                </Link>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The numbers in this chart, to compare with any free kundli (paper canvas, on the reveal). */
export function CrossCheckCard({ reveal, lang }: { reveal: RevealData; lang: Lang }) {
  const c = crossCheck(reveal, lang);
  return (
    <article className="rounded-card bg-white border border-paper-line px-5 py-5">
      <h2 className="font-display font-semibold text-ink text-[1.375rem] leading-tight mb-2">{c.title}</h2>
      <p className="font-body text-body-md leading-[1.65] text-ink-muted mb-4">{c.intro}</p>
      <dl className="divide-y divide-paper-line border-y border-paper-line">
        {c.rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
            <dt className="font-body text-body-md text-ink-soft">{r.label}</dt>
            <dd className="font-body text-[1.0625rem] font-semibold text-ink tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-body text-body-sm leading-[1.6] text-ink-soft">{c.method}</p>
      <p className="mt-2 font-body text-body-sm leading-[1.6] text-ink-soft">{c.caution}</p>
    </article>
  );
}
