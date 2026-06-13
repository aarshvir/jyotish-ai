'use client';

import { useState } from 'react';

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
}

/**
 * Reusable birth-details input with automatic city geocoding.
 * Users type a city; on blur (or Search) we resolve coordinates via /api/geocode
 * so they never have to enter latitude/longitude by hand. Shared by the
 * Matchmaking and Kundali forms.
 */
export function BirthDetailsInput({ value, onChange, label, showName = true }: BirthDetailsInputProps) {
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    value.birth_lat && value.birth_lng ? 'ok' : 'idle',
  );
  const [resolvedName, setResolvedName] = useState<string>('');

  async function geocodeCity(city: string) {
    const q = city.trim();
    if (!q) {
      setGeoStatus('idle');
      return;
    }
    setGeoStatus('loading');
    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(q)}`);
      const data = (await res.json().catch(() => [])) as Array<{ lat: string; lon: string; display_name?: string }>;
      const first = Array.isArray(data) ? data[0] : undefined;
      if (first?.lat && first?.lon) {
        onChange({ ...value, birth_city: q, birth_lat: parseFloat(first.lat), birth_lng: parseFloat(first.lon) });
        setResolvedName(first.display_name ?? '');
        setGeoStatus('ok');
      } else {
        setGeoStatus('error');
      }
    } catch {
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
            className={inputCls}
            value={value.birth_time?.slice(0, 5)}
            onChange={(e) => onChange({ ...value, birth_time: `${e.target.value}:00` })}
          />
        </label>
      </div>

      <label className="block text-body-sm text-dust">
        Birth city
        <input
          className={inputCls}
          value={value.birth_city}
          placeholder="e.g. Mumbai, India"
          onChange={(e) => onChange({ ...value, birth_city: e.target.value })}
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
