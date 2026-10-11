'use client';

import { useRef, useState } from 'react';
import type { Lang } from '@/lib/funnel/screens';
import { PRIVACY_CONTACT } from '@/lib/leads/consentText';
import { ConsentFields, validateConsent } from './ConsentFields';
import { Title } from './QuestionScreens';

/**
 * "Save your chart" — the email ask, after the first look and before the full free reveal.
 * Email only. Two separate unticked boxes (see ConsentFields), a Skip link that is always
 * visible unless the `contact_required` flag says otherwise, and links to the privacy notice
 * and to deletion. Skipping costs nothing: the result opens either way, and the result has
 * a one-tap way to save it later.
 */
export function SaveChartScreen({
  required,
  serviceBox,
  initialEmail,
  initialName,
  lang,
  busy,
  onSubmit,
  onSkip,
}: {
  required: boolean;
  serviceBox: boolean;
  initialEmail?: string;
  initialName?: string;
  lang: Lang;
  busy: boolean;
  onSubmit: (v: { email: string; name: string; marketing: boolean }) => void;
  onSkip: () => void;
}) {
  const hi = lang === 'hi';
  const value = useRef({ email: initialEmail ?? '', name: initialName ?? '', marketing: false, service: false });
  const [error, setError] = useState<string | null>(null);

  return (
    <section>
      <Title>{hi ? 'Aapka chart taiyaar hai.' : 'Your chart is ready.'}</Title>
      <p className="font-body text-body-lg text-dust-light mb-6">
        {hi ? 'Link kahan bhejein, taaki aap ise baad mein phir khol sakein?' : 'Where should we send the link, so you can open it again later?'}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.current;
          const problem = validateConsent(v, serviceBox, lang);
          if (problem) return setError(problem);
          onSubmit({ email: v.email.trim().toLowerCase(), name: v.name.trim(), marketing: v.marketing });
        }}
      >
        <ConsentFields
          tone="night"
          lang={lang}
          serviceBox={serviceBox}
          showName
          initial={{ email: initialEmail, name: initialName }}
          error={error}
          onErrorClear={() => setError(null)}
          onChange={(v) => {
            value.current = v;
          }}
        />
        <button type="submit" disabled={busy} className="btn-primary w-full min-h-[52px] mt-5 font-body text-[1.0625rem] font-semibold disabled:opacity-60">
          {busy ? (hi ? 'Save ho raha hai…' : 'Saving…') : hi ? 'Save karke chart dikhayein' : 'Save and show my chart'}
        </button>
      </form>
      {!required && (
        <button type="button" onClick={onSkip} disabled={busy} className="block w-full text-center mt-2 min-h-[48px] py-3 font-body text-body-md text-dust-light underline underline-offset-4">
          {hi ? 'Skip karke chart dekhein' : 'Skip, show my chart'}
        </button>
      )}
      <p className="mt-3 flex flex-wrap justify-center gap-x-4 font-body text-body-sm text-dust">
        <a href="/chart-privacy" target="_blank" rel="noopener" className="min-h-[44px] inline-flex items-center underline underline-offset-4">
          {hi ? 'Privacy notice' : 'Privacy notice'}
        </a>
        <a href={`mailto:${PRIVACY_CONTACT}?subject=Delete%20my%20data`} className="min-h-[44px] inline-flex items-center underline underline-offset-4">
          {hi ? 'Mera data delete karein' : 'Delete my data'}
        </a>
      </p>
    </section>
  );
}
