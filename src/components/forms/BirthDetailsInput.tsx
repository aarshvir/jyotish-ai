'use client';

import { useRef, useState } from 'react';
import { hasValidBirthCoords } from '@/lib/utils/coords';

export interface BirthDetails {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
}

interface BirthDetailsInputProps {
  value: BirthDetails;
  onChange: (next: BirthDetails) => void;
  /** Heading shown above the fields, e.g. "You" / "Your partner" / "Person 1". */
  label?: string;
  /** Show the display-name field (default true). */
  showName?: boolean;
  /** Allow the "don't know the birth time → use noon" toggle (default true).
   *  Hide it where an exact time is required (e.g. Lagna / full-chart tools). */
  allowUnknownTime?: boolean;
}

/**
 * Reusable birth-details input with automatic city geocoding.
 * Users type a city; on blur (or Search) we resolve coordinates via /api/geocode
 * so they never have to enter latitude/longitude by hand. Shared by the
 * Matchmaking and Kundali forms.
 */
export function BirthDetailsInput({ value, onChange, label, showName = true, allowUnknownTime = true }: BirthDetailsInputProps) {
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    hasValidBirthCoords(value) ? 'ok' : 'idle',
  );
  const [resolvedName, setResolvedName] = useState<string>('');
  const [unknownTime, setUnknownTime] = useState(false);
  // Remember the user's exact time so unchecking "use noon" restores it instead of leaving 12:00.
  const [lastExactTime, setLastExactTime] = useState('');

  // Two races guarded here (same pattern as the onboard form's geocoder):
  //  1. Stale response wins — blur "Mumbai", correct it to "Delhi", blur again;
  //     if Mumbai's response lands last it writes Mumbai's coords AND rewrites
  //     birth_city back to "Mumbai". An AbortController supersedes the old call.
  //  2. Stale-closure clobber — `{ ...value }` captured at blur time would revert
  //     any name/date/time edit made while the request was in flight, so the
  //     spread reads the LATEST props via a ref instead.
  const geocodeAbort = useRef<AbortController | null>(null);
  const latestValue = useRef(value);
  latestValue.current = value;

  async function geocodeCity(city: string) {
    const q = city.trim();
    geocodeAbort.current?.abort();
    if (!q) {
      setGeoStatus('idle');
      return;
    }
    const controller = new AbortController();
    geocodeAbort.current = controller;
    setGeoStatus('loading');
    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(q)}`, { signal: controller.signal });
      const data = (await res.json().catch(() => [])) as Array<{ lat: string; lon: string; display_name?: string }>;
      // .json()'s catch swallows an abort mid-body, so re-check before writing.
      if (controller.signal.aborted) return;
      const first = Array.isArray(data) ? data[0] : undefined;
      if (first?.lat && first?.lon) {
        onChange({ ...latestValue.current, birth_city: q, birth_lat: parseFloat(first.lat), birth_lng: parseFloat(first.lon) });
        setResolvedName(first.display_name ?? '');
        setGeoStatus('ok');
      } else {
        setGeoStatus('error');
      }
    } catch (err) {
      // Superseded by a newer lookup — the newer call owns the status.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGeoStatus('error');
    }
  }

  const inputCls =
    'mt-1 w-full rounded-md bg-cosmos border border-horizon px-3 py-2.5 text-star focus:border-amber/60 focus:outline-none transition-colors';

  return (
    <div className="space-y-3">
      {label && <h3 className="font-display text-headline-sm text-amber">{label}</h3>}

      {showName && (
        <label className="block text-body-sm text-dust">
          Name
          <input
            className={inputCls}
            value={value.name}
            placeholder="Their name"
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-body-sm text-dust">
          Birth date
          <input
            type="date"
            className={inputCls}
            value={value.birth_date}
            onChange={(e) => onChange({ ...value, birth_date: e.target.value })}
          />
        </label>
        <label className="block text-body-sm text-dust">
          Birth time
          <input
            type="time"
            disabled={unknownTime}
            className={`${inputCls} ${unknownTime ? 'opacity-50 cursor-not-allowed' : ''}`}
            value={value.birth_time?.slice(0, 5)}
            onChange={(e) => onChange({ ...value, birth_time: `${e.target.value}:00` })}
          />
        </label>
      </div>

      {allowUnknownTime && (
        <>
          <label className="flex items-center gap-2 text-body-sm text-dust/80 cursor-pointer -mt-1">
            <input
              type="checkbox"
              className="accent-amber"
              checked={unknownTime}
              onChange={(e) => {
                const checked = e.target.checked;
                setUnknownTime(checked);
                if (checked) {
                  setLastExactTime(value.birth_time && value.birth_time !== '12:00:00' ? value.birth_time : '');
                  onChange({ ...value, birth_time: '12:00:00' });
                } else {
                  onChange({ ...value, birth_time: lastExactTime });
                }
              }}
            />
            Don&apos;t know the exact birth time? We&apos;ll use noon.
          </label>
          {unknownTime && (
            <p className="font-mono text-mono-sm text-dust/50 -mt-1">
              Noon (12:00) is the standard astrological default — your Moon sign, nakshatra and Gun Milan stay accurate; only the rising sign (Lagna) needs an exact time.
            </p>
          )}
        </>
      )}

      <label className="block text-body-sm text-dust">
        Birth city
        <input
          className={inputCls}
          value={value.birth_city}
          placeholder="e.g. Mumbai, India"
          onChange={(e) => {
            // Editing the city invalidates any prior geocode (including the
            // historical 0,0 form default). Submit must wait for a fresh locate.
            onChange({ ...value, birth_city: e.target.value, birth_lat: 0, birth_lng: 0 });
            setResolvedName('');
            setGeoStatus('idle');
          }}
          onBlur={(e) => void geocodeCity(e.target.value)}
        />
        <span className="mt-1 block font-mono text-mono-sm min-h-[18px]">
          {geoStatus === 'loading' && <span className="text-dust/60">Locating city…</span>}
          {geoStatus === 'ok' && (
            <span className="text-success">✓ Located{resolvedName ? ` — ${resolvedName.split(',').slice(0, 2).join(',')}` : ''}</span>
          )}
          {geoStatus === 'error' && (
            <span className="text-caution">Couldn&apos;t find that city — try &quot;City, Country&quot;.</span>
          )}
          {geoStatus === 'idle' && <span className="text-dust/40">We&apos;ll locate your city automatically.</span>}
        </span>
      </label>
    </div>
  );
}
