'use client';

import { useState } from 'react';
import type { Lang, T } from '@/lib/funnel/screens';
import { PrimaryButton, Sub, Title, t } from './QuestionScreens';

/**
 * Optional free-text screen ("In your own words…"). Typed words are kept exactly as
 * written. The one thing refused is contact details (an email or a phone number): this
 * box is for what is on someone's mind, and a stray number would travel into the brief
 * and into any email quoting it.
 */

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const DIGIT_RUN = /\+?\d[\d\s-]{7,}\d/g;

/** An email, or a run of ten or more digits (a mobile number). A date like 12-04-1990 is eight digits and is fine. */
export function containsContactDetails(text: string): boolean {
  if (EMAIL.test(text)) return true;
  return (text.match(DIGIT_RUN) ?? []).some((run) => run.replace(/\D/g, '').length >= 10);
}

export function TextScreen({
  title,
  subtitle,
  placeholder,
  maxLength,
  initial,
  cta,
  skip,
  lang,
  onSubmit,
  onSkip,
}: {
  title: T;
  subtitle?: T;
  placeholder: T;
  maxLength: number;
  initial: string;
  cta: T;
  skip: T;
  lang: Lang;
  onSubmit: (text: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const text = value.replace(/\s+/g, ' ').trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text) return onSkip();
    if (containsContactDetails(text)) {
      setError(
        lang === 'hi'
          ? 'Yahan phone number ya email na likhein. Unke liye aage alag jagah hai.'
          : 'Please leave phone numbers and email addresses out of this box. There is a separate place for those later.',
      );
      return;
    }
    onSubmit(text);
  }

  return (
    <section>
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <form onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="mind-words">
          {t(title, lang)}
        </label>
        <textarea
          id="mind-words"
          value={value}
          rows={5}
          maxLength={maxLength}
          placeholder={t(placeholder, lang)}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          className="w-full px-4 py-3 bg-white/[0.05] border border-horizon rounded-card font-body text-[1.0625rem] leading-[1.6] text-star placeholder:text-dust focus:outline-none focus:border-amber/60 resize-none"
        />
        <div className="mt-1 text-right font-body text-body-sm text-dust tabular-nums" aria-hidden>
          {value.length}/{maxLength}
        </div>
        {error && (
          <p role="alert" className="mt-2 font-body text-body-md text-caution-light">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" disabled={!text}>
          {t(cta, lang)}
        </PrimaryButton>
      </form>
      <button type="button" onClick={onSkip} className="block w-full text-center mt-3 py-3 min-h-[48px] font-body text-body-md text-dust-light underline underline-offset-4">
        {t(skip, lang)}
      </button>
    </section>
  );
}
