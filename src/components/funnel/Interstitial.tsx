'use client';

import { useEffect, useRef } from 'react';
import type { BuiltInterstitial } from '@/lib/funnel/interstitials';
import { PrimaryButton, Title } from './QuestionScreens';

/**
 * Renders one built interstitial (lib/funnel/interstitials.ts). The text is already
 * resolved and already true by construction; this component only lays it out.
 * Chips are the person's own answers; the quote is their own words, unchanged.
 */
export function Interstitial({ built, onView, onNext }: { built: BuiltInterstitial; onView?: () => void; onNext: () => void }) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onView?.();
  }, [onView]);

  return (
    <section>
      <p className="font-body text-label-md text-amber-light mb-3">{built.eyebrow}</p>
      <Title>{built.title}</Title>
      <div className="mt-5 space-y-4">
        {built.blocks.map((b, i) => {
          switch (b.kind) {
            case 'chips':
              return (
                <div key={i}>
                  <p className="font-body text-body-sm text-dust mb-2">{b.label}</p>
                  <ul className="flex flex-wrap gap-2">
                    {b.items.map((x) => (
                      <li key={x} className="px-3 py-1.5 rounded-full border border-amber/50 bg-amber/[0.10] font-body text-body-md text-star">
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            case 'pair':
              return (
                <div key={i} className="rounded-card border border-horizon bg-nebula px-4 py-4">
                  <p className="font-body text-body-md font-semibold text-star">{b.head}</p>
                  <p className="mt-1.5 font-body text-body-md leading-[1.65] text-dust-light">{b.text}</p>
                </div>
              );
            case 'heading':
              return (
                <p key={i} className="pt-2 font-body text-label-md text-amber-light">
                  {b.text}
                </p>
              );
            case 'line':
              return (
                <p key={i} className="font-body text-[1.0625rem] leading-[1.7] text-dust-light">
                  {b.text}
                </p>
              );
            case 'quote':
              return (
                <blockquote key={i} className="border-l-2 border-amber/70 pl-4">
                  <p className="font-display text-[1.5rem] leading-snug text-star whitespace-pre-wrap break-words">
                    {'“'}
                    {b.text}
                    {'”'}
                  </p>
                </blockquote>
              );
            case 'link':
              return (
                <a key={i} href={b.href} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center font-body text-body-md text-indigo underline underline-offset-4">
                  {b.text}
                </a>
              );
            case 'note':
              return (
                <p key={i} className="font-body text-body-sm leading-[1.6] text-dust">
                  {b.text}
                </p>
              );
          }
        })}
      </div>
      <PrimaryButton onClick={onNext}>{built.cta}</PrimaryButton>
    </section>
  );
}
