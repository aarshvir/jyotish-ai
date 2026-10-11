'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/funnel/screens';
import type { LeadStatus } from '@/lib/funnel/state';
import { leadStatusLine } from '@/lib/funnel/leadClient';
import { ConsentFields, validateConsent } from './ConsentFields';

/**
 * One-tap re-ask on the result, for people who skipped "Save your chart". Same email field,
 * same unticked boxes, same ledger. After a send it turns into one honest line.
 */
export function ReaskBar({
  lang,
  serviceBox,
  status,
  busy,
  onView,
  onSubmit,
}: {
  lang: Lang;
  serviceBox: boolean;
  status: LeadStatus | null;
  busy: boolean;
  onView?: () => void;
  onSubmit: (v: { email: string; marketing: boolean }) => void;
}) {
  const hi = lang === 'hi';
  const value = useRef({ email: '', name: '', marketing: false, service: false });
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    onView?.();
  }, [onView]);

  const line = leadStatusLine(status, lang);
  if (line && status?.saved) {
    return (
      <p role="status" className="rounded-card bg-white border border-paper-line px-5 py-4 font-body text-body-md leading-[1.6] text-ink-muted">
        {line}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="rounded-card bg-white border border-paper-line px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.current;
        const problem = validateConsent(v, serviceBox, lang);
        if (problem) return setError(problem);
        onSubmit({ email: v.email.trim().toLowerCase(), marketing: v.marketing });
      }}
    >
      <h2 className="font-display font-semibold text-ink text-[1.25rem] leading-tight">{hi ? 'Chart save karna hai?' : 'Want this saved?'}</h2>
      <p className="mt-1 mb-4 font-body text-body-md text-ink-muted">{hi ? 'Link email par bhej dete hain.' : 'We will email you the link.'}</p>
      <ConsentFields
        tone="paper"
        lang={lang}
        serviceBox={serviceBox}
        showName={false}
        error={error ?? (line && status && !status.saved ? line : null)}
        onErrorClear={() => setError(null)}
        onChange={(v) => {
          value.current = v;
        }}
      />
      <button type="submit" disabled={busy} className="btn-primary w-full min-h-[52px] mt-4 font-body text-[1.0625rem] font-semibold disabled:opacity-60">
        {busy ? (hi ? 'Bhej rahe hain…' : 'Sending…') : hi ? 'Mujhe link email karein' : 'Email me the link'}
      </button>
    </form>
  );
}
