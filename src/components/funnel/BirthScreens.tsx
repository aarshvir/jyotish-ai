'use client';

import { useState } from 'react';
import type { Lang, T } from '@/lib/funnel/screens';
import {
  DATE_ERROR,
  TIME_ERROR,
  dateEcho,
  parseDate,
  parseTime,
  splitIso,
  splitTime,
  timeEcho,
  type Meridiem,
} from '@/lib/funnel/birth';
import { PrimaryButton, Sub, Title, t } from './QuestionScreens';

/**
 * Birth date and birth time entry (see lib/funnel/birth.ts for why).
 *  • Date: three numeric boxes, no calendar, no wheel, no default. The date is read back with
 *    its weekday.
 *  • Time: say how sure you are first, then (only if you know it) type it. There is no default
 *    time and AM/PM must be chosen. "I don't know" is a full path, not a small link.
 */

const box =
  'w-full px-3 min-h-[56px] bg-white/[0.05] border border-horizon rounded-card font-body text-[1.25rem] text-star text-center tabular-nums placeholder:text-dust focus:outline-none focus:border-amber/60';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-body text-body-sm text-dust-light mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// ── date ─────────────────────────────────────────────────────────────────────

export function BirthDateScreen({
  title,
  subtitle,
  notice,
  initial,
  lang,
  onSubmit,
}: {
  title: T;
  subtitle?: T;
  /** The data-notice line: what is collected here and why. */
  notice: T;
  initial: string;
  lang: Lang;
  onSubmit: (iso: string) => void;
}) {
  const start = splitIso(initial);
  const [d, setD] = useState(start.d);
  const [m, setM] = useState(start.m);
  const [y, setY] = useState(start.y);
  const [error, setError] = useState<string | null>(null);
  const hi = lang === 'hi';
  const parsed = parseDate(d, m, y);
  const echo = 'iso' in parsed ? dateEcho(parsed.iso, lang) : null;
  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

  return (
    <section>
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if ('iso' in parsed) onSubmit(parsed.iso);
          else setError(t(DATE_ERROR[parsed.error], lang));
        }}
      >
        <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-3" role="group" aria-label={t(title, lang)}>
          <Field label={hi ? 'Din' : 'Day'}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-day"
              placeholder="DD"
              value={d}
              onChange={(e) => {
                setD(digits(e.target.value, 2));
                setError(null);
              }}
              className={box}
            />
          </Field>
          <Field label={hi ? 'Mahina' : 'Month'}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-month"
              placeholder="MM"
              value={m}
              onChange={(e) => {
                setM(digits(e.target.value, 2));
                setError(null);
              }}
              className={box}
            />
          </Field>
          <Field label={hi ? 'Saal' : 'Year'}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="bday-year"
              placeholder="YYYY"
              value={y}
              onChange={(e) => {
                setY(digits(e.target.value, 4));
                setError(null);
              }}
              className={box}
            />
          </Field>
        </div>
        <p role="status" className="mt-3 min-h-[1.75rem] font-body text-[1.0625rem] text-amber-light">
          {echo}
        </p>
        {error && (
          <p role="alert" className="mt-1 font-body text-body-md text-caution-light">
            {error}
          </p>
        )}
        <PrimaryButton type="submit">{hi ? 'Aage badhein' : 'Continue'}</PrimaryButton>
      </form>
      <p className="mt-5 font-body text-body-sm leading-[1.6] text-dust">{t(notice, lang)}</p>
    </section>
  );
}

// ── time ─────────────────────────────────────────────────────────────────────

type Known = 'exact' | 'approx' | 'unknown';

const KNOWN_OPTIONS: { value: Known; label: T; hint?: T }[] = [
  { value: 'exact', label: { en: 'Yes, I am sure of it', hi: 'Haan, pakka pata hai' }, hint: { en: 'From a certificate or a family record', hi: 'Certificate ya ghar ke record se' } },
  { value: 'approx', label: { en: 'Roughly, within an hour or two', hi: 'Lagbhag, ek-do ghante idhar-udhar' } },
  { value: 'unknown', label: { en: 'No idea', hi: 'Pata nahi' } },
];

