'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RevealData, Sourced } from '@/lib/funnel/reveal/compute';
import { NodeChart } from './NodeChart';

/**
 * S16 — the free reveal. Night frame (header + chart) opening onto paper reading cards
 * (DESIGN_SYSTEM: ritual frames on night, reading on paper). Every sentence carries its
 * source chart keys in a data attribute for QA (spec §6); nothing here is invented.
 */

function Para({ p, className }: { p: Sourced; className?: string }) {
  return (
    <span data-source-keys={p.source_keys.join(' ')} className={className}>
      {p.text}{' '}
    </span>
  );
}

const BADGE: Record<string, string> = {
  Strong: 'text-[#226B48] bg-[rgba(34,107,72,.10)]',
  Moderate: 'text-[#8A6318] bg-[rgba(138,99,24,.09)]',
  Developing: 'text-[#4A4FA8] bg-[rgba(74,79,168,.09)]',
};

export function RevealScreen({
  reveal,
  name,
  ctaLabel,
  onCta,
}: {
  reveal: RevealData;
  name?: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  const reduce = useReducedMotion();
  const [k, r, m] = reveal.cards;
  return (
    <div className="pb-28">
      <section className="pt-2">
        <p className="font-body text-label-md text-amber-light mb-3">Your Karmic Blueprint · the free part</p>
        <h1 className="font-display font-semibold text-star text-[1.875rem] leading-[1.1] tracking-[-0.015em] mb-4">
          {name ? `${name}, here is your Rahu–Ketu axis.` : 'Here is your Rahu–Ketu axis.'}
        </h1>
        <p
          data-source-keys={`ketu.sign=${reveal.ketu.sign} ketu.house=${reveal.ketu.house} rahu.sign=${reveal.rahu.sign} rahu.house=${reveal.rahu.house}`}
          className="inline-block px-3 py-2 rounded-[10px] bg-bg-3 font-body text-[0.9375rem] text-star tabular-nums"
        >
          {reveal.header.split(' | ').map((part) => (
            <span key={part} className="block">
              {part}
            </span>
          ))}
        </p>
        <div className="mt-6 mx-auto max-w-[280px]">
          <NodeChart
            referenceSign={reveal.referenceSign}
            reference={reveal.reference}
            rahuHouse={reveal.rahu.house}
            ketuHouse={reveal.ketu.house}
          />
        </div>
        {reveal.reference === 'moon' && (
          <p className="mt-4 font-body text-body-md text-dust-light">
            You did not give a birth time, so every house here is counted from your Moon sign, {reveal.moonSign}. With a
            time, houses are counted from your rising sign and may differ.
          </p>
        )}
      </section>

      <div className="mt-8 -mx-4 px-4 pt-6 pb-8 bg-parchment rounded-t-[20px] space-y-4">
        {[k, r].map((card) => (
          <article key={card.key} className="rounded-card bg-white border border-paper-line px-5 py-5">
            <h2 className="font-display font-semibold text-ink text-[1.375rem] leading-tight mb-3">{card.title}</h2>
            <p className="font-body text-[1.0625rem] leading-[1.75] text-ink-muted">
              {card.paragraphs.map((p, i) => (
                <Para key={i} p={p} />
              ))}
            </p>
          </article>
        ))}

        {reveal.match && (
          <article className="rounded-card bg-parchment-2 border border-paper-line px-5 py-5">
            <p className="font-body text-label-md text-indigo-deep mb-2">Your pick vs your chart</p>
            <p data-source-keys={reveal.match.source_keys.join(' ')} className="font-display font-semibold text-ink text-[1.3125rem] leading-snug">
              {reveal.match.text}
            </p>
          </article>
        )}

        <article className="rounded-card bg-white border border-paper-line px-5 py-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-semibold text-ink text-[1.375rem] leading-tight">{m.title}</h2>
            {m.badge && (
              <span className={`shrink-0 px-3 py-1 rounded-full font-body text-label-md font-semibold ${BADGE[m.badge] ?? ''}`}>{m.badge}</span>
            )}
          </div>
          <p className="font-body text-[1.0625rem] leading-[1.75] text-ink-muted">
            {m.paragraphs.map((p, i) => (
              <Para key={i} p={p} />
            ))}
          </p>
        </article>

        <section className="pt-4">
          <h2 className="font-display font-semibold text-ink text-[1.375rem] leading-tight mb-1">In your full blueprint</h2>
          <p className="font-body text-body-md text-ink-soft mb-4">Worked out from the same chart.</p>
          <ul className="space-y-3">
            {reveal.locked.map((title) => (
              <li key={title} className="rounded-card bg-white border border-paper-line px-5 py-4">
                <div className="flex items-start gap-3">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 mt-1 shrink-0 text-ink-soft" aria-hidden>
                    <path d="M4 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-body font-semibold text-[1rem] text-ink">{title}</p>
                    <div aria-hidden className="mt-2 space-y-1.5 blur-[3px] select-none">
                      <div className="h-2.5 rounded bg-parchment-3 w-full" />
                      <div className="h-2.5 rounded bg-parchment-3 w-4/5" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-horizon bg-[rgba(18,12,30,.92)] backdrop-blur-md px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="max-w-md mx-auto">
          <motion.button
            type="button"
            onClick={onCta}
            initial={false}
            animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
            transition={{ duration: 0.9, delay: 0.6, ease: 'easeInOut' }}
            className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold"
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
