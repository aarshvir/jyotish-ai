'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang, Option, T } from '@/lib/funnel/screens';
import { SceneArt } from './SceneArt';

export const t = (x: T | undefined, lang: Lang) => (x ? x[lang] || x.en : '');

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display font-semibold text-star text-[1.75rem] leading-[1.15] tracking-[-0.01em] mb-2">{children}</h1>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-body-lg text-dust-light mb-6">{children}</p>;
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="btn-primary w-full min-h-[52px] mt-6 font-body text-[1.0625rem] font-semibold">
      {children}
    </button>
  );
}

export function SingleScreen({
  title,
  subtitle,
  options,
  selected,
  lang,
  onChoose,
}: {
  title: T;
  subtitle?: T;
  options: Option[];
  selected?: string;
  lang: Lang;
  onChoose: (v: string) => void;
}) {
  return (
    <section>
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <div className="space-y-3" role="radiogroup" aria-label={t(title, lang)}>
        {options.map((o) => {
          const on = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChoose(o.value)}
              className={`w-full flex items-center gap-3 text-left px-4 min-h-[56px] py-3 rounded-card border transition-colors duration-150 ${
                on ? 'border-amber bg-amber/[0.10]' : 'border-horizon bg-nebula hover:border-amber/50'
              }`}
            >
              {o.emoji && (
                <span aria-hidden className="text-[1.375rem] w-8 text-center shrink-0">
                  {o.emoji}
                </span>
              )}
              <span className="font-body text-[1.0625rem] text-star">{t(o.label, lang)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PictureScreen({
  title,
  options,
  toast,
  selected,
  lang,
  onChoose,
}: {
  title: T;
  options: Option[];
  toast: T;
  selected?: string;
  lang: Lang;
  onChoose: (v: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const choose = useRef(onChoose);
  choose.current = onChoose;
  // Hold the toast long enough to read before moving on.
  useEffect(() => {
    if (!picked) return;
    const id = setTimeout(() => choose.current(picked), 1700);
    return () => clearTimeout(id);
  }, [picked]);
  return (
    <section>
      <Title>{t(title, lang)}</Title>
      <div className="h-4" />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t(title, lang)}>
        {options.map((o) => {
          const on = (picked ?? selected) === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={Boolean(picked)}
              onClick={() => setPicked(o.value)}
              className={`rounded-card overflow-hidden border text-left transition-colors ${on ? 'border-amber ring-2 ring-amber/40' : 'border-horizon'}`}
            >
              <SceneArt scene={o.value as 'temple' | 'ghat' | 'fort' | 'court'} className="block w-full aspect-[4/3]" />
              <span className="block px-3 py-2.5 bg-nebula font-body text-body-md text-star">{t(o.label, lang)}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <p role="status" className="mt-5 px-4 py-3 rounded-card bg-bg-3 border border-horizon font-body text-body-md text-dust-light">
          {t(toast, lang)}
        </p>
      )}
    </section>
  );
}

export function InfoScreen({ title, body, cta, lang, onNext, eyebrow }: { title: T; body: T; cta: T; lang: Lang; onNext: () => void; eyebrow?: string }) {
  return (
    <section>
      {eyebrow && <p className="font-body text-label-md text-indigo mb-3">{eyebrow}</p>}
      <Title>{t(title, lang)}</Title>
      <div className="mt-4 border-l-2 border-amber/60 pl-4">
        <p className="font-body text-[1.0625rem] leading-[1.7] text-dust-light">{t(body, lang)}</p>
      </div>
      <PrimaryButton onClick={onNext}>{t(cta, lang)}</PrimaryButton>
    </section>
  );
}

export function InputScreen({
  kind,
  title,
  subtitle,
  initial,
  lang,
  validate,
  onSubmit,
}: {
  kind: 'date' | 'time';
  title: T;
  subtitle?: T;
  initial: string;
  lang: Lang;
  validate: (v: string) => string | null;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <section>
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const problem = validate(value);
          if (problem) setError(problem);
          else onSubmit(value);
        }}
      >
        <input
          type={kind}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          max={kind === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
          aria-label={t(title, lang)}
          className="w-full px-4 min-h-[56px] bg-white/[0.05] border border-horizon rounded-card font-body text-[1.0625rem] text-star focus:outline-none focus:border-amber/60 [color-scheme:dark]"
        />
        {error && (
          <p role="alert" className="mt-3 font-body text-body-md text-caution-light">
            {error}
          </p>
        )}
        <PrimaryButton type="submit">{lang === 'hi' ? 'Aage badhein' : 'Continue'}</PrimaryButton>
      </form>
    </section>
  );
}
