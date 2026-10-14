'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { cityCandidates, todayLocal, UNKNOWN_TIME_MESSAGE, type CityCandidate, type TimeAccuracy } from '@/lib/tools/birth';
import { LatestRequest, requestJson, RequestTimeout } from '@/lib/tools/requests';

export interface BirthDetails {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
  birth_time_accuracy?: TimeAccuracy;
  birth_city_confirmed?: boolean;
}

interface BirthDetailsInputProps {
  value: BirthDetails;
  onChange: (next: BirthDetails) => void;
  label?: string;
  showName?: boolean;
  /** Hide unknown time when the consuming flow requires a birth time. */
  allowUnknownTime?: boolean;
}

export function BirthDetailsInput({ value, onChange, label, showName = true, allowUnknownTime = true }: BirthDetailsInputProps) {
  const id = useId();
  const located = hasValidBirthCoords(value) && value.birth_city_confirmed !== false;
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'choose' | 'ok' | 'error'>(located ? 'ok' : 'idle');
  const [candidates, setCandidates] = useState<CityCandidate[]>([]);
  const [geoError, setGeoError] = useState('');
  const requests = useRef(new LatestRequest());
  const latestValue = useRef(value);
  latestValue.current = value;
  const accuracySelect = useRef<HTMLSelectElement>(null);
  const cityInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => requests.current.cancel(), []);
  useEffect(() => {
    accuracySelect.current?.setCustomValidity(value.birth_time_accuracy === 'unknown' ? UNKNOWN_TIME_MESSAGE : '');
    cityInput.current?.setCustomValidity(located ? '' : 'Search for your city and select the correct location.');
  }, [located, value.birth_time_accuracy]);

  function update(next: BirthDetails) {
    latestValue.current = next;
    onChange(next);
  }

  async function geocodeCity() {
    const city = latestValue.current.birth_city.trim();
    if (city.length < 2) {
      setGeoStatus('error');
      setGeoError('Enter a city and country before searching.');
      return;
    }
    const controller = requests.current.start();
    setCandidates([]);
    setGeoStatus('loading');
    try {
      const { response, data } = await requestJson(`/api/geocode?city=${encodeURIComponent(city)}`, { signal: controller.signal }, 8_000);
      if (!requests.current.isCurrent(controller) || latestValue.current.birth_city.trim() !== city) return;
      const matches = response.ok ? cityCandidates(data) : [];
      if (!matches.length) {
        setGeoStatus('error');
        setGeoError(response.status === 429 ? 'Too many searches. Try again in a minute.' : 'No city selected. Try again with a city and country.');
        return;
      }
      setCandidates(matches);
      setGeoStatus('choose');
    } catch (error) {
      if (!requests.current.isCurrent(controller)) return;
      setGeoStatus('error');
      setGeoError(error instanceof RequestTimeout ? 'City search took too long. Try again.' : 'City search is unavailable. Try again.');
    }
  }

  function choose(city: CityCandidate) {
    requests.current.cancel();
    update({ ...latestValue.current, birth_city: city.display_name, birth_lat: city.lat, birth_lng: city.lon, birth_city_confirmed: true });
    setGeoStatus('ok');
  }

  const inputCls = 'mt-1 w-full min-w-0 rounded-md bg-cosmos border border-horizon px-3 py-2.5 text-star focus:border-amber/60 focus:outline-none transition-colors';
  const unknown = value.birth_time_accuracy === 'unknown';

  return (
    <div className="space-y-4">
      {label && <h3 className="font-display text-headline-sm text-star">{label}</h3>}
      {showName && (
        <label className="block text-body-sm text-dust">
          Name (optional)
          <input className={inputCls} value={value.name} maxLength={80} autoComplete="off" onChange={e => update({ ...value, name: e.target.value })} />
        </label>
      )}
      <label className="block text-body-sm text-dust">
        Birth date
        <input type="date" required max={todayLocal()} className={inputCls} value={value.birth_date} onChange={e => update({ ...value, birth_date: e.target.value })} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block min-w-0 text-body-sm text-dust">
          Birth time certainty
          <select ref={accuracySelect} required className={inputCls} value={value.birth_time_accuracy ?? ''}
            onChange={e => update({ ...value, birth_time_accuracy: e.target.value as TimeAccuracy, birth_time: '' })}>
            <option value="" disabled>Select certainty</option>
            <option value="known">Known</option>
            <option value="approximate">Approximate</option>
            {allowUnknownTime && <option value="unknown">Unknown</option>}
          </select>
        </label>
        {!unknown && (
          <label className="block min-w-0 text-body-sm text-dust">
            Birth time (24-hour)
            <input type="time" required step="1" className={inputCls}
              value={value.birth_time_accuracy ? value.birth_time : ''}
              aria-describedby={`${id}-time-note`}
              onChange={e => update({ ...value, birth_time: e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value })} />
          </label>
        )}
      </div>
      <p id={`${id}-time-note`} className="text-body-sm text-dust" aria-live="polite">
        {unknown ? UNKNOWN_TIME_MESSAGE : value.birth_time_accuracy === 'approximate'
          ? 'Results use the time you enter, not a verified time range. Signs, houses and periods may change if this estimate is wrong.'
          : 'Use the local clock time at your birthplace. No time is assumed.'}
        {unknown && <> <Link href="/blog/kundli-without-birth-time" className="underline text-star">Birth-time help</Link></>}
      </p>
      <label className="block text-body-sm text-dust">
        Birth city and country
        <div className="flex items-center gap-2">
          <input ref={cityInput} required maxLength={120} className={inputCls} value={value.birth_city}
            placeholder="City, Country" autoComplete="off" aria-describedby={`${id}-city-status`}
            onChange={e => {
              requests.current.cancel();
              update({ ...value, birth_city: e.target.value, birth_lat: Number.NaN, birth_lng: Number.NaN, birth_city_confirmed: false });
              setCandidates([]);
              setGeoStatus('idle');
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void geocodeCity(); } }}
            onBlur={() => { if (!located && geoStatus === 'idle') void geocodeCity(); }} />
          <button type="button" title="Search city" aria-label="Search city" className="mt-1 shrink-0 w-11 h-11 rounded-md border border-horizon flex items-center justify-center text-star"
            onClick={() => void geocodeCity()}>
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      </label>
      <p id={`${id}-city-status`} role="status" aria-live="polite" className="text-body-sm text-dust min-h-[20px] break-words">
        {geoStatus === 'loading' ? 'Searching cities...' : located ? `Selected: ${value.birth_city}` : geoStatus === 'choose'
          ? 'Select your birthplace from the matches below.' : geoStatus === 'error' ? geoError : 'Select a city match to confirm the location.'}
      </p>
      {candidates.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-body-sm text-star mb-2">City matches</legend>
          {candidates.map(city => (
            <label key={`${city.lat},${city.lon}`} className="flex items-start gap-3 border-b border-horizon py-2 text-body-sm text-star cursor-pointer">
              <input type="radio" className="mt-1 shrink-0" name={`${id}-city`} checked={located && value.birth_lat === city.lat && value.birth_lng === city.lon} onChange={() => choose(city)} />
              <span className="min-w-0 break-words">{city.display_name}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
