'use client';

import { useEffect, useRef } from 'react';
import type { RevealData } from '@/lib/funnel/reveal/compute';
import type { Lang } from '@/lib/funnel/screens';
import { firstLook } from '@/lib/funnel/firstLook';
import { PrimaryButton, Title } from './QuestionScreens';
import { TrustRow } from './TrustBits';

/**
 * The first look: three or four values from the person's own chart, before we ask for
 * anything. Each is computed (see lib/funnel/firstLook.ts) and says when the birth time
 * limits it. No score, no meter, no percentage.
 */
export function FirstLookScreen({ reveal, lang, onView, onContinue }: { reveal: RevealData; lang: Lang; onView?: () => void; onContinue: () => void }) {
  const hi = lang === 'hi';
  const look = firstLook(reveal, lang);
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    onView?.();
  }, [onView]);

  return (
    <section>
      <p className="font-body text-label-md text-amber-light mb-3">{hi ? 'Aapke chart se' : 'From your chart'}</p>
      <Title>{hi ? 'Aapki pehli jhalak' : 'Your first look'}</Title>
      <dl className="mt-5 rounded-card border border-horizon bg-nebula divide-y divide-horizon">
        {look.rows.map((r) => (
          <div key={r.key} className="px-4 py-3.5">
            <dt className="font-body text-body-sm text-dust">{r.label}</dt>
            <dd className="mt-1 font-body text-[1.0625rem] leading-[1.55] text-star">{r.value}</dd>
          </div>
        ))}
        <div className="px-4 py-3.5">
          <dt className="font-body text-body-sm text-dust">{hi ? 'Kitna pakka' : 'How exact'}</dt>
          <dd className="mt-1 font-body text-[1.0625rem] text-star">{look.precision}</dd>
        </div>
      </dl>
      {look.notes.map((n, i) => (
        <p key={i} className="mt-3 font-body text-body-md leading-[1.6] text-dust-light">
          {n}
        </p>
      ))}
      <p className="mt-4 font-body text-body-sm leading-[1.6] text-dust">{look.footer}</p>
      <div className="mt-5">
        <TrustRow lang={lang} tone="night" />
      </div>
      <PrimaryButton onClick={onContinue}>{hi ? 'Aage badhein' : 'Continue'}</PrimaryButton>
    </section>
  );
}
