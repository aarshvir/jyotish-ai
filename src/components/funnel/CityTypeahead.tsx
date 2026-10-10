'use client';

import { useEffect, useRef, useState } from 'react';
import { matchCities, placeFromGeocode, placeLabel, type Place } from '@/lib/funnel/cities';

/**
 * Birth-place type-ahead: big cities appear as you type (local list, instant); after a
 * short pause the wider search (/api/geocode, cached server-side) adds smaller towns.
 * No "Find" button. One tap on a row picks it.
 */
export function CityTypeahead({
  initial,
  saved,
  placeholder,
  labels,
  onPick,
}: {
  initial: string;
  saved: Place | null;
  placeholder: string;
  labels: { searching: string; none: string; error: string; use: string };
  onPick: (p: Place) => void;
}) {
  const [query, setQuery] = useState(initial);
  const [local, setLocal] = useState<Place[]>(() => matchCities(initial));
  const [remote, setRemote] = useState<Place[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [searched, setSearched] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    setLocal(matchCities(term));
    setRemote([]);
    if (term.length < 3) {
      setStatus('idle');
      return;
    }
    const mine = ++seq.current;
    // Pause before asking the wider search, so we send one request per word, not per key.
    const t = setTimeout(async () => {
      setStatus('loading');
      try {
        const r = await fetch(`/api/geocode?city=${encodeURIComponent(term)}`);
        if (mine !== seq.current) return;
        if (!r.ok) {
          setStatus('error');
          return;
        }
        const data = (await r.json().catch(() => [])) as Array<{ lat: string; lon: string; display_name?: string }>;
        const list = (Array.isArray(data) ? data : [])
          .slice(0, 5)
          .map((d) => placeFromGeocode(d.display_name ?? term, parseFloat(d.lat), parseFloat(d.lon)))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        setRemote(list);
        setSearched(term);
        setStatus('idle');
      } catch {
        if (mine === seq.current) setStatus('error');
      }
    }, 650);
    return () => clearTimeout(t);
  }, [query]);

  // Local first; then wider results that are not the same place (same label, or within ~3 km).
  const results = local.concat(
    remote.filter(
      (r, i, all) =>
        all.findIndex((q) => placeLabel(q) === placeLabel(r)) === i &&
        !local.some((l) => placeLabel(l) === placeLabel(r) || (Math.abs(l.lat - r.lat) < 0.03 && Math.abs(l.lng - r.lng) < 0.03)),
    ),
  ).slice(0, 7);

  const term = query.trim();
  return (
    <div>
      {saved && (
        <button
          type="button"
          onClick={() => onPick(saved)}
          className="w-full text-left px-4 min-h-[56px] mb-3 rounded-card border border-amber bg-amber/[0.08] font-body text-body-lg text-star"
        >
          {labels.use} {placeLabel(saved)}
        </button>
      )}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-controls="city-results"
        className="w-full px-4 min-h-[56px] bg-white/[0.05] border border-horizon rounded-card font-body text-[1.0625rem] text-star placeholder:text-dust focus:outline-none focus:border-amber/60"
      />
      <ul id="city-results" role="listbox" className="mt-3 space-y-2">
        {results.map((p) => (
          <li key={`${p.name}|${p.region}|${p.lat}`} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className="w-full text-left px-4 py-2.5 min-h-[56px] rounded-card border border-horizon bg-nebula hover:border-amber/50 active:border-amber"
            >
              <span className="block font-body text-body-lg text-star">{p.name}</span>
              {p.region && <span className="block font-body text-body-sm text-dust">{p.region}</span>}
            </button>
          </li>
        ))}
      </ul>
      {status === 'loading' && results.length === 0 && <p className="mt-3 font-body text-body-sm text-dust">{labels.searching}</p>}
      {status === 'idle' && searched === term && term.length >= 3 && results.length === 0 && (
        <p className="mt-3 font-body text-body-sm text-dust">{labels.none}</p>
      )}
      {status === 'error' && <p className="mt-3 font-body text-body-sm text-caution-light">{labels.error}</p>}
    </div>
  );
}
