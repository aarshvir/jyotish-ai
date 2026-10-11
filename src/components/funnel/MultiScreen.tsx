'use client';

import type { Lang, Option, T } from '@/lib/funnel/screens';
import { joinCodes, splitCodes } from '@/lib/funnel/problems';
import { Sub, Title, t } from './QuestionScreens';

/**
 * Pick-several screen (up to `max`). Selected rows get a tick; once the limit is reached
 * the unselected rows dim and a line says so, instead of silently ignoring taps. The
 * continue bar is pinned to the bottom so it stays reachable on a short phone.
 * `exclusive` choices ("just curious", "nothing bothered me") clear every other choice
 * and are cleared by any other choice.
 */
export function MultiScreen({
  title,
  subtitle,
  options,
  selected,
  min,
  max,
  exclusive = [],
  cta,
  lang,
  onChange,
  onSubmit,
}: {
  title: T;
  subtitle?: T;
  options: Option[];
  selected: string;
  min: number;
  max: number;
  exclusive?: string[];
  cta: T;
  lang: Lang;
  onChange: (next: string) => void;
  /** Receives only the choices that are valid for this screen's options. */
  onSubmit: (value: string) => void;
}) {
  const valid = new Set(options.map((o) => o.value));
  const picked = splitCodes(selected).filter((c) => valid.has(c));
  const full = picked.length >= max;
  const hi = lang === 'hi';

  function toggle(v: string) {
    if (picked.includes(v)) return onChange(joinCodes(picked.filter((c) => c !== v)));
    if (exclusive.includes(v)) return onChange(v);
    const rest = picked.filter((c) => !exclusive.includes(c));
    if (rest.length >= max) return;
    onChange(joinCodes([...rest, v]));
  }

  return (
    <section className="pb-28">
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <div className="space-y-3" role="group" aria-label={t(title, lang)}>
        {options.map((o) => {
          const on = picked.includes(o.value);
          const blocked = full && !on && !exclusive.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={blocked || undefined}
              onClick={() => toggle(o.value)}
              className={`w-full flex items-center gap-3 text-left px-4 min-h-[56px] py-3 rounded-card border transition-colors duration-150 ${
                on ? 'border-amber bg-amber/[0.10]' : blocked ? 'border-horizon bg-nebula opacity-50' : 'border-horizon bg-nebula hover:border-amber/50'
              }`}
            >
              <span
                aria-hidden
                className={`w-6 h-6 shrink-0 rounded-[7px] border flex items-center justify-center ${on ? 'border-amber bg-amber text-space' : 'border-dust'}`}
              >
                {on && (
                  <svg viewBox="0 0 16 16" className="w-4 h-4">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="font-body text-[1.0625rem] leading-snug text-star">{t(o.label, lang)}</span>
            </button>
          );
        })}
      </div>
      {full && max < options.length && (
        <p role="status" className="mt-4 font-body text-body-md text-dust-light">
          {hi ? `${max} chun liye. Badalne ke liye kisi ek par tap karke hata dein.` : `You have picked ${max}. Tap one to remove it and choose another.`}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-horizon bg-[rgba(18,12,30,.94)] backdrop-blur-md px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => onSubmit(joinCodes(picked))}
            disabled={picked.length < min}
            className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold disabled:opacity-40"
          >
            {t(cta, lang)}
            {max < options.length && picked.length > 0 ? ` (${picked.length}/${max})` : ''}
          </button>
        </div>
      </div>
    </section>
  );
}