const KNOWN_NOTE: Record<Known, T> = {
  exact: { en: 'Type it as it is written. Hours are 1 to 12, then choose AM or PM.', hi: 'Jaise likha hai waise likhein. Ghanta 1 se 12, phir AM ya PM chunein.' },
  approx: {
    en: 'Good. Anything that could change if the real time is an hour or two off will be marked on your result.',
    hi: 'Theek hai. Jo kuch ek-do ghante ke farq se badal sakta hai, use aapke result par alag se likh denge.',
  },
  unknown: {
    en: 'No problem. We will show what can be worked out without it and mark the rest as uncertain. Houses are counted from your Moon instead of your rising sign.',
    hi: 'Koi baat nahi. Jo bina samay ke nikal sakta hai wo dikhayenge. Baaki par "andaza" likh denge. Ghar rising sign ki jagah Chandra se ginenge.',
  },
};

export function BirthTimeScreen({
  title,
  subtitle,
  initialKnown,
  initialTime,
  lang,
  onSubmit,
}: {
  title: T;
  subtitle?: T;
  initialKnown: string | undefined;
  initialTime: string | undefined;
  lang: Lang;
  onSubmit: (known: Known, time: string | null) => void;
}) {
  const hi = lang === 'hi';
  const init = splitTime(initialTime);
  const [known, setKnown] = useState<Known | null>(initialKnown === 'exact' || initialKnown === 'approx' || initialKnown === 'unknown' ? initialKnown : null);
  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);
  const [ap, setAp] = useState<Meridiem | null>(init.ap);
  const [error, setError] = useState<string | null>(null);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 2);

  const parsed = parseTime(h, m, ap);
  const needsTime = known === 'exact' || known === 'approx';
  const ready = known === 'unknown' || (needsTime && 'hhmm' in parsed);
  // Hour 13–23 is a 24-hour time, so AM/PM is not asked for.
  const hourNum = Number(h);
  const is24 = h !== '' && hourNum > 12;

  return (
    <section>
      <Title>{t(title, lang)}</Title>
      {subtitle ? <Sub>{t(subtitle, lang)}</Sub> : <div className="h-4" />}
      <div className="space-y-3" role="radiogroup" aria-label={t(title, lang)}>
        {KNOWN_OPTIONS.map((o) => {
          const on = known === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setKnown(o.value);
                setError(null);
              }}
              className={`w-full text-left px-4 min-h-[56px] py-3 rounded-card border transition-colors duration-150 ${on ? 'border-amber bg-amber/[0.10]' : 'border-horizon bg-nebula hover:border-amber/50'}`}
            >
              <span className="block font-body text-[1.0625rem] text-star">{t(o.label, lang)}</span>
              {o.hint && <span className="block mt-0.5 font-body text-body-sm text-dust">{t(o.hint, lang)}</span>}
            </button>
          );
        })}
      </div>

      {known && (
        <form
          noValidate
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (known === 'unknown') return onSubmit('unknown', null);
            if ('hhmm' in parsed) return onSubmit(known, parsed.hhmm);
            setError(t(TIME_ERROR[parsed.error], lang));
          }}
        >
          <p className="font-body text-body-md leading-[1.6] text-dust-light">{t(KNOWN_NOTE[known], lang)}</p>
          {needsTime && (
            <>
              <div className="mt-4 flex items-end gap-3">
                <Field label={hi ? 'Ghanta' : 'Hour'} className="w-[84px]">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="HH"
                    value={h}
                    onChange={(e) => {
                      setH(digits(e.target.value));
                      setError(null);
                    }}
                    className={box}
                  />
                </Field>
                <Field label={hi ? 'Minute' : 'Minutes'} className="w-[84px]">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="MM"
                    value={m}
                    onChange={(e) => {
                      setM(digits(e.target.value));
                      setError(null);
                    }}
                    className={box}
                  />
                </Field>
                <div className="flex-1" role="radiogroup" aria-label="AM or PM">
                  <div className="grid grid-cols-2 gap-2">
                    {(['am', 'pm'] as const).map((v) => {
                      const on = is24 ? (hourNum >= 12 ? 'pm' : 'am') === v : ap === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          disabled={is24}
                          onClick={() => {
                            setAp(v);
                            setError(null);
                          }}
                          className={`min-h-[56px] rounded-card border font-body text-[1.0625rem] font-semibold transition-colors ${on ? 'border-amber bg-amber/[0.14] text-star' : 'border-horizon bg-nebula text-dust-light'} disabled:opacity-70`}
                        >
                          {v.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p role="status" className="mt-3 min-h-[1.75rem] font-body text-[1.0625rem] text-amber-light">
                {'hhmm' in parsed ? timeEcho(parsed.hhmm, lang) : ''}
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="mt-1 font-body text-body-md text-caution-light">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={!ready}>
            {hi ? 'Aage badhein' : 'Continue'}
          </PrimaryButton>
        </form>
      )}
    </section>
  );
}
