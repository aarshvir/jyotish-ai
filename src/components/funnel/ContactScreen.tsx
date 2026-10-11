'use client';

import { useState } from 'react';
import type { Contact } from '@/lib/funnel/state';
import type { Lang } from '@/lib/funnel/screens';
import { PrimaryButton, Title } from './QuestionScreens';

/**
 * S15 — contact, before the free reveal. Email only (the funnel does not collect phone
 * numbers). Marketing consent is a separate, unticked box (H7, DPDP Act). Arm B of the
 * `contact_required` flag shows a "Skip and view" link.
 *
 * The copy does not promise a sent copy: this interim screen sends nothing yet, so it only
 * says what the address is actually used for. (Rebuilt as "Save your chart" in the leads PR.)
 */
export function ContactScreen({
  required,
  initial,
  lang,
  onSubmit,
  onSkip,
}: {
  required: boolean;
  initial: Contact | null;
  lang: Lang;
  onSubmit: (c: Contact) => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState(initial?.value ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [consent, setConsent] = useState(initial?.consent ?? false);
  const [error, setError] = useState<string | null>(null);
  const hi = lang === 'hi';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      setError(hi ? 'Kripya sahi email likhein.' : 'Please enter a valid email.');
      return;
    }
    onSubmit({ channel: 'email', value: v.toLowerCase(), name: name.trim() || undefined, consent });
  }

  const field =
    'w-full px-4 min-h-[56px] bg-white/[0.05] border border-horizon rounded-card font-body text-[1.0625rem] text-star placeholder:text-dust focus:outline-none focus:border-amber/60';

  return (
    <section>
      <p className="font-body text-label-md text-amber-light mb-3">{hi ? 'Calculation poori hui' : 'Calculation complete'}</p>
      <Title>{hi ? 'Aapka Karmic Blueprint taiyaar hai.' : 'Your Karmic Blueprint is ready.'}</Title>
      <p className="font-body text-body-lg text-dust-light mb-6">{hi ? 'Hum aap tak kahan pahunchein?' : 'Where can we reach you about it?'}</p>
      <form onSubmit={submit} noValidate>
        <label className="block">
          <span className="block font-body text-body-md text-dust-light mb-2">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            className={field}
          />
        </label>

        <label className="block mt-4">
          <span className="block font-body text-body-md text-dust-light mb-2">{hi ? 'Aapka naam (zaroori nahi)' : 'Your first name (optional)'}</span>
          <input type="text" autoComplete="given-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={field} />
        </label>

        <label className="mt-5 flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-[#D4A853]" />
          <span className="font-body text-body-md text-dust-light">
            {hi
              ? 'Mujhe kabhi-kabhi timing tips aur offers bhejein. Main kabhi bhi band kar sakta/sakti hoon.'
              : 'Send me occasional timing tips and offers. I can stop them any time.'}
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-3 font-body text-body-md text-caution-light">
            {error}
          </p>
        )}
        <PrimaryButton type="submit">{hi ? 'Mera blueprint dikhayein' : 'Show my blueprint'}</PrimaryButton>
      </form>
      <p className="mt-4 font-body text-body-sm text-dust">
        {hi
          ? 'Yeh sirf aapki reading aap se jodne ke liye hai. Aapki details kabhi bechi nahi jaatin.'
          : 'Used only to keep this reading linked to you. Your details are never sold.'}
      </p>
      {!required && (
        <button type="button" onClick={onSkip} className="block w-full text-center mt-3 py-3 font-body text-body-md text-dust underline underline-offset-4">
          {hi ? 'Skip karke dekhein' : 'Skip and view'}
        </button>
      )}
    </section>
  );
}
