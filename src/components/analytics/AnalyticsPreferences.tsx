'use client';

import { useState } from 'react';
import { Check, ShieldOff, Save } from 'lucide-react';
import { setAnalyticsConsent } from '@/lib/analytics/consent';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

export function AnalyticsPreferences() {
  const consent = useAnalyticsConsent();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const blocked = consent.blocked;

  function save(enabled: boolean) {
    const result = setAnalyticsConsent(enabled);
    setChoice(null);
    setMessage(result.persistent
      ? (result.enabled ? 'Optional usage analytics enabled on this browser.' : 'Optional tracking off. Known identifiers are removed where the browser permits.')
      : 'Choice applied in this tab only. Browser storage is unavailable.');
  }

  return (
    <section id="analytics-preferences" aria-labelledby="analytics-preferences-heading" className="border-y border-[var(--public-line)] py-6 my-8 scroll-mt-32">
      <h2 id="analytics-preferences-heading" className="!text-xl">Your optional analytics choice</h2>
      <p className="public-body mt-3">Off unless you choose to enable it. Your chart, account and reports work without it. This choice applies to this browser and is separate from email preferences.</p>
      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input type="checkbox" checked={choice ?? consent.allowed} disabled={blocked}
          onChange={event => { setChoice(event.target.checked); setMessage(''); }}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--public-action)]" />
        <span><span className="font-medium">Usage analytics and source/referral attribution</span><span className="public-body block mt-1">Allow limited page and action events through PostHog and our first-party analytics, plus source and referral cookies. No birth details, free text, query strings, session replay or automatic form capture.</span></span>
      </label>
      <p className="public-body mt-4">Google Analytics and Meta advertising pixels are disabled in this release. This choice does not enable advertising tracking.</p>
      {blocked && <p className="public-body mt-3">Your browser sends a privacy signal. Optional tracking remains off.</p>}
      <div className="public-actions mt-5">
        <button type="button" className="public-button public-button-primary" onClick={() => save(choice ?? consent.allowed)}><Save size={17} aria-hidden="true" />Save choice</button>
        <button type="button" className="public-button public-button-secondary" onClick={() => save(false)}><ShieldOff size={17} aria-hidden="true" />Turn off optional tracking</button>
      </div>
      <p role="status" aria-live="polite" className="public-body mt-4 flex gap-2 items-start min-h-6">
        {message && <Check size={17} aria-hidden="true" className="mt-1 shrink-0" />}{message || (consent.allowed ? 'Current choice: optional usage analytics on.' : 'Current choice: optional usage analytics off.')}
      </p>
      <p className="public-meta mt-3">Turning this off stops new optional capture and attempts to remove known optional identifiers on this site where the browser permits. It does not erase events already sent, clear account data or remove cookies set on another provider&apos;s domain.</p>
    </section>
  );
}
