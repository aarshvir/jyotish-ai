'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/funnel/screens';
import { consentText } from '@/lib/leads/consentText';

/**
 * The email field and the two separate, unticked boxes — shared by "Save your chart" (night
 * canvas) and the one-tap re-ask on the result (paper canvas). The words come from
 * lib/leads/consentText.ts, the same strings the consent ledger records.
 *
 *   box 1  the chart link itself ("service"): shown unless the flag turns it off; when shown
 *          it must be ticked to save;
 *   box 2  optional emails about the chart and new tools ("marketing"): never required, never pre-ticked.
 */

const DOMAIN_SLIPS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com',
};

/** A suggestion for an obvious domain slip, or null. Never blocks; the person decides. */
export function suggestEmail(email: string): string | null {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!local || !domain) return null;
  const fix = DOMAIN_SLIPS[domain];
  return fix ? `${local}@${fix}` : null;
}

export const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export interface ConsentValue {
  email: string;
  marketing: boolean;
}

export function ConsentFields({
  tone,
  lang,
  serviceBox,
  showName,
  initial,
  error,
  onErrorClear,
  onChange,
}: {
  tone: 'night' | 'paper';
  lang: Lang;
  serviceBox: boolean;
  showName: boolean;
  initial?: { email?: string; name?: string; marketing?: boolean };
  error: string | null;
  onErrorClear: () => void;
  onChange: (v: { email: string; name: string; marketing: boolean; service: boolean }) => void;
}) {
  const hi = lang === 'hi';
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [marketing, setMarketing] = useState(initial?.marketing ?? false);
  const [service, setService] = useState(false);
  const night = tone === 'night';

  const push = (next: Partial<{ email: string; name: string; marketing: boolean; service: boolean }>) =>
    onChange({ email, name, marketing, service, ...next });

  const input = night
    ? 'w-full px-4 min-h-[56px] bg-white/[0.05] border border-horizon rounded-card font-body text-[1.0625rem] text-star placeholder:text-dust focus:outline-none focus:border-amber/60'
    : 'w-full px-4 min-h-[52px] bg-white border border-paper-line rounded-card font-body text-[1.0625rem] text-ink placeholder:text-ink-soft focus:outline-none focus:border-[#B5862F]';
  const label = night ? 'text-dust-light' : 'text-ink-muted';
  const small = night ? 'text-dust' : 'text-ink-soft';
  const accent = night ? 'accent-[#D4A853]' : 'accent-[#B5862F] [color-scheme:light]';
  const tick = night ? 'text-dust-light' : 'text-ink-muted';
  const hint = suggestEmail(email);

  return (
    <div>
      <label className="block">
        <span className={`block font-body text-body-md ${label} mb-2`}>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          placeholder="you@example.com"
          onChange={(e) => {
            setEmail(e.target.value);
            onErrorClear();
            push({ email: e.target.value });
          }}
          className={input}
        />
      </label>
      {hint && (
        <button
          type="button"
          onClick={() => {
            setEmail(hint);
            push({ email: hint });
          }}
          className={`mt-2 min-h-[44px] text-left font-body text-body-md underline underline-offset-4 ${night ? 'text-indigo' : 'text-indigo-deep'}`}
        >
          {hi ? `Kya aapka matlab ${hint} tha?` : `Did you mean ${hint}?`}
        </button>
      )}
      <p className={`mt-2 font-body text-body-sm leading-[1.55] ${small}`}>{consentText('notice', lang)}</p>

      {showName && (
        <label className="block mt-4">
          <span className={`block font-body text-body-md ${label} mb-2`}>{hi ? 'Pehla naam (zaroori nahi)' : 'First name (optional)'}</span>
          <input
            type="text"
            autoComplete="given-name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              push({ name: e.target.value });
            }}
            className={input}
          />
        </label>
      )}

      <div className="mt-5 space-y-1">
        {serviceBox && (
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px] py-1.5">
            <input
              type="checkbox"
              checked={service}
              onChange={(e) => {
                setService(e.target.checked);
                onErrorClear();
                push({ service: e.target.checked });
              }}
              className={`mt-0.5 w-5 h-5 shrink-0 ${accent}`}
            />
            <span className={`font-body text-body-md leading-[1.55] ${tick}`}>{consentText('service', lang)}</span>
          </label>
        )}
        <label className="flex items-start gap-3 cursor-pointer min-h-[44px] py-1.5">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => {
              setMarketing(e.target.checked);
              push({ marketing: e.target.checked });
            }}
            className={`mt-0.5 w-5 h-5 shrink-0 ${accent}`}
          />
          <span className={`font-body text-body-md leading-[1.55] ${tick}`}>{consentText('marketing', lang)}</span>
        </label>
      </div>

      {error && (
        <p role="alert" className={`mt-3 font-body text-body-md ${night ? 'text-caution-light' : 'text-[#8E3418]'}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function validateConsent(v: { email: string; service: boolean }, serviceBox: boolean, lang: Lang): string | null {
  const hi = lang === 'hi';
  if (!EMAIL_OK.test(v.email.trim())) return hi ? 'Kripya apni email check karein.' : 'Please check your email address.';
  if (serviceBox && !v.service) return hi ? 'Link bhejne ke liye pehla box tick karein, ya skip karein.' : 'Please tick the first box so we know to email you the link, or skip.';
  return null;
}
